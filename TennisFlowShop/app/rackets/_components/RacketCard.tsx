"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Eye, ShoppingCart } from "lucide-react";
import useSWR from "swr";
import { racketBrandLabel } from "@/lib/constants";
import StatusBadge from "@/components/badges/StatusBadge";
import { badgeToneVariant } from "@/lib/badge-style";
import { cn } from "@/lib/utils";

const RentDialog = dynamic(
  () => import("@/app/rackets/[id]/_components/RentDialog"),
  { loading: () => null },
);

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

type RacketItem = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: "A" | "B" | "C";
  images: string[];
  status: "available" | "sold" | "rented" | "inactive";
  rental?: {
    enabled: boolean;
    deposit: number;
    fee: { d7: number; d15: number; d30: number };
  };
};

type Props = {
  racket: RacketItem;
  viewMode: "grid" | "list";
  brandLabel: string;
  isApplyFlow?: boolean;
};

function useRacketAvailability(id: string) {
  const { data } = useSWR<{
    ok: boolean;
    count: number;
    quantity: number;
    available: number;
  }>(`/api/rentals/active-count/${id}`, fetcher, { dedupingInterval: 5000 });

  // qty: 보유 수량, count: 대여중 수량, avail: 현재 가용(보유 - 대여중)
  const qty = Number(data?.quantity ?? 1);
  const count = Number(data?.count ?? 0);

  const availRaw = (data as any)?.available;
  const avail = Number.isFinite(availRaw)
    ? Math.max(0, Number(availRaw))
    : Math.max(0, qty - count);

  const rentedCount = Math.min(qty, Math.max(0, count));
  const isSold = qty <= 0; // 판매 완료(보유 0)
  const isAllRented = !isSold && avail <= 0 && rentedCount > 0; // 전량 대여중

  return {
    qty,
    count,
    avail,
    rentedCount,
    isSold,
    isAllRented,
    ready: data !== undefined,
  };
}

type RacketAvailabilityState = ReturnType<typeof useRacketAvailability>;

type RacketAvailBadgeProps = Pick<
  RacketAvailabilityState,
  "qty" | "avail" | "rentedCount" | "isSold" | "isAllRented" | "ready"
>;

