'use client';

import { usedBadgeMeta, type UsedBadgeKind } from '@/lib/badge-style';

type Props = {
  kind: UsedBadgeKind; // 'rental' | 'condition'
  state: string; // 상태코드(e.g. 'available', 'A' 등)
  className?: string;
  as?: 'span' | 'div';
};

export default function StatusBadge({ kind, state, className = '', as = 'span' }: Props) {
  const Comp: any = as;
  const meta = usedBadgeMeta(kind, state);

  return <Comp className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border shadow-sm ${meta.className} ${className}`}>{meta.label}</Comp>;
}
