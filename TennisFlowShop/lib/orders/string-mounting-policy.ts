export function isMountableStringByFee(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function hasPaidMountingFee(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
