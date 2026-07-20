import { getCommonPaymentStatusLabel } from "@/lib/status-labels/base";

export type AdminOrderPaymentStateKind =
  | "not_required"
  | "bank_pending"
  | "pg_pending"
  | "pending"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "other";

export type AdminOrderPaymentState = {
  kind: AdminOrderPaymentStateKind;
  label: string;
  needsCheck: boolean;
  actionLabel: string | null;
};

export type AdminOrderPaymentStateParams = {
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

// 현재 활성 PG는 NICEPAY.
// Toss 값은 과거 주문 표시 호환을 위해서만 인식하며,
// 신규 결제수단 활성화 여부와는 무관하다.
const KNOWN_ONLINE_PAYMENT_PROVIDERS =
  new Set(["nicepay", "toss", "tosspayments"]);

export function isAdminBankTransferPayment(params: {
  paymentMethod?: string | null;
  paymentProvider?: string | null;
  totalPrice?: number | null;
}) {
  const hasTotalPrice = params.totalPrice !== null && params.totalPrice !== undefined;

  const normalizedTotal = Number(params.totalPrice);

  if (hasTotalPrice && Number.isFinite(normalizedTotal) && normalizedTotal <= 0) {
    return false;
  }

  const providerToken = compactPaymentToken(params.paymentProvider);
  const methodToken = compactPaymentToken(params.paymentMethod);

  if (KNOWN_ONLINE_PAYMENT_PROVIDERS.has(providerToken)) {
    return false;
  }

  return (
    methodToken.includes("무통장") ||
    methodToken.includes("계좌") ||
    methodToken.includes("banktransfer") ||
    methodToken.includes("manualbanktransfer") ||
    methodToken.includes("deposit") ||
    providerToken === "banktransfer" ||
    providerToken === "manualbanktransfer"
  );
}

export function getAdminOrderPaymentState({
  paymentStatus,
  paymentMethod,
  paymentProvider,
  totalPrice,
}: AdminOrderPaymentStateParams): AdminOrderPaymentState {
  const hasTotalPrice = totalPrice !== null && totalPrice !== undefined;

  const normalizedTotal = Number(totalPrice);

  if (hasTotalPrice && Number.isFinite(normalizedTotal) && normalizedTotal <= 0) {
    return {
      kind: "not_required",
      label: "결제 불필요",
      needsCheck: false,
      actionLabel: null,
    };
  }

  const statusToken = compactPaymentToken(paymentStatus);
  const providerToken = compactPaymentToken(paymentProvider);

  const isBankTransfer = isAdminBankTransferPayment({
    paymentMethod,
    paymentProvider,
    totalPrice,
  });

  const isOnlinePayment = KNOWN_ONLINE_PAYMENT_PROVIDERS.has(providerToken);

  if (["paid", "결제완료", "paymentcompleted", "approved"].includes(statusToken)) {
    return {
      kind: "paid",
      label: "결제 완료",
      needsCheck: false,
      actionLabel: null,
    };
  }

  if (["failed", "결제실패", "paymentfailed"].includes(statusToken)) {
    return {
      kind: "failed",
      label: "결제 실패",
      needsCheck: true,
      actionLabel: "결제 실패 확인",
    };
  }

  if (["canceled", "cancelled", "결제취소"].includes(statusToken)) {
    return {
      kind: "canceled",
      label: "결제 취소",
      needsCheck: false,
      actionLabel: null,
    };
  }

  if (["refunded", "refundcompleted", "환불", "환불완료"].includes(statusToken)) {
    return {
      kind: "refunded",
      label: "환불 완료",
      needsCheck: false,
      actionLabel: null,
    };
  }

  const isPending =
    !statusToken || ["pending", "결제대기", "대기중", "paymentpending"].includes(statusToken);

  if (isPending && isBankTransfer) {
    return {
      kind: "bank_pending",
      label: "입금 확인 대기",
      needsCheck: true,
      actionLabel: "입금 확인하기",
    };
  }

  if (isPending && isOnlinePayment) {
    return {
      kind: "pg_pending",
      label: "PG 승인 확인 대기",
      needsCheck: true,
      actionLabel: "PG 상태 확인하기",
    };
  }

  if (isPending) {
    return {
      kind: "pending",
      label: "결제 확인 대기",
      needsCheck: true,
      actionLabel: "결제 확인하기",
    };
  }

  return {
    kind: "other",
    label: getCommonPaymentStatusLabel(paymentStatus) ?? paymentStatus ?? "결제 상태 미확인",
    needsCheck: false,
    actionLabel: null,
  };
}
