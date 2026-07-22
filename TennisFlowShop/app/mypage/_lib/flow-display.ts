import {
  getMypagePaymentStatusLabel,
  getMypageUserStatusLabel,
} from "@/app/mypage/_lib/status-label";

const normalize = (value?: string | null) => String(value ?? "").trim();
const lower = (value?: string | null) => normalize(value).toLowerCase();

const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "주문 접수",
  대기중: "주문 접수",
  paid: "상품 준비 대기",
  결제완료: "상품 준비 대기",
  processing: "상품 준비 중",
  preparing: "상품 준비 중",
  처리중: "상품 준비 중",
  shipped: "배송 중",
  배송중: "배송 중",
  delivered: "수령 확인 필요",
  배송완료: "수령 확인 필요",
  confirmed: "이용 완료",
  purchase_confirmed: "이용 완료",
  구매확정: "이용 완료",
  completed: "이용 완료",
  완료: "이용 완료",
  cancel_requested: "취소 요청 확인 중",
  cancel_processing: "취소 처리중",
  cancelprocessing: "취소 처리중",
  approved_pending_pg_cancel: "취소 처리중",
  취소처리중: "취소 처리중",
  canceled: "취소 완료",
  cancelled: "취소 완료",
  취소: "취소 완료",
  refunding: "환불 처리 중",
  refunded: "환불 완료",
  refund_completed: "환불 완료",
  환불: "환불 완료",
  환불완료: "환불 완료",
  partial_canceled: "부분 취소",
  partialcanceled: "부분 취소",
  partial_cancelled: "부분 취소",
  부분취소: "부분 취소",
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
  done: "작업 완료",
  work_done: "작업 완료",
  교체완료: "작업 완료",
  작업완료: "작업 완료",
  rejected: "신청 반려",
  거절: "신청 반려",
  canceled: "취소 완료",
  cancelled: "취소 완료",
  취소: "취소 완료",
};

const CUSTOMER_RENTAL_STATUS_LABELS: Record<string, string> = {
  pending: "대여 신청 확인 중",
  대기중: "대여 신청 확인 중",
  paid: "대여 준비 중",
  결제완료: "대여 준비 중",
  out: "대여 중",
  rented: "대여 중",
  대여중: "대여 중",
  returned: "이용 완료",
  반납완료: "이용 완료",
  overdue: "연체",
  연체: "연체",
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
  refund_completed: "환불 완료",
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
  return (
    CUSTOMER_APPLICATION_STATUS_LABELS[lower(raw)] ??
    CUSTOMER_APPLICATION_STATUS_LABELS[base] ??
    base
  );
}

export function getCustomerRentalStatusLabel(status?: string | null) {
  const raw = normalize(status);
  if (!raw) return "상태 확인 중";
  const base = getMypageUserStatusLabel(raw);
  return CUSTOMER_RENTAL_STATUS_LABELS[lower(raw)] ?? CUSTOMER_RENTAL_STATUS_LABELS[base] ?? base;
}

export function getCustomerPaymentStatusLabel(status?: string | null) {
  const raw = normalize(status);
  if (!raw) return "상태 확인 중";
  const base = getMypagePaymentStatusLabel(raw);
  return CUSTOMER_PAYMENT_STATUS_LABELS[lower(raw)] ?? CUSTOMER_PAYMENT_STATUS_LABELS[base] ?? base;
}

// 목록, 상세의 단일 표시 기준
export type CustomerOrderPaymentStatusParams = {
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentProvider?: string | null;
  totalPrice?: number | null;
};

const compactPaymentToken = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

export function isCustomerBankTransferPayment({
  paymentMethod,
  paymentProvider,
  totalPrice,
}: Omit<CustomerOrderPaymentStatusParams, "paymentStatus">) {
  const hasTotalPrice = totalPrice !== null && totalPrice !== undefined;
  const normalizedTotalPrice = Number(totalPrice);

  if (hasTotalPrice && Number.isFinite(normalizedTotalPrice) && normalizedTotalPrice <= 0) {
    return false;
  }

  const providerToken = compactPaymentToken(paymentProvider);
  const methodToken = compactPaymentToken(paymentMethod);

  const isOnlinePaymentProvider = ["nicepay", "toss", "tosspayments"].includes(providerToken);

  return (
    !isOnlinePaymentProvider &&
    (methodToken.includes("무통장") ||
      methodToken.includes("banktransfer") ||
      methodToken.includes("manualbanktransfer") ||
      methodToken.includes("deposit"))
  );
}

export type CustomerTransactionPaymentStatusParams = CustomerOrderPaymentStatusParams;

export function getCustomerTransactionPaymentStatusLabel({
  paymentStatus,
  paymentMethod,
  paymentProvider,
  totalPrice,
}: CustomerTransactionPaymentStatusParams): string {
  const hasExplicitPaymentEvidence = Boolean(
    normalize(paymentStatus) || normalize(paymentMethod) || normalize(paymentProvider),
  );
  const hasExplicitFreeTotal =
    typeof totalPrice === "number" && Number.isFinite(totalPrice) && totalPrice <= 0;

  if (hasExplicitFreeTotal || hasExplicitPaymentEvidence) {
    return getCustomerOrderPaymentStatusLabel({
      paymentStatus,
      paymentMethod,
      paymentProvider,
      totalPrice,
    });
  }

  return "결제 상태 확인 중";
}

export function getCustomerOrderPaymentStatusLabel({
  paymentStatus,
  paymentMethod,
  paymentProvider,
  totalPrice,
}: CustomerOrderPaymentStatusParams) {
  const hasTotalPrice = totalPrice !== null && totalPrice !== undefined;
  const normalizedTotalPrice = Number(totalPrice);

  if (hasTotalPrice && Number.isFinite(normalizedTotalPrice) && normalizedTotalPrice <= 0) {
    return "결제 불필요";
  }

  const statusToken = compactPaymentToken(paymentStatus);
  const isBankTransfer = isCustomerBankTransferPayment({
    paymentMethod,
    paymentProvider,
    totalPrice,
  });

  const isPaid = ["paid", "결제완료", "paymentcompleted"].includes(statusToken);
  const isPending =
    !statusToken || ["pending", "결제대기", "대기중", "paymentpending"].includes(statusToken);

  if (isPaid) return "결제 완료";
  if (isBankTransfer && isPending) return "입금 확인 대기";
  if (isPending) return "결제 확인 대기";

  return getCustomerPaymentStatusLabel(paymentStatus);
}

export function getCustomerStringingSubmissionLabel(params: {
  withStringService?: boolean;
  hasSubmittedApplication?: boolean;
}) {
  if (params.hasSubmittedApplication) return "접수 완료";
  if (params.withStringService) return "신청서 작성 필요";
  return "미포함";
}
// 목록, 상세의 단일 표시 기준 끝

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
    return {
      title: "이용이 완료되었습니다.",
      description: "주문과 서비스 이용이 마무리되었습니다.",
    };
  }
  return {
    title: "현재는 기다려주세요.",
    description: "주문 진행 상황이 변경되면 이 화면에서 다음 안내를 확인할 수 있습니다.",
  };
}
