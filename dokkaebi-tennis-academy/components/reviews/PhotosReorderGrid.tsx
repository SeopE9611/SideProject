'use client';
import { X } from 'lucide-react';
import { useRef } from 'react';

/**
 * 초경량 사진 정렬 컴포넌트 (HTML5 DnD)
 * - value: string[] (썸네일 URL)
 * - onChange: (next) => void
 * - disabled?: boolean
 */
export default function PhotosReorderGrid({ value, onChange, disabled, className, columns = 5 }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean; className?: string; columns?: 4 | 5 }) {
  const dragFrom = useRef<number | null>(null);
  if (!Array.isArray(value) || value.length === 0) return null;

  // 업로더에서 완료 썸네일을 숨기는 경우(=아래 그리드만 남기는 UX),
  // 사용자가 사진을 삭제할 수 있도록 그리드에서도 삭제 버튼을 제공한다.
  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

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
          className={`group relative aspect-square rounded-md overflow-hidden ring-1 ring-border/10 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-move'}`}
          aria-label={`사진을 위치 ${idx + 1}로 이동`}
          title={disabled ? '지금은 정렬할 수 없습니다' : '썸네일을 드래그하여 순서를 바꿀 수 있어요'}
        >
          <img src={src} alt={`리뷰 사진 ${idx + 1}`} className="h-full w-full object-cover select-none pointer-events-none" draggable={false} />
          <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-overlay/60 text-foreground">{idx + 1}</span>
          {!disabled && <span className="absolute bottom-1 right-1 text-[10px] px-1 py-0.5 rounded bg-card/80 text-foreground shadow">드래그</span>}
          {!disabled && (
            <button
              type="button"
              aria-label="사진 삭제"
              title="삭제"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeAt(idx);
              }}
              className="absolute top-1 right-1 inline-flex p-1 rounded-full bg-overlay/55 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
