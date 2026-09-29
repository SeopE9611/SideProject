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
  const panel = await read("../TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
  const payment = `${step}\n${panel}`;
  const recovery = await read("../TossMiniApp/src/components/StringingPendingPaymentRecovery.tsx");
  const marker = await read("../TossMiniApp/src/lib/pending-payment.ts");
  assert.match(contract, /itemSnapshot/); assert.match(contract, /pricingSnapshot/); assert.match(contract, /packageSnapshot/);
  assert.match(contract, /Math\.max\(0, serviceFeeBeforePackage - intent\.pricingSnapshot\.serviceFee\)/);
  assert.match(marker, /PENDING_PAYMENT_STORAGE_PROBE_KEY/);
  assert.match(marker, /localStorage\.setItem\(PENDING_PAYMENT_STORAGE_PROBE_KEY[\s\S]*localStorage\.removeItem\(PENDING_PAYMENT_STORAGE_PROBE_KEY[\s\S]*return true[\s\S]*catch[\s\S]*return false/);
  assert.match(step, /AppsPaymentCheckoutPanel/);
  assert.match(payment, /if \(!canStorePendingAppsPayment\(\)\)[\s\S]*return;[\s\S]*getAppsPaymentIntent\(auth\.sessionToken, attemptId\)[\s\S]*checkoutPayment\(\{ params: \{ payToken \} \}\)/);
  assert.match(payment, /setAuthorized\(true\);[\s\S]*setPayToken\(null\);[\s\S]*try \{[\s\S]*savePendingAppsPayment\(attemptId\)[\s\S]*catch[\s\S]*결제 인증은 완료됐습니다\. 중복 결제를 시도하지 마세요\.[\s\S]*await complete\(attemptId, markerSaveFailed\)/);
  assert.match(payment, /checkoutPayment\(\{ params: \{ payToken \} \}\)/);
  assert.match(payment, /intent\.attemptId !== attemptId \|\| intent\.expired \|\| intent\.state !== "awaiting_authorization" \|\| !intent\.paymentReady/);
  assert.match(payment, /if \(intent\.expired\)[\s\S]*setPayToken\(null\);[\s\S]*setSummary\(null\);[\s\S]*onPaymentAttemptIdChange\(null\);[\s\S]*return;/);
  assert.doesNotMatch(recovery, /prepareAppsPayment|checkoutPayment/); assert.match(recovery, /completeAppsPayment/);
  assert.match(marker, /dokkaebitennis:apps-payment-pending:v1/);
  assert.doesNotMatch(marker, /payToken|sessionToken|applicant|shipping|work/);
  assert.match(recovery, /result === "finalized"[\s\S]*주문 화면으로 돌아가기/);
  assert.match(recovery, /result === "refunded"[\s\S]*주문 내용 다시 확인하기/);
  assert.match(recovery, /result === "retryable"[\s\S]*새 결제 다시 준비하기/);
  assert.match(recovery, /PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX[\s\S]*clearPendingAppsPayment\(\)[\s\S]*setResult\("sandbox"\)/);
  assert.match(recovery, /if \(loginBusy \|\| auth\.status === "authenticated"\) return;[\s\S]*try \{[\s\S]*await auth\.login\(\)[\s\S]*catch[\s\S]*finally/);
  assert.doesNotMatch(payment + recovery, /\/execute|\/finalize|\/refund/);
});

test("MiniApp pending marker가 탐색과 신청 변경보다 우선한다", async () => {
  const flow = await read("../TossMiniApp/src/components/StringingApplicationFlow.tsx");
  assert.match(flow, /const handlePopState = \(\) => \{\s*const pending = readPendingAppsPayment\(\);\s*if \(pending\) \{\s*setPendingPayment\(pending\);\s*return;/);
  for (const handler of ["handleApplicantChange", "handleCollectionMethodChange", "handleShippingChange", "handleWorkChange"]) {
    assert.match(flow, new RegExp(`const ${handler} =[\\s\\S]*?readPendingAppsPayment\\(\\);[\\s\\S]*?setPendingPayment\\(pending\\); return;[\\s\\S]*?setPaymentAttemptId\\(null\\);`));
  }
});

test("MiniApp pending recovery 종료 시 Step 1과 새 결제 상태로 초기화한다", async () => {
  const flow = await read("../TossMiniApp/src/components/StringingApplicationFlow.tsx");
  const resolvedHandler = flow.match(/const handlePendingPaymentResolved = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[productId\]\);/)?.[1] ?? "";
  assert.match(resolvedHandler, /normalizedUrl\.searchParams\.delete\("step"\)/);
  assert.match(resolvedHandler, /window\.history\.replaceState\(\s*\{\s*productId,\s*view: "stringing-checkout",\s*step: 1,/);
  assert.match(resolvedHandler, /setPendingPayment\(null\);/);
  assert.match(resolvedHandler, /setPaymentAttemptId\(null\);/);
  assert.match(resolvedHandler, /setCurrentStep\(1\);/);
  assert.doesNotMatch(resolvedHandler, /localStorage|sessionStorage/);
  assert.match(flow, /<StringingPendingPaymentRecovery pending=\{pendingPayment\} onResolved=\{handlePendingPaymentResolved\} \/>/);
  assert.doesNotMatch(flow, /onResolved=\{\(\) => setPendingPayment\(null\)\}/);
});

test("prepare 실패 시 기존 attempt 폐기 정책과 세부 안내를 유지한다", async () => {
  const step = await read("../TossMiniApp/src/components/StringingApplicationStepFive.tsx");
  const panel = await read("../TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
  assert.match(step, /AppsPaymentCheckoutPanel/);
  for (const code of ["PAYMENT_INTENT_EXPIRED", "ATTEMPT_PAYLOAD_MISMATCH", "ATTEMPT_CONFLICT", "PAYMENT_CREATION_FAILED", "TOSS_PAY_UNAVAILABLE", "TOSS_PAY_MAKE_FAILED"]) assert.match(panel, new RegExp(code));
  for (const code of ["PRODUCT_NOT_AVAILABLE", "VARIANT_NOT_FOUND", "VARIANT_INSUFFICIENT_STOCK", "VISIT_SLOT_UNAVAILABLE"]) assert.match(panel, new RegExp(code));
  assert.match(panel, /!readPendingAppsPayment\(\)[\s\S]*onPaymentAttemptIdChange\(null\)/);
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
