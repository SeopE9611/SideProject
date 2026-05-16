export function isMountableStringByFee(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function hasPaidMountingFee(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isMountableStringItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;

  const maybeItem = item as {
    isMountableString?: unknown;
    mountingFee?: unknown;
  };

  return (
    maybeItem.isMountableString === true ||
    (maybeItem.isMountableString !== false &&
      isMountableStringByFee(maybeItem.mountingFee))
  );
}
