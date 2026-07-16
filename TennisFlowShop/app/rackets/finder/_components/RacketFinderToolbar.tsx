import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const summary = !hasSearched
    ? "필터 선택 후 검색해 주세요"
    : hasError
      ? "총 -개 · -/- 페이지"
      : isLoading
        ? "조회 중"
        : `총 ${(total ?? 0).toLocaleString()}개 · ${page}/${totalPages ?? "-"} 페이지`;

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 bp-md:grid-cols-[auto_minmax(0,1fr)_auto_auto] bp-md:items-center bp-lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="bp-lg:hidden">{filterTrigger}</div>
        <div className="min-w-0 text-ui-body-sm text-muted-foreground bp-md:order-2 bp-lg:order-1">
          <span className="break-keep">{summary}</span>
        </div>
        {hasSearched ? (
          <Select value={sort} onValueChange={(value) => onSortChange(value as T)}>
            <SelectTrigger className="h-10 min-h-10 w-full rounded-control bg-background/80 focus:ring-primary/50 bp-md:order-3 bp-md:w-[168px] dark:bg-muted/30">
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
        ) : (
          <div className="h-10 bp-md:order-3" aria-hidden="true" />
        )}
        <div className="flex justify-end bp-md:order-4">
          <Button variant="ghost" size="icon" disabled={!canGoPrevious} onClick={onPrevious} className="h-10 w-10 rounded-r-none" aria-label="이전 결과 페이지">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" disabled={!canGoNext} onClick={onNext} className="h-10 w-10 rounded-l-none" aria-label="다음 결과 페이지">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
