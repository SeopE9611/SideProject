import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { importFileModule } from "./helpers/import-file-module.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "review-target-"));
fs.mkdirSync(path.join(tmp, "node_modules", "mongodb"), { recursive: true });
fs.mkdirSync(path.join(tmp, "node_modules", "@", "lib", "status"), { recursive: true });
fs.writeFileSync(path.join(tmp, "node_modules", "@", "lib", "status", "flow-status.js"), `const norm=(v)=>String(v??"").trim().toLowerCase(); exports.isOrderConfirmedStatus=(s)=>["구매확정","confirmed","purchase_confirmed"].includes(norm(s)); exports.isRentalReturnedStatus=(s)=>["returned","반납완료"].includes(norm(s)); exports.isStringingCompletedStatus=(s)=>["교체완료","completed","done","work_done"].includes(norm(s));`);
fs.writeFileSync(path.join(tmp, "node_modules", "mongodb", "index.js"), `class ObjectId { constructor(v){ this.v=String(v) } toString(){ return this.v } static isValid(v){ return /^[0-9a-fA-F]{24}$/.test(String(v)) } } module.exports={ObjectId};`);
for (const name of ["review-target", "review-policy", "review-target.server"]) {
  const src = fs.readFileSync(new URL(`../lib/reviews/${name}.ts`, import.meta.url), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  fs.writeFileSync(path.join(tmp, `${name}.js`), out);
}
const resolver = await importFileModule(path.join(tmp, "review-target.server.js"));
const policy = await importFileModule(path.join(tmp, "review-policy.js"));
const { ObjectId } = await importFileModule(path.join(tmp, "node_modules", "mongodb", "index.js"));
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
const order = (n, items, extra={}) => ({ _id: new ObjectId(id(n)), userId, items, status: "구매확정", userConfirmedAt: new Date(), createdAt: new Date(n), ...extra });
const app = (n, extra={}) => ({ _id: new ObjectId(id(n)), userId, status: "교체완료", userConfirmedAt: new Date(), createdAt: new Date(n), stringDetails: { racketLines: [{ stringProductId: new ObjectId(id(10+n)), racketId: new ObjectId(id(200+n)) }] }, ...extra });

test("A/B 일반 상품 target과 주문 item 순서를 유지한다", async () => {
  const db = makeDb({ orders: [], stringing_applications: [], reviews: [], products: [prod(1), prod(2)] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [order(1, [{ productId: new ObjectId(id(1)) }, { productId: new ObjectId(id(2)) }])])).get(id(1));
  assert.equal(b.targets.length, 2); assert.deepEqual(b.targets.map(t => t.primaryProductId), [id(1), id(2)]); assert.equal(b.counts.total, 2);
});

test("명시 itemId target 선택은 primary exact match만 허용하고 nextTarget fallback하지 않는다", () => {
  const bundle = resolver.makeBundle("order", id(10), [
    { targetKey: "a", subjectType: "order", subjectId: id(10), reviewContext: "product", contextLabel: "상품 후기", eligible: true, reviewed: false, applicationIds: [], primaryProductId: id(11), relatedProductIds: [id(11), id(13)], relatedRacketIds: [] },
    { targetKey: "b", subjectType: "order", subjectId: id(10), reviewContext: "product", contextLabel: "상품 후기", eligible: true, reviewed: false, applicationIds: [], primaryProductId: id(12), relatedProductIds: [id(12)], relatedRacketIds: [] },
  ]);
  assert.equal(policy.findRequestedCanonicalTarget(bundle, id(11)).primaryProductId, id(11));
  assert.equal(policy.findRequestedCanonicalTarget(bundle, id(12)).primaryProductId, id(12));
  assert.equal(policy.findRequestedCanonicalTarget(bundle, id(13)), null);
});

test("일반 라켓 구매 item은 product context 안에 라켓 canonical metadata를 포함한다", async () => {
  const racketId = id(21);
  const db = makeDb({ orders: [], stringing_applications: [], reviews: [], products: [], used_rackets: [prod(21, { brand: "head", model: "Speed" })] });
  const b = (await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [order(20, [{ kind: "racket", productId: new ObjectId(racketId) }])])).get(id(20));
  assert.equal(b.targets.length, 1);
  assert.equal(b.targets[0].reviewContext, "product");
  assert.equal(b.targets[0].primaryProductId, racketId);
  assert.equal(b.targets[0].primaryRacketId, racketId);
  assert.deepEqual(b.targets[0].relatedProductIds, []);
  assert.deepEqual(b.targets[0].relatedRacketIds, [racketId]);
  assert.equal(b.targets[0].relatedItems[0].type, "racket");
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
  const rental = { _id: new ObjectId(id(80)), userId, status: "반납완료", userConfirmedAt: new Date(), racketId: new ObjectId(id(81)), stringing: { requested: true } };
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


test("N eligible=false target은 counts에서 제외된다", () => {
  const b = resolver.makeBundle("application", id(300), [{ targetKey: "n", subjectType: "application", subjectId: id(300), reviewContext: "standalone_stringing", contextLabel: "교체서비스 후기", eligible: false, reviewed: false, applicationIds: [id(300)], relatedProductIds: [], relatedRacketIds: [] }]);
  assert.deepEqual(b.counts, { total: 0, reviewed: 0, remaining: 0 });
  assert.equal(b.allReviewed, true); assert.equal(b.nextTarget, null);
});

test("O/P 고객 확정 여부로 단독 교체서비스 eligibility를 계산한다", async () => {
  const notConfirmed = app(301, { userConfirmedAt: null });
  const confirmed = app(302);
  const db = makeDb({ stringing_applications: [notConfirmed, confirmed], reviews: [], products: [prod(311), prod(312)] });
  const bundles = await resolver.resolveApplicationReviewTargetBundlesBatch(db, userId, [notConfirmed, confirmed]);
  const o = bundles.get(id(301)); const p = bundles.get(id(302));
  assert.equal(o.targets[0].reviewContext, "standalone_stringing"); assert.equal(o.targets[0].eligible, false); assert.equal(o.targets[0].ineligibleReason, "notConfirmed"); assert.equal(o.counts.remaining, 0); assert.equal(o.nextTarget, null);
  assert.equal(p.targets[0].eligible, true); assert.equal(p.counts.total, 1); assert.equal(p.counts.remaining, 1); assert.ok(p.nextTarget);
});

test("Q 연결 application bundle은 parent counts/nextTarget을 재사용하지 않는다", async () => {
  const o = order(303, [{ productId: new ObjectId(id(304)) }]);
  const linked = app(305, { orderId: o._id });
  const db = makeDb({ orders: [o], stringing_applications: [linked], reviews: [], products: [prod(304), prod(315)] });
  const b = (await resolver.resolveApplicationReviewTargetBundlesBatch(db, userId, [linked])).get(id(305));
  assert.equal(b.subjectType, "application"); assert.equal(b.targets[0].eligible, false); assert.equal(b.targets[0].ineligibleReason, "coveredByIntegratedReview"); assert.equal(b.targets[0].coveredBySubjectType, "order"); assert.ok(b.targets[0].coveredBySubjectId); assert.ok(b.targets[0].redirectTarget);
  assert.equal(b.counts.total, 0); assert.equal(b.counts.remaining, 0); assert.equal(b.allReviewed, true); assert.equal(b.nextTarget, null);
});

test("R/S/T rental_stringing은 유효 연결 신청서 기준으로만 판정한다", async () => {
  const r1 = { _id: new ObjectId(id(320)), userId, status: "반납완료", userConfirmedAt: new Date(), stringing: { requested: true } };
  const r2 = { _id: new ObjectId(id(321)), userId, status: "반납완료", userConfirmedAt: new Date(), stringing: { requested: true } };
  const r3 = { _id: new ObjectId(id(322)), userId, status: "반납완료", userConfirmedAt: new Date(), stringing: { requested: true } };
  const canceled = app(323, { rentalId: r2._id, status: "환불완료" });
  const valid = app(324, { rentalId: r3._id });
  const db = makeDb({ stringing_applications: [canceled, valid], reviews: [], products: [prod(334)] });
  const bundles = await resolver.resolveRentalReviewTargetBundlesBatch(db, userId, [r1, r2, r3]);
  assert.equal(bundles.get(id(320)).targets[0].reviewContext, "rental");
  assert.equal(bundles.get(id(321)).targets[0].reviewContext, "rental"); assert.deepEqual(bundles.get(id(321)).targets[0].applicationIds, []); assert.ok(!bundles.get(id(321)).targets[0].relatedItems.some(i => i.type === "string" || i.type === "service"));
  assert.equal(bundles.get(id(322)).targets[0].reviewContext, "rental_stringing"); assert.deepEqual(bundles.get(id(322)).targets[0].applicationIds, [id(324)]); assert.ok(bundles.get(id(322)).targets[0].relatedItems.some(i => i.type === "string")); assert.ok(bundles.get(id(322)).targets[0].relatedItems.some(i => i.type === "service"));
});

test("U 신청서 기반 스트링 relatedItems는 string 타입이다", async () => {
  const a = app(330);
  const db = makeDb({ stringing_applications: [a], reviews: [], products: [prod(340)] });
  const b = (await resolver.resolveApplicationReviewTargetBundlesBatch(db, userId, [a])).get(id(330));
  assert.ok(b.targets[0].relatedItems.some(i => i.id === id(340) && i.type === "string"));
});

test("V/W 주문 구매확정 전후 eligibility와 remaining을 계산한다", async () => {
  const before = order(350, [{ productId: new ObjectId(id(351)) }], { status: "배송완료", userConfirmedAt: null });
  const after = order(352, [{ productId: new ObjectId(id(353)) }, { productId: new ObjectId(id(354)) }]);
  const db = makeDb({ stringing_applications: [], reviews: [{ _id: new ObjectId(id(355)), userId, orderId: after._id, productId: new ObjectId(id(353)) }], products: [prod(351), prod(353), prod(354)] });
  const bundles = await resolver.resolveOrderReviewTargetBundlesBatch(db, userId, [before, after]);
  assert.equal(bundles.get(id(350)).targets[0].eligible, false); assert.equal(bundles.get(id(350)).counts.remaining, 0); assert.equal(bundles.get(id(350)).nextTarget, null);
  assert.equal(bundles.get(id(352)).counts.total, 2); assert.equal(bundles.get(id(352)).counts.remaining, 1);
});

test("X 차단 application은 후기 target으로 집계하지 않는다", async () => {
  for (const status of ["취소", "환불완료"]) {
    const a = app(status === "취소" ? 360 : 361, { status });
    const db = makeDb({ stringing_applications: [a], reviews: [] });
    const b = (await resolver.resolveApplicationReviewTargetBundlesBatch(db, userId, [a])).get(String(a._id));
    assert.equal(b.targets[0].eligible, false); assert.equal(b.counts.remaining, 0); assert.equal(b.nextTarget, null);
  }
});
