const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(value: string | undefined): boolean {
  return ENABLED_VALUES.has(String(value ?? "").trim().toLowerCase());
}

export const ENABLE_TOSS_PAYMENTS = parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_TOSS_PAYMENTS ?? process.env.ENABLE_TOSS_PAYMENTS ?? "false");

export function isTossPaymentsEnabled(): boolean {
  return ENABLE_TOSS_PAYMENTS;
}
