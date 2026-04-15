const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(value: string | undefined): boolean {
  return ENABLED_VALUES.has(String(value ?? "").trim().toLowerCase());
}

export const ENABLE_NICE_PAYMENTS = parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_NICE_PAYMENTS ?? process.env.ENABLE_NICE_PAYMENTS ?? "false");
export const ENABLE_TOSS_PAYMENTS_RAW = parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_TOSS_PAYMENTS ?? process.env.ENABLE_TOSS_PAYMENTS ?? "false");

export function isNicePaymentsEnabled(): boolean {
  return ENABLE_NICE_PAYMENTS;
}

// 운영 정책: 일반 체크아웃에서는 NicePG를 우선 노출한다.
// 둘 다 true로 설정된 경우 Toss를 자동으로 비활성화해 충돌을 방지한다.
export function isTossPaymentsEnabled(): boolean {
  if (ENABLE_NICE_PAYMENTS) return false;
  return ENABLE_TOSS_PAYMENTS_RAW;
}
