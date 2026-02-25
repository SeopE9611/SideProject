// 카드 섹션 래퍼: 헤더/내용/액션을 한결같은 스타일로 (v0 톤)
// - ring-border/* 제거
// - 은은한 배경 + 얇은 테두리 + 작은 그림자
'use client';
import { cn } from '@/lib/utils';
import { adminTypography } from '@/components/admin/admin-typography';

export function Section({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={cn('rounded-2xl border bg-card/70 dark:bg-card/70 shadow-sm', 'border-border/70 dark:border-border/70', className)}>{children}</section>;
}

export function SectionHeader({ title, aside }: { title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between px-4 sm:px-5 py-3', 'rounded-t-2xl border-b border-border/70 dark:border-border/70', 'bg-background/70')}>
      <h3 className={adminTypography.panelTitle}>{title}</h3>
      {aside}
    </div>
  );
}

export function SectionBody({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-4 sm:px-6 py-4', className)}>{children}</div>;
}
