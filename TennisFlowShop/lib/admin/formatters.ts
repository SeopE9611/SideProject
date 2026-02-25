export function formatAdminNumber(n: number) {
  return new Intl.NumberFormat('ko-KR').format(Number(n || 0));
}

export function formatAdminKRW(n: number) {
  return `${formatAdminNumber(n)}원`;
}

export function formatIsoToKstShort(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '-';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
