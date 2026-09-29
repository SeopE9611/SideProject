import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { importFileModule } from "./helpers/import-file-module.mjs";

const root = new URL("..", import.meta.url);
const quoteSource = fs.readFileSync(new URL("lib/payments/toss/checkout-quote.ts", root), "utf8");
const prepareSource = fs.readFileSync(new URL("lib/apps-in-toss/server/payment-prepare.ts", root), "utf8");
const intentSource = fs.readFileSync(new URL("lib/apps-in-toss/server/payment-intents.ts", root), "utf8");
const prepareContractSource = fs.readFileSync(new URL("lib/apps-in-toss/server/payment-prepare-contract.ts", root), "utf8");
const policySource = fs.readFileSync(new URL("lib/apps-in-toss/server/toss-pay-policy-contract.ts", root), "utf8");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-payment-snapshot-"));
const slotSource = fs.readFileSync(new URL("app/features/stringing-applications/lib/slotEngine.ts", root), "utf8");
fs.writeFileSync(path.join(tmp, "slot-engine.cjs"), ts.transpileModule(slotSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText);
const slotEngine = await importFileModule(path.join(tmp, "slot-engine.cjs"));

test("quote가 패키지 적용 전 요금과 실제 적용 패스 결정을 함께 반환한다", () => {
  assert.match(quoteSource, /serviceFeeBeforePackage: baseServiceFee/);
  assert.match(quoteSource, /packageApplied: packageUsage\.usingPackage/);
  assert.match(quoteSource, /requiredPassCount,/);
  assert.match(quoteSource, /packagePassId: packageUsage\.usingPackage \? pass\?\._id : undefined/);
});

test("prepare는 quote의 가격·상품·패키지 snapshot을 그대로 저장하고 패스를 재조회하지 않는다", () => {
  assert.match(prepareSource, /serviceFeeBeforePackage: quote\.serviceFeeBeforePackage/);
  assert.match(prepareSource, /serviceFee: quote\.serviceFee/);
  assert.match(prepareSource, /payableAmount: quote\.payableTotalPrice/);
  assert.match(prepareSource, /price: quotedItem\.price, mountingFee: quotedItem\.mountingFee/);
  assert.match(prepareSource, /applied: quote\.packageApplied, requiredPassCount: quote\.requiredPassCount/);
  assert.match(prepareSource, /quote\.packagePassId \? \{ passId: quote\.packagePassId \} : \{\}/);
  assert.doesNotMatch(prepareSource, /findOneActivePassForUser/);
});

test("방문 snapshot은 quote 작업 수와 날짜별 schedule interval을 사용한다", () => {
  const schedule = slotEngine.resolveDaySchedule({
    _id: "stringingSlots", interval: 45, businessDays: [1],
    exceptions: [{ date: "2026-08-11", interval: 75, capacity: 3 }],
  }, "2026-08-11");
  assert.equal(schedule.interval, 75);
  assert.equal(schedule.capacity, 3);
  assert.match(prepareSource, /slotCount: quote\.requiredPassCount/);
  assert.match(prepareSource, /durationMinutes: schedule\.interval \* quote\.requiredPassCount/);
  assert.match(prepareSource, /capacityAtPrepare: slots\.capacity/);
  assert.match(prepareSource, /visitSnapshot \? \{ reservationSnapshot: visitSnapshot \} : \{\}/);
});

test("신규 snapshot은 서버 소유이며 기존 intent와 안전하게 호환된다", () => {
  assert.match(intentSource, /serviceFeeBeforePackage\?: number/);
  assert.match(intentSource, /mountingFee\?: number/);
  assert.match(intentSource, /packageSnapshot\?: \{ applied: boolean; requiredPassCount: number; passId\?: ObjectId \}/);
  assert.doesNotMatch(prepareSource, /checkoutPayload[\s\S]{0,300}packagePassId/);
  assert.doesNotMatch(prepareSource, /recoverExisting[\s\S]{0,900}(updateOne|findOneActivePassForUser)/);
});

test("공개 응답은 안전한 snapshot summary를 포함하고 Toss make-payment 금액 계약은 유지한다", () => {
  assert.match(prepareContractSource, /paymentSummary:/);
  assert.match(prepareSource, /return \{ \.\.\.createSafePaymentIntentResponse\(intent\), payToken \}/);
  assert.doesNotMatch(prepareContractSource.slice(prepareContractSource.indexOf("createSafePaymentIntentResponse")), /packagePassId|mountingFee|capacityAtPrepare/);
  assert.match(policySource, /amount: intent\.pricingSnapshot\.payableAmount/);
});
