import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function normalizeSource(source) {
  return source.replace(/\s+/g, " ").trim();
}

function assertSourceIncludes(source, expected, message) {
  assert.ok(normalizeSource(source).includes(normalizeSource(expected)), message);
}

test("상태 라벨 계약: 주요 raw status는 고객/관리자 표시용 한글 라벨로 매핑한다", () => {
  const baseLabels = read("lib/status-labels/base.ts");
  const mypageLabels = read("app/mypage/_lib/status-label.ts");
  const flowDisplay = read("app/mypage/_lib/flow-display.ts");
  const adminLabels = read("lib/admin/status-labels.ts");
  const badgeStyle = read("lib/badge-style.ts");
  const operationsClient = read("app/admin/operations/_components/OperationsClient.tsx");
  const activityFeed = read("app/mypage/tabs/ActivityFeed.tsx");
  const transactionFlowList = read("app/mypage/tabs/TransactionFlowList.tsx");

  for (const [raw, label] of [
    ["purchase_confirmed", "구매확정"],
    ["confirmed", "구매확정"],
    ["delivered", "배송완료"],
    ["refund_completed", "환불완료"],
    ["refunded", "환불완료"],
    ["partial_canceled", "부분취소"],
    ["partialcanceled", "부분취소"],
    ["partial_cancelled", "부분취소"],
  ]) {
    assert.ok(
      baseLabels.includes(`${raw}: "${label}"`),
      `base order/payment label: ${raw} -> ${label}`,
    );
  }

  for (const raw of ["completed", "done", "work_done"]) {
    assert.ok(
      baseLabels.includes(`${raw}: "교체완료"`),
      `base stringing label: ${raw} -> 교체완료`,
    );
    assert.ok(
      mypageLabels.includes(`${raw}: "교체완료"`),
      `mypage stringing label: ${raw} -> 교체완료`,
    );
  }

  assert.ok(baseLabels.includes('returned: "반납완료"'), "base rental label: returned -> 반납완료");
  assert.ok(
    mypageLabels.includes('returned: "반납완료"'),
    "mypage rental label: returned -> 반납완료",
  );
  assert.ok(flowDisplay.includes('purchase_confirmed: "이용 완료"'));
  assert.ok(flowDisplay.includes('refund_completed: "환불 완료"'));
  assert.ok(flowDisplay.includes('work_done: "작업 완료"'));
  assert.ok(flowDisplay.includes('returned: "이용 완료"'));
  assert.ok(adminLabels.includes('["completed", "done", "work_done"].includes(lower)'));
  assert.ok(badgeStyle.includes('["completed", "done", "work_done"].includes(lower)'));

  for (const [label, src] of [
    ["operations client", operationsClient],
    ["mypage activity feed", activityFeed],
    ["mypage transaction flow list", transactionFlowList],
  ]) {
    assert.ok(
      src.includes("statusLabel") || src.includes("getMypageUserStatusLabel"),
      `${label}: 라벨 또는 배지 helper를 통해 상태를 표시해야 합니다.`,
    );
  }
});

