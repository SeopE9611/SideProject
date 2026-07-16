import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  activeCount: number;
  description?: ReactNode;
  children: ReactNode;
  onReset: () => void;
  onApply: () => void;
  applyLabel?: string;
  resetLabel?: string;
};

export function CatalogFilterPanelShell({
  title,
  activeCount,
  description,
  children,
  onReset,
  onApply,
  applyLabel = "적용하기",
  resetLabel = "초기화",
}: Props) {
  return (
    <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-border bg-card bp-md:h-dvh bp-md:max-h-none bp-md:rounded-none">
      <header className="shrink-0 border-b border-border p-4 bp-sm:p-5">
        <div>
          <h2 className="text-ui-section-title font-semibold text-foreground">{title}</h2>
          <p className="text-ui-label text-muted-foreground">적용 조건 {activeCount}개</p>
        </div>
        {description ? (
          <div className="mt-3 text-ui-body-sm text-muted-foreground">{description}</div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] bp-sm:p-5">
        {children}
      </div>
      <footer className="sticky bottom-0 flex shrink-0 gap-2 border-t border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-11 min-h-11 flex-1 rounded-control whitespace-nowrap"
        >
          {resetLabel}
        </Button>
        <Button
          type="button"
          variant="highlight_soft"
          onClick={onApply}
          className="h-11 min-h-11 flex-1 rounded-control whitespace-nowrap"
        >
          {applyLabel}
        </Button>
      </footer>
    </div>
  );
}
