import type { Flow, Kind } from '../filters/operationsFilters';

export type SettlementAnchor = 'order' | 'rental' | 'application';

export type OpItem = {
  id: string;
  kind: Kind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string;
  statusLabel: string;
  paymentLabel?: string;
  amount: number;
  amountNote?: string;
  amountReference?: number;
  amountReferenceLabel?: string;
  flow: Flow;
  flowLabel: string;
  settlementAnchor: SettlementAnchor;
  settlementLabel: string;
  href: string;
  related?: { kind: Kind; id: string; href: string } | null;
  isIntegrated: boolean;
  warnReasons?: string[];
  pendingReasons?: string[];
  warn?: boolean;
  needsReview?: boolean;
  reviewReasons?: string[];
};

export function formatKST(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}. ${mm}. ${dd}. ${hh}:${mi}`;
}

export function yyyymmKST(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).formatToParts(d);
  const map = parts.reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  if (!map.year || !map.month) return null;
  return `${map.year}${map.month}`;
}
