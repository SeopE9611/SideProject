import type {
  AdminOperationItem,
  AdminOperationsGroup,
  AdminOperationsQuickView,
  OperationSignalCounts,
} from "@/types/admin/operations";

type OperationGroupLike = Pick<
  AdminOperationsGroup,
  "groupQueueBucket" | "items" | "linkedFlowStatusIssue"
>;

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

export function isTodayQueueGroup(group: OperationGroupLike) {
  return ["urgent", "caution", "pending"].includes(group.groupQueueBucket ?? "clean");
}

export function isCancelRequestedGroup(group: OperationGroupLike) {
  return group.items.some(
    (item) =>
      item.cancel?.status === "requested" || item.cancel?.status === "approved_pending_pg_cancel",
  );
}

function itemNeedsPaymentCheck(item: AdminOperationItem) {
  const excludeKeywords = ["결제완료", "환불완료", "취소완료"];
  const includeKeywords = [
    "결제대기",
    "입금대기",
    "미입금",
    "입금 확인",
    "결제 확인",
    "동기화 필요",
  ];

  if (item.kind === "order" && typeof item.paymentNeedsCheck === "boolean") {
    return item.paymentNeedsCheck;
  }

  const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`;
  if (excludeKeywords.some((word) => statusText.includes(word))) return false;

  const paymentStatus = normalizeText(item.stage);
  if (paymentStatus.includes("pending") || paymentStatus.includes("unpaid")) return true;

  const combined = `${item.paymentLabel ?? ""} ${statusText} ${item.nextAction ?? ""}`;
  return includeKeywords.some((word) => combined.includes(word));
}

export function hasPaymentCheckNeeded(
  group: OperationGroupLike,
  options: { includePackagePurchases?: boolean } = {},
) {
  const includePackagePurchases = options.includePackagePurchases ?? false;
  return group.items.some(
    (item) =>
      (includePackagePurchases || item.kind !== "package_purchase") && itemNeedsPaymentCheck(item),
  );
}

export function hasPackagePaymentCheckNeeded(group: OperationGroupLike) {
  return group.items.some(
    (item) => item.kind === "package_purchase" && itemNeedsPaymentCheck(item),
  );
}

export function hasShippingMissing(group: OperationGroupLike) {
  const excludeKeywords = ["배송완료", "수령완료", "방문 수령 완료", "반납완료"];
  const includeKeywords = [
    "운송장",
    "배송 등록",
    "운송장 등록",
    "배송 필요",
    "발송 필요",
    "출고 필요",
    "인도 필요",
    "인도 운송장",
    "인도 정보",
    "배송 누락",
  ];

  return group.items.some((item) => {
    if (item.shippingFollowupRequired === true) return true;

    const statusText = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""}`;
    if (excludeKeywords.some((word) => statusText.includes(word))) return false;

    const warningText = (item.warnReasons ?? []).join(" ");
    const nextActionText = item.nextAction ?? "";
    const combined = `${statusText} ${warningText} ${nextActionText}`;
    const needsTracking = item.hasShippingInfo === false || item.hasOutboundTracking === false;
    if (needsTracking && includeKeywords.some((word) => combined.includes(word))) return true;
    return includeKeywords.some(
      (word) => warningText.includes(word) || nextActionText.includes(word),
    );
  });
}

export function hasRentalDue(group: OperationGroupLike) {
  const includeStageKeywords = ["overdue", "duesoon", "returndue", "active", "ongoing"];
  const includeStatusKeywords = ["대여중", "반납대기", "반납예정"];
  const includeActionKeywords = ["반납 확인", "반납확인", "반납 예정", "반납 필요"];
  const excludeKeywords = ["반납완료", "완료", "환불완료"];

  return group.items.some((item) => {
    if (item.kind !== "rental") return false;

    const combined = `${item.statusDisplayLabel ?? ""} ${item.statusLabel ?? ""} ${item.nextAction ?? ""}`;
    const isReturned = combined.toLowerCase().includes("returned") || combined.includes("반납완료");
    const hasDepositRefundSignal =
      item.signals?.some((signal) => signal.code === "RENTAL_DEPOSIT_REFUND_REQUIRED") === true;
    const needsDepositRefund =
      !item.depositRefundedAt &&
      (hasDepositRefundSignal || (isReturned && combined.includes("보증금")));
    if (needsDepositRefund) return true;
    if (excludeKeywords.some((word) => combined.includes(word))) return false;

    const stage = normalizeText(item.stage);
    if (includeStageKeywords.some((word) => stage.includes(word))) return true;
    if (includeStatusKeywords.some((word) => combined.includes(word))) return true;
    return includeActionKeywords.some((word) => (item.nextAction ?? "").includes(word));
  });
}

export function hasStringingWork(group: OperationGroupLike) {
  const terminalStatuses = [
    "completed",
    "done",
    "work_done",
    "교체완료",
    "canceled",
    "cancelled",
    "취소",
  ];

  return group.items.some((item) => {
    if (item.kind !== "stringing_application") return false;
    const status = normalizeText(item.statusLabel).replace(/\s+/g, "");
    return !terminalStatuses.some((value) => status === value.replace(/\s+/g, ""));
  });
}

export function isLinkedWorkGroup(group: OperationGroupLike) {
  return group.items.some((item) => Boolean(item.related)) || group.items.length > 1;
}

export function hasLinkedReviewIssue(group: OperationGroupLike) {
  return Boolean(group.linkedFlowStatusIssue);
}

export function matchesOperationsQuickView(
  group: OperationGroupLike,
  view: AdminOperationsQuickView,
) {
  switch (view) {
    case "today":
      return isTodayQueueGroup(group);
    case "cancelRequests":
      return isCancelRequestedGroup(group);
    case "paymentCheck":
      return hasPaymentCheckNeeded(group);
    case "shippingMissing":
      return hasShippingMissing(group);
    case "rentalDue":
      return hasRentalDue(group);
    case "linkedWork":
      return isLinkedWorkGroup(group);
    case "linkedIssues":
      return hasLinkedReviewIssue(group);
    default:
      return true;
  }
}

export function countOperationSignalGroups(groups: OperationGroupLike[]): OperationSignalCounts {
  return {
    cancelRequests: groups.filter(isCancelRequestedGroup).length,
    paymentCheck: groups.filter((group) => hasPaymentCheckNeeded(group)).length,
    packagePaymentCheck: groups.filter(hasPackagePaymentCheckNeeded).length,
    shippingMissing: groups.filter(hasShippingMissing).length,
    stringingWork: groups.filter(hasStringingWork).length,
    rentalDue: groups.filter(hasRentalDue).length,
    linkedReview: groups.filter(hasLinkedReviewIssue).length,
    offline: 0,
    academyApplications: 0,
  };
}
