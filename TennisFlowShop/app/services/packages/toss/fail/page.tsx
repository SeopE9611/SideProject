import { PaymentFailureResult } from "@/components/checkout/PaymentFailureResult";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 실패",
};

const FAIL_GUIDE_MAP: Record<
  string,
  { title: string; description: string[]; accent?: "default" | "warning" }
> = {
  USER_CANCEL: {
    title: "패키지 결제를 완료하지 못했어요",
    description: [
      "결제창을 닫았거나 결제를 취소했어요.",
      "결제수단을 다시 선택한 뒤 결제를 다시 시도해주세요.",
    ],
  },
  INVALID_QUERY: {
    title: "결제 결과 정보가 올바르지 않아요",
    description: [
      "결제 결과를 확인하는 중 필수 값이 누락되었어요.",
      "패키지 체크아웃으로 돌아가 다시 결제를 진행해주세요.",
    ],
  },
  CONFIRM_FAILED: {
    title: "결제 승인 확인에 실패했어요",
    description: [
      "결제 승인 요청 중 문제가 발생했어요.",
      "잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
    ],
  },
  AMOUNT_MISMATCH: {
    title: "결제 금액 검증에 실패했어요",
    description: [
      "결제 금액이 패키지 정보와 일치하지 않아 결제가 중단되었어요.",
      "패키지 체크아웃으로 돌아가 금액을 다시 확인한 뒤 시도해주세요.",
    ],
  },
  SESSION_NOT_FOUND: {
    title: "결제 세션을 찾지 못했어요",
    description: [
      "결제 준비 정보가 없어 결제를 완료할 수 없어요.",
      "패키지 체크아웃에서 다시 결제를 진행해주세요.",
    ],
  },
  SESSION_EXPIRED: {
    title: "결제 유효시간이 만료되었어요",
    description: [
      "결제 준비 시간이 지나 결제를 이어서 진행할 수 없어요.",
      "패키지 체크아웃으로 돌아가 다시 결제를 시도해주세요.",
    ],
  },
  ORDER_CREATION_FAILED_AFTER_PAYMENT_CONFIRM: {
    title: "결제 후 주문 처리 중 문제가 발생했어요",
    description: [
      "결제 승인 이후 패키지 주문 생성 단계에서 오류가 발생했어요.",
      "이미 결제가 완료되었을 수 있으니 주문 내역 또는 관리자 확인이 필요합니다.",
    ],
    accent: "warning",
  },
  UNKNOWN: {
    title: "패키지 결제를 완료하지 못했어요",
    description: [
      "결제 처리 중 문제가 발생했어요.",
      "패키지 체크아웃으로 돌아가 다시 시도해주세요.",
    ],
  },
};

export default async function PackageTossFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const rawCode = (sp.code || "UNKNOWN").trim().toUpperCase();
  const code = FAIL_GUIDE_MAP[rawCode] ? rawCode : "UNKNOWN";
  const guide = FAIL_GUIDE_MAP[code];
  const rawMessage = (sp.message || "").trim();

  return (
    <PaymentFailureResult
      guide={guide}
      code={code}
      message={rawMessage}
      primaryAction={{
        label: "패키지 목록으로 돌아가기",
        href: "/services/packages",
      }}
      secondaryAction={{
        label: "패키지 체크아웃으로 이동",
        href: "/services/packages/checkout",
      }}
      warningMessage="중복 결제를 막기 위해 같은 패키지로 반복 결제하지 마시고, 주문 내역 또는 관리자 확인 후 진행해주세요."
    />
  );
}
