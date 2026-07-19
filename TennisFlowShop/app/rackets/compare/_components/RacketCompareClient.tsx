"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Info, Scale, X } from "lucide-react";

import { useRacketCompareStore } from "@/app/store/racketCompareStore";
import RacketCompareHeader from "@/app/rackets/compare/_components/RacketCompareHeader";
import RacketCompareMobileSections from "@/app/rackets/compare/_components/RacketCompareMobileSections";
import RacketComparePageSkeleton from "@/app/rackets/compare/_components/RacketComparePageSkeleton";
import RacketCompareTable from "@/app/rackets/compare/_components/RacketCompareTable";
import RacketSpecQuickViewDialog from "@/app/rackets/compare/_components/RacketSpecQuickViewDialog";
import {
  formatRacketCondition,
  racketCompareRows,
} from "@/app/rackets/compare/_components/racketCompareRows";
import { EmptyState } from "@/components/public/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { racketBrandLabel } from "@/lib/constants";
import { normalizeInternalReturnPath } from "@/lib/navigation/internal-return-path";

const FINDER_LAST_URL_KEY = "racketFinder.lastUrl.v1";
const FINDER_FALLBACK_PATH = "/rackets/finder";

const readFinderLastUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(FINDER_LAST_URL_KEY);
  } catch {
    return null;
  }
};

function normalizeFinderReturnPath(value: string | null | undefined): string {
  const normalized = normalizeInternalReturnPath(value, FINDER_FALLBACK_PATH);

  if (
    normalized === FINDER_FALLBACK_PATH ||
    normalized.startsWith(`${FINDER_FALLBACK_PATH}?`) ||
    normalized.startsWith(`${FINDER_FALLBACK_PATH}#`)
  ) {
    return normalized;
  }

  return FINDER_FALLBACK_PATH;
}

function CompareNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-ui-body-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="break-keep">
        첫 번째 라켓이 비교 기준입니다. 표시되는 수치 차이는 방향을 보여주며 우열 평가는 아닙니다.
      </p>
    </div>
  );
}

export default function RacketCompareClient() {
  const { items, remove, clear } = useRacketCompareStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goBackToFinder = () => {
    router.push(normalizeFinderReturnPath(readFinderLastUrl()));
  };

  if (!mounted) return <RacketComparePageSkeleton />;

  const selected = items[0];
  const selectedBrand = selected ? racketBrandLabel(selected.brand) || "-" : "-";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <RacketCompareHeader count={items.length} onBackToFinder={goBackToFinder} onClear={clear} />

        {items.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-8 w-8" />}
            title="비교할 라켓을 선택해주세요"
            description="라켓 찾기에서 2개 이상, 최대 4개까지 비교 목록에 담을 수 있습니다."
            action={<Button onClick={goBackToFinder}>라켓 찾기로</Button>}
          />
        ) : items.length === 1 && selected ? (
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm bp-sm:p-6">
            <div className="space-y-2">
              <h2 className="text-ui-card-title-lg font-semibold">라켓을 하나 더 선택해주세요</h2>
              <p className="text-ui-body-sm text-muted-foreground">
                비교는 최소 2개부터 가능합니다.
              </p>
            </div>
            <article className="mt-5 grid gap-4 rounded-xl bg-muted/30 p-4 bp-sm:grid-cols-[120px_1fr]">
              <div className="relative h-36 rounded-lg bg-background">
                {selected.image ? (
                  <Image
                    src={selected.image}
                    alt={`${selectedBrand} ${selected.model}`}
                    fill
                    className="object-contain p-3"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-ui-label text-muted-foreground">
                    No Image
                  </span>
                )}
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info" className="h-5 px-2 text-ui-micro">
                    기준
                  </Badge>
                  <span className="text-ui-label text-muted-foreground">현재 선택한 라켓</span>
                </div>
                <div>
                  <p className="text-ui-label text-muted-foreground">{selectedBrand}</p>
                  <h3 className="line-clamp-2 text-ui-body font-semibold">{selected.model}</h3>
                  <p className="mt-1 text-ui-label text-muted-foreground">
                    {selected.year ? `${selected.year}년` : "-"} ·{" "}
                    {formatRacketCondition(selected.condition)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 bp-sm:flex">
                  <RacketSpecQuickViewDialog
                    racket={selected}
                    trigger={
                      <Button type="button" variant="outline">
                        Quick View
                      </Button>
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => remove(selected.id)}
                    aria-label={`${selectedBrand} ${selected.model} 비교 목록에서 제거`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    제거
                  </Button>
                </div>
              </div>
            </article>
            <Button onClick={goBackToFinder} className="mt-5 rounded-lg">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              라켓 더 고르기
            </Button>
          </section>
        ) : (
          <>
            <CompareNotice />
            <div className="bp-md:hidden">
              <RacketCompareMobileSections
                items={items}
                rows={racketCompareRows}
                onRemove={remove}
              />
            </div>
            <div className="hidden bp-md:block">
              <RacketCompareTable items={items} rows={racketCompareRows} onRemove={remove} />
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
