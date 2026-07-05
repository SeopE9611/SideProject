import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type MypageSummaryItem = {
  label: ReactNode;
  value: ReactNode;
  /** 값이 비어있을 때 노출할 대체 텍스트 */
  fallback?: ReactNode;
  /** 값 영역에 추가 클래스(예: 강조 색상) */
  valueClassName?: string;
  /** 좁은 화면에서도 항상 보이게 할지 여부는 상위에서 제어 */
  className?: string;
};

type MypageSummaryStripProps = {
  items: MypageSummaryItem[];
  className?: string;
  /** 데스크톱 열 개수 (기본: 아이템 수 기반 자동) */
  columns?: 2 | 3 | 4;
};

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "bp-sm:grid-cols-2",
  3: "bp-sm:grid-cols-3",
  4: "bp-sm:grid-cols-2 bp-lg:grid-cols-4",
};

/**
 * 마이페이지 목록/상세 공통 "핵심 요약 스트립".
 * 결제 금액 · 날짜 · 배송/수령/반납 등 4개 내외의 핵심 사실을
 * 카드/상세에서 동일한 시각적 리듬으로 노출합니다. (UI 전용)
 */
export default function MypageSummaryStrip({ items, className, columns }: MypageSummaryStripProps) {
  const resolvedColumns: 2 | 3 | 4 =
    columns ?? (items.length >= 4 ? 4 : items.length === 2 ? 2 : 3);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2",
        COLUMN_CLASS[resolvedColumns],
        className,
      )}
    >
      {items.map((item, index) => {
        const isEmpty = item.value === null || item.value === undefined || item.value === "";
        return (
          <div
            key={index}
            className={cn("min-w-0 rounded-lg bg-card/80 px-3 py-2", item.className)}
          >
            <p className="text-ui-micro font-medium text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                "mt-1 truncate text-ui-body-sm font-semibold tabular-nums text-foreground",
                isEmpty && "font-normal text-muted-foreground",
                item.valueClassName,
              )}
            >
              {isEmpty ? (item.fallback ?? "-") : item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
