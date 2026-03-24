import {
  getCommonApplicationStatusLabel,
  getCommonOrderStatusLabel,
  getCommonPaymentStatusLabel,
} from "@/lib/status-labels/base";

const normalizeStatusInput = (raw?: string | null) => String(raw ?? "").trim();

export function labelPaymentStatus(raw?: string) {
  const v = normalizeStatusInput(raw);
  if (!v) return "결제대기";
  const lower = v.toLowerCase();

  if (v === "결제대기" || v === "대기중") return "결제대기";
  if (lower === "payment_pending" || lower === "unpaid") return "결제대기";

  const commonLabel = getCommonPaymentStatusLabel(v);
  if (commonLabel === "결제취소") return "취소";
  if (commonLabel === "환불완료") return "환불";
  if (commonLabel) return commonLabel;

  if (v === "취소" || lower === "canceled" || lower === "cancelled")
    return "취소";
  if (v === "환불" || lower === "refunded" || lower === "refund") return "환불";
  return v;
}

export function labelOrderStatus(raw?: string) {
  const v = normalizeStatusInput(raw);
  if (!v) return "대기중";
  const lower = v.toLowerCase();

  if (
    ["대기중", "배송준비중", "배송중", "배송완료", "취소", "환불"].includes(v)
  )
    return v;

  const commonLabel = getCommonOrderStatusLabel(v);
  if (commonLabel) return commonLabel;

  if (lower === "preparing" || lower === "processing") return "배송준비중";
  if (lower === "in_transit") return "배송중";
  if (lower === "completed") return "배송완료";
  return v;
}

export function labelStringingStatus(raw?: string) {
  const v = normalizeStatusInput(raw);
  if (!v) return "접수완료";
  const lower = v.toLowerCase();

  if (["접수완료", "검토중", "완료", "교체완료", "취소"].includes(v)) return v;

  const commonLabel = getCommonApplicationStatusLabel(v);
  if (commonLabel === "접수완료") return "접수완료";
  if (commonLabel === "거절") return "취소";

  if (lower === "pending") return "접수완료";
  if (lower === "reviewing" || lower === "in_review" || lower === "processing")
    return "검토중";
  if (lower === "completed") return "완료";
  if (lower === "canceled" || lower === "cancelled") return "취소";
  return v;
}
