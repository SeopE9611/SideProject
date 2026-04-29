import { isVisitPickupOrder } from "@/lib/order-shipping";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";

export type GuestOrderNextActionInput = {
  status?: string | null;
  displayStatus?: string | null;
  shippingLike?: {
    shippingMethod?: string | null;
    deliveryMethod?: string | null;
  } | null;
};

const normalizeStatus = (value?: string | null) => String(value ?? "").trim();

const normalizeOrderStatusLabel = (status?: string | null, displayStatus?: string | null) => {
  const raw = normalizeStatus(status);
  const display = normalizeStatus(displayStatus);

  const mappedRaw = getCommonOrderStatusLabel(raw);
  if (mappedRaw) return mappedRaw;

  const mappedDisplay = getCommonOrderStatusLabel(display);
  if (mappedDisplay) return mappedDisplay;

  return display || raw;
};

export function getGuestOrderNextActionText(input: GuestOrderNextActionInput): string | null {
  const normalized = normalizeOrderStatusLabel(input.status, input.displayStatus);

  if (normalized === "대기중") return "결제를 완료해주세요.";
  if (normalized === "결제완료") return "상품 준비 중입니다. 잠시만 기다려주세요.";
  if (normalized === "처리중" || normalized === "배송준비중") {
    return "상품을 준비하고 있습니다. 준비가 끝나면 배송 또는 수령 안내가 진행됩니다.";
  }
  if (normalized === "배송중" || normalized === "수령 준비중") {
    return isVisitPickupOrder(input.shippingLike)
      ? "수령 준비 상태를 확인해주세요."
      : "배송 정보를 확인해주세요.";
  }
  if (normalized === "배송완료" || normalized === "방문 수령 완료") {
    return "상품 수령 후 주문 상세에서 진행 상태를 확인해주세요.";
  }
  if (normalized === "구매확정") {
    return "이용이 완료된 주문입니다. 추가 문의가 있다면 고객센터로 문의해주세요.";
  }
  if (normalized === "취소요청") return "취소 요청이 접수되었습니다. 처리 결과를 기다려주세요.";
  if (normalized === "취소") return "취소가 완료되었습니다.";
  if (normalized === "환불") return "환불 처리가 완료되었거나 진행 상태를 확인할 수 있습니다.";

  return null;
}
