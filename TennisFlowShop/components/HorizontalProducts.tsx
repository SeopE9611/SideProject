"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { merchandisingImageBadgeClass, merchandisingImageBadgeVariant } from "@/lib/badge-style";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { cn } from "@/lib/utils";
import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const productCardSurfaceClass =
  "group block h-full rounded-2xl border border-border bg-card p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md";
const placeholderSurfaceClass =
  "h-full rounded-2xl border border-border bg-background p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm";
const moreCardSurfaceClass =
  "group flex h-full items-center justify-center rounded-2xl border border-border bg-card p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md";
const subtlePanelClass = "rounded-xl border border-border/60 bg-secondary/40";
const homeProductCardSurfaceClass =
  "group block h-full rounded-panel border border-border/80 bg-card p-3 shadow-none transition-[border-color,background-color] duration-200 hover:border-foreground/20 hover:bg-muted/20 bp-sm:p-4 bp-md:p-5";
const homePlaceholderSurfaceClass =
  "h-full rounded-panel border border-border/80 bg-card p-3 shadow-none bp-sm:p-4 bp-md:p-5";
const homeMoreCardSurfaceClass =
  "group flex h-full items-center justify-center rounded-panel border border-border/80 bg-card p-3 shadow-none transition-[border-color,background-color] duration-200 hover:border-foreground/20 hover:bg-muted/30 bp-sm:p-4 bp-md:p-5";
const normalizeImageSrc = (src?: string) => {
  const imageSrc = src || "/placeholder.svg";
  return imageSrc.startsWith("http") || imageSrc.startsWith("/") ? imageSrc : `/${imageSrc}`;
};

export type HItem = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  href?: string;
  merchandisingBadges?: Array<"품절" | "SALE" | "NEW" | "추천" | "입고예정">;
  inventory?: {
    isSale?: boolean | string | number;
    salePrice?: number | string | null;
  };
  marketing?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number | string | null;
  };
};

type Props = {
  title: string;
  subtitle?: string;
  items: HItem[];
  moreHref: string;
  /** 필요하면 슬라이드 폭 커스터마이징용 (기본은 2/3/4장 구조) */
  cardWidthClass?: string;
  showHeader?: boolean;
  showMoreCard?: boolean;

  // API 호환용 (지금은 안 씀)
  firstPageSlots?: number;
  moveMoreToSecondWhen5Plus?: boolean;
  loading?: boolean;

  // 상태 구분용
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  variant?: "default" | "home";
};

