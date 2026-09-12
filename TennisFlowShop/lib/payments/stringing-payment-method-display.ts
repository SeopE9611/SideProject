export function getStringingPaymentMethodDisplayLabel(
  method?: string | null,
  packageApplied?: boolean,
): string {
  if (
    packageApplied ||
    String(method ?? "")
      .trim()
      .toLowerCase() === "package"
  ) {
    return "패키지 사용";
  }

  const raw = String(method ?? "").trim();
  const token = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (!token) return "결제 정보 확인 중";

  if (
    raw.includes("무통장") ||
    raw.includes("계좌") ||
    token.includes("bank") ||
    token.includes("virtualaccount") ||
    token.includes("deposit") ||
    token.includes("transfer")
  ) {
    return "무통장입금";
  }
  if (raw.includes("카드") || token.includes("card") || token === "nicepay") {
    return "카드 결제";
  }
  if (token.includes("pay")) return "간편결제";

  return "결제 정보 확인 중";
}
