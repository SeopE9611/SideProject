import {
  isOrderConfirmedStatus,
  isOrderDeliveredStatus,
  isRentalReturnedStatus,
  isStringingCompletedStatus,
} from "@/lib/status/flow-status";

export type ActivityTodoApplicationLike = {
  status?: string | null;
  hasTracking?: boolean | null;
  needsInboundTracking?: boolean | null;
  userConfirmedAt?: string | null;
  serviceReviewPending?: boolean | null;
};

export function normalizeMypageTodoStatus(status?: string | null): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (["pending", "대기중"].includes(lower)) return "대기중";
  if (["paid", "결제완료"].includes(lower)) return "결제완료";
  if (["delivered", "배송완료"].includes(lower)) return "배송완료";
  if (["returned", "반납완료"].includes(lower)) return "반납완료";
  if (["requested", "접수완료", "received"].includes(lower)) return "접수완료";
  if (["reviewing", "검토중", "검토 중"].includes(lower)) return "검토 중";
  if (["completed", "완료", "교체완료"].includes(lower)) return "교체완료";
  if (["canceled", "cancelled", "취소"].includes(lower)) return "취소";
  if (["refunded", "refund", "환불"].includes(lower)) return "환불";
  if (["rejected", "거절", "반려"].includes(lower)) return "거절";
  return raw;
}

function isTerminalCanceledTodoStatus(status?: string | null): boolean {
  const normalized = normalizeMypageTodoStatus(status);

  return (
    normalized === "취소" || normalized === "환불" || normalized === "거절" || normalized === "반려"
  );
}

export function isApplicationTodoActionable(app?: ActivityTodoApplicationLike | null): boolean {
  if (!app) return false;

  const status = normalizeMypageTodoStatus(app.status);
  if (isTerminalCanceledTodoStatus(status)) return false;

  return Boolean(
    (app.needsInboundTracking && !app.hasTracking) ||
    (isStringingCompletedStatus(app.status) && !app.userConfirmedAt) ||
    app.serviceReviewPending,
  );
}

export function isApplicationServiceReviewTodoPending(
  app?: ActivityTodoApplicationLike | null,
): boolean {
  if (!app || isTerminalCanceledTodoStatus(app.status)) return false;
  return Boolean(app.serviceReviewPending);
}

function isApplicationTrackingTodoActionable(app?: ActivityTodoApplicationLike | null): boolean {
  if (!app || isTerminalCanceledTodoStatus(app.status)) return false;
  return Boolean(app.needsInboundTracking && !app.hasTracking);
}

export function isOrderTodoActionable(params: {
  status?: string | null;
  userConfirmedAt?: string | null;
  reviewPendingCount?: number | null;
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
}): boolean {
  const status = normalizeMypageTodoStatus(params.status);

  if (isTerminalCanceledTodoStatus(status)) return false;

  const isConfirmed = Boolean(params.userConfirmedAt) || isOrderConfirmedStatus(params.status);
  const hasPendingReview = (params.reviewPendingCount ?? 0) > 0;
  const hasActionableLinkedApplication = (params.linkedApplications ?? []).some(
    (app) => isApplicationTrackingTodoActionable(app) || isApplicationServiceReviewTodoPending(app),
  );

  return Boolean(
    isOrderDeliveredStatus(params.status) ||
    hasActionableLinkedApplication ||
    (isConfirmed && hasPendingReview) ||
    isApplicationTrackingTodoActionable(params.primaryApplication) ||
    isApplicationServiceReviewTodoPending(params.primaryApplication),
  );
}

export function isRentalTodoActionable(params: {
  status?: string | null;
  userConfirmedAt?: string | null;
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
  stringingApplicationId?: string | null;
  withStringService?: boolean | null;
  reviewPendingCount?: number | null;
}): boolean {
  const status = normalizeMypageTodoStatus(params.status);
  if (isTerminalCanceledTodoStatus(status)) return false;

  const hasActionableLinkedApplication = (params.linkedApplications ?? []).some(
    (app) => isApplicationTrackingTodoActionable(app) || isApplicationServiceReviewTodoPending(app),
  );
  const hasPendingReview = (params.reviewPendingCount ?? 0) > 0;
  return Boolean(
    (isRentalReturnedStatus(params.status) && (!params.userConfirmedAt || hasPendingReview)) ||
    hasActionableLinkedApplication ||
    isApplicationTrackingTodoActionable(params.primaryApplication) ||
    isApplicationServiceReviewTodoPending(params.primaryApplication) ||
    (!params.stringingApplicationId && params.withStringService),
  );
}