export default function HorizontalProducts({
  title,
  subtitle,
  items,
  moreHref,
  cardWidthClass,
  showHeader = true,
  showMoreCard = true,
  firstPageSlots,
  moveMoreToSecondWhen5Plus,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
  variant = "default",
}: Props) {
  // 한 화면에 몇 장 보여줄지(2/3/4장 고정)
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const w = window.innerWidth;
      // 프로젝트 공용 BP(≤575 / 576~767 / 768~1199 / ≥1200)
      if (variant === "home") {
        if (w <= 575) setItemsPerPage(1);
        else if (w <= 1199) setItemsPerPage(2);
        else setItemsPerPage(3);
      } else if (w <= 575) {
        // Mobile S
        setItemsPerPage(2);
      } else if (w <= 767) {
        // Mobile L
        setItemsPerPage(2);
      } else if (w <= 1199) {
        // Tablet
        setItemsPerPage(3);
      } else {
        // Desktop
        setItemsPerPage(4);
      }
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [variant]);

  // 데이터 → 슬라이드 배열로 변환
  //
  //   - items.length === 0:
  //       → 플레이스홀더 itemsPerPage개 (더보기 없음)
  //   - 1 ~ itemsPerPage - 1:
  //       → 아이템들 + 플레이스홀더(빈칸) + 더보기 = 한 화면 딱 itemsPerPage개
  //   - itemsPerPage 이상:
  //       → 전체 아이템 + 더보기 (맨 끝)
  // ─────────────────────────────
  const slides = useMemo(() => {
    // skeleton 타입 추가
    const list: Array<{
      kind: "item" | "placeholder" | "more" | "skeleton" | "error" | "empty";
      data?: HItem;
    }> = [];

    // 에러 상태: 사용자에게 “실패”를 명확히 알림
    if (error) {
      for (let i = 0; i < itemsPerPage; i++) {
        list.push({ kind: "error" });
      }
      return list;
    }

    // 로딩 중일 때: 스켈레톤 카드만 채우기
    if (loading) {
      for (let i = 0; i < itemsPerPage; i++) {
        list.push({ kind: "skeleton" });
      }
      return list;
    }

    // 빈 상태: “상품이 없음”을 명확히 알림
    if (items.length === 0) {
      for (let i = 0; i < itemsPerPage; i++) {
        list.push({ kind: "empty" });
      }
      return list;
    }

    // 아이템들 먼저 넣기
    items.forEach((it) => list.push({ kind: "item", data: it }));

    // 1~(itemsPerPage - 1)개: 빈칸 + 더많은상품 카드로 한 화면 맞추기
    if (items.length < itemsPerPage) {
      const placeholderCount = showMoreCard
        ? Math.max(0, itemsPerPage - 1 - items.length)
        : Math.max(0, itemsPerPage - items.length);
      for (let i = 0; i < placeholderCount; i++) {
        list.push({ kind: "placeholder" });
      }
      if (showMoreCard) list.push({ kind: "more" });
      return list;
    }

    // itemsPerPage 이상: 아이템 전부 + 더많은상품(맨 뒤)
    if (showMoreCard) {
      list.push({ kind: "more" });
    }
    return list;
  }, [items, itemsPerPage, loading, error, showMoreCard]);

  const shouldCenter = slides.length <= itemsPerPage;

  // 슬라이드 폭
  const slideClass =
    cardWidthClass ??
    (variant === "home"
      ? "flex-none basis-full bp-sm:basis-[calc((100%_-_16px)/2)] bp-lg:basis-[calc((100%_-_48px)/3)]"
      : "flex-none basis-[calc((100%-12px)/2)] " +
        "bp-sm:basis-[calc((100%-16px)/2)] " +
        "bp-md-only:basis-[calc((100%-40px)/3)] " +
        "bp-lg:basis-[calc((100%-72px)/4)]");

  // Embla 설정
  //    - slidesToScroll 을 itemsPerPage 로 줘서
  //      버튼 클릭 시 "한 페이지(2/3/4장)씩" 이동
  const emblaOptions: EmblaOptionsType = {
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
    slidesToScroll: itemsPerPage,
  };

  const [viewportRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = (api: EmblaCarouselType) => {
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  };

  useEffect(() => {
    if (!emblaApi) return;
    // 공통 핸들러
    const handleSelect = () => {
      onSelect(emblaApi);
    };
    // 초기 상태 계산
    handleSelect();
    // 슬라이드가 선택될 때마다
    emblaApi.on("select", handleSelect);
    // 슬라이드가 reInit(초기화/재계산) 될 때마다
    emblaApi.on("reInit", handleSelect);
    // 클린업 – 타입 에러나면 이 부분은 빼도 동작은 함
    // return () => {
    //   emblaApi.off('select', handleSelect);
    //   emblaApi.off('reInit', handleSelect);
    // };
  }, [emblaApi]);

  const scrollByPage = (dir: "left" | "right") => {
    if (!emblaApi) return;
    if (dir === "left") emblaApi.scrollPrev();
    else emblaApi.scrollNext();
  };

  const isHomeVariant = variant === "home";
  const cardSurfaceClass = isHomeVariant ? homeProductCardSurfaceClass : productCardSurfaceClass;
  const placeholderCardSurfaceClass = isHomeVariant
    ? homePlaceholderSurfaceClass
    : placeholderSurfaceClass;
  const moreSurfaceClass = isHomeVariant ? homeMoreCardSurfaceClass : moreCardSurfaceClass;
  const stateCardClass = isHomeVariant
    ? "flex h-full flex-col items-center justify-center rounded-panel border border-border/80 bg-card p-3 text-center shadow-none bp-sm:p-4 bp-md:p-5"
    : "flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-background p-4 text-center shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7";
  const errorCardClass = isHomeVariant
    ? "flex h-full flex-col items-center justify-center rounded-panel border border-border/80 bg-card p-3 text-center text-foreground shadow-none bp-sm:p-4 bp-md:p-5"
    : "flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center text-foreground shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7";
  const imageSurfaceClass = isHomeVariant
    ? "relative mb-3 aspect-square overflow-hidden rounded-control border border-border/70 bg-muted/30 bp-sm:mb-4 bp-md:mb-5"
    : "relative mb-4 aspect-square overflow-hidden rounded-xl border border-border/50 bg-secondary/40 bp-sm:mb-5 bp-md:mb-6";

  const ItemCard = ({ p }: { p: HItem }) =>
    (() => {
      const regularPrice = Number(p.price ?? 0);
      const racketSaleRate = p.marketing ? getRacketDiscountRate(p) : 0;
      const salePrice = p.marketing
        ? getEffectiveRacketPrice(p)
        : Number(p.inventory?.salePrice ?? 0);
      const isSale = p.marketing
        ? racketSaleRate > 0
        : (p.inventory?.isSale === true ||
            p.inventory?.isSale === "true" ||
            p.inventory?.isSale === 1) &&
          salePrice > 0 &&
          salePrice < regularPrice;
      const displayPrice = isSale ? salePrice : regularPrice;
      const saleRate = p.marketing
        ? racketSaleRate
        : isSale
          ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
          : 0;
      return (
        <Link key={p._id} href={p.href ?? `/products/${p._id}`} className={cardSurfaceClass}>
          <div className={imageSurfaceClass}>
            {p.images?.[0] ? (
              <Image
                src={normalizeImageSrc(p.images[0])}
                alt={p.name}
                fill
                className={cn(
                  "object-contain p-3 bp-sm:p-4 bp-md:p-5",
                  !isHomeVariant && "transition-transform duration-500 group-hover:scale-105",
                )}
                sizes="(max-width: 767px) calc((100vw - 36px) / 2), (max-width: 1199px) calc((100vw - 88px) / 3), 282px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ui-section-title-lg font-semibold text-muted-foreground/50 bp-sm:text-ui-page-title bp-md:text-ui-page-title-lg">
                {(p.brand ?? "D").charAt(0)}
              </div>
            )}

            {(p.merchandisingBadges?.length ?? 0) > 0 && (
              <div className="absolute top-2.5 left-2.5 right-2.5 bp-sm:top-3 bp-sm:left-3 bp-sm:right-3 flex items-center gap-2 z-10">
                {(p.merchandisingBadges ?? [])
                  .filter((label) => label === "NEW" || label === "추천")
                  .slice(0, 2)
                  .map((label) => (
                    <Badge
                      key={`${p._id}-${label}`}
                      variant={merchandisingImageBadgeVariant(label)}
                      shape="pill"
                      className={cn(merchandisingImageBadgeClass)}
                    >
                      {label}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-2 bp-sm:space-y-2.5 bp-md:space-y-3">
            <div className="text-ui-body-sm font-medium text-foreground/70 bp-md:text-ui-body">
              {p.brand}
            </div>
            <h3 className="line-clamp-2 min-h-[2.5rem] text-ui-body-sm font-medium leading-snug text-foreground bp-sm:min-h-[3rem] bp-sm:text-ui-card-title bp-md:min-h-[3.5rem] bp-md:text-ui-card-title-lg">
              {p.name}
            </h3>
            <div className="pt-1 bp-sm:pt-2">
              <div className="text-ui-price font-semibold tracking-normal text-foreground bp-sm:text-ui-price-lg">
                {displayPrice.toLocaleString()}
                <span className="ml-0.5 text-ui-body-sm font-medium">원</span>
              </div>
              {isSale && (
                <div className="flex items-center gap-2">
                  <span className="text-ui-label text-muted-foreground line-through">
                    {regularPrice.toLocaleString()}원
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 whitespace-nowrap border-destructive/30 bg-destructive/10 text-ui-caption text-destructive"
                  >
                    {saleRate}% OFF
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Link>
      );
    })();

  const PlaceholderCard = () => (
    <div className={`${placeholderCardSurfaceClass} flex flex-col items-center justify-center`}>
      <div
        className={cn(
          "relative mb-3 aspect-square w-full rounded-xl flex items-center justify-center",
          subtlePanelClass,
          "bp-sm:mb-4 bp-md:mb-5",
        )}
      >
        <div className="h-12 w-12 rounded-full border border-border/60 bg-card bp-sm:h-14 bp-sm:w-14 bp-md:h-16 bp-md:w-16" />
      </div>
      <div className="text-center space-y-1.5">
        <div className="text-ui-card-title font-medium text-foreground bp-sm:text-ui-card-title-lg">
          준비 중
        </div>
        <div className="text-ui-body-sm text-muted-foreground bp-md:text-ui-body">
          곧 상품이 업데이트됩니다.
        </div>
      </div>
    </div>
  );

  const SkeletonCard = () => (
    <div
      className={cn(
        "h-full animate-pulse",
        isHomeVariant
          ? "rounded-panel border border-border/80 bg-card p-3 shadow-none bp-sm:p-4 bp-md:p-5"
          : "rounded-2xl border border-border bg-card p-4 shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7",
      )}
    >
      <div className="relative mb-3 aspect-square rounded-xl border border-border/50 bg-secondary/40 bp-sm:mb-4 bp-md:mb-5" />
      <div className="space-y-2 bp-sm:space-y-2.5 bp-md:space-y-3">
        <div className="h-3 bp-sm:h-4 bp-md:h-5 w-20 bp-sm:w-24 bp-md:w-28 rounded bg-muted/60 dark:bg-card/60" />
        <div className="h-4 bp-sm:h-5 bp-md:h-6 w-32 bp-sm:w-40 bp-md:w-48 rounded bg-muted/60 dark:bg-card/60" />
        <div className="h-5 bp-sm:h-6 bp-md:h-7 w-20 bp-sm:w-24 bp-md:w-28 rounded bg-muted/60 dark:bg-card/60" />
      </div>
    </div>
  );

  const MoreCard = () => (
    <Link href={moreHref} className={moreSurfaceClass}>
      <div className="text-center space-y-2 bp-sm:space-y-3 bp-md:space-y-4">
        <div className="w-14 h-14 bp-sm:w-16 bp-sm:h-16 bp-md:w-20 bp-md:h-20 rounded-full border border-border/60 bg-secondary mx-auto flex items-center justify-center transition-all duration-300 group-hover:shadow-sm">
          <ArrowRight className="h-6 w-6 bp-sm:h-7 bp-sm:w-7 bp-md:h-9 bp-md:w-9 text-foreground" />
        </div>
        <div className="space-y-1 bp-sm:space-y-1.5">
          <h3 className="text-ui-card-title font-medium text-foreground bp-sm:text-ui-card-title-lg">
            더 많은 상품
          </h3>
          <p className="text-ui-body-sm text-muted-foreground bp-md:text-ui-body">전체 보기</p>
        </div>
      </div>
    </Link>
  );

  const EmptyCard = () => (
    <div className={stateCardClass}>
      <div className="w-14 h-14 bp-sm:w-16 bp-sm:h-16 rounded-full bg-secondary border border-border/60 text-foreground flex items-center justify-center mb-3">
        <Inbox className="h-6 w-6 text-foreground" />
      </div>
      <div className="text-ui-card-title font-medium text-foreground">
        {emptyTitle ?? "등록된 상품이 없습니다"}
      </div>
      <div className="mt-1 text-ui-body-sm text-muted-foreground">
        {emptyDescription ?? "곧 상품이 업데이트됩니다."}
      </div>
    </div>
  );

  const ErrorCard = () => (
    <div className={errorCardClass}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-secondary bp-sm:h-16 bp-sm:w-16">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-ui-card-title font-medium text-foreground">
        {errorTitle ?? "불러오지 못했어요"}
      </div>
      <div className="mt-1 text-ui-body-sm text-muted-foreground">
        {errorDescription ?? "네트워크 상태를 확인 후 다시 시도해 주세요."}
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 rounded-full"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      )}
    </div>
  );

  // 렌더
  return (
    <section className="relative">
      <div className="relative z-10">
        {showHeader && (
          <div className="text-center mb-6 bp-sm:mb-8 bp-md:mb-12 bp-lg:mb-16">
            <h2 className="mb-1.5 text-ui-section-title font-semibold text-foreground bp-sm:mb-2 bp-sm:text-ui-section-title-lg bp-md:text-ui-page-title">
              {title}
            </h2>
            {subtitle && (
              <p className="text-ui-body-sm text-muted-foreground bp-sm:text-ui-body">{subtitle}</p>
            )}
          </div>
        )}

        <div className="relative">
          <div ref={viewportRef} className="overflow-hidden">
            <div
              className={`flex gap-3 bp-sm:gap-4 bp-md-only:gap-5 bp-lg:gap-6 ${shouldCenter ? "justify-center" : ""}`}
            >
              {slides.map((s, i) => {
                if (s.kind === "item") {
                  return (
                    <div key={`it-${s.data!._id}`} className={slideClass}>
                      <ItemCard p={s.data!} />
                    </div>
                  );
                }

                if (s.kind === "skeleton") {
                  return (
                    <div key={`sk-${i}`} className={slideClass}>
                      <SkeletonCard />
                    </div>
                  );
                }

                if (s.kind === "empty") {
                  return (
                    <div key={`em-${i}`} className={slideClass}>
                      <EmptyCard />
                    </div>
                  );
                }

                if (s.kind === "error") {
                  return (
                    <div key={`er-${i}`} className={slideClass}>
                      <ErrorCard />
                    </div>
                  );
                }

                if (s.kind === "placeholder") {
                  return (
                    <div key={`ph-${i}`} className={slideClass}>
                      <PlaceholderCard />
                    </div>
                  );
                }

                return (
                  <div key={`more-${i}`} className={slideClass}>
                    <MoreCard />
                  </div>
                );
              })}
            </div>
          </div>

          {slides.length > itemsPerPage && (
            <div className="mt-4 bp-sm:mt-6 bp-md:mt-8 flex flex-col items-center gap-2">
              <div className="flex gap-2 bp-sm:gap-3">
                <Button
                  variant="elevated"
                  size="icon"
                  aria-label="이전 상품 보기"
                  disabled={!canPrev}
                  className={cn(
                    "h-9 w-9 bp-sm:h-10 bp-sm:w-10 bp-md:h-12 bp-md:w-12",
                    isHomeVariant ? "rounded-control" : "rounded-full",
                  )}
                  onClick={() => scrollByPage("left")}
                >
                  <ChevronLeft className="h-4 w-4 bp-sm:h-4 bp-sm:w-4 bp-md:h-5 bp-md:w-5" />
                </Button>

                <Button
                  variant="elevated"
                  size="icon"
                  aria-label="다음 상품 보기"
                  disabled={!canNext}
                  className={cn(
                    "h-9 w-9 bp-sm:h-10 bp-sm:w-10 bp-md:h-12 bp-md:w-12",
                    isHomeVariant ? "rounded-control" : "rounded-full",
                  )}
                  onClick={() => scrollByPage("right")}
                >
                  <ChevronRight className="h-4 w-4 bp-sm:h-4 bp-sm:w-4 bp-md:h-5 bp-md:w-5" />
                </Button>
              </div>

              <p className="hidden text-ui-body-sm text-muted-foreground bp-sm:block">
                드래그하거나 터치로 넘겨보세요
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
