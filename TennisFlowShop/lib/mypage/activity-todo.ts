import { toKstYmd } from "@/lib/date/kst";
import {
  isOrderConfirmedStatus,
  isOrderDeliveredStatus,
  isRentalReturnedStatus,
  isStringingCompletedStatus,
  normalizeStatusText,
} from "@/lib/status/flow-status";

export type MypageTodoReasonCode =
  | "application_inbound_tracking"
  | "order_confirm"
  | "application_confirm"
  | "rental_return_shipping_register"
  | "rental_confirm"
  | "rental_stringing_apply"
  | "order_stringing_apply"
  | "product_review"
  | "product_stringing_review";

export type MypageTodoReasonKind = "required" | "optional";

export type MypageTodoReasonMeta = {
  kind: MypageTodoReasonKind;
  label: "다음 조치" | "선택 활동";
  message: string;
};

export const MYPAGE_TODO_REASON_META: Record<MypageTodoReasonCode, MypageTodoReasonMeta> = {
  application_inbound_tracking: {
    kind: "required",
    label: "다음 조치",
    message: "라켓 발송 운송장을 등록해주세요.",
  },
  order_confirm: {
    kind: "required",
    label: "다음 조치",
    message: "상품을 받으셨다면 구매 확정을 진행해주세요.",
  },
  application_confirm: {
    kind: "required",
    label: "다음 조치",
    message: "작업 내용을 확인하고 교체서비스 확정을 진행해주세요.",
  },
  rental_return_shipping_register: {
    kind: "required",
    label: "다음 조치",
    message: "반납 운송장을 등록해주세요.",
  },
  rental_confirm: {
    kind: "required",
    label: "다음 조치",
    message: "반납 내용을 확인하고 수령 확인을 진행해주세요.",
  },
  rental_stringing_apply: {
    kind: "required",
    label: "다음 조치",
    message: "교체서비스 신청을 이어갈 수 있어요.",
  },
  order_stringing_apply: {
    kind: "required",
    label: "다음 조치",
    message: "교체서비스 신청을 이어갈 수 있어요.",
  },
  product_review: {
    kind: "optional",
    label: "선택 활동",
    message: "후기를 남길 수 있어요.",
  },
  product_stringing_review: {
    kind: "optional",
    label: "선택 활동",
    message: "상품과 교체서비스 후기를 남길 수 있어요.",
  },
};

export function getMypageTodoReasonMeta(code: MypageTodoReasonCode): MypageTodoReasonMeta {
  return MYPAGE_TODO_REASON_META[code];
}

export type ActivityTodoApplicationLike = {
  status?: string | null;
  hasTracking?: boolean | null;
  needsInboundTracking?: boolean | null;
  userConfirmedAt?: string | null;
  serviceReviewPending?: boolean | null;
};

export type RentalShippingSideLike = {
  trackingNumber?: unknown;
  trackingNo?: unknown;
  tracking_no?: unknown;
};

export function getRentalShippingTrackingNumber(
  side?: RentalShippingSideLike | null,
): string | null {
  const value = side?.trackingNumber ?? side?.trackingNo ?? side?.tracking_no ?? null;
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function hasRentalReturnShipping(
  shipping?: { return?: RentalShippingSideLike | null } | null,
): boolean {
  return Boolean(getRentalShippingTrackingNumber(shipping?.return));
}

export function normalizeMypageTodoStatus(status?: string | null): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (["pending", "대기중"].includes(lower)) return "대기중";
  if (["paid", "결제완료"].includes(lower)) return "결제완료";
  if (["delivered", "배송완료"].includes(lower)) return "배송완료";
  if (["out", "rented", "대여중", "출고", "출고완료"].includes(lower)) return "out";
  if (["returned", "반납완료"].includes(lower)) return "반납완료";
  if (["requested", "접수완료", "received"].includes(lower)) return "접수완료";
  if (["reviewing", "검토중", "검토 중"].includes(lower)) return "검토 중";
  if (["completed", "완료", "교체완료"].includes(lower)) return "교체완료";
  if (["canceled", "cancelled", "취소", "취소완료"].includes(lower)) return "취소";
  if (["refunded", "refund", "환불", "환불완료"].includes(lower)) return "환불";
  if (["rejected", "거절", "반려"].includes(lower)) return "거절";
  return raw;
}

function isTerminalCanceledTodoStatus(status?: string | null): boolean {
  const normalized = normalizeMypageTodoStatus(status);

  return (
    normalized === "취소" || normalized === "환불" || normalized === "거절" || normalized === "반려"
  );
}

function isRentalOutStatus(status?: string | null): boolean {
  const normalized = normalizeMypageTodoStatus(status);
  return normalized === "out" || normalizeStatusText(status) === "out";
}

type RentalTodoParams = {
  status?: string | null;
  userConfirmedAt?: string | null;
  dueAt?: string | Date | null;
  returnedAt?: string | Date | null;
  hasReturnShipping?: boolean | null;
  todayYmd: string;
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
  stringingApplicationId?: string | null;
  withStringService?: boolean | null;
  reviewPendingCount?: number | null;
};

