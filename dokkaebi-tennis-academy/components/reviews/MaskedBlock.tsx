'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  children: React.ReactNode; // 뒤에서 흐리게 보일 내용(없어도 됨)
  label?: string; // 오버레이 문구
  className?: string; // 바깥 래퍼 커스텀
  blurStrength?: number; // px
};

export default function MaskedBlock({ children, label = '비공개된 리뷰입니다. 관리자와 작성자만 확인할 수 있어요.', className, blurStrength = 3 }: Props) {
  return (
    <div className={clsx('relative rounded-md border border-slate-300/80 overflow-hidden', 'bg-white/60', className)}>
      {/* 아래층(블러 처리) */}
      <div aria-hidden className="pointer-events-none select-none" style={{ filter: `blur(${blurStrength}px)` }}>
        {/* children이 없을 때도 형태감이 보이도록 플래시홀더 */}
        <div className="p-3">
          {children ?? (
            <div className="space-y-2 opacity-70">
              <div className="h-3 w-11/12 rounded bg-slate-200" />
              <div className="h-3 w-10/12 rounded bg-slate-200" />
              <div className="h-3 w-9/12 rounded bg-slate-200" />
            </div>
          )}
        </div>
      </div>

      {/* 위층(안내문 오버레이) */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex items-center gap-2 rounded-md bg-white/85 backdrop-blur px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-300 shadow-sm">
          <Shield className="h-4 w-4 text-slate-500" />
          <span className="text-[13px]">{label}</span>
        </div>
      </div>
    </div>
  );
}
