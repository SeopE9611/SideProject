'use client';
import { Badge } from '@/components/ui/badge';

type OrderPrefillBadgeProps = {
  orderId?: string | null;
  rentalId?: string | null;
};

export default function OrderPrefillBadge({ orderId, rentalId }: OrderPrefillBadgeProps) {
  const resolvedId = orderId ?? rentalId;
  if (!resolvedId) return null;

  const typeLabel = orderId ? '주문' : '대여';

  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
          <span className="font-semibold text-blue-900 dark:text-blue-100">프리필</span>
        </div>
        <span className="h-4 w-px bg-blue-200 dark:bg-blue-700" />
        <span className="text-sm text-slate-600 dark:text-slate-300">{typeLabel}</span>
        <code className="rounded bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-mono text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">{resolvedId}</code>
        <span className="text-sm text-slate-600 dark:text-slate-300">기준으로 자동 채워짐</span>
      </div>
    </div>
  );
}
