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

test("CTA, 계좌, 온라인 정보와 개발 결제 완료 버튼을 상태로 제한한다", () => {
  required('usageStatus === "available" && displayGroup === "available"');
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

test("기존 접근 제어와 화면 주요 요소를 유지한다", () => {
  required("resolvePackageSuccessViewer");
  required("LoginGate");
  required("packageOrderFilter");
  required("userId: viewerObjectId");
  required("isAdmin ?");
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
