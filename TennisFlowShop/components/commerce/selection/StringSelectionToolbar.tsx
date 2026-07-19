import { Grid3X3, List, Search, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StringSelectionToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  stockFilter: "all" | "available";
  onStockFilterChange: (value: "all" | "available") => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
  total: number;
  isLoading: boolean;
  helper: string;
};

export function StringSelectionToolbar({
  searchValue,
  onSearchChange,
  onSearchClear,
  stockFilter,
  onStockFilterChange,
  viewMode,
  onViewModeChange,
  total,
  isLoading,
  helper,
}: StringSelectionToolbarProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-md:p-4">
      <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="string-search" className="sr-only">
            스트링명 또는 브랜드 검색
          </label>
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="string-search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="스트링명 또는 브랜드 검색"
            className="h-10 pl-10 pr-12 bp-sm:h-11"
          />
          {searchValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSearchClear}
              aria-label="스트링 검색어 지우기"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="flex w-full items-center gap-2 bp-sm:w-auto">
          <Select
            value={stockFilter}
            onValueChange={(value) => onStockFilterChange(value as "all" | "available")}
          >
            <SelectTrigger
              className="h-10 w-full rounded-control bp-sm:h-11 bp-sm:w-[180px]"
              aria-label="스트링 재고 필터"
            >
              <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 스트링</SelectItem>
              <SelectItem value="available">재고 있음</SelectItem>
            </SelectContent>
          </Select>

          <div
            className="hidden items-center gap-1 rounded-xl border border-border p-1 bp-md:flex"
            aria-label="보기 방식"
          >
            {(["grid", "list"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={viewMode === mode ? "secondary" : "ghost"}
                size="icon"
                aria-pressed={viewMode === mode}
                aria-label={mode === "grid" ? "그리드 보기" : "리스트 보기"}
                className={cn("h-10 w-10", viewMode === mode && "bg-secondary")}
                onClick={() => onViewModeChange(mode)}
              >
                {mode === "grid" ? (
                  <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <List className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3 text-ui-body-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <p>
            총 <span className="font-semibold text-foreground">{total}</span>개의 스트링
          </p>
        )}
        <p className="mt-1 break-keep text-ui-label">{helper}</p>
      </div>
    </section>
  );
}
