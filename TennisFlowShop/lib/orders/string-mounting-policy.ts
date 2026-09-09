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
    (maybeItem.isMountableString !== false && isMountableStringByFee(maybeItem.mountingFee))
  );
}

export function resolveOrderItemIsMountableString(
  item: unknown,
  currentProductMountingFee: unknown,
): boolean {
  if (!item || typeof item !== "object") {
    return isMountableStringByFee(currentProductMountingFee);
  }

  const snapshot = item as {
    isMountableString?: unknown;
    mountingFee?: unknown;
  };

  if (typeof snapshot.isMountableString === "boolean") {
    return snapshot.isMountableString;
  }

  if (
    Object.prototype.hasOwnProperty.call(snapshot, "mountingFee") &&
    snapshot.mountingFee !== null &&
    snapshot.mountingFee !== undefined
  ) {
    return isMountableStringByFee(snapshot.mountingFee);
  }

  return isMountableStringByFee(currentProductMountingFee);
}
