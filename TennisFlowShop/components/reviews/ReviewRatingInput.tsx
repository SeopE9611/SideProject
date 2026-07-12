"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useRef, useState } from "react";

type Props = { value: number; onChange?: (value: number) => void; disabled?: boolean; label?: string };

const SCORES = [1, 2, 3, 4, 5] as const;

export default function ReviewRatingInput({ value, onChange, disabled = false, label = "별점 선택" }: Props) {
  const [preview, setPreview] = useState<number | null>(null);
  const displayValue = preview ?? value;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const commitAndFocus = (next: number) => {
    if (disabled) return;
    const safeValue = Math.min(5, Math.max(1, next));
    setPreview(null);
    onChange?.(safeValue);
    requestAnimationFrame(() => {
      buttonRefs.current[safeValue - 1]?.focus();
    });
  };
  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <div role="radiogroup" aria-label={label} aria-disabled={disabled} className="flex justify-center gap-1.5">
        {SCORES.map((score) => {
          const selected = value === score;
          const filled = displayValue >= score;
          return (
            <button key={score} ref={(element) => { buttonRefs.current[score - 1] = element; }} type="button" role="radio" aria-checked={selected} aria-label={`${score}점`} disabled={disabled} tabIndex={disabled ? -1 : selected || (value === 0 && score === 1) ? 0 : -1} onMouseEnter={() => setPreview(score)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(score)} onBlur={() => setPreview(null)} onClick={() => commitAndFocus(score)} onKeyDown={(event) => {
              let nextScore: number | null = null;
              if (event.key === "ArrowRight" || event.key === "ArrowUp") nextScore = score + 1;
              else if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextScore = score - 1;
              else if (event.key === "Home") nextScore = 1;
              else if (event.key === "End") nextScore = 5;
              if (nextScore !== null) { event.preventDefault(); commitAndFocus(nextScore); }
            }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-ui-page-title-lg transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
              <Star aria-hidden="true" className={cn("h-8 w-8 stroke-current", filled ? "fill-current text-warning" : "fill-transparent text-muted-foreground")} />
            </button>
          );
        })}
      </div>
      <p className="text-center text-ui-body-sm font-semibold text-foreground" aria-live="polite">{value > 0 ? `${value}점 선택됨` : "아직 별점을 선택하지 않았어요"}</p>
    </div>
  );
}
