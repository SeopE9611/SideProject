import { PaymentFailureResult } from "@/components/checkout/PaymentFailureResult";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 실패",
};

const FAIL_GUIDE_MAP: Record<
  string,
  { title: string; description: string[]; accent?: "default" | "warning" }
> = {
  INVALID_QUERY: {
    title: "결제 결과 정보가 올바르지 않아요",
    description: ["결제 결과를 확인하는 데 필요한 정보가 누락되었어요.", "결제 링크를 다시 확인해주세요."],
  },
  SESSION_NOT_FOUND: {
    title: "결제 세션을 찾지 못했어요",
    description: ["결제 준비 정보를 찾을 수 없어 결제를 완료하지 못했어요.", "결제 링크에서 다시 시도해주세요."],
  },
  SESSION_EXPIRED: {
    title: "결제 유효시간이 만료되었어요",
    description: ["결제 준비 시간이 지나 결제를 이어서 진행할 수 없어요.", "결제 링크에서 다시 결제를 진행해주세요."],
  },
  PAYMENT_SESSION_ALREADY_PROCESSING: {
    title: "결제가 이미 처리 중이에요",
    description: [
      "앞서 요청한 결제 결과를 확인하고 있어요.",
      "반복 결제하지 말고 결제 상태 또는 고객센터에서 먼저 확인해주세요.",
    ],
    accent: "warning",
  },
  AUTH_FAILED: {
    title: "인증 단계에서 결제가 중단되었어요",
    description: ["결제 인증 결과를 확인하는 중 문제가 발생했어요.", "잠시 후 결제 링크에서 다시 시도해주세요."],
  },
  AMOUNT_MISMATCH: {
    title: "결제 정보 검증에 실패했어요",
    description: ["결제 금액과 요청 정보가 일치하지 않아 결제가 중단되었어요.", "결제 링크의 금액을 확인한 뒤 다시 시도해주세요."],
  },
  APPROVE_FAILED: {
    title: "승인 처리에 실패했어요",
    description: ["결제 승인 요청 중 문제가 발생했어요.", "잠시 후 다시 시도하거나 고객센터로 문의해주세요."],
  },
  ORDER_CREATION_FAILED_AFTER_PAYMENT_APPROVE: {
    title: "승인 후 결제 처리 중 문제가 발생했어요",
    description: [
      "결제 승인은 완료됐지만 개인결제 상태 반영 중 문제가 발생했어요.",
      "반복 결제하지 말고 결제 상태 또는 고객센터에서 먼저 확인해주세요.",
    ],
    accent: "warning",
  },
  PAYMENT_PROCESSING_FAILED: {
    title: "결제 처리 결과를 확인해야 해요",
    description: [
      "개인결제 처리 결과가 아직 명확하게 확정되지 않았어요.",
      "반복 결제하지 말고 결제 상태 또는 고객센터에서 먼저 확인해주세요.",
    ],
    accent: "warning",
  },
  UNKNOWN: {
    title: "결제를 완료하지 못했어요",
    description: ["결제 처리 중 문제가 발생했어요.", "결제 링크를 확인한 뒤 다시 시도해주세요."],
  },
};

const PAYMENT_ID_RE = /^[a-fA-F0-9]{24}$/;

export default async function PrivatePaymentNiceFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; paymentId?: string }>;
}) {
  const params = await searchParams;
  const rawCode = (params.code || "UNKNOWN").trim().toUpperCase();
  const code = FAIL_GUIDE_MAP[rawCode] ? rawCode : "UNKNOWN";
  const guide = FAIL_GUIDE_MAP[code];
  const rawMessage = (params.message || "").trim();
  const paymentId = (params.paymentId || "").trim();
  const paymentHref = PAYMENT_ID_RE.test(paymentId)
    ? `/private-payments/${encodeURIComponent(paymentId)}`
    : null;
  const requiresPaymentCheck = guide.accent === "warning";

  return (
    <PaymentFailureResult
      guide={guide}
      code={code}
      message={rawMessage}
      primaryAction={
        paymentHref
          ? {
              label: requiresPaymentCheck ? "결제 상태 확인" : "결제 링크로 돌아가기",
              href: paymentHref,
            }
          : { label: "홈으로 이동", href: "/" }
      }
      secondaryAction={
        requiresPaymentCheck ? { label: "고객센터로 이동", href: "/support" } : undefined
      }
      warningMessage="결제 승인이 완료됐을 가능성이 있으니 같은 개인결제를 바로 반복하지 마시고, 먼저 결제 상태 또는 고객센터에서 확인해주세요."
    />
  );
}
