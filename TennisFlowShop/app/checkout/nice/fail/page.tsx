import { PaymentFailureResult } from "@/components/checkout/PaymentFailureResult";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 실패",
};

const FAIL_GUIDE_MAP: Record<
  string,
  {
    title: string;
    description: string[];
    accent?: "default" | "warning";
  }
> = {
  PAYMENT_PROVIDER_DISABLED: {
    title: "현재 카드/간편결제를 사용할 수 없어요",
    description: [
      "운영 설정상 카드/간편결제가 비활성화되어 있어 결제를 진행할 수 없어요.",
      "다른 결제수단을 이용하거나 관리자에게 문의해주세요.",
    ],
  },
  USER_CANCEL: {
    title: "결제를 취소했어요",
    description: [
      "결제창에서 취소를 선택해 결제가 완료되지 않았어요.",
      "결제수단을 다시 선택한 뒤 결제를 다시 시도해주세요.",
    ],
  },
  AUTH_FAILED: {
    title: "인증 단계에서 결제가 중단되었어요",
    description: [
      "인증 결과 확인 중 문제가 발생했어요.",
      "잠시 후 다시 시도하거나 다른 결제수단을 이용해주세요.",
    ],
  },
  APPROVE_FAILED: {
    title: "승인 처리에 실패했어요",
    description: [
      "인증 후 승인 요청 중 문제가 발생했어요.",
      "잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
    ],
  },
  AMOUNT_MISMATCH: {
    title: "결제 금액 검증에 실패했어요",
    description: [
      "결제 금액이 주문 정보와 일치하지 않아 결제가 중단되었어요.",
      "체크아웃으로 돌아가 금액을 다시 확인한 뒤 시도해주세요.",
    ],
  },
  SESSION_NOT_FOUND: {
    title: "결제 세션을 찾지 못했어요",
    description: [
      "결제 준비 정보가 없어 결제를 완료할 수 없어요.",
      "체크아웃에서 다시 결제를 진행해주세요.",
    ],
  },
  SESSION_EXPIRED: {
    title: "결제 유효시간이 만료되었어요",
    description: [
      "결제 준비 시간이 지나 결제를 이어서 진행할 수 없어요.",
      "체크아웃으로 돌아가 다시 결제를 시도해주세요.",
    ],
  },
  ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE: {
    title: "승인 후 주문 생성 중 오류가 발생했어요",
    description: [
      "결제 승인은 완료됐지만 주문 생성 단계에서 문제가 발생했어요.",
      "중복 결제를 피하기 위해 주문 내역 또는 관리자 확인이 필요합니다.",
    ],
    accent: "warning",
  },
  PAYMENT_PROCESSING_FAILED: {
    title: "결제 처리 결과를 확인해야 해요",
    description: [
      "결제 처리 결과가 아직 명확하게 확정되지 않았어요.",
      "반복 결제하지 말고 주문 내역 또는 고객센터에서 먼저 확인해주세요.",
    ],
    accent: "warning",
  },
  UNKNOWN: {
    title: "결제를 완료하지 못했어요",
    description: ["결제 처리 중 문제가 발생했어요.", "체크아웃으로 돌아가 다시 시도해주세요."],
  },
};

export default async function NiceCheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const rawCode = (sp.code || "UNKNOWN").trim().toUpperCase();
  const code = FAIL_GUIDE_MAP[rawCode] ? rawCode : "UNKNOWN";
  const guide = FAIL_GUIDE_MAP[code];
  const rawMessage = (sp.message || "").trim();
  const requiresPaymentCheck = guide.accent === "warning";

  return (
    <PaymentFailureResult
      guide={guide}
      code={code}
      message={rawMessage}
      primaryAction={
        requiresPaymentCheck
          ? { label: "주문 내역 확인", href: "/mypage?tab=orders" }
          : { label: "체크아웃으로 돌아가기", href: "/checkout" }
      }
      secondaryAction={
        requiresPaymentCheck
          ? { label: "고객센터로 이동", href: "/support" }
          : { label: "장바구니로 이동", href: "/cart" }
      }
      warningMessage="결제 승인이 완료됐을 가능성이 있으니 같은 상품을 바로 반복 결제하지 마시고, 먼저 주문 내역 또는 고객센터에서 상태를 확인해주세요."
    />
  );
}
