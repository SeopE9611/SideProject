import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ActiveFilterItem = { id: string; label: string; removeLabel: string; onRemove: () => void };
type ActiveFilterBarProps = { items: ActiveFilterItem[]; onResetAll: () => void; resetLabel?: string };
export function ActiveFilterBar({ items, onResetAll, resetLabel = "전체 초기화" }: ActiveFilterBarProps) {
  if (items.length === 0) return null;
  return <div className="flex items-center gap-2"><div className="relative min-w-0 flex-1 after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-card after:to-transparent"><div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1 pr-8"><span className="shrink-0 text-ui-label font-medium text-muted-foreground">적용 중</span>{items.map((item) => <span key={item.id} className="inline-flex max-w-[240px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-highlight-ink/30 bg-brand-highlight-muted px-2.5 py-1 text-ui-label text-brand-highlight-ink"><span className="min-w-0 truncate">{item.label}</span><button type="button" aria-label={item.removeLabel} onClick={item.onRemove} className="inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full text-brand-highlight-ink transition-colors hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3.5 w-3.5" /></button></span>)}</div></div><Button type="button" variant="ghost" size="sm" onClick={onResetAll} className="h-8 shrink-0 px-2 text-ui-label">{resetLabel}</Button></div>;
}
