// 상태 뱃지 하나로 통일: active/suspended/deleted
'use client';
import { cn } from '@/lib/utils';
import { adminTypography } from '@/components/admin/admin-typography';

type Status = 'active' | 'suspended' | 'deleted';

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  // 상태별 톤 매핑 (사이트 톤에 맞춘 파스텔)
  const tone = status === 'active' ? 'bg-primary/15 text-primary' : status === 'suspended' ? 'bg-muted text-muted-foreground' : 'bg-destructive/15 text-destructive';

  const label = status === 'active' ? '활성' : status === 'suspended' ? '비활성' : '삭제됨';

  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 font-medium', adminTypography.badgeLabel, 'shadow-sm ring-1 ring-border/70', tone, className)}>{label}</span>;
}
