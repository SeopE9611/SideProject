import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/services/packages/success/page.tsx", import.meta.url),
  "utf8",
);
const flowDisplay = readFileSync(
  new URL("../app/mypage/_lib/flow-display.ts", import.meta.url),
  "utf8",
);

function required(fragment) {
  assert.ok(source.includes(fragment), `필수 코드가 없습니다: ${fragment}`);
}

function getFunctionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `함수를 찾을 수 없습니다: ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index + 1);
  }

  assert.fail(`함수 본문을 닫을 수 없습니다: ${name}`);
}

test("패키지 성공 페이지는 공용 고객 결제 상태 정책과 누락 안전 정규화를 사용한다", () => {
  required("getCustomerTransactionPaymentStatusLabel");
  required("isCustomerBankTransferPayment");
  required("nullableTrim(packageOrder.paymentStatus) ?? nullableTrim(paymentInfo?.status)");
  required("const paymentMethod = nullableTrim(paymentInfo?.method)");
  required("const paymentProvider = nullableTrim(paymentInfo?.provider)");
  assert.doesNotMatch(
    source,
    /provider:\s*paymentInfo\?\.provider\s*\?\?\s*"manual_bank_transfer"/,
  );
  assert.match(flowDisplay, /refund:\s*"환불 완료"/);
  assert.match(flowDisplay, /환불:\s*"환불 완료"/);
});

test("인가된 주문의 실제 패스만 최소 projection으로 조회한다", () => {
  assert.ok(
    source.indexOf("if (!packageOrder) return notFound()") <
      source.indexOf('collection("service_passes")'),
  );
  required('collection("service_passes")');
  required("{ orderId: packageOrderObjectId, userId: packageOrderUserId }");
  required("projection: { status: 1, remainingCount: 1, expiresAt: 1 }");
  assert.doesNotMatch(source, /projection:\s*\{[^}]*redemptions/);
});

test("결제, 이용, 활성화 및 표시 그룹 상태를 분리한다", () => {
  required("type PackagePaymentLifecycle");
  required("type PackageUsageStatus");
  required("type PackageActivationStatus");
  required("const paymentLifecycle");
  required("const usageStatus");
  required("const activationStatus");
  required("const activationStatusLabel");
  required("const displayGroup");
  required("const hasTerminalPaymentState");
  required('paymentLifecycle === "paid" && usageStatus === "not_issued"');
  required('pending_issue: "발급 처리 중"');
  required('paymentLifecycle === "failed"');
  required('paymentLifecycle === "cancelled"');
  required('paymentLifecycle === "refunded"');
  required("패키지 결제가 환불되었습니다");
  required('? "history"');
});

test("주문 terminal 상태는 stale 결제 완료 또는 대기 상태보다 우선한다", () => {
  const lifecycleBody = getFunctionBody("getPaymentLifecycle");
  const orderRefund = lifecycleBody.indexOf(".includes(orderToken)");
  const orderCancel = lifecycleBody.indexOf(".includes(orderToken)", orderRefund + 1);
  const paymentPaid = lifecycleBody.indexOf('return "paid"');
  const paymentPending = lifecycleBody.indexOf('return "pending"');

  assert.ok(orderRefund < paymentPaid, "주문 환불이 결제 완료보다 먼저 판정되어야 합니다");
  assert.ok(orderCancel < paymentPaid, "주문 취소가 결제 완료보다 먼저 판정되어야 합니다");
  assert.ok(orderRefund < paymentPending, "주문 환불이 결제 대기보다 먼저 판정되어야 합니다");
  assert.ok(orderCancel < paymentPending, "주문 취소가 결제 대기보다 먼저 판정되어야 합니다");
});

test("terminal lifecycle은 고객 결제 상태 라벨에도 반영한다", () => {
  required("const orderStatus = nullableTrim(packageOrder.status)");
  required("const paymentStatusForDisplay");
  required('paymentLifecycle === "refunded"');
  required('? "환불"');
  required('paymentLifecycle === "cancelled"');
  required('? "결제취소"');
  required('paymentLifecycle === "failed"');
  required('? "결제실패"');
  assert.match(
    source,
    /getCustomerTransactionPaymentStatusLabel\(\{\s*paymentStatus:\s*paymentStatusForDisplay,/,
  );
});

test("CTA, 계좌, 온라인 정보와 개발 결제 완료 버튼을 상태로 제한한다", () => {
  required(
    'paymentLifecycle === "paid" && usageStatus === "available" && displayGroup === "available"',
  );
  required('href="/services#service-start"');
  required('const lookupHref = "/mypage?tab=passes"');
  required("const shouldShowBankAccount");
  required('paymentStatusLabel === "입금 확인 대기"');
  required("paymentTotalAmount > 0");
  required("bankLabelMap[paymentInfo.bank]");
  required("!hasTerminalPaymentState");
  assert.doesNotMatch(source, /!isTossPayment\s*&&\s*!isNicePayment/);
  required("결제 상태: {paymentStatusLabel}");
  required("const approvedAt = toValidDateOrNull(paymentInfo?.approvedAt)");
  required('normalizedPaymentProvider === "nicepay"');
  required('["tosspayments", "toss"]');
  required("const canShowDevMarkPaidButton");
  required('isBankTransfer && paymentLifecycle === "pending"');
  required("<DevMarkPaidButton");
});

test("안내 제목은 실제 무통장입금 여부로만 입금 안내를 표시한다", () => {
  required('{isBankTransfer ? "입금 안내" : "결제 안내"}');
  assert.doesNotMatch(
    source,
    /isTossPayment\s*\|\|\s*isNicePayment\s*\?\s*"결제 안내"\s*:\s*"입금 안내"/,
  );
});

test("렌더링 중 현재 시각은 서버 시간 helper로 한 번만 조회한다", () => {
  required('import { getServerNowMs } from "@/lib/server-time"');
  required("const nowMs = getServerNowMs()");
  required("expiresAt.getTime() <= nowMs");
  assert.doesNotMatch(source, /Date\.now\(\)/);
  assert.doesNotMatch(source, /eslint-disable/);
});

test("기존 접근 제어와 화면 주요 요소를 유지한다", () => {
  required("resolvePackageSuccessViewer");
  required("LoginGate");
  required("packageOrderFilter");
  required("userId: viewerObjectId");
  assert.match(source, /packageOrderFilter[\s\S]*= isAdmin\s*\?/);
  required("notFound()");
  required('qs.set("packageOrderId", packageOrderId)');
  required("UnifiedPackageCard");
  required("SummaryCard");
  required("신청자 정보");
  required("패키지권 확인");
  required("다른 패키지 보기");
  required("총 결제 금액");
  required("BackButtonGuard");
});
