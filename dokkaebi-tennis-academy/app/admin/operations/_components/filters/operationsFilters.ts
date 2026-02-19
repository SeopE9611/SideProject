import type { OpsKind } from '@/lib/admin-ops-taxonomy';

export type Kind = OpsKind;
export type Flow = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function prevMonthYyyymmKST() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}${String(pm).padStart(2, '0')}`;
}

export function flowBadgeClass(flow?: Flow) {
  if (!flow) return 'bg-card text-foreground';
  if (flow === 3) return 'bg-card text-foreground';
  if (flow === 6 || flow === 7) return 'bg-violet-500/10 text-violet-700';
  if (flow === 4 || flow === 5) return 'bg-orange-500/10 text-orange-700';
  return 'bg-sky-500/10 text-sky-700';
}

export function settlementBadgeClass() {
  return 'bg-card text-muted-foreground';
}
