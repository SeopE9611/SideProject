import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { AppsPaymentPrepareRequestSchema, isSameAppsPaymentPayload } = require("../lib/apps-in-toss/server/payment-prepare-contract.ts");
const { findFullyBookedTimesWithSpan } = require("../app/features/stringing-applications/lib/slotEngine.ts");

const request = AppsPaymentPrepareRequestSchema.parse({
  attemptId: "b57afdaf-73e6-4f79-b4e3-67f2563b2f50", purpose: "racket_purchase",
  racketId: "507f1f77bcf86cd799439012", stringProductId: "507f1f77bcf86cd799439013", quantity: 2,
  selectedColor: "black", selectedGauge: "1.25",
  applicant: { name: "홍길동", email: "retry@example.com", phone: "01012345678" },
  collectionMethod: "visit", shipping: { postalCode: "", address: "", addressDetail: "" },
  work: { tensionMain: "48", tensionCross: "46", note: "요청", preferredDate: "2026-08-10", preferredTime: "10:00" },
});
const checkout = {
  items: [
    { productId: request.racketId, kind: "racket", quantity: 2 },
    { productId: request.stringProductId, kind: "product", quantity: 2, selectedColor: "black", selectedGauge: "1.25" },
  ],
  applicant: request.applicant, collectionMethod: "visit",
  shipping: { postalCode: "12345", address: "저장 주소", addressDetail: "101호" },
  work: { ...request.work, racketType: "서버 파생 라켓명" },
};

test("라켓 구매 same-attempt 비교는 서버 파생 racketType과 visit 주소를 제외한다", () => {
  assert.equal("racketType" in request.work, false);
  assert.equal(checkout.work.racketType, "서버 파생 라켓명");
  assert.equal(isSameAppsPaymentPayload(checkout, request), true);
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, shipping: { postalCode: "54321", address: "다른 주소", addressDetail: "202호" } }), true);
});

test("라켓 구매 same-attempt에서 사용자 결제 의미가 바뀌면 mismatch이다", () => {
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, work: { ...request.work, tensionMain: "49" } }), false);
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, quantity: 1 }), false);
  assert.equal(isSameAppsPaymentPayload(checkout, { ...request, stringProductId: "507f1f77bcf86cd799439014" }), false);
});

test("quantity 2 방문 신청 metadata는 예약 엔진에서 연속 2슬롯을 점유한다", async () => {
  const application = { stringDetails: { preferredTime: "10:00" }, visitSlotCount: 2, visitDurationMinutes: 60, status: "검토 중" };
  const db = { collection: () => ({ find: () => ({ toArray: async () => [application] }) }) };
  const full = await findFullyBookedTimesWithSpan(db, "2026-08-10", 1, ["10:00", "10:30", "11:00"]);
  assert.equal(application.visitDurationMinutes, 60);
  assert.deepEqual(full, ["10:00", "10:30"]);
});
