import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "review-target-"));
fs.mkdirSync(path.join(tmp, "node_modules", "mongodb"), { recursive: true });
fs.writeFileSync(path.join(tmp, "node_modules", "mongodb", "index.js"), `class ObjectId { constructor(v){ this.v=String(v) } toString(){ return this.v } static isValid(v){ return /^[0-9a-fA-F]{24}$/.test(String(v)) } } module.exports={ObjectId};`);
for (const name of ["review-target", "review-policy", "review-target.server"]) {
  const src = fs.readFileSync(new URL(`../lib/reviews/${name}.ts`, import.meta.url), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  fs.writeFileSync(path.join(tmp, `${name}.js`), out);
}
const resolver = await import(path.join(tmp, "review-target.server.js"));
const { ObjectId } = await import(path.join(tmp, "node_modules", "mongodb", "index.js"));
const id = (n) => String(n).padStart(24, "0");
const userId = new ObjectId(id(999));

function makeDb(seed) {
  const calls = new Map();
  const inc = (name, op) => calls.set(`${name}.${op}`, (calls.get(`${name}.${op}`) ?? 0) + 1);
  const match = (doc, q = {}) => {
    if (q.userId && String(doc.userId) !== String(q.userId)) return false;
    if (q._id?.$in && !q._id.$in.map(String).includes(String(doc._id))) return false;
    if (q._id && !q._id.$in && String(doc._id) !== String(q._id)) return false;
    if (q.status?.$ne && doc.status === q.status.$ne) return false;
    if (q.$or) return q.$or.some((x) => match(doc, x));
    for (const [k, v] of Object.entries(q)) {
      if (["userId", "_id", "status", "$or", "isDeleted"].includes(k)) continue;
      const dv = doc[k];
      if (v && typeof v === "object" && "$in" in v) { if (!v.$in.map(String).includes(String(dv))) return false; }
      else if (v && typeof v === "object" && "$ne" in v) { if (dv === v.$ne) return false; }
      else if (v && typeof v === "object" && "$exists" in v) { if ((dv !== undefined) !== v.$exists) return false; }
      else if (String(dv) !== String(v)) return false;
    }
    return true;
  };
  return { calls, collection(name) { return { find(q){ inc(name, "find"); let rows = (seed[name] ?? []).filter((d) => match(d, q)); return { sort(){ return this }, project(){ return this }, toArray: async () => rows }; }, findOne: async (q) => { inc(name, "findOne"); return (seed[name] ?? []).find((d) => match(d, q)) ?? null; } }; } };
}
const prod = (n, extra={}) => ({ _id: new ObjectId(id(n)), name: `상품${n}`, imageUrl: `/p${n}.jpg`, ...extra });
const order = (n, items, extra={}) => ({ _id: new ObjectId(id(n)), userId, items, createdAt: new Date(n), ...extra });
const app = (n, extra={}) => ({ _id: new ObjectId(id(n)), userId, status: "완료", userConfirmedAt: new Date(), createdAt: new Date(n), stringDetails: { racketLines: [{ stringProductId: new ObjectId(id(10+n)), racketId: new ObjectId(id(200+n)) }] }, ...extra });

test("A/B 일반 상품 target과 주문 item 순서를 유지한다", async () => {
  const db = makeDb({ orders: [], stringing_applications: [], reviews: [], products: [prod(1), prod(2)] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [order(1, [{ productId: new ObjectId(id(1)) }, { productId: new ObjectId(id(2)) }])])).get(id(1));
  assert.equal(b.targets.length, 2); assert.deepEqual(b.targets.map(t => t.primaryProductId), [id(1), id(2)]); assert.equal(b.counts.total, 2);
});

test("C/D/E 스트링 구매와 복수 신청서는 주문당 통합 target 1개이며 createdAt 순서를 유지한다", async () => {
  const o = order(3, [{ productId: new ObjectId(id(30)), kind: "racket" }, { productId: new ObjectId(id(31)), kind: "string" }], { stringingApplicationId: new ObjectId(id(40)) });
  const a1 = app(40, { orderId: o._id, createdAt: new Date("2024-01-01"), stringDetails: { racketLines: [{ stringProductId: new ObjectId(id(31)), racketId: new ObjectId(id(30)) }] } });
  const a2 = app(41, { orderId: String(o._id), createdAt: new Date("2024-01-02"), stringDetails: { racketLines: [{ stringProductId: new ObjectId(id(32)), racketId: new ObjectId(id(30)) }] } });
  const db = makeDb({ stringing_applications: [a2, a1], reviews: [], products: [prod(30), prod(31), prod(32)], used_rackets: [prod(30, { name: "라켓" })] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [o])).get(id(3));
  assert.equal(b.targets.length, 1); assert.equal(b.targets[0].reviewContext, "product_stringing"); assert.deepEqual(b.targets[0].applicationIds, [id(40), id(41)]); assert.equal(b.targets[0].primaryProductId, id(31)); assert.ok(b.targets[0].relatedProductIds.includes(id(32))); assert.ok(b.targets[0].relatedItems.length >= 3);
});

test("F 차단 신청서만 있으면 신규 통합 target으로 오판하지 않는다", async () => {
  const o = order(5, [{ productId: new ObjectId(id(50)) }]);
  const db = makeDb({ stringing_applications: [app(51, { orderId: o._id, status: "환불완료" })], reviews: [], products: [prod(50)] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [o])).get(id(5));
  assert.equal(b.targets[0].reviewContext, "product");
});

test("G/H 단독 신청서와 연결 신청서 parent 정보를 구분한다", async () => {
  const linkedOrder = order(7, [{ productId: new ObjectId(id(70)) }]);
  const standalone = app(60); const linked = app(61, { orderId: linkedOrder._id });
  const db = makeDb({ orders: [linkedOrder], stringing_applications: [standalone, linked], reviews: [], products: [prod(70), prod(70+61), prod(70+60)] });
  const bundles = await resolver.resolveApplicationReviewTargetBundlesBatch(db, userId, [standalone, linked]);
  assert.equal(bundles.get(id(60)).targets[0].reviewContext, "standalone_stringing");
  assert.equal(bundles.get(id(61)).targets[0].ineligibleReason, "coveredByIntegratedReview");
  assert.equal(bundles.get(id(61)).targets[0].coveredBySubjectType, "order");
});

test("I/J 대여 및 대여+교체서비스 target과 relatedItems를 구성한다", async () => {
  const rental = { _id: new ObjectId(id(80)), userId, racketId: new ObjectId(id(81)), stringing: { requested: true } };
  const a = app(82, { rentalId: rental._id });
  const db = makeDb({ stringing_applications: [a], reviews: [], products: [prod(92)], used_rackets: [prod(81)] });
  const b = (await resolver.resolveRentalReviewTargetBundlesBatch(db, userId, [rental])).get(id(80));
  assert.equal(b.targets.length, 1); assert.equal(b.targets[0].reviewContext, "rental_stringing"); assert.ok(b.targets[0].relatedRacketIds.includes(id(81))); assert.ok(b.targets[0].relatedItems.some(i => i.type === "rental"));
});

test("K/L loaded reviews 기반으로 reviewed와 remaining을 계산한다", async () => {
  const o = order(90, [{ productId: new ObjectId(id(91)) }, { productId: new ObjectId(id(92)) }]);
  const db = makeDb({ stringing_applications: [], reviews: [{ _id: new ObjectId(id(93)), userId, orderId: o._id, productId: new ObjectId(id(91)) }], products: [prod(91), prod(92)] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [o])).get(id(90));
  assert.equal(b.counts.reviewed, 1); assert.equal(b.counts.remaining, 1); assert.equal(b.nextTarget.primaryProductId, id(92));
});

test("M batch는 주문 수만큼 orders/applications/reviews 조회를 반복하지 않는다", async () => {
  const orders = [order(101, [{ productId: new ObjectId(id(1)) }]), order(102, [{ productId: new ObjectId(id(2)) }])];
  const db = makeDb({ stringing_applications: [], reviews: [], products: [prod(1), prod(2)] });
  await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, orders);
  assert.equal(db.calls.get("orders.findOne") ?? 0, 0); assert.equal(db.calls.get("stringing_applications.find") ?? 0, 1); assert.equal(db.calls.get("reviews.find") ?? 0, 1);
});
