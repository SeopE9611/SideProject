"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Info, Scale, ShoppingCart } from "lucide-react";

import { useRacketCompareStore, type CompareRacketItem } from "@/app/store/racketCompareStore";
import { CatalogPrice } from "@/components/commerce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { badgeToneVariant, usedBadgeMeta } from "@/lib/badge-style";
import { racketBrandLabel, stringPatternLabel } from "@/lib/constants";
import { racketConditionLabel } from "@/lib/racket-condition";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const RentDialog = dynamic(() => import("@/app/rackets/[id]/_components/RentDialog"), {
  loading: () => null,
});

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
      <span className="block whitespace-nowrap text-ui-micro uppercase tracking-wide text-foreground/70 bp-sm:text-ui-label">
        {label}
      </span>
      <span className="block break-keep text-ui-body-sm font-semibold leading-snug tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function FinderRacketCard({ racket }: { racket: FinderRacket }) {
  const brandText = racketBrandLabel(racket.brand);
  const spec = (racket.spec ?? {}) as RacketSpec;
  const conditionMeta = racket.condition
    ? usedBadgeMeta("condition", racket.condition, "image")
    : null;
  const conditionText = racketConditionLabel(racket.condition);
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
        gripSize: spec.gripSize ?? null,
      },
    }),
    [racket.id, racket.brand, racket.model, racket.year, racket.price, racket.condition, img, spec],
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md">
      <div className="p-4 bp-sm:p-5">
        <div className="flex flex-col gap-4 bp-md:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted/60 dark:bg-muted/30 bp-md:h-44 bp-md:w-44 bp-md:aspect-auto">
            {img ? (
              <Image
                src={img || "/placeholder.svg"}
                alt={`${brandText} ${racket.model}`}
                fill
                className="object-contain p-2"
                sizes="(min-width: 768px) 176px, calc(100vw - 3rem)"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ui-label text-muted-foreground">
                No Image
              </div>
            )}
            {conditionMeta && conditionText ? (
              <div
                className={cn(
                  "absolute left-2 top-2 rounded-full px-2 py-1 text-ui-label font-semibold",
                  conditionMeta.className,
                )}
              >
                상태 {conditionText}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-ui-label font-medium uppercase tracking-wide text-muted-foreground">
                  {brandText}
                </span>
                <h3 className="mt-0.5 line-clamp-2 break-words text-ui-body font-medium leading-tight text-foreground">
                  {racket.model}
                  {racket.year ? (
                    <span className="ml-1.5 text-ui-body-sm font-normal text-muted-foreground">
                      ({racket.year})
                    </span>
                  ) : null}
                </h3>
              </div>
              <Badge variant={badgeToneVariant(rentalEnabled ? "success" : "danger")}>
                {rentalEnabled ? "대여 가능" : "대여 불가"}
              </Badge>
            </div>

            <div className="mb-4">
              {typeof racket.price === "number" && Number.isFinite(racket.price) ? (
                <CatalogPrice regularPrice={Number(racket.price)} salePrice={null} size="list" />
              ) : (
                <p className="text-ui-body-sm font-medium text-muted-foreground">가격 정보 없음</p>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-3 bp-sm:grid-cols-3 bp-sm:px-4 bp-sm:py-3.5 bp-xl:grid-cols-4">
              <SpecItem label="헤드" value={fmt(spec.headSize)} />
              <SpecItem label="무게" value={fmt(spec.weight, "g")} />
              <SpecItem label="밸런스" value={fmt(spec.balance, "mm")} />
              <SpecItem label="SW" value={fmt(spec.swingWeight)} />
              <SpecItem label="길이" value={fmt(spec.lengthIn, "in")} />
              <SpecItem label="RA" value={fmt(spec.stiffnessRa)} />
              <SpecItem
                label="패턴"
                value={spec.pattern ? stringPatternLabel(String(spec.pattern)) : "-"}
                className="col-span-2 bp-sm:col-span-1"
              />
            </div>

            <div className="mt-auto space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <RacketSpecQuickViewDialog
                  racket={compareItem}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      wrap="responsive"
                      className="min-h-10 w-full min-w-0 rounded-lg bg-transparent px-2 text-ui-label bp-sm:text-ui-body-sm"
                    >
                      <Info className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      상세 스펙
                    </Button>
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "min-h-10 w-full min-w-0 rounded-lg px-2 text-ui-label bp-sm:text-ui-body-sm",
                    selected && "border-primary/40 bg-secondary text-foreground",
                  )}
                  aria-pressed={selected}
                  onClick={() => {
                    if (!selected && compareItems.length >= 4) {
                      showErrorToast("라켓 비교는 최대 4개까지 담을 수 있습니다.");
                      return;
                    }
                    const res = toggle(compareItem);
                    if (!res.ok) {
                      showErrorToast(res.message);
                      return;
                    }
                    if (res.action === "added") showSuccessToast("비교 목록에 담았습니다.");
                    if (res.action === "removed") showSuccessToast("비교 목록에서 제거했습니다.");
                  }}
                >
                  <Scale className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {selected ? "비교 선택됨" : "비교 담기"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 bp-sm:grid-cols-2">
                <Button
                  asChild
                  size="sm"
                  wrap="responsive"
                  variant="highlight_soft"
                  className="min-h-11 w-full min-w-0 rounded-lg px-2 text-ui-label bp-sm:text-ui-body-sm"
                >
                  <Link href={`/rackets/${racket.id}/select-string`}>
                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
                    variant="outline"
                    label="스트링 선택 후 대여"
                    ariaLabel={`${brandText} ${racket.model} 스트링 선택 후 대여`}
                    preventCardNav={true}
                    full={false}
                    className="min-h-11 w-full min-w-0 rounded-lg px-2 text-ui-label bp-sm:text-ui-body-sm"
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled
                    title={rentalDisabledReason ?? undefined}
                    wrap="responsive"
                    aria-label={
                      rentalDisabledReason ? `대여 불가: ${rentalDisabledReason}` : "대여 불가"
                    }
                    className="min-h-11 w-full min-w-0 rounded-lg px-2 text-ui-label opacity-70 bp-sm:text-ui-body-sm"
                  >
                    대여 불가
                  </Button>
                )}
              </div>
              {!rentalEnabled && rentalDisabledReason ? (
                <p className="text-ui-label text-muted-foreground">{rentalDisabledReason}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
