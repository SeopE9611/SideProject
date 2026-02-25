import type { OpsKind } from '@/lib/admin-ops-taxonomy';
import { flowBadgeClass as sharedFlowBadgeClass, linkBadgeClass } from '@/lib/badge-style';

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
  return sharedFlowBadgeClass(flow);
}

export function settlementBadgeClass() {
  return linkBadgeClass('standalone');
}
