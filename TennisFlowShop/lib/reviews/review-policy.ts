import { isOrderConfirmedStatus, isRentalReturnedStatus, isStringingCompletedStatus } from "@/lib/status/flow-status";

type OrderLike = {
  _id?: unknown;
  stringingApplicationId?: unknown;
  shippingInfo?: { withStringService?: unknown } | null;
};

export function hasStringingApplicationLink(order: OrderLike | null | undefined) {
  return Boolean(order?.stringingApplicationId || order?.shippingInfo?.withStringService);
}

export function isOrderLinkedToStringing(
  order: OrderLike | null | undefined,
  linkedApplications: unknown[] = [],
) {
  return hasStringingApplicationLink(order) || linkedApplications.length > 0;
}

export async function isOrderServiceReviewOnly(
  db: { collection: (name: string) => any },
  order: OrderLike | null | undefined,
) {
  if (hasStringingApplicationLink(order)) return true;
  if (!order?._id) return false;

  const orderIds = typeof order._id === "string" ? [order._id] : [order._id, String(order._id)];
  const linkedApplication = await db
    .collection("stringing_applications")
    .findOne({ orderId: { $in: orderIds } }, { projection: { _id: 1 } });

  return Boolean(linkedApplication);
}

const BLOCKED_STRINGING_REVIEW_STATUS_TOKENS = [
  "취소",
  "거절",
  "환불",
  "반려",
  "cancel",
  "reject",
  "refund",
];

export function isStringingReviewBlockedStatus(status: unknown) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return BLOCKED_STRINGING_REVIEW_STATUS_TOKENS.some((token) => normalized.includes(token));
}


export function isOrderReviewEligible(order: any) {
  return Boolean(order?.userConfirmedAt) || isOrderConfirmedStatus(order?.status);
}

export function isRentalReviewEligible(rental: any) {
  return isRentalReturnedStatus(rental?.status) && Boolean(rental?.userConfirmedAt);
}

export function isStandaloneStringingReviewEligible(app: any) {
  return (
    Boolean(app?.userConfirmedAt) &&
    isStringingCompletedStatus(app?.status) &&
    !isStringingReviewBlockedStatus(app?.status)
  );
}

export type ReviewSubmissionBlockReason =
  | "notFound"
  | "already"
  | "coveredByIntegratedReview"
  | "notConfirmed"
  | "notCompleted"
  | "invalidStatus"
  | null;

export function getReviewSubmissionBlockReason(
  target: { reviewed?: boolean; eligible?: boolean; ineligibleReason?: string | null } | null | undefined,
): ReviewSubmissionBlockReason {
  if (!target) return "notFound";
  if (target.reviewed) return "already";
  if (!target.eligible) {
    return (target.ineligibleReason as ReviewSubmissionBlockReason) ?? "notConfirmed";
  }
  return null;
}

export function getStandaloneStringingIneligibleReason(app: any) {
  if (isStringingReviewBlockedStatus(app?.status)) return "invalidStatus";
  if (!isStringingCompletedStatus(app?.status)) return "notCompleted";
  if (!app?.userConfirmedAt) return "notConfirmed";
  return null;
}
