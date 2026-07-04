import { getMypagePaymentStatusLabel, getMypageUserStatusLabel } from "@/app/mypage/_lib/status-label";

const normalize = (value?: string | null) => String(value ?? "").trim();
const lower = (value?: string | null) => normalize(value).toLowerCase();

const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "결제 또는 입금 확인 대기",
  대기중: "결제 또는 입금 확인 대기",
  paid: "결제 확인 완료",
  결제완료: "결제 확인 완료",
  processing: "상품 준비 중",
  preparing: "상품 준비 중",
  처리중: "상품 준비 중",
  shipped: "배송 중",
  배송중: "배송 중",
  delivered: "수령 확인 필요",
  배송완료: "수령 확인 필요",
  confirmed: "이용 완료",
  구매확정: "이용 완료",
  completed: "이용 완료",
  완료: "이용 완료",
  cancel_requested: "취소 요청 확인 중",
  canceled: "취소 완료",
  cancelled: "취소 완료",
  취소: "취소 완료",
  refunding: "환불 처리 중",
  refunded: "환불 완료",
  환불: "환불 완료",
  returned: "반납 완료",
};

const CUSTOMER_APPLICATION_STATUS_LABELS: Record<string, string> = {
  requested: "신청 내용 확인 중",
  received: "신청 내용 확인 중",
  접수완료: "신청 내용 확인 중",
  reviewing: "신청 내용 확인 중",
  "검토 중": "신청 내용 확인 중",
  검토중: "신청 내용 확인 중",
  approved: "작업 준비 중",
  승인: "작업 준비 중",
  in_progress: "스트링 작업 중",
  "작업 중": "스트링 작업 중",
  작업중: "스트링 작업 중",
  completed: "작업 완료",
  교체완료: "작업 완료",
  작업완료: "작업 완료",
  rejected: "신청 반려",
  거절: "신청 반려",
  canceled: "취소 완료",
  cancelled: "취소 완료",
  취소: "취소 완료",
};

const CUSTOMER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "결제 또는 입금 확인 대기",
  결제대기: "결제 또는 입금 확인 대기",
  paid: "결제 완료",
  결제완료: "결제 완료",
  failed: "결제 실패",
  결제실패: "결제 실패",
  canceled: "결제 취소",
  cancelled: "결제 취소",
  결제취소: "결제 취소",
  refunded: "환불 완료",
  환불완료: "환불 완료",
};

export function getCustomerOrderStatusLabel(status?: string | null) {
  const raw = normalize(status);
  if (!raw) return "상태 확인 중";
  const base = getMypageUserStatusLabel(raw);
  return CUSTOMER_ORDER_STATUS_LABELS[lower(raw)] ?? CUSTOMER_ORDER_STATUS_LABELS[base] ?? base;
}

export function getCustomerApplicationStatusLabel(status?: string | null) {
  const raw = normalize(status);
  if (!raw) return "상태 확인 중";
  const base = getMypageUserStatusLabel(raw);
  return CUSTOMER_APPLICATION_STATUS_LABELS[lower(raw)] ?? CUSTOMER_APPLICATION_STATUS_LABELS[base] ?? base;
}

export function getCustomerPaymentStatusLabel(status?: string | null) {
  const raw = normalize(status);
  if (!raw) return "상태 확인 중";
  const base = getMypagePaymentStatusLabel(raw);
  return CUSTOMER_PAYMENT_STATUS_LABELS[lower(raw)] ?? CUSTOMER_PAYMENT_STATUS_LABELS[base] ?? base;
}

export function getCustomerNextActionCopy(params: {
  hasTodo: boolean;
  todoLabel?: string | null;
  todoDescription?: string | null;
  isCompleted?: boolean;
  isCanceled?: boolean;
}) {
  if (params.hasTodo) {
    return {
      title: params.todoLabel || "다음 할 일을 확인해주세요.",
      description: params.todoDescription || "아래 주요 버튼을 눌러 필요한 절차를 진행해주세요.",
    };
  }
  if (params.isCanceled) {
    return { title: "추가로 진행할 일이 없습니다.", description: "취소된 주문입니다." };
  }
  if (params.isCompleted) {
    return { title: "이용이 완료되었습니다.", description: "주문과 서비스 이용이 마무리되었습니다." };
  }
  return {
    title: "현재는 기다려주세요.",
    description: "주문 진행 상황이 변경되면 이 화면에서 다음 안내를 확인할 수 있습니다.",
  };
}
