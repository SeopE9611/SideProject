// 상태 뱃지 하나로 통일: active/suspended/deleted
'use client';
import { cn } from '@/lib/utils';

type Status = 'active' | 'suspended' | 'deleted';

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  // 상태별 톤 매핑 (사이트 톤에 맞춘 파스텔)
  const tone = status === 'active' ? 'bg-emerald-100 text-emerald-700' : status === 'suspended' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700';

  const label = status === 'active' ? '활성' : status === 'suspended' ? '비활성' : '삭제됨';

  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', 'shadow-sm ring-1 ring-black/[0.03]', tone, className)}>{label}</span>;
}