export function isRentalReturnShippingRegistrationRequired(
  params: Pick<
    RentalTodoParams,
    "status" | "dueAt" | "returnedAt" | "hasReturnShipping" | "todayYmd"
  >,
): boolean {
  if (!isRentalOutStatus(params.status)) return false;
  if (params.returnedAt) return false;
  if (params.hasReturnShipping) return false;
  if (!params.dueAt) return false;

  const dueDate = params.dueAt instanceof Date ? params.dueAt : new Date(params.dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;
  const dueYmd = toKstYmd(dueDate);
  return dueYmd <= params.todayYmd;
}

export function resolveApplicationTodoReason(
  app?: ActivityTodoApplicationLike | null,
): MypageTodoReasonCode | null {
  if (!app) return null;

  const status = normalizeMypageTodoStatus(app.status);
  if (isTerminalCanceledTodoStatus(status)) return null;

  if (app.needsInboundTracking && !app.hasTracking) return "application_inbound_tracking";
  if (isStringingCompletedStatus(app.status) && !app.userConfirmedAt) return "application_confirm";
  if (app.serviceReviewPending) return "product_stringing_review";
  return null;
}

export function isApplicationServiceReviewTodoPending(
  app?: ActivityTodoApplicationLike | null,
): boolean {
  if (!app || isTerminalCanceledTodoStatus(app.status)) return false;
  return Boolean(app.serviceReviewPending);
}

function resolveApplicationTrackingTodoReason(
  app?: ActivityTodoApplicationLike | null,
): MypageTodoReasonCode | null {
  if (!app || isTerminalCanceledTodoStatus(app.status)) return null;
  return app.needsInboundTracking && !app.hasTracking ? "application_inbound_tracking" : null;
}

export function resolveOrderTodoReason(params: {
  status?: string | null;
  userConfirmedAt?: string | null;
  reviewPendingCount?: number | null;
  linkedApplications?: Array<ActivityTodoApplicationLike | null | undefined>;
  primaryApplication?: ActivityTodoApplicationLike | null;
  withStringService?: boolean | null;
}): MypageTodoReasonCode | null {
  const status = normalizeMypageTodoStatus(params.status);

  if (isTerminalCanceledTodoStatus(status)) return null;

  if ((params.linkedApplications ?? []).some((app) => resolveApplicationTrackingTodoReason(app))) {
    return "application_inbound_tracking";
  }
  if (resolveApplicationTrackingTodoReason(params.primaryApplication))
    return "application_inbound_tracking";
  if (
    !(params.linkedApplications ?? []).length &&
    !params.primaryApplication &&
    params.withStringService
  ) {
    return "order_stringing_apply";
  }
  if (isOrderDeliveredStatus(params.status)) return "order_confirm";

  const isConfirmed = Boolean(params.userConfirmedAt) || isOrderConfirmedStatus(params.status);
  const hasPendingReview = (params.reviewPendingCount ?? 0) > 0;
  if (isConfirmed && hasPendingReview) return "product_review";
  if ((params.linkedApplications ?? []).some((app) => isApplicationServiceReviewTodoPending(app))) {
    return "product_stringing_review";
  }
  if (isApplicationServiceReviewTodoPending(params.primaryApplication))
    return "product_stringing_review";
  return null;
}

export function resolveRentalTodoReason(params: RentalTodoParams): MypageTodoReasonCode | null {
  const status = normalizeMypageTodoStatus(params.status);
  if (isTerminalCanceledTodoStatus(status)) return null;

  if (isRentalReturnShippingRegistrationRequired(params)) return "rental_return_shipping_register";
  if (isRentalReturnedStatus(params.status) && !params.userConfirmedAt) return "rental_confirm";

  const hasPendingReview = (params.reviewPendingCount ?? 0) > 0;
  if (params.userConfirmedAt && hasPendingReview) return "product_review";
  if ((params.linkedApplications ?? []).some((app) => isApplicationServiceReviewTodoPending(app))) {
    return "product_stringing_review";
  }
  if (isApplicationServiceReviewTodoPending(params.primaryApplication))
    return "product_stringing_review";
  if (
    !params.stringingApplicationId &&
    !(params.linkedApplications ?? []).length &&
    !params.primaryApplication &&
    params.withStringService
  ) {
    return "rental_stringing_apply";
  }
  return null;
}

export function isApplicationTodoActionable(app?: ActivityTodoApplicationLike | null): boolean {
  return resolveApplicationTodoReason(app) !== null;
}

export function isOrderTodoActionable(
  params: Parameters<typeof resolveOrderTodoReason>[0],
): boolean {
  return resolveOrderTodoReason(params) !== null;
}

export function isRentalTodoActionable(params: RentalTodoParams): boolean {
  return resolveRentalTodoReason(params) !== null;
}