test("표시 계약: 후기/교체서비스/관리자 대여 화면은 raw 상태와 결제수단을 직접 렌더링하지 않는다", () => {
  const reviewWrite = read("app/reviews/write/page.tsx");
  const reviewCard = read("app/reviews/_components/ReviewCard.tsx");
  const applicationBadge = read(
    "app/features/stringing-applications/components/ApplicationStatusBadge.tsx",
  );
  const stringingDetail = read(
    "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
  );
  const paymentDetail = read(
    "app/features/stringing-applications/components/PaymentMethodDetail.tsx",
  );
  const adminRentalDetail = read("app/admin/rentals/[id]/_components/AdminRentalDetailClient.tsx");
  const adminRentalsClient = read("app/admin/rentals/_components/AdminRentalsClient.tsx");
  const paymentDisplay = read("lib/payments/payment-display.ts");

  assert.ok(applicationBadge.includes("getCommonApplicationStatusLabel(status)"));
  assert.ok(!applicationBadge.includes("{status}\n"));
  assert.ok(reviewWrite.includes("ReviewTargetSummary"));
  assert.ok(!reviewWrite.includes('`상태: ${a.status ?? "미정"}`'));
  assert.ok(!reviewWrite.includes("`상태 ${rentalMeta.status}`"));
  assert.ok(reviewCard.includes("getCustomerRentalStatusLabel(item.rentalStatus)"));
  assert.ok(!reviewCard.includes("`상태 ${item.rentalStatus}`"));
  assert.ok(
    stringingDetail.includes(
      'label="결제 방식" value={getCustomerPaymentMethodLabel(paymentMethodForDisplay, packageApplied)}',
    ),
  );
  assert.ok(paymentDetail.includes("getMypagePaymentStatusLabel(paymentStatus)"));
  assert.ok(
    paymentDisplay.includes(
      '["bank_transfer", "manual_bank_transfer", "bank", "virtual_account"].includes(lowered)',
    ),
  );
  assert.ok(adminRentalDetail.includes("formatRentalHistoryStatus(latestProcessingHistory?.from)"));
  assert.ok(adminRentalDetail.includes("formatRentalHistoryStatus(latestProcessingHistory?.to)"));
  assert.ok(
    !adminRentalDetail.includes(
      '{latestProcessingHistory?.from ?? "-"} → {latestProcessingHistory?.to ?? "-"}',
    ),
  );
  assert.ok(adminRentalsClient.includes("getCommonApplicationStatusLabel(normalized)"));
  assert.ok(adminRentalsClient.includes("getCommonRentalStatusLabel(normalized)"));
  assert.ok(!adminRentalsClient.includes("교체서비스 {r.stringingApplicationStatus}"));
  assert.ok(!adminRentalsClient.includes("{rentalStatusLabels[r.status] || r.status}"));
});

test("표시 계약: 주문/패키지/개인결제 화면은 raw 상태와 결제수단을 직접 렌더링하지 않는다", () => {
  const orderDetail = read("app/features/orders/components/OrderDetailClient.tsx");
  const ordersClient = read("app/features/orders/components/OrdersClient.tsx");
  const checkoutSuccess = read("app/checkout/success/page.tsx");
  const privatePaymentSuccess = read("app/private-payments/success/page.tsx");
  const privatePaymentsClient = read("app/admin/private-payments/PrivatePaymentsClient.tsx");
  const packageList = read("app/admin/packages/page.tsx");
  const packageDetail = read("app/admin/packages/[id]/PackageDetailClient.tsx");
  const stringingHistory = read(
    "app/features/stringing-applications/components/StringingApplicationHistory.tsx",
  );
  const userActivity = read("app/admin/users/_components/UserActivityTabsSection.tsx");

  assert.ok(orderDetail.includes("getCommonApplicationStatusLabel(app.status)"));
  assert.ok(!orderDetail.includes("`상태: ${app.status}`"));
  assert.ok(!orderDetail.includes("`작업 상태 ${latestLinkedApplication.status}`"));
  assert.ok(orderDetail.includes("paymentMethodDisplayLabel"));
  assert.ok(!orderDetail.includes('value={orderDetail.paymentMethod || "무통장입금"}'));
  assert.ok(ordersClient.includes("getCommonPaymentStatusLabel(order.paymentStatus)"));
  assert.ok(!ordersClient.includes("{order.paymentStatus}"));
  assert.ok(checkoutSuccess.includes("paymentStatusLabel"));
  assert.ok(!checkoutSuccess.includes('{order.paymentStatus || "결제완료"}'));
  assert.ok(privatePaymentSuccess.includes("paymentStatusLabel"));
  assert.ok(!privatePaymentSuccess.includes('{item.paymentStatus || "-"}'));
  assert.ok(privatePaymentsClient.includes("getCommonPaymentStatusLabel(normalized)"));
  assert.ok(privatePaymentsClient.includes("{paymentStatusLabel}"));
  assert.ok(!privatePaymentsClient.includes("{item.paymentStatus}"));
  assert.ok(packageList.includes("{paymentLabel}"));
  assert.ok(!packageList.includes("{pkg.paymentStatus}"));
  assert.ok(packageDetail.includes("getPackagePaymentDisplayLabel(data.paymentStatus)"));
  assert.ok(!packageDetail.includes('{data.paymentStatus ?? "결제대기"}'));
  assert.ok(stringingHistory.includes("getCommonApplicationStatusLabel(log.status)"));
  assert.ok(!stringingHistory.includes("{log.status}"));
  assert.ok(userActivity.includes("getCommonOrderStatusLabel(o?.status)"));
  assert.ok(
    userActivity.includes("getCommonApplicationStatusLabel(a?.status || a?.applicationStatus)"),
  );
  assert.ok(!userActivity.includes('subtitle={o?.status || o?.computedStatus || "—"}'));
  assert.ok(!userActivity.includes('subtitle={a?.status || a?.applicationStatus || "—"}'));
});

