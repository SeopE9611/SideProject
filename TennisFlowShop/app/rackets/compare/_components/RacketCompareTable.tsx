import Image from "next/image";
import { Eye, Info, X } from "lucide-react";

import type { CompareRacketItem } from "@/app/store/racketCompareStore";
import RacketSpecQuickViewDialog from "@/app/rackets/compare/_components/RacketSpecQuickViewDialog";
import {
  formatNumberValue,
  formatRacketCondition,
  toCompareNumber,
  type RacketCompareRow,
} from "@/app/rackets/compare/_components/racketCompareRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { racketBrandLabel } from "@/lib/constants";

function minMax(nums: Array<number | null>) {
  const values = nums.filter((n): n is number => n !== null);
  if (values.length < 2) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function ratio01(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function deltaText(
  value: number | null,
  base: number | null,
  row: Extract<RacketCompareRow, { kind: "number" }>,
) {
  if (value === null || base === null) return "비교 불가";
  const delta = value - base;
  if (delta === 0) return "동일";
  const pct =
    base !== 0 ? ` (${delta > 0 ? "+" : "-"}${Math.abs((delta / base) * 100).toFixed(1)}%)` : "";
  return `${delta > 0 ? "+" : "-"}${formatNumberValue(Math.abs(delta), row)}${pct}`;
}

export default function RacketCompareTable({
  items,
  rows,
  onRemove,
}: {
  items: CompareRacketItem[];
  rows: RacketCompareRow[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-ui-body-sm">
        <caption className="sr-only">
          선택한 라켓의 브랜드, 모델, 상태, 가격과 스펙을 비교하는 표
        </caption>
        <thead>
          <tr className="bg-muted/40">
            <th
              scope="col"
              className="sticky left-0 z-30 w-[150px] min-w-[150px] bg-muted p-4 text-left text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span>항목</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="표 해석 힌트"
                      className="text-muted-foreground"
                    >
                      <Info className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] text-ui-label">
                    배경 막대는 현재 비교 중인 라켓 안에서 수치의 상대 위치를 표시합니다. 막대가
                    길다고 더 좋은 스펙을 의미하지 않습니다.
                  </TooltipContent>
                </Tooltip>
              </div>
            </th>
            {items.map((item, index) => {
              const brand = racketBrandLabel(item.brand) || "-";
              return (
                <th key={item.id} scope="col" className="min-w-[220px] p-4 text-left align-top">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="line-clamp-2 font-semibold text-foreground">
                          {item.model}
                        </span>
                        {index === 0 ? (
                          <Badge variant="info" className="h-5 px-2 text-ui-micro">
                            기준
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-ui-label font-normal text-muted-foreground">{brand}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => onRemove(item.id)}
                      aria-label={`${brand} ${item.model} 비교 목록에서 제거`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-20 w-20 shrink-0 rounded-lg bg-muted/50">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={`${brand} ${item.model}`}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-ui-micro text-muted-foreground">
                          No Image
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-2 font-normal">
                      <p className="text-ui-label text-muted-foreground">
                        {item.year ? `${item.year}년` : "-"} ·{" "}
                        {formatRacketCondition(item.condition)}
                      </p>
                      <RacketSpecQuickViewDialog
                        racket={item}
                        trigger={
                          <Button type="button" variant="outline" size="sm">
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            Quick View
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const base = items[0];
            const baseNum = row.kind === "number" ? toCompareNumber(row.getValue(base)) : null;
            const mm =
              row.kind === "number"
                ? minMax(items.map((item) => toCompareNumber(row.getValue(item))))
                : null;
            return (
              <tr key={row.key} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-20 border-t border-border bg-card p-4 text-left font-medium text-muted-foreground group-hover:bg-card"
                >
                  <div className="flex items-center gap-2">
                    <span>{row.label}</span>
                    {row.hint ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${row.label} 해석 힌트`}
                            className="text-muted-foreground"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-ui-label">
                          {row.hint}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </th>
                {items.map((item, index) => {
                  if (row.kind === "text")
                    return (
                      <td
                        key={`${row.key}-${item.id}`}
                        className="border-t border-border p-4 font-medium"
                      >
                        {row.getValue(item)}
                      </td>
                    );
                  const value = toCompareNumber(row.getValue(item));
                  const ratio = mm && value !== null ? ratio01(value, mm.min, mm.max) : null;
                  return (
                    <td
                      key={`${row.key}-${item.id}`}
                      className="relative overflow-hidden border-t border-border p-4"
                    >
                      {ratio !== null ? (
                        <div
                          className="absolute inset-y-0 left-0 bg-secondary/50 dark:bg-secondary/30"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      ) : null}
                      <div className="relative z-10 tabular-nums">
                        <p className="font-semibold">{formatNumberValue(value, row)}</p>
                        {index > 0 ? (
                          <p className="mt-0.5 text-ui-caption font-medium text-muted-foreground">
                            {deltaText(value, baseNum, row)}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
