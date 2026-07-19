"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { CatalogCardFrame, CatalogPrice, CatalogRating } from "@/components/commerce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Eye, ShoppingCart } from "lucide-react";
import useSWR from "swr";
import { racketBrandLabel } from "@/lib/constants";
import StatusBadge from "@/components/badges/StatusBadge";
import {
  badgeToneClass,
  badgeToneVariant,
  merchandisingImageBadgeClass,
  merchandisingImageBadgeVariant,
  usedBadgeMeta,
} from "@/lib/badge-style";
import { cn } from "@/lib/utils";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";

const RentDialog = dynamic(() => import("@/app/rackets/[id]/_components/RentDialog"), {
  loading: () => null,
});

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

const racketImageWrapClass = "relative block w-full aspect-[4/3] overflow-hidden bg-muted/20";

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
  ratingAvg?: number;
  ratingAverage?: number;
  ratingCount?: number;
  reviewCount?: number;
  marketing?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number;
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

  const availRaw = data?.available;
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

function ConditionBadge({ state }: { state: string }) {
  const meta = usedBadgeMeta("condition", state);

  return (
    <Badge
      variant="neutral"
      className={cn("rounded px-2 py-0.5 text-ui-label font-medium shadow-sm", meta.className)}
    >
      상태: {meta.label}
    </Badge>
  );
}

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
        className="px-2 py-1 text-ui-label font-medium whitespace-nowrap animate-pulse"
      >
        구매·대여 가능 여부 확인 중
      </Badge>
    );
  }

  // 판매 완료(보유 0)
  if (isSold) {
    return (
      <Badge
        variant={badgeToneVariant("neutral")}
        className="px-2 py-1 text-ui-label font-medium whitespace-nowrap"
      >
        현재 구매·대여 불가
      </Badge>
    );
  }

  // 전량 대여중
  if (isAllRented) {
    return (
      <Badge
        variant={badgeToneVariant("danger")}
        className="px-2 py-1 text-ui-label font-medium whitespace-nowrap"
      >
        현재 대여 중
      </Badge>
    );
  }

  return (
    <Badge
      variant={badgeToneVariant("brand")}
      className="px-2 py-1 text-ui-label font-medium whitespace-nowrap"
    >
      구매·대여 가능 {avail}개
    </Badge>
  );
}

