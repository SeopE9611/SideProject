import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};

const { AppsPaymentPrepareRequestSchema, calculateAppsRentalPaymentAmount, canonicalizeAppsPaymentPrepareRequest, isSameAppsPaymentPayload } = require("../lib/apps-in-toss/server/payment-prepare-contract.ts");
const { getAppsInTossPaymentPurpose } = require("../lib/apps-in-toss/server/payment-purpose-contract.ts");
const { createRentalOrderInTransaction } = require("../app/features/rentals/api/rental-order-transaction.ts");

const base = {
  purpose: "racket_rental",
  attemptId: "7ac8a4b0-ff9d-4bd4-a46e-585534abc101",
  racketId: "507f1f77bcf86cd799439011",
  days: 7,
  applicant: { name: "홍길동", email: "rental@example.com", phone: "01012345678" },
  collectionMethod: "self_ship",
  shipping: { postalCode: "12345", address: "서울시", addressDetail: "101호", deliveryRequest: "문 앞" },
  refundAccount: { bank: "kb", account: "123-456-789012", holder: "홍길동" },
  stringing: { requested: false },
};

test("payment purpose는 기존 두 목적과 racket_rental을 유지하고 discriminator 없는 intent는 stringing_service다", () => {
  assert.equal(getAppsInTossPaymentPurpose({}), "stringing_service");
  assert.equal(getAppsInTossPaymentPurpose({ paymentPurpose: "stringing_service" }), "stringing_service");
  assert.equal(getAppsInTossPaymentPurpose({ paymentPurpose: "racket_purchase" }), "racket_purchase");
  assert.equal(getAppsInTossPaymentPurpose({ paymentPurpose: "racket_rental" }), "racket_rental");
});

test("racket_rental은 7/15/30일, 유효 환불계좌와 strict 서버 가격 경계를 적용한다", () => {
  for (const days of [7, 15, 30]) assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, days }).success, true);
  for (const days of [0, 5, 8, 31]) assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, days }).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, refundAccount: undefined }).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, refundAccount: { bank: "unknown", account: "12", holder: "A" } }).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, total: 1, rentalFee: 1, deposit: 1 }).success, false);
});

test("스트링 미신청은 옵션과 작업정보를 요구하지 않고 단순 방문수령도 예약 일시를 요구하지 않는다", () => {
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse(base).success, true);
  const visit = { ...base, collectionMethod: "visit", shipping: { postalCode: "", address: "", addressDetail: "" } };
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse(visit).success, true);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, stringing: { requested: false, stringProductId: "507f1f77bcf86cd799439012" } }).success, false);
});

test("스트링 신청은 상품·옵션·장력을 요구하고 visit에서만 예약 일시를 요구한다", () => {
  const stringing = { requested: true, stringProductId: "507f1f77bcf86cd799439012", selectedColor: "black", selectedGauge: "1.25", work: { tensionMain: "48", tensionCross: "46", note: "", preferredDate: "", preferredTime: "" } };
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, stringing }).success, true);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...base, stringing: { ...stringing, selectedGauge: "" } }).success, false);
  const visit = { ...base, collectionMethod: "visit", shipping: { postalCode: "", address: "", addressDetail: "" }, stringing };
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse(visit).success, false);
  assert.equal(AppsPaymentPrepareRequestSchema.safeParse({ ...visit, stringing: { ...stringing, work: { ...stringing.work, preferredDate: "2026-08-10", preferredTime: "10:00" } } }).success, true);
});

test("서버 대여 금액은 fee+deposit과 선택적 string price+service fee만 합산한다", () => {
  assert.deepEqual(calculateAppsRentalPaymentAmount({ rentalFee: 0, deposit: 10_000 }), { rentalFee: 0, deposit: 10_000, stringPrice: 0, serviceFee: 0, payableAmount: 10_000 });
  assert.equal(calculateAppsRentalPaymentAmount({ rentalFee: 7_000, deposit: 20_000, stringPrice: 12_000, serviceFee: 5_000 }).payableAmount, 44_000);
  assert.throws(() => calculateAppsRentalPaymentAmount({ rentalFee: -1, deposit: 0 }), /INVALID_RENTAL_PRICE/);
  assert.throws(() => calculateAppsRentalPaymentAmount({ rentalFee: 0, deposit: 0 }), /INVALID_PAYMENT_AMOUNT/);
});

test("same attempt는 canonical 사용자 입력만 비교하고 visit 주소 잔존값은 제외한다", () => {
  const request = canonicalizeAppsPaymentPrepareRequest(AppsPaymentPrepareRequestSchema.parse(base));
  const checkout = { items: [{ productId: request.racketId, kind: "rental_racket", quantity: 1 }], applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: request.shipping, work: { tensionMain: "", tensionCross: "", note: "", preferredDate: "", preferredTime: "" }, rental: { days: request.days, refundAccount: request.refundAccount, stringing: { requested: false } } };
  assert.equal(isSameAppsPaymentPayload(checkout, request), true);
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, days: 15 }), false);
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, refundAccount: { ...request.refundAccount, account: "9999999999" } }), false);
  const visit = canonicalizeAppsPaymentPrepareRequest(AppsPaymentPrepareRequestSchema.parse({ ...base, collectionMethod: "visit", shipping: { postalCode: "99999", address: "잔존", addressDetail: "값" } }));
  const visitCheckout = { ...checkout, collectionMethod: "visit", shipping: { postalCode: "11111", address: "다른 값", addressDetail: "다른 값" } };
  assert.equal(isSameAppsPaymentPayload(visitCheckout, visit), true);
});

test("transaction-scoped helper는 session을 새로 만들지 않고 paid 예약·insert·선택적 확장을 정확히 한 번 수행한다", async () => {
  const session = { id: "open-session" };
  const calls = { reads: 0, reserveWrites: 0, inserts: 0, extensions: 0 };
  const db = { collection(name) {
    if (name === "used_rackets") return {
      findOne: async (_filter, options) => { assert.equal(options.session, session); calls.reads += 1; return { quantity: 1, status: "available" }; },
      updateOne: async (_filter, _update, options) => { assert.equal(options.session, session); calls.reserveWrites += 1; return { modifiedCount: 1 }; },
    };
    if (name === "rental_orders") return {
      countDocuments: async (_filter, options) => { assert.equal(options.session, session); return 0; },
      insertOne: async (doc, options) => { assert.equal(options.session, session); assert.equal(doc.idemKey, "apps-in-toss:rental:attempt"); calls.inserts += 1; return { insertedId: doc._id }; },
    };
    throw new Error(`unexpected collection ${name}`);
  } };
  const result = await createRentalOrderInTransaction({ db, session, rentalId: "rental-id", racketId: "racket-id", rentalDocument: { status: "paid" }, idemKey: "apps-in-toss:rental:attempt", reservePaidRental: true, afterInsert: async () => { calls.extensions += 1; return { stringingApplicationId: "application-id", stringingSubmitted: true }; } });
  assert.deepEqual(calls, { reads: 1, reserveWrites: 1, inserts: 1, extensions: 1 });
  assert.equal(result.stringingApplicationId, "application-id");
  assert.equal("startTransaction" in session, false);
});
