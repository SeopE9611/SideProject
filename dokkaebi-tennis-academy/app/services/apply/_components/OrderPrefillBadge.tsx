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
      <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted dark:bg-card/60 animate-pulse" />
          <span className="font-semibold text-primary">프리필</span>
        </div>
        <span className="h-4 w-px bg-primary/40" />
        <span className="text-sm text-muted-foreground">{typeLabel}</span>
        <code className="rounded bg-card px-2 py-0.5 text-xs font-mono text-primary border border-border">{resolvedId}</code>
        <span className="text-sm text-muted-foreground">기준으로 자동 채워짐</span>
      </div>
    </div>
  );
}
