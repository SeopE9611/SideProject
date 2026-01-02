import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function SiteContainer({ className, children, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        // base(≤575): 패딩 조금 더 타이트
        'mx-auto w-full px-3',
        // 576~767
        'bp-sm:px-4',
        // 768~1199
        'bp-md:px-6',
        // ≥1200: TW처럼 중앙 고정 폭 (원하면 1240~1280 등으로 조정 가능)
        'bp-lg:max-w-[1200px] bp-lg:px-6',
        className
      )}
    >
      {children}
    </div>
  );
}
