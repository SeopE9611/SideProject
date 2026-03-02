'use client';

import { Badge } from '@/components/ui/badge';
import { usedBadgeMeta, type UsedBadgeKind } from '@/lib/badge-style';
import { cn } from '@/lib/utils';

type Props = {
  kind: UsedBadgeKind; // 'rental' | 'condition'
  state: string; // 상태코드(e.g. 'available', 'A' 등)
  className?: string;
  as?: 'span' | 'div';
};

export default function StatusBadge({ kind, state, className = '', as = 'span' }: Props) {
  const meta = usedBadgeMeta(kind, state);

  if (as === 'div') {
    return (
      <Badge variant={meta.variant} className={cn('rounded px-2 py-0.5 text-xs font-medium shadow-sm', className)}>
        <div>{meta.label}</div>
      </Badge>
    );
  }

  return (
    <Badge variant={meta.variant} className={cn('rounded px-2 py-0.5 text-xs font-medium shadow-sm', className)}>
      {meta.label}
    </Badge>
  );
}
