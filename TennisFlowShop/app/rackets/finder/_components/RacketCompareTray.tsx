"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Scale, Trash2, X } from "lucide-react";

import { useRacketCompareStore, type CompareRacketItem } from "@/app/store/racketCompareStore";
import { Button } from "@/components/ui/button";
import { racketBrandLabel } from "@/lib/constants";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function SelectedCompareItem({
  item,
  onRemove,
}: {
  item: CompareRacketItem;
  onRemove: (id: string) => void;
}) {
  const title = `${item.model}${item.year ? ` (${item.year})` : ""}`;
  const brandText = racketBrandLabel(item.brand);

  return (
    <div className="relative flex min-w-[168px] max-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2 py-2 transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:shadow-md bp-md:w-full bp-md:min-w-0 bp-md:max-w-none">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/50 ring-1 ring-border/10">
        {item.image ? (
          <Image
            src={item.image || "/placeholder.svg"}
            alt={title}
            fill
            className="object-contain p-1"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ui-micro text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-8">
        <div className="line-clamp-2 text-ui-label font-medium leading-tight">{title}</div>
        <div className="truncate text-ui-caption text-muted-foreground">{brandText}</div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${brandText} ${title} 비교 목록에서 제거`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function RacketCompareTray() {
  const router = useRouter();
  const trayRef = useRef<HTMLDivElement>(null);
  const [trayHeight, setTrayHeight] = useState(152);

  const items = useRacketCompareStore((s) => s.items);
  const remove = useRacketCompareStore((s) => s.remove);
  const clear = useRacketCompareStore((s) => s.clear);

  useEffect(() => {
    const element = trayRef.current;
    if (!element) return;
    const update = () => setTrayHeight(element.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length]);

  if (!items.length) return null;

  const canCompare = items.length >= 2;

  const goCompare = () => {
    if (!canCompare) {
      showErrorToast("라켓 비교는 최소 2개 이상 선택해야 합니다.");
      return;
    }
    router.push("/rackets/compare");
  };

  return (
    <>
      <div aria-hidden="true" style={{ height: trayHeight ? trayHeight + 12 : 164 }} />

      <div
        ref={trayRef}
        data-bottom-sticky="1"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full bp-sm:px-1 bp-md:px-3 bp-lg:max-w-[1200px]">
          <div className="rounded-xl border border-border bg-card/95 shadow-md backdrop-blur-sm">
            <div className="p-3 bp-sm:p-4">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary bp-sm:flex">
                    <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-ui-body-sm font-semibold">
                      라켓 비교{" "}
                      <span className="text-primary" aria-live="polite">
                        선택 {items.length} / 4
                      </span>
                    </div>
                    <div className="hidden text-ui-label text-muted-foreground bp-sm:block">
                      최소 2개부터 비교 가능
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 bp-sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    className="h-10 min-h-10 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 bp-sm:mr-1" aria-hidden="true" />
                    <span className="sr-only bp-sm:not-sr-only">모두 삭제</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="highlight_soft"
                    onClick={goCompare}
                    disabled={!canCompare}
                    className="h-10 min-h-10 gap-1.5 rounded-lg px-3"
                  >
                    비교하기
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 bp-md:grid bp-md:grid-cols-4 bp-md:overflow-visible bp-md:pb-0">
                {items.map((item) => (
                  <SelectedCompareItem key={item.id} item={item} onRemove={remove} />
                ))}
                {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className={cn(
                      "hidden h-16 items-center justify-center rounded-lg bg-muted/30 text-ui-label text-muted-foreground/60 ring-1 ring-dashed ring-muted-foreground/20 bp-md:flex",
                    )}
                  >
                    <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                    비어 있음
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