test("마이페이지 거래 카드 계약: 상태 배지와 액션 배치를 단순화한다", () => {
  const transactionFlowList = read("app/mypage/tabs/TransactionFlowList.tsx");

  assert.ok(!transactionFlowList.includes("TODO_STATUS_LABEL_MAP"));
  assert.ok(!transactionFlowList.includes("TODO_STATUS_LABEL_MAP[todoPrimaryReason]"));
  assert.ok(transactionFlowList.includes("getCompactStatusLabel(displayUserStatusLabel, g.kind)"));
  assert.ok(!transactionFlowList.includes("priority:"));
  assert.ok(!transactionFlowList.includes("pinInline"));
  assert.ok(!transactionFlowList.includes("forceSecondary"));
  assert.ok(!transactionFlowList.includes("inlineEligible"));
  assert.ok(!transactionFlowList.includes("shouldUseSecondary"));
  assert.ok(transactionFlowList.includes("const primaryActionCandidates: CardAction[] = [];"));
  assert.ok(transactionFlowList.includes("primaryActionCandidates.push(candidate);"));
  assert.ok(
    transactionFlowList.includes("const primaryAction = primaryActionCandidates[0] ?? null;"),
  );
  assert.ok(!transactionFlowList.includes("primaryAction = primaryAction ?? candidate;"));
  assert.ok(transactionFlowList.includes("const detailAction: CardAction"));
  assert.ok(transactionFlowList.includes("{detailAction.node}"));
  assert.ok(
    !transactionFlowList.includes('key: "flow-detail"') ||
      !transactionFlowList.includes('addSecondaryAction({ key: "flow-detail"'),
  );
  assert.ok(!transactionFlowList.includes("미작성"));
  assert.ok(!transactionFlowList.includes("ActivityOrderReviewCTA"));
  assert.ok(!transactionFlowList.includes("RentalReviewCTA"));
  assert.ok(!transactionFlowList.includes("ServiceReviewCTA"));
  assert.ok(transactionFlowList.includes("reviewPendingCount: g.order?.reviewPendingCount"));
  assert.ok(transactionFlowList.includes("nextReviewTarget: g.order?.nextReviewTarget"));
  assert.ok(transactionFlowList.includes("reviewPendingCount: g.rental?.reviewPendingCount"));
  assert.ok(transactionFlowList.includes("nextReviewTarget: g.rental?.nextReviewTarget"));
  assert.ok(
    transactionFlowList.includes("reviewPendingCount: applicationActionTarget.reviewPendingCount"),
  );
  assert.ok(transactionFlowList.includes("buildReviewWriteHref"));
  assert.ok(
    transactionFlowList.includes("if ((params.reviewPendingCount ?? 0) <= 0) return null;"),
  );
  assert.ok(!transactionFlowList.includes("모든 후기를 남겼어요"));
  assert.ok(!transactionFlowList.includes("이미 대여 후기를 남겼어요"));
  assert.ok(!transactionFlowList.includes("이미 이용 후기를 남겼어요"));
  assert.ok(transactionFlowList.includes("handleConfirmPurchase(orderId)"));
  assert.ok(transactionFlowList.includes("handleConfirmRental(rentalId)"));
  assert.ok(transactionFlowList.includes("handleConfirmApplication(applicationActionTarget.id)"));
  assert.ok(transactionFlowList.includes("setCancelOrderDialogId(orderId)"));
  assert.ok(transactionFlowList.includes("setCancelRentalDialogId(rentalId)"));
  assert.ok(
    transactionFlowList.includes("setCancelApplicationDialogId(applicationActionTarget.id)"),
  );
  assertSourceIncludes(transactionFlowList, ">상세 보기<", "거래 카드 상세 보기 액션 문구를 유지해야 합니다.");
  assert.ok(transactionFlowList.includes("md:hidden"));
});
