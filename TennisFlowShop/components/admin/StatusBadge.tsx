// 상태 뱃지 하나로 통일: active/suspended/deleted
'use client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { adminTypography } from '@/components/admin/admin-typography';
import { badgeToneVariant } from '@/lib/badge-style';

type Status = 'active' | 'suspended' | 'deleted';

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const tone = status === 'active' ? 'success' : status === 'suspended' ? 'neutral' : 'danger';

  const label = status === 'active' ? '활성' : status === 'suspended' ? '비활성' : '삭제됨';

  return (
    <Badge variant={badgeToneVariant(tone)} className={cn('px-2.5 py-0.5 font-medium shadow-sm', adminTypography.badgeLabel, className)}>
      {label}
    </Badge>
  );
}
