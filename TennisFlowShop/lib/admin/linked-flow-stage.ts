import { isVisitPickupOrder } from "@/lib/order-shipping";

const LINKED_FLOW_STAGES = [
  "결제대기",
  "신청접수",
  "작업중",
  "인도준비",
  "인도완료",
] as const;

export type LinkedFlowStage = (typeof LINKED_FLOW_STAGES)[number];

export const LINKED_FLOW_STAGE_LIST: readonly LinkedFlowStage[] =
  LINKED_FLOW_STAGES;

export const LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES = [
  "취소",
  "환불",
  "구매확정",
] as const;
export const LINKED_FLOW_AUTOMATION_BLOCKED_APPLICATION_STATUSES = [
  "취소",
] as const;
export const LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES = [
  "draft",
  "취소",
] as const;
export const LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES = [
  "approved",
  "승인",
] as const;

const STAGE_TO_ORDER_STATUS: Record<LinkedFlowStage, string> = {
  결제대기: "대기중",
  신청접수: "결제완료",
  작업중: "결제완료",
  인도준비: "배송중",
  인도완료: "배송완료",
};

const STAGE_TO_APPLICATION_STATUS: Record<LinkedFlowStage, string> = {
  결제대기: "검토 중",
  신청접수: "접수완료",
  작업중: "작업 중",
  인도준비: "교체완료",
  인도완료: "교체완료",
};

const EXACT_STATUS_COMBO_TO_STAGE = new Map<string, LinkedFlowStage>([
  ["대기중::검토 중", "결제대기"],
  ["결제완료::접수완료", "신청접수"],
  ["결제완료::작업 중", "작업중"],
  ["배송중::교체완료", "인도준비"],
  ["배송완료::교체완료", "인도완료"],
]);

function comboKey(
  orderStatus?: string | null,
  applicationStatus?: string | null,
): string {
  return `${String(orderStatus ?? "").trim()}::${String(applicationStatus ?? "").trim()}`;
}

export function isLinkedFlowStage(value: unknown): value is LinkedFlowStage {
  return (
    typeof value === "string" &&
    (LINKED_FLOW_STAGES as readonly string[]).includes(value)
  );
}

export function mapStageToOrderStatus(stage: LinkedFlowStage): string {
  return STAGE_TO_ORDER_STATUS[stage];
}

export function mapStageToApplicationStatus(stage: LinkedFlowStage): string {
  return STAGE_TO_APPLICATION_STATUS[stage];
}

export function mapOrderStatusToPaymentStatus(
  orderStatus: string,
): string | null {
  if (["결제완료", "배송중", "배송완료"].includes(orderStatus))
    return "결제완료";
  if (orderStatus === "대기중") return "결제대기";
  if (orderStatus === "취소") return "결제취소";
  if (orderStatus === "환불") return "환불";
  return null;
}

export function isApplicationClosedForLinkedAutomation(input: {
  status?: string | null;
  cancelRequestStatus?: string | null;
}) {
  const status = String(input.status ?? "").trim();
  const cancelStatus = String(input.cancelRequestStatus ?? "")
    .trim()
    .toLowerCase();

  if (
    LINKED_FLOW_AUTOMATION_BLOCKED_APPLICATION_STATUSES.includes(status as any)
  )
    return true;
  if (cancelStatus === "approved" || cancelStatus === "승인") return true;

  return false;
}

export function isOrderBlockedForLinkedAutomation(
  orderStatus?: string | null,
): boolean {
  const status = String(orderStatus ?? "").trim();
  return LINKED_FLOW_AUTOMATION_BLOCKED_ORDER_STATUSES.includes(status as any);
}

export function isApplicationEligibleForLinkedStage(input: {
  status?: string | null;
  cancelRequestStatus?: string | null;
}): boolean {
  const status = String(input.status ?? "").trim();
  const cancelStatus = String(input.cancelRequestStatus ?? "").trim();

  if (LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES.includes(status as any))
    return false;
  if (
    LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES.includes(
      cancelStatus as any,
    )
  )
    return false;

  return true;
}

export function inferLinkedFlowStage(
  orderStatus?: string | null,
  applicationStatus?: string | null,
): LinkedFlowStage | null {
  const exact = EXACT_STATUS_COMBO_TO_STAGE.get(
    comboKey(orderStatus, applicationStatus),
  );
  if (exact) return exact;

  const order = String(orderStatus ?? "").trim();
  const app = String(applicationStatus ?? "").trim();

  if (order === "배송완료") return "인도완료";
  if (order === "배송중") return "인도준비";
  if (app === "작업 중") return "작업중";
  if (order === "결제완료" || app === "접수완료") return "신청접수";
  if (order === "대기중" || app === "검토 중") return "결제대기";

  return null;
}

export function getLinkedFlowStageLabelForDisplay(
  stage: LinkedFlowStage,
  shippingLike?: any,
): string {
  if (stage === "인도준비") {
    return isVisitPickupOrder(shippingLike) ? "수령 준비중" : "배송중";
  }
  if (stage === "인도완료") {
    return isVisitPickupOrder(shippingLike) ? "방문 수령 완료" : "배송완료";
  }
  return stage;
}

export function buildLinkedFlowStagePreview(input: {
  stage: LinkedFlowStage;
  orderPreviousStatus: string;
  orderNextStatus: string;
  applicationPreviousStatus: string;
  applicationNextStatus: string;
  shippingLike?: any;
}): string {
  const {
    stage,
    orderPreviousStatus,
    orderNextStatus,
    applicationPreviousStatus,
    applicationNextStatus,
    shippingLike,
  } = input;

  return [
    `[대표단계: ${getLinkedFlowStageLabelForDisplay(stage, shippingLike)}]`,
    `주문: '${orderPreviousStatus}' → '${orderNextStatus}'`,
    `신청서: '${applicationPreviousStatus}' → '${applicationNextStatus}'`,
  ].join(" / ");
}
