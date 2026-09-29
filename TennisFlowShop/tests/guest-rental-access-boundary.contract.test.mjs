import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import { test } from "node:test";
import ts from "typescript";

function compileRentalAccess() {
  const source = readFileSync(
    new URL("../app/api/rentals/_lib/rental-access.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "rental-access-")), "rental-access.cjs");
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id === "@/lib/auth.utils") return { verifyAccessToken: () => null };
    if (id === "@/lib/auth/guest-resource-access.server") return { hasGuestRentalCookieAccess: () => false };
    if (id === "mongodb") return { ObjectId: { isValid: () => true } };
    if (id === "next/headers") return { cookies: async () => ({ get: () => undefined }) };
    if (id === "next/server") return { NextResponse: { json: (_body, init) => init } };
    return originalRequire(id);
  };
  mod._compile(outputText, filename);
  return mod.exports;
}

const { getRentalAccessDecision } = compileRentalAccess();
const rentalId = "000000000000000000000001";
const otherRentalId = "000000000000000000000002";

function compileAuth() {
  const source = readFileSync(new URL("../lib/auth.utils.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "rental-auth-")), "auth.cjs");
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod._compile(outputText, filename);
  return mod.exports;
}

process.env.REFRESH_TOKEN_SECRET ??= "guest-rental-contract-secret";
const auth = compileAuth();

test("대여 접근 경계는 회원 본인과 올바른 guest rental token만 허용한다", () => {
  assert.deepEqual(
    getRentalAccessDecision({
      rental: { userId: "member-1" }, rentalId, accessClaims: { sub: "member-1" },
      hasGuestRentalAccess: false,
    }),
    { ok: true, isGuestRental: false },
  );
  assert.deepEqual(
    getRentalAccessDecision({ rental: {}, rentalId, accessClaims: null, hasGuestRentalAccess: true }),
    { ok: true, isGuestRental: true },
  );
});

test("대여 접근 경계는 다른 회원과 allowAdmin=false 관리자를 거부한다", () => {
  assert.deepEqual(
    getRentalAccessDecision({ rental: { userId: "member-1" }, rentalId, accessClaims: { sub: "member-2" }, hasGuestRentalAccess: false }),
    { ok: false, reason: "RENTAL_NOT_AVAILABLE" },
  );
  assert.deepEqual(
    getRentalAccessDecision({ rental: { userId: "member-1" }, rentalId, accessClaims: { role: "admin" }, hasGuestRentalAccess: false, allowAdmin: false }),
    { ok: false, reason: "RENTAL_NOT_AVAILABLE" },
  );
  assert.deepEqual(
    getRentalAccessDecision({ rental: { userId: "member-1" }, rentalId, accessClaims: { role: "admin" }, hasGuestRentalAccess: false, allowAdmin: true }),
    { ok: true, isGuestRental: false },
  );
});

test("대여 접근 경계는 guest token 없음, 위조, 다른 rentalId 및 문서 없음을 거부한다", () => {
  const noToken = auth.hasDedicatedGuestRentalAccess(null, rentalId);
  const forgedToken = auth.hasDedicatedGuestRentalAccess(auth.verifyRentalAccessToken("forged-token"), rentalId);
  const otherToken = auth.signRentalAccessToken({ scope: "guest_rental", rentalId: otherRentalId });
  const wrongRental = auth.hasDedicatedGuestRentalAccess(auth.verifyRentalAccessToken(otherToken), rentalId);
  assert.deepEqual(getRentalAccessDecision({ rental: {}, rentalId, accessClaims: null, hasGuestRentalAccess: noToken }), { ok: false, reason: "RENTAL_NOT_AVAILABLE" });
  assert.deepEqual(getRentalAccessDecision({ rental: {}, rentalId, accessClaims: null, hasGuestRentalAccess: forgedToken }), { ok: false, reason: "RENTAL_NOT_AVAILABLE" });
  assert.deepEqual(getRentalAccessDecision({ rental: {}, rentalId, accessClaims: null, hasGuestRentalAccess: wrongRental }), { ok: false, reason: "RENTAL_NOT_AVAILABLE" });
  assert.deepEqual(getRentalAccessDecision({ rental: null, rentalId, accessClaims: null, hasGuestRentalAccess: false }), { ok: false, reason: "RENTAL_NOT_AVAILABLE" });
});

test("전용 guest rental token은 rentalId에 묶이고 주문 guest token과 교차 사용되지 않는다", () => {
  const rentalToken = auth.signRentalAccessToken({ scope: "guest_rental", rentalId });
  assert.equal(auth.hasDedicatedGuestRentalAccess(auth.verifyRentalAccessToken(rentalToken), rentalId), true);
  assert.equal(auth.hasDedicatedGuestRentalAccess(auth.verifyRentalAccessToken(rentalToken), otherRentalId), false);
  assert.equal(auth.verifyRentalAccessToken("invalid-token"), null);

  const orderToken = auth.signGuestOrderLookupAccessToken({
    scope: "guest_order_lookup", orderIds: [rentalId],
  });
  assert.equal(auth.verifyRentalAccessToken(orderToken), null);
  assert.equal(auth.hasGuestRentalAccess(auth.verifyOrderAccessToken(orderToken), rentalId), false);
  assert.deepEqual(
    getRentalAccessDecision({
      rental: {}, rentalId, accessClaims: null,
      hasGuestRentalAccess: auth.hasDedicatedGuestRentalAccess(auth.verifyRentalAccessToken(orderToken), rentalId),
    }),
    { ok: false, reason: "RENTAL_NOT_AVAILABLE" },
  );
});
