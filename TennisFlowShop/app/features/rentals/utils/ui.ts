function isRentalReturnedStatus(status?: string | null) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return normalized === "returned" || normalized.includes("반납완료");
}

export function getDepositBanner(opts: {
  status: string;
  returnedAt?: string;
  depositRefundedAt?: string;
}) {
  const { status, returnedAt, depositRefundedAt } = opts;
  if (!isRentalReturnedStatus(status)) return null;

  // 이미 환불 완료
  if (depositRefundedAt) {
    return {
      tone: "success" as const,
      title: "보증금 환불 완료",
      desc: `환불 시각: ${new Date(depositRefundedAt).toLocaleString()}`,
    };
  }

  // 반납 완료, 환불 대기
  return {
    tone: "info" as const,
    title: "반납 확인됨 · 보증금 환불 대기",
    desc: returnedAt ? `반납 시각: ${new Date(returnedAt).toLocaleString()}` : undefined,
  };
}
