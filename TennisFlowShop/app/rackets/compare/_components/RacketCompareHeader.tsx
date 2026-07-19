import { ArrowLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RacketCompareHeader({
  count,
  onBackToFinder,
  onClear,
}: {
  count: number;
  onBackToFinder: () => void;
  onClear: () => void;
}) {
  return (
    <header className="rounded-2xl border border-border bg-card p-4 shadow-sm bp-sm:p-6">
      <div className="flex flex-col gap-4 bp-md:flex-row bp-md:items-end bp-md:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-ui-label font-semibold tracking-[0.16em] text-muted-foreground">
            RACKET COMPARE
          </p>
          <h1 className="text-ui-section-title font-semibold text-foreground bp-sm:text-ui-page-title">
            라켓 비교
          </h1>
          <p className="max-w-2xl break-keep text-ui-body-sm text-muted-foreground">
            최대 4개의 라켓을 스펙별로 비교합니다. 첫 번째 라켓을 기준으로 차이를 표시합니다.
          </p>
          <p className="text-ui-body-sm font-medium text-foreground" aria-live="polite">
            선택 {count} / 4
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 bp-sm:flex bp-sm:items-center">
          <Button
            variant="outline"
            onClick={onBackToFinder}
            className="min-w-0 rounded-lg bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            라켓 찾기로
          </Button>
          <Button
            variant="ghost"
            onClick={onClear}
            disabled={count === 0}
            className="min-w-0 rounded-lg text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            모두 삭제
          </Button>
        </div>
      </div>
    </header>
  );
}
