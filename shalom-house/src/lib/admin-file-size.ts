/** Format stored byte counts for display only; upload limits remain unchanged. */
export function formatAdminFileSize(byteSize: number): string {
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) return "크기 확인 불가";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let unit = 0;
  while (byteSize / 1024 ** unit >= 1024 && unit < units.length - 1) unit += 1;

  let value = byteSize / 1024 ** unit;
  let rounded = Math.round(value * 10) / 10;
  if (rounded >= 1024 && unit < units.length - 1) {
    unit += 1;
    value = byteSize / 1024 ** unit;
    rounded = Math.round(value * 10) / 10;
  }
  const prefix = rounded === value ? "" : "약 ";
  return `${prefix}${rounded.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}