const RacketCard = React.memo(
  function RacketCard({ racket, viewMode, brandLabel, isApplyFlow = false }: Props) {
    const availability = useRacketAvailability(racket.id);
    const { avail, isSold, ready } = availability;
    const canBuy = ready ? !isSold && avail > 0 : true; // 로딩 중엔 일단 true(서버에서 최종 검증)
    const canRent = racket.rental?.enabled ? (ready ? !isSold && avail > 0 : true) : false;
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
    const ratingAvg = Number(racket.ratingAvg ?? racket.ratingAverage ?? 0);
    const ratingCount = Number(racket.reviewCount ?? racket.ratingCount ?? 0);
    const ratingBadge = <CatalogRating average={ratingAvg} count={ratingCount} />;
    const buyLabel = isApplyFlow ? "스트링 선택" : "스트링 선택 후 구매";
    const salePrice = getEffectiveRacketPrice(racket);
    const discountRate = getRacketDiscountRate(racket);
    const hasSalePrice = discountRate > 0;
    const benefitBadgeClass = {
      off: badgeToneClass("danger"),
    };

    const marketingBadges = (
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        {racket.marketing?.isFeatured && (
          <Badge
            variant={merchandisingImageBadgeVariant("추천")}
            shape="pill"
            className={cn(merchandisingImageBadgeClass)}
          >
            추천
          </Badge>
        )}
        {racket.marketing?.isNew && (
          <Badge
            variant={merchandisingImageBadgeVariant("NEW")}
            shape="pill"
            className={cn(merchandisingImageBadgeClass)}
          >
            NEW
          </Badge>
        )}
      </div>
    );

    const priceBlock = (align: "left" | "right" = "right") => (
      <CatalogPrice
        regularPrice={racket.price}
        salePrice={hasSalePrice ? salePrice : null}
        label={hasSalePrice ? "할인가" : "판매가"}
        align={align === "right" ? "end" : "start"}
        size={viewMode === "list" ? "list" : "card"}
      />
    );

    const actionButtons = (options?: { compact?: boolean; stackOnNarrow?: boolean }) => {
      const compact = options?.compact ?? false;
      const buttonClassName = cn(
        "inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-center font-semibold [&_svg]:mr-0 [&_svg]:shrink-0",
        compact ? "text-ui-caption bp-sm:text-ui-label bp-md:text-ui-body-sm" : "text-ui-body-sm",
      );
      const disabledButtonClassName = cn(
        buttonClassName,
        "border border-border bg-muted/70 text-muted-foreground cursor-not-allowed opacity-100 disabled:opacity-100",
      );
      const iconClassName = "h-4 w-4 shrink-0";
      const buyButton = canBuy ? (
        <Button
          asChild
          size="sm"
          variant="highlight_soft"
          className={buttonClassName}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/rackets/${racket.id}/select-string`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 text-center"
          >
            <ShoppingCart className={iconClassName} />
            {buyLabel}
          </Link>
        </Button>
      ) : (
        <Button size="sm" className={disabledButtonClassName} disabled title={buyDisabledTitle}>
          <ShoppingCart className={iconClassName} />
          구매 불가
        </Button>
      );
      const rentButton =
        racket.rental?.enabled && canRent ? (
          <RentDialog
            id={racket.id}
            rental={racket.rental}
            brand={displayBrandLabel}
            model={racket.model}
            size="sm"
            preventCardNav={true}
            full={false}
            className={buttonClassName}
            variant={canBuy ? "outline" : "highlight_soft"}
            label="스트링 선택 후 대여"
          />
        ) : (
          <Button
            size="sm"
            className={disabledButtonClassName}
            disabled
            aria-disabled
            title={rentDisabledTitle}
          >
            <Briefcase className={iconClassName} />
            대여 불가
          </Button>
        );

      return (
        <div className="grid w-full grid-cols-1 gap-2">
          {canBuy ? buyButton : canRent ? rentButton : buyButton}
          {canBuy ? rentButton : canRent ? buyButton : rentButton}
        </div>
      );
    };

    const media = (
      <Link
        href={`/rackets/${racket.id}`}
        className={racketImageWrapClass}
        aria-label={`${displayBrandLabel} ${racket.model} 상세 보기`}
      >
        {(racket.marketing?.isFeatured || racket.marketing?.isNew) && marketingBadges}
        <Image
          src={racket.images?.[0] || "/placeholder.svg?height=300&width=300&query=tennis+racket"}
          alt={`${displayBrandLabel} ${racket.model}`}
          fill
          sizes={
            viewMode === "list"
              ? "(max-width: 768px) 100vw, 260px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className="object-contain object-center p-3 transition-opacity duration-200 group-hover:opacity-95"
        />
      </Link>
    );

    const content = (
      <div className="min-w-0">
        <div
          className="mb-1.5 max-w-full truncate text-ui-label font-semibold uppercase tracking-[0.08em] text-muted-foreground bp-sm:text-ui-body-sm"
          title={displayBrandLabel}
        >
          {displayBrandLabel}
        </div>
        <Link href={`/rackets/${racket.id}`} className="block min-w-0">
          <h3
            className="mb-2 line-clamp-2 break-words text-ui-body leading-snug text-foreground transition-colors group-hover:text-primary dark:group-hover:text-primary bp-sm:text-ui-card-title-lg bp-md:text-ui-section-title bp-lg:line-clamp-3"
            title={racket.model}
          >
            {racket.model}
          </h3>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {ratingBadge}
          <ConditionBadge state={racket.condition} />
          <RacketAvailBadge {...availability} />
          {!racket.rental?.enabled && <StatusBadge kind="rental" state="unavailable" />}
        </div>
      </div>
    );

    if (viewMode === "list") {
      return (
        <CatalogCardFrame
          viewMode="list"
          media={media}
          content={content}
          price={priceBlock("right")}
          actions={
            <>
              {actionButtons({ compact: true, stackOnNarrow: true })}
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 w-full justify-center whitespace-nowrap rounded-control bg-background text-ui-label font-semibold bp-sm:text-ui-body-sm"
              >
                <Link href={`/rackets/${racket.id}`}>
                  <Eye className="mr-1.5 h-4 w-4 shrink-0" />
                  상세 보기
                </Link>
              </Button>
            </>
          }
        />
      );
    }

    // grid view
    return (
      <CatalogCardFrame
        viewMode="grid"
        media={media}
        content={content}
        price={priceBlock()}
        actions={actionButtons({ compact: true, stackOnNarrow: false })}
      />
    );
  },
  (prev, next) =>
    prev.racket.id === next.racket.id &&
    prev.viewMode === next.viewMode &&
    prev.brandLabel === next.brandLabel &&
    Boolean(prev.isApplyFlow) === Boolean(next.isApplyFlow) &&
    prev.racket.marketing?.isFeatured === next.racket.marketing?.isFeatured &&
    prev.racket.marketing?.isNew === next.racket.marketing?.isNew &&
    prev.racket.marketing?.isSale === next.racket.marketing?.isSale &&
    prev.racket.marketing?.salePrice === next.racket.marketing?.salePrice &&
    prev.racket.price === next.racket.price &&
    prev.racket.ratingAvg === next.racket.ratingAvg &&
    prev.racket.ratingAverage === next.racket.ratingAverage &&
    prev.racket.ratingCount === next.racket.ratingCount &&
    prev.racket.reviewCount === next.racket.reviewCount,
);

export default RacketCard;
