export function formatGaugeLabel(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/mm/i.test(raw)) return raw;
  return `${raw}mm`;
}
