// 아이콘 + 라벨 + 값(복사 버튼 선택) 정의형 행 (v0 톤)
'use client';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InfoItem({ icon, label, value, onCopy, mono = false, className }: { icon?: React.ReactNode; label: string; value: React.ReactNode; onCopy?: () => void; mono?: boolean; className?: string }) {
  return (
    <div className={cn('flex gap-3 py-1.5', className)}>
      <div className="w-16 shrink-0 text-sm text-muted-foreground/90 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('flex-1 text-sm', mono && 'tabular-nums')}>{value}</div>
      {onCopy && (
        <button onClick={onCopy} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent dark:hover:bg-accent" title="복사">
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
