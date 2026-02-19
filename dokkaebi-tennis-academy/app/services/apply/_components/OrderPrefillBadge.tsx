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
      <div className="inline-flex items-center gap-2 rounded-lg bg-primary  to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-border dark:border-border px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent0 dark:bg-primary animate-pulse" />
          <span className="font-semibold text-primary dark:text-primary">프리필</span>
        </div>
        <span className="h-4 w-px bg-primary dark:bg-primary" />
        <span className="text-sm text-muted-foreground dark:text-muted-foreground">{typeLabel}</span>
        <code className="rounded bg-card dark:bg-card px-2 py-0.5 text-xs font-mono text-primary dark:text-primary border border-border dark:border-border">{resolvedId}</code>
        <span className="text-sm text-muted-foreground dark:text-muted-foreground">기준으로 자동 채워짐</span>
      </div>
    </div>
  );
}
