import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const sessionPath = "lib/payments/toss/session.ts";
const { ensureTossPaymentSessionIndexes, tossPaymentSessions } = compileTsModule(sessionPath);
const expectedIndexes = [
  [{ tossOrderId: 1 }, { unique: true, sparse: true }],
  [{ niceOrderId: 1 }, { unique: true, sparse: true }],
];

function fixture(t) {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected live fetch"); });
  const collection = {
    createIndex: t.mock.fn(async () => "mock-index"),
    dropIndex: t.mock.fn(),
    dropIndexes: t.mock.fn(),
  };
  const db = {
    collection: t.mock.fn(() => collection),
    command: t.mock.fn(),
    dropCollection: t.mock.fn(),
  };
  return { db, collection };
}

for (const repetitions of [1, 3]) {
  test(`index ensure called ${repetitions} time(s) preserves only the two unique sparse indexes`, async (t) => {
    const { db, collection } = fixture(t);
    for (let i = 0; i < repetitions; i++) await ensureTossPaymentSessionIndexes(db);
    const requests = collection.createIndex.mock.calls.map(({ arguments: args }) => args);
    assert.deepEqual(requests, Array.from({ length: repetitions }, () => expectedIndexes).flat());
    assert.equal(requests.filter(([keys, options]) => "expiresAt" in keys || "expireAfterSeconds" in options).length, 0);
    assert.equal(collection.dropIndex.mock.callCount(), 0);
    assert.equal(collection.dropIndexes.mock.callCount(), 0);
    assert.equal(db.command.mock.callCount(), 0);
    assert.equal(db.dropCollection.mock.callCount(), 0);
    for (const call of db.collection.mock.calls) assert.deepEqual(call.arguments, ["toss_payment_sessions"]);
  });
}

test("tossPaymentSessions returns the existing shared collection", (t) => {
  const { db, collection } = fixture(t);
  assert.equal(tossPaymentSessions(db), collection);
  assert.deepEqual(db.collection.mock.calls[0].arguments, ["toss_payment_sessions"]);
  assert.equal(collection.createIndex.mock.callCount(), 0);
});

function sourceFile(path) {
  return ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
}

test("shared session expiresAt remains a required Date", () => {
  const source = sourceFile(sessionPath);
  const session = source.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === "TossPaymentSession");
  const expiresAt = session.type.members.find((node) => node.name?.getText(source) === "expiresAt");
  assert.equal(expiresAt.questionToken, undefined);
  assert.equal(expiresAt.type.getText(source), "Date");
});

for (const flow of ["", "package/", "racket/", "rental/", "stringing/", "private-payment/"]) {
  test(`NICE ${flow || "checkout/"}prepare retains a 30-minute payment window`, () => {
    const source = sourceFile(`app/api/payments/nice/${flow}prepare/route.ts`);
    const initializers = [];
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === "expiresAt") initializers.push(node.initializer);
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === "expiresAt" && node.initializer) initializers.push(node.initializer);
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(initializers.length, 1);
    // Evaluate only the expiry expression; no route, provider or database is executed.
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresAt = runInNewContext(initializers[0].getText(source), { now });
    assert.equal(expiresAt.getTime() - now.getTime(), 30 * 60 * 1000);
  });
}
