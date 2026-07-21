import { isVisitPickupOrder } from "@/lib/order-shipping";
import { getCommonOrderStatusLabel } from "@/lib/status-labels/base";

export type GuestOrderNextActionInput = {
  status?: string | null;
  displayStatus?: string | null;
  paymentStatusLabel?: string | null;
  shippingLike?: {
    shippingMethod?: string | null;
    deliveryMethod?: string | null;
  } | null;
};

const getGuestPaymentNextActionText = (paymentStatusLabel?: string | null): string | null => {
  switch (paymentStatusLabel) {
    case "입금 확인 대기":
      return "아직 입금하지 않았다면 안내 계좌로 입금해주세요. 이미 입금했다면 확인까지 기다려주세요.";
    case "결제 확인 대기":
    case "결제 또는 입금 확인 대기":
      return "결제 상태를 확인하고 있습니다. 상태가 오래 지속되면 고객센터로 문의해주세요.";
    case "결제 실패":
      return "결제가 완료되지 않았습니다. 결제 상태를 확인하거나 고객센터로 문의해주세요.";
    case "결제 취소":
      return "결제가 취소된 주문입니다.";
    case "환불 완료":
      return "환불이 완료된 주문입니다.";
    default:
      return null;
  }
};

const normalizeStatus = (value?: string | null) => String(value ?? "").trim();

const normalizeRawStatus = (status?: string | null): string => {
  return String(status ?? "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

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
  const normalizedRawStatus = normalizeRawStatus(input.status);

  if (
    normalizedRawStatus === "cancel_requested" ||
    normalizedRawStatus === "cancel_request" ||
    normalizedRawStatus === "cancellation_requested" ||
    normalized === "취소요청" ||
    normalized === "취소 요청" ||
    normalized === "취소 요청 접수"
  ) {
    return "취소 요청이 접수되었습니다. 처리 결과를 기다려주세요.";
  }
  if (
    normalizedRawStatus === "canceled" ||
    normalizedRawStatus === "cancelled" ||
    normalized === "취소" ||
    normalized === "취소 완료" ||
    normalized === "취소완료"
  ) {
    return "취소가 완료되었습니다.";
  }
  if (
    normalizedRawStatus === "refunded" ||
    normalizedRawStatus === "refunding" ||
    normalized === "환불" ||
    normalized === "환불 완료" ||
    normalized === "환불 처리중"
  ) {
    return "환불 진행 상태를 확인해주세요.";
  }
  if (
    normalizedRawStatus === "confirmed" ||
    normalizedRawStatus === "completed" ||
    normalized === "구매확정" ||
    normalized === "구매 확정" ||
    normalized === "완료"
  ) {
    return "이용이 완료된 주문입니다. 추가 문의가 있다면 고객센터로 문의해주세요.";
  }

  if (
    normalizedRawStatus === "processing" ||
    normalizedRawStatus === "preparing" ||
    normalizedRawStatus === "in_progress" ||
    normalized === "처리중" ||
    normalized === "처리 중" ||
    normalized === "배송준비중" ||
    normalized === "배송 준비중" ||
    normalized === "배송 준비 중"
  ) {
    return "상품을 준비하고 있습니다. 준비가 끝나면 배송 또는 수령 안내가 진행됩니다.";
  }

  if (
    normalizedRawStatus === "shipped" ||
    normalized === "배송중" ||
    normalized === "배송 중" ||
    normalized === "수령 준비중" ||
    normalized === "수령 준비 중"
  ) {
    return isVisitPickupOrder(input.shippingLike)
      ? "수령 준비 상태를 확인해주세요."
      : "배송 정보를 확인해주세요.";
  }

  if (
    normalizedRawStatus === "delivered" ||
    normalized === "배송완료" ||
    normalized === "배송 완료" ||
    normalized === "방문 수령 완료"
  ) {
    return "상품을 받으셨다면 주문 상세에서 상태를 확인해주세요.";
  }

  return getGuestPaymentNextActionText(input.paymentStatusLabel);
}
