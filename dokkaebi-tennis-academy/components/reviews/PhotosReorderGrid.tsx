'use client';
import React, { useRef } from 'react';

/**
 * 초경량 사진 정렬 컴포넌트 (HTML5 DnD)
 * - value: string[] (썸네일 URL)
 * - onChange: (next) => void
 * - disabled?: boolean
 */
export default function PhotosReorderGrid({ value, onChange, disabled, className, columns = 5 }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean; className?: string; columns?: 4 | 5 }) {
  const dragFrom = useRef<number | null>(null);
  if (!Array.isArray(value) || value.length === 0) return null;

  const reorder = (list: string[], fromIdx: number, toIdx: number) => {
    const arr = list.slice();
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    return arr;
  };

  const colsClass = columns === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <ul className={`grid ${colsClass} gap-2 mt-2 ${className ?? ''}`} data-cy="photos-grid">
      {value.map((src, idx) => (
        <li
          data-cy="photo-card"
          key={`${src}-${idx}`}
          draggable={!disabled}
          onDragEnd={() => {
            dragFrom.current = null;
          }}
          onDragStart={() => {
            if (!disabled) dragFrom.current = idx;
          }}
          onDragOver={(e) => {
            if (!disabled) e.preventDefault();
          }}
          onDrop={() => {
            const from = dragFrom.current;
            if (disabled || from === null || from === idx) return;
            onChange(reorder(value, from, idx));
            dragFrom.current = null;
          }}
          className={`relative aspect-square rounded-md overflow-hidden ring-1 ring-black/10 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-move'}`}
          aria-label={`사진을 위치 ${idx + 1}로 이동`}
          title={disabled ? '지금은 정렬할 수 없습니다' : '썸네일을 드래그하여 순서를 바꿀 수 있어요'}
        >
          <img src={src} alt={`리뷰 사진 ${idx + 1}`} className="h-full w-full object-cover select-none pointer-events-none" draggable={false} />
          <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">{idx + 1}</span>
          {!disabled && <span className="absolute bottom-1 right-1 text-[10px] px-1 py-0.5 rounded bg-card/80 text-foreground shadow">드래그</span>}
        </li>
      ))}
    </ul>
  );
}
