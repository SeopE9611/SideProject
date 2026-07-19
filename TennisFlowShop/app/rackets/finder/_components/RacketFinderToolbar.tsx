import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption<T extends string> = { value: T; label: string };

type RacketFinderToolbarProps<T extends string> = {
  filterTrigger: ReactNode;
  hasSearched: boolean;
  total: number | null;
  page: number;
  totalPages: number | null;
  isLoading: boolean;
  hasError: boolean;
  sort: T;
  sortOptions: SortOption<T>[];
  onSortChange: (value: T) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function RacketFinderToolbar<T extends string>({
  filterTrigger,
  hasSearched,
  total,
  page,
  totalPages,
  isLoading,
  hasError,
  sort,
  sortOptions,
  onSortChange,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: RacketFinderToolbarProps<T>) {
  if (!hasSearched) {
    return (
      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 bp-lg:grid-cols-1">
          <div className="bp-lg:hidden">{filterTrigger}</div>
          <p className="min-w-0 break-keep text-ui-body-sm text-muted-foreground">
            필터 선택 후 검색해 주세요
          </p>
        </div>
      </section>
    );
  }

  const summary = hasError
    ? "총 -개 · -/- 페이지"
    : isLoading
      ? "조회 중"
      : `총 ${(total ?? 0).toLocaleString()}개 · ${page}/${totalPages ?? "-"} 페이지`;

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 bp-md:grid-cols-[auto_minmax(0,1fr)_auto_auto] bp-md:items-center bp-lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="col-start-1 row-start-1 bp-md:col-auto bp-md:row-auto bp-md:order-1 bp-lg:hidden">
          {filterTrigger}
        </div>
        <Select value={sort} onValueChange={(value) => onSortChange(value as T)}>
          <SelectTrigger className="col-start-2 row-start-1 h-10 min-h-10 w-full min-w-0 rounded-control bg-background/80 focus:ring-primary/50 bp-md:col-auto bp-md:row-auto bp-md:order-3 bp-md:w-[168px] dark:bg-muted/30">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="col-start-1 row-start-2 min-w-0 self-center text-ui-body-sm text-muted-foreground bp-md:col-auto bp-md:row-auto bp-md:order-2 bp-lg:order-1">
          <span className="break-keep">{summary}</span>
        </div>
        <div className="col-start-2 row-start-2 flex justify-end bp-md:col-auto bp-md:row-auto bp-md:order-4">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoPrevious}
            onClick={onPrevious}
            className="h-10 w-10 rounded-r-none"
            aria-label="이전 결과 페이지"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoNext}
            onClick={onNext}
            className="h-10 w-10 rounded-l-none"
            aria-label="다음 결과 페이지"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
