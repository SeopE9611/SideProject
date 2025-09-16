// 카드 섹션 래퍼: 헤더/내용/액션을 한결같은 스타일로 (v0 톤)
// - ring-black/* 제거
// - 은은한 배경 + 얇은 테두리 + 작은 그림자
'use client';
import { cn } from '@/lib/utils';

export function Section({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={cn('rounded-2xl border bg-white/70 dark:bg-slate-950/60 shadow-sm', 'border-slate-200/70 dark:border-slate-800/70', className)}>{children}</section>;
}

export function SectionHeader({ title, aside }: { title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between px-4 sm:px-5 py-3', 'rounded-t-2xl border-b border-slate-200/70 dark:border-slate-800/70', 'bg-gradient-to-b from-slate-50/70 to-white/30 dark:from-slate-900/50 dark:to-slate-950/30')}>
      <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
      {aside}
    </div>
  );
}

export function SectionBody({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-4 sm:px-6 py-4', className)}>{children}</div>;
}
