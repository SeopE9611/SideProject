'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type Props = {
  badgeLabel: string;
  description: string;
  reasonSummary?: string;
  tone?: 'warning' | 'success' | 'destructive';
  className?: string;
  rightSlot?: ReactNode;
  children?: ReactNode;
};

const toneClassMap: Record<NonNullable<Props['tone']>, string> = {
  warning: 'text-warning',
  success: 'text-success',
  destructive: 'text-destructive',
};

const badgeVariantMap: Record<NonNullable<Props['tone']>, 'warning' | 'success' | 'destructive'> = {
  warning: 'warning',
  success: 'success',
  destructive: 'destructive',
};

export default function AdminCancelRequestCard({ badgeLabel, description, reasonSummary, tone = 'warning', className, rightSlot, children }: Props) {
  const toneClassName = toneClassMap[tone];

  return (
    <div className={cn('mt-4 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm text-foreground', className)}>
      <div className={cn('grid gap-3', rightSlot ? 'md:grid-cols-2' : undefined)}>
        <div>
          <p className="flex items-center gap-2 font-medium text-foreground">
            취소 요청 상태
            <Badge variant={badgeVariantMap[tone]}>{badgeLabel}</Badge>
          </p>
          <p className={cn('mt-1', toneClassName)}>{description}</p>
          {reasonSummary && <p className={cn('mt-1 text-xs', toneClassName)}>사유: {reasonSummary}</p>}
          {children}
        </div>
        {rightSlot}
      </div>
    </div>
  );
}
