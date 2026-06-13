"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { racketBrandLabel, stringPatternLabel } from "@/lib/constants";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  useRacketCompareStore,
  type CompareRacketItem,
} from "@/app/store/racketCompareStore";
import { useMemo } from "react";
import { Scale, ShoppingCart, Info } from "lucide-react";
import { badgeToneVariant, imageBadgeClass } from "@/lib/badge-style";

const RentDialog = dynamic(
  () => import("@/app/rackets/[id]/_components/RentDialog"),
  { loading: () => null },
);

const RacketSpecQuickViewDialog = dynamic(
  () => import("@/app/rackets/compare/_components/RacketSpecQuickViewDialog"),
  { loading: () => null },
);

type RacketSpec = {
  headSize?: number | null;
  weight?: number | null;
  balance?: number | null;
  lengthIn?: number | null;
  swingWeight?: number | null;
  stiffnessRa?: number | null;
  pattern?: string | null;
  gripSize?: string | null;
};

type RentalInfo = {
  enabled?: boolean;
  deposit?: number;
  fee?: { d7: number; d15: number; d30: number };
  disabledReason?: string | null;
};

export type FinderRacket = {
  id: string;
  brand: string;
  model: string;
  year?: number | null;
  price?: number | null;
  images?: string[];
  condition?: string | null;
  status?: string | null;
  rental?: RentalInfo | null;
  spec?: RacketSpec | null;
};

function conditionLabel(condition?: string | null) {
  if (!condition) return null;
  const c = condition.toUpperCase();
  if (c === "A")
    return { label: "A", desc: "최상", className: imageBadgeClass("success") };
  if (c === "B")
    return { label: "B", desc: "상", className: imageBadgeClass("info") };
  if (c === "C")
    return { label: "C", desc: "보통", className: imageBadgeClass("warning") };
  return {
    label: c,
    desc: "",
    className: imageBadgeClass("neutral"),
  };
}

function fmt(n: number | null | undefined, suffix?: string) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return `${n}${suffix ?? ""}`;
}

function SpecItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <span className="block whitespace-nowrap text-[10px] uppercase tracking-wide text-foreground/70 bp-sm:text-xs">
        {label}
      </span>
      <span className="block break-keep text-sm font-semibold leading-snug tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function FinderRacketCard({ racket }: { racket: FinderRacket }) {
  const brandText = racketBrandLabel(racket.brand);
  const spec = (racket.spec ?? {}) as RacketSpec;
  const cond = conditionLabel(racket.condition);

  const img = racket.images?.[0];
  const rentalEnabled = !!racket.rental?.enabled;
  const rentalDisabledReason = racket.rental?.disabledReason ?? null;

  const { items: compareItems, toggle } = useRacketCompareStore();
  const selected = compareItems.some((x) => x.id === racket.id);

  const compareItem: CompareRacketItem = useMemo(
    () => ({
      id: racket.id,
      brand: racket.brand,
      model: racket.model,
      year: racket.year ?? null,
      price: racket.price ?? null,
      image: img ?? null,
      condition: racket.condition ?? null,
      spec: {
        headSize: spec.headSize ?? null,
        weight: spec.weight ?? null,
        balance: spec.balance ?? null,
        lengthIn: spec.lengthIn ?? null,
        swingWeight: spec.swingWeight ?? null,
        stiffnessRa: spec.stiffnessRa ?? null,
        pattern: spec.pattern ?? null,
        // 비교 스냅샷 누락 방지: Finder에서 담을 때도 gripSize를 반드시 포함한다.
        gripSize: spec.gripSize ?? null,
      },
    }),
    [
      racket.id,
      racket.brand,
      racket.model,
      racket.year,
      racket.price,
      racket.condition,
      img,
      spec,
    ],
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md">
      <div className="p-4 bp-sm:p-5">
        <div className="flex flex-col bp-md:flex-row gap-4">
          {/* 이미지 영역 */}
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted/60 dark:bg-muted/30 bp-md:h-36 bp-md:w-36 bp-md:aspect-auto">
            {img ? (
              <Image
                src={img || "/placeholder.svg"}
                alt={`${brandText} ${racket.model}`}
                fill
                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                No Image
              </div>
            )}
            {/* 컨디션 뱃지 - 이미지 위에 표시 */}
            {cond && (
              <div
                className={cn(
                  "absolute top-2 left-2 rounded-full px-2 py-1 text-xs font-bold",
                  cond.className,
                )}
              >
                {cond.label}
              </div>
            )}
          </div>

          {/* 정보 영역 */}
          <div className="min-w-0 flex-1 flex flex-col">
            {/* 헤더: 브랜드, 모델명, 상태 뱃지 */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {brandText}
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-foreground leading-tight truncate">
                  {racket.model}
                  {racket.year && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                      ({racket.year})
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {rentalEnabled ? (
                  <Badge variant={badgeToneVariant("success")}>대여 가능</Badge>
                ) : (
                  <Badge variant={badgeToneVariant("danger")}>대여 불가</Badge>
                )}
              </div>
            </div>

            {/* 스펙 그리드 */}
            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-3 bp-xl:grid-cols-4 bp-sm:px-4 bp-sm:py-3.5">
              <SpecItem label="Head" value={fmt(spec.headSize, "")} />
              <SpecItem label="Weight" value={fmt(spec.weight, "g")} />
              <SpecItem label="Balance" value={fmt(spec.balance, "mm")} />
              <SpecItem label="SW" value={fmt(spec.swingWeight, "")} />
              <SpecItem label="Length" value={fmt(spec.lengthIn, "in")} />
              <SpecItem label="RA" value={fmt(spec.stiffnessRa, "")} />
              {/* 화면 표시는 공통 라벨 함수로 통일(과거 raw 값도 최대한 사람이 읽기 쉽게) */}
              <SpecItem
                label="Pattern"
                value={
                  spec.pattern ? stringPatternLabel(String(spec.pattern)) : "-"
                }
                className="col-span-2 bp-xl:col-span-1"
              />
              <SpecItem
                label="Price"
                value={
                  racket.price ? `${(racket.price / 10000).toFixed(0)}만` : "-"
                }
              />
            </div>

            {/* 액션 버튼 */}
            <div className="mt-auto grid grid-cols-1 gap-2 bp-sm:grid-cols-2 bp-lg:flex bp-lg:flex-wrap bp-lg:items-center">
              <RacketSpecQuickViewDialog
                racket={compareItem}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full min-w-0 whitespace-nowrap rounded-lg bg-transparent px-2 text-xs bp-sm:text-sm bp-lg:h-9 bp-lg:min-w-[7.5rem] bp-lg:w-auto bp-lg:flex-none"
                  >
                    <Info className="mr-1.5 h-3.5 w-3.5" />
                    상세 스펙
                  </Button>
                }
              />

              <Button
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className={cn(
                  "h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-2 text-xs bp-sm:text-sm bp-lg:h-9 bp-lg:min-w-[7.5rem] bp-lg:w-auto bp-lg:flex-none",
                  selected && "bg-secondary text-foreground",
                )}
                onClick={() => {
                  if (!selected && compareItems.length >= 4) {
                    showErrorToast(
                      "라켓 비교는 최대 4개까지 담을 수 있습니다.",
                    );
                    return;
                  }
                  const res = toggle(compareItem);
                  if (!res.ok) {
                    showErrorToast(res.message);
                    return;
                  }
                  if (res.action === "added")
                    showSuccessToast("비교 목록에 담았습니다.");
                  if (res.action === "removed")
                    showSuccessToast("비교 목록에서 제거했습니다.");
                }}
              >
                <Scale className="mr-1.5 h-3.5 w-3.5" />
                {selected ? "비교 선택됨" : "비교하기"}
              </Button>

              <Button
                asChild
                size="sm"
                className="h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-2 text-xs bp-sm:text-sm bp-lg:h-9 bp-lg:min-w-[7.5rem] bp-lg:w-auto bp-lg:flex-none"
              >
                <Link href={`/rackets/${racket.id}/select-string`}>
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  스트링 선택 후 구매
                </Link>
              </Button>

              {rentalEnabled ? (
                <RentDialog
                  id={racket.id}
                  rental={racket.rental}
                  brand={brandText}
                  model={racket.model}
                  size="sm"
                  preventCardNav={true}
                  full={false}
                  className="h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-2 text-xs bp-sm:text-sm bp-lg:h-9 bp-lg:min-w-[7.5rem] bp-lg:w-auto bp-lg:flex-none"
                />
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  title={rentalDisabledReason ?? undefined}
                  className="h-10 w-full min-w-0 whitespace-nowrap rounded-lg px-2 text-xs opacity-50 bp-sm:text-sm bp-lg:h-9 bp-lg:min-w-[7.5rem] bp-lg:w-auto bp-lg:flex-none"
                >
                  대여 불가
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function isolateSpecFallback(spec: any) {
  return spec ?? {};
}