function RacketAvailBadge({
  qty,
  avail,
  rentedCount,
  isSold,
  isAllRented,
  ready,
}: RacketAvailBadgeProps) {
  // 로딩 중에 1/1 같은 가짜 값이 보이는 깜빡임 방지
  if (!ready) {
    return (
      <Badge
        variant={badgeToneVariant("neutral")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap animate-pulse"
      >
        수량 확인중
      </Badge>
    );
  }

  // 판매 완료(보유 0)
  if (isSold) {
    return (
      <Badge
        variant={badgeToneVariant("neutral")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        판매 완료 (재고 0)
      </Badge>
    );
  }

  // 전량 대여중
  if (isAllRented) {
    return (
      <Badge
        variant={badgeToneVariant("danger")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        전량 대여중 ({rentedCount}/{qty})
      </Badge>
    );
  }

  // “대여중 0”이면 19/19 같은 표기가 어색하므로 “재고 n개”로 표현
  if (rentedCount === 0) {
    return (
      <Badge
        variant={badgeToneVariant("brand")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        재고 {qty}개
      </Badge>
    );
  }

  // 대여중이 있으면 분수(가용/보유) + 대여중 배지로 정보량 확보
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge
        variant={badgeToneVariant("brand")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        가용 {avail}/{qty}
      </Badge>

      <Badge
        variant={badgeToneVariant("neutral")}
        className="px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        대여중 {rentedCount}
      </Badge>
    </div>
  );
}

const RacketCard = React.memo(
  function RacketCard({
    racket,
    viewMode,
    brandLabel,
    isApplyFlow = false,
  }: Props) {
    const availability = useRacketAvailability(racket.id);
    const { avail, isSold, ready } = availability;
    const canBuy = ready ? !isSold && avail > 0 : true; // 로딩 중엔 일단 true(서버에서 최종 검증)
    const canRent = racket.rental?.enabled
      ? ready
        ? !isSold && avail > 0
        : true
      : false;
    const buyDisabledTitle = !canBuy
      ? isSold
        ? "판매가 종료된 상품입니다."
        : "현재 전량 대여중이라 구매가 불가합니다."
      : undefined;
    const rentDisabledTitle = !canRent
      ? racket.rental?.enabled
        ? isSold
          ? "판매가 종료된 상품입니다."
          : "현재 전량 대여중이라 대여가 불가합니다."
        : "대여 불가 상태입니다"
      : undefined;
    const displayBrandLabel = racketBrandLabel(racket.brand) || brandLabel;
    const buyLabel = isApplyFlow ? "스트링 선택" : "구매하기";

    const actionButtons = (compact = false) => (
      <div className="grid grid-cols-2 gap-2">
        {canBuy ? (
          <Button
            asChild
            size="sm"
            className={cn(
              "h-10 w-full min-w-0 justify-center whitespace-nowrap text-center",
              compact ? "text-xs bp-sm:text-sm" : "text-sm",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/rackets/${racket.id}/select-string`}
              onClick={(e) => e.stopPropagation()}
              className="w-full justify-center text-center"
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {buyLabel}
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            className={cn(
              "h-10 w-full min-w-0 justify-center whitespace-nowrap text-center",
              compact ? "text-xs bp-sm:text-sm" : "text-sm",
            )}
            disabled
            title={buyDisabledTitle}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            품절
          </Button>
        )}

        {racket.rental?.enabled ? (
          canRent ? (
            <RentDialog
              id={racket.id}
              rental={racket.rental}
              brand={displayBrandLabel}
              model={racket.model}
              size="sm"
              preventCardNav={true}
              full={false}
              className={cn(
                "h-10 w-full min-w-0 justify-center whitespace-nowrap text-center",
                compact ? "text-xs bp-sm:text-sm" : "text-sm",
              )}
            />
          ) : (
            <Button
              size="sm"
              className={cn(
                "h-10 w-full min-w-0 justify-center whitespace-nowrap bg-muted text-muted-foreground cursor-not-allowed",
                compact ? "text-xs bp-sm:text-sm" : "text-sm",
              )}
              disabled
              aria-disabled
              title={rentDisabledTitle}
            >
              <Briefcase className="mr-1.5 h-4 w-4" />
              품절
            </Button>
          )
        ) : (
          <Button
            size="sm"
            className={cn(
              "h-10 w-full min-w-0 justify-center whitespace-nowrap bg-muted text-muted-foreground cursor-not-allowed",
              compact ? "text-xs bp-sm:text-sm" : "text-sm",
            )}
            disabled
            aria-disabled
            title={rentDisabledTitle}
          >
            <Briefcase className="mr-1.5 h-4 w-4" />
            대여 불가
          </Button>
        )}
      </div>
    );

    if (viewMode === "list") {
      return (
        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md">
          <div className="flex flex-col bp-md:flex-row">
            <Link
              href={`/rackets/${racket.id}`}
              className="relative block w-full aspect-[4/3] overflow-hidden bg-muted/30 bp-md:w-[240px] bp-md:aspect-square bp-xl:w-[280px]"
              aria-label={`${displayBrandLabel} ${racket.model} 상세 보기`}
            >
              <Image
                src={
                  racket.images?.[0] ||
                  "/placeholder.svg?height=200&width=200&query=tennis+racket"
                }
                alt={`${displayBrandLabel} ${racket.model}`}
                fill
                sizes="(max-width: 768px) 100vw, 260px"
                className="object-contain object-center p-2"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col p-4 bp-sm:p-5 bp-md:p-6">
              <div className="min-w-0">
                <div
                  className="mb-1.5 max-w-full truncate text-sm font-medium text-muted-foreground bp-sm:text-base"
                  title={displayBrandLabel}
                >
                  {displayBrandLabel}
                </div>
                <Link href={`/rackets/${racket.id}`} className="block min-w-0">
                  <h3
                    className="line-clamp-2 break-keep text-lg font-bold leading-snug text-foreground bp-sm:text-xl"
                    title={racket.model}
                  >
                    {racket.model}
                  </h3>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 bp-sm:gap-2">
                  <StatusBadge kind="condition" state={racket.condition} />
                  <RacketAvailBadge {...availability} />
                  {!racket.rental?.enabled && (
                    <StatusBadge kind="rental" state="unavailable" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col justify-between border-t border-border/60 p-4 bp-md:w-[260px] bp-md:border-l bp-md:border-t-0 bp-md:p-5">
              <div className="whitespace-nowrap tabular-nums text-xl font-bold text-foreground bp-md:text-right bp-md:text-2xl">
                {racket.price.toLocaleString()}원
              </div>
              <div className="mt-4 space-y-2">
                {actionButtons(true)}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 w-full justify-center whitespace-nowrap bg-background text-xs bp-sm:text-sm"
                >
                  <Link
                    href={`/rackets/${racket.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    상세 보기
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // grid view
    return (
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md">
        <div className="absolute left-0 right-0 top-0 h-1 bg-muted/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <Link
          href={`/rackets/${racket.id}`}
          className="relative block w-full aspect-[4/3] overflow-hidden bg-muted/30"
          aria-label={`${displayBrandLabel} ${racket.model} 상세 보기`}
        >
          <Image
            src={
              racket.images?.[0] ||
              "/placeholder.svg?height=300&width=300&query=tennis+racket"
            }
            alt={`${displayBrandLabel} ${racket.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain object-center p-2 transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <CardContent className="flex flex-1 flex-col p-3 bp-sm:p-6">
          <div
            className="mb-2 max-w-full truncate text-xs font-medium text-muted-foreground bp-sm:text-base"
            title={displayBrandLabel}
          >
            {displayBrandLabel}
          </div>
          <Link href={`/rackets/${racket.id}`} className="block min-w-0">
            <CardTitle
              className="mb-3 min-h-[3rem] line-clamp-2 break-keep text-base leading-snug transition-colors group-hover:text-primary dark:group-hover:text-primary bp-sm:min-h-[3.5rem] bp-sm:text-lg bp-md:text-xl"
              title={racket.model}
            >
              {racket.model}
            </CardTitle>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="condition" state={racket.condition} />
            <div className="ml-1">
              <RacketAvailBadge {...availability} />
            </div>
            {!racket.rental?.enabled && (
              <StatusBadge kind="rental" state="unavailable" />
            )}
          </div>
        </CardContent>

        <CardFooter className="mt-auto p-3 pt-0 bp-sm:p-6 bp-sm:pt-0">
          <div className="w-full">
            <div className="min-h-[2.5rem] text-base font-bold text-foreground bp-sm:text-xl bp-md:text-2xl">
              {racket.price.toLocaleString()}원
            </div>

            <div className="mt-3">{actionButtons(true)}</div>
          </div>
        </CardFooter>
      </Card>
    );
  },
  (prev, next) =>
    prev.racket.id === next.racket.id &&
    prev.viewMode === next.viewMode &&
    prev.brandLabel === next.brandLabel &&
    Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow),
);

export default RacketCard;
