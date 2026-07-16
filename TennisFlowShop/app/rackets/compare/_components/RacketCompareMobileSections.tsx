import Image from "next/image";
import { Eye, X } from "lucide-react";

import type { CompareRacketItem } from "@/app/store/racketCompareStore";
import RacketSpecQuickViewDialog from "@/app/rackets/compare/_components/RacketSpecQuickViewDialog";
import { formatNumberValue, racketCompareRowCategories, toCompareNumber, type RacketCompareRow } from "@/app/rackets/compare/_components/racketCompareRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { racketBrandLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

function deltaText(value: number | null, base: number | null, row: Extract<RacketCompareRow, { kind: "number" }>) {
  if (value === null || base === null) return "비교 불가";
  const delta = value - base;
  if (delta === 0) return "동일";
  const abs = formatNumberValue(Math.abs(delta), row);
  const pct = base !== 0 ? ` (${delta > 0 ? "+" : "-"}${Math.abs((delta / base) * 100).toFixed(1)}%)` : "";
  return `${delta > 0 ? "+" : "-"}${abs}${pct}`;
}

export default function RacketCompareMobileSections({ items, rows, onRemove }: { items: CompareRacketItem[]; rows: RacketCompareRow[]; onRemove: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:thin]">
        <div className="flex snap-x gap-3 pb-2">
          {items.map((item, index) => {
            const brand = racketBrandLabel(item.brand) || "-";
            return (
              <article key={item.id} className="min-w-[220px] max-w-[240px] snap-start rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="relative h-28 rounded-lg bg-muted/50">
                  {item.image ? <Image src={item.image} alt={`${brand} ${item.model}`} fill className="object-contain p-2" unoptimized /> : <span className="flex h-full items-center justify-center text-ui-label text-muted-foreground">No Image</span>}
                </div>
                <div className="mt-3 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">{index === 0 ? <Badge variant="info" className="h-5 px-2 text-ui-micro">기준</Badge> : null}<span className="text-ui-label text-muted-foreground">{brand}</span></div>
                  <h2 className="line-clamp-2 text-ui-body-sm font-semibold">{item.model}</h2>
                  <p className="text-ui-label text-muted-foreground">{item.year ? `${item.year}년` : "-"}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <RacketSpecQuickViewDialog racket={item} trigger={<Button type="button" variant="outline" size="sm" className="w-full"><Eye className="h-4 w-4" aria-hidden="true" />Quick View</Button>} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(item.id)} aria-label={`${brand} ${item.model} 비교 목록에서 제거`}>
                    <X className="h-4 w-4" aria-hidden="true" />제거
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {racketCompareRowCategories.map((category) => (
        <section key={category.title} className="space-y-3">
          <h2 className="text-ui-body font-semibold text-foreground">{category.title}</h2>
          {category.rowKeys.map((key) => rows.find((row) => row.key === key)).filter((row): row is RacketCompareRow => Boolean(row)).map((row) => {
            const base = items[0];
            const baseNum = row.kind === "number" ? toCompareNumber(row.getValue(base)) : null;
            return (
              <article key={row.key} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="space-y-1"><h3 className="text-ui-body-sm font-semibold">{row.label}</h3>{row.hint ? <p className="break-keep text-ui-label text-muted-foreground">{row.hint}</p> : null}</div>
                <div className="mt-4 divide-y divide-border/60">
                  {items.map((item, index) => {
                    const brand = racketBrandLabel(item.brand) || "-";
                    const value = row.kind === "text" ? row.getValue(item) : formatNumberValue(row.getValue(item), row);
                    const n = row.kind === "number" ? toCompareNumber(row.getValue(item)) : null;
                    return (
                      <div key={`${row.key}-${item.id}`} className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0"><p className="line-clamp-1 text-ui-label text-muted-foreground">{brand} {item.model}</p>{index === 0 ? <Badge variant="info" className="mt-1 h-5 px-2 text-ui-micro">기준</Badge> : null}</div>
                        <div className="text-right"><p className="font-semibold tabular-nums">{value}</p>{row.kind === "number" && index > 0 ? <p className={cn("text-ui-caption font-medium", "text-muted-foreground")}>{deltaText(n, baseNum, row)}</p> : null}</div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
