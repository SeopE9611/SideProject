import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Live prepare/execute 이중 gate와 sandbox mapping을 유지한다", async () => {
  const config = await read("lib/apps-in-toss/server/config.ts");
  const prepare = await read("lib/apps-in-toss/server/payment-prepare.ts");
  assert.match(config, /isAppsInTossTossPayLivePrepareEnabled/);
  assert.match(config, /mode === "sandbox"\) return \{ mode, isTestPayment: true \}/);
  assert.match(config, /mode === "live"\) return \{ mode, isTestPayment: false \}/);
  assert.match(prepare, /mode\.mode === "live" && \(!isAppsInTossTossPayLivePrepareEnabled\(\) \|\| !isAppsInTossTossPayLiveExecuteEnabled\(\)\)/);
});

test("immutable summary와 MiniApp 중복 결제 방지 계약을 유지한다", async () => {
  const contract = await read("lib/apps-in-toss/server/payment-prepare-contract.ts");
  const step = await read("../TossMiniApp/src/components/StringingApplicationStepFive.tsx");
  const recovery = await read("../TossMiniApp/src/components/StringingPendingPaymentRecovery.tsx");
  const marker = await read("../TossMiniApp/src/lib/pending-payment.ts");
  assert.match(contract, /itemSnapshot/); assert.match(contract, /pricingSnapshot/); assert.match(contract, /packageSnapshot/);
  assert.match(contract, /Math\.max\(0, serviceFeeBeforePackage - intent\.pricingSnapshot\.serviceFee\)/);
  assert.match(step, /savePendingAppsPayment\(attemptId\);[\s\S]*await complete\(attemptId\)/);
  assert.match(step, /checkoutPayment\(\{ params: \{ payToken \} \}\)/);
  assert.doesNotMatch(recovery, /prepareAppsPayment|checkoutPayment/); assert.match(recovery, /completeAppsPayment/);
  assert.match(marker, /dokkaebitennis:apps-payment-pending:v1/);
});

test("핵심 route duration과 정책 문구를 명시한다", async () => {
  for (const path of ["app/api/apps-in-toss/payments/[attemptId]/complete/route.ts", "app/api/admin/apps-in-toss/reconciliation/[attemptId]/recover/route.ts"]) {
    const route = await read(path); assert.match(route, /export const runtime = "nodejs"/); assert.match(route, /export const maxDuration = 60/);
  }
  const stepFour = await read("../TossMiniApp/src/components/StringingApplicationStepFour.tsx");
  assert.match(stepFour, /신청 접수 후 작업 시작 전에는 취소 요청이 가능합니다/);
  assert.match(stepFour, /스트링 장착 작업이 시작된 이후에는 취소\/환불이 제한될 수 있습니다/);
  assert.match(stepFour, /작업 완료 후 단순 변심 환불은 제한될 수 있습니다/);
});
