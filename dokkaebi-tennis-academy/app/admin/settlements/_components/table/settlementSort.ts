import type { SettlementSnapshot } from '@/types/admin/settlements';

export type SortField = 'paid' | 'refund' | 'net' | 'orders' | 'applications' | 'packages';
export type SortDirection = 'asc' | 'desc' | null;

export function sortSettlementRows(data: SettlementSnapshot[] | undefined, sortField: SortField | null, sortDirection: SortDirection) {
  if (!data || !sortField || !sortDirection) return data;

  return [...data].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortField) {
      case 'paid':
        aVal = a.totals?.paid || 0;
        bVal = b.totals?.paid || 0;
        break;
      case 'refund':
        aVal = a.totals?.refund || 0;
        bVal = b.totals?.refund || 0;
        break;
      case 'net':
        aVal = a.totals?.net || 0;
        bVal = b.totals?.net || 0;
        break;
      case 'orders':
        aVal = a.breakdown?.orders || 0;
        bVal = b.breakdown?.orders || 0;
        break;
      case 'applications':
        aVal = a.breakdown?.applications || 0;
        bVal = b.breakdown?.applications || 0;
        break;
      case 'packages':
        aVal = a.breakdown?.packages || 0;
        bVal = b.breakdown?.packages || 0;
        break;
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
}
