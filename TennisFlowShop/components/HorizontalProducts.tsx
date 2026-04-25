"use client";

import StatusBadge from "@/components/badges/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { imageBadgeClass } from "@/lib/badge-style";
import { cn } from "@/lib/utils";
import type { EmblaCarouselType, EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Inbox, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const productCardSurfaceClass =
  "group block h-full rounded-2xl border border-border bg-card p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md";
const placeholderSurfaceClass = "h-full rounded-2xl border border-border bg-background p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm";
const moreCardSurfaceClass =
  "group flex h-full items-center justify-center rounded-2xl border border-border bg-card p-4 bp-sm:p-5 bp-md:p-6 bp-lg:p-7 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md";
const subtlePanelClass = "rounded-xl border border-border/60 bg-secondary/40";

export type HItem = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  href?: string;
  condition?: "A" | "B" | "C" | "D";
  rentalEnabled?: boolean;
  merchandisingBadges?: Array<"NEW" | "정품">;
};

type Props = {
  title: string;
  subtitle?: string;
  items: HItem[];
  moreHref: string;
  /** 필요하면 슬라이드 폭 커스터마이징용 (기본은 2/3/4장 구조) */
  cardWidthClass?: string;
  showHeader?: boolean;

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
};

export default function HorizontalProducts({
  title,
  subtitle,
  items,
  moreHref,
  cardWidthClass,
  showHeader = true,
  firstPageSlots,
  moveMoreToSecondWhen5Plus,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
}: Props) {
  // 한 화면에 몇 장 보여줄지(2/3/4장 고정)
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const w = window.innerWidth;
      // 프로젝트 공용 BP(≤575 / 576~767 / 768~1199 / ≥1200)
      if (w <= 575) {
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
  }, []);

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
      const placeholderCount = Math.max(0, itemsPerPage - 1 - items.length);
      for (let i = 0; i < placeholderCount; i++) {
        list.push({ kind: "placeholder" });
      }
      list.push({ kind: "more" });
      return list;
    }

    // itemsPerPage 이상: 아이템 전부 + 더많은상품(맨 뒤)
    list.push({ kind: "more" });
    return list;
  }, [items, itemsPerPage, loading, error]);

  const shouldCenter = slides.length <= itemsPerPage;

  // 슬라이드 폭
  const slideClass = cardWidthClass ?? "flex-none basis-[calc((100%-12px)/2)] " + "bp-sm:basis-[calc((100%-16px)/2)] " + "bp-md-only:basis-[calc((100%-40px)/3)] " + "bp-lg:basis-[calc((100%-72px)/4)]";

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

  const ItemCard = ({ p }: { p: HItem }) => (
    <Link
      key={p._id}
      href={p.href ?? `/products/${p._id}`}
      className={productCardSurfaceClass}
    >
      <div className="relative mb-4 aspect-square overflow-hidden rounded-xl border border-border/50 bg-secondary/40 bp-sm:mb-5 bp-md:mb-6">
        {p.images?.[0] ? (
          <img src={p.images[0] || "/placeholder.svg"} alt={p.name} className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105 bp-sm:p-4 bp-md:p-5" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl bp-sm:text-4xl bp-md:text-5xl font-bold text-muted-foreground/50">{(p.brand ?? "D").charAt(0)}</div>
        )}

        {((typeof p.rentalEnabled === "boolean" || p.condition) || (p.merchandisingBadges?.length ?? 0) > 0) && (
          <div className="absolute top-2.5 left-2.5 right-2.5 bp-sm:top-3 bp-sm:left-3 bp-sm:right-3 flex items-center gap-2 z-10">
            {typeof p.rentalEnabled === "boolean" && !p.rentalEnabled && <StatusBadge kind="rental" state="unavailable" surface="image" />}
            {p.condition && <StatusBadge kind="condition" state={p.condition} surface="image" />}
            {(p.merchandisingBadges ?? []).slice(0, 2).map((label) => (
              <Badge
                key={`${p._id}-${label}`}
                className={cn(
                  "text-xs px-2.5 py-0.5 rounded-md shadow-sm",
                  imageBadgeClass(label === "NEW" ? "brand" : "info"),
                )}
              >
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 bp-sm:space-y-2.5 bp-md:space-y-3">
        <div className="text-sm bp-md:text-base text-foreground/80 font-medium">{p.brand}</div>
        <h3 className="text-sm bp-sm:text-base bp-md:text-lg bp-lg:text-xl font-semibold text-foreground line-clamp-2 min-h-[2.5rem] bp-sm:min-h-[3rem] bp-md:min-h-[3.5rem] leading-snug">{p.name}</h3>
        <div className="text-base bp-sm:text-lg bp-md:text-xl bp-lg:text-2xl font-bold text-foreground pt-1 bp-sm:pt-2 tracking-normal">
          {Number(p.price).toLocaleString()}
          <span className="text-sm bp-sm:text-base bp-md:text-lg font-medium ml-0.5">원</span>
        </div>
      </div>
    </Link>
  );

  const PlaceholderCard = () => (
    <div className={`${placeholderSurfaceClass} flex flex-col items-center justify-center`}>
      <div className={cn("relative mb-3 aspect-square w-full rounded-xl flex items-center justify-center", subtlePanelClass, "bp-sm:mb-4 bp-md:mb-5")}>
        <div className="h-12 w-12 rounded-full border border-border/60 bg-card bp-sm:h-14 bp-sm:w-14 bp-md:h-16 bp-md:w-16" />
      </div>
      <div className="text-center space-y-1.5">
        <div className="text-sm bp-sm:text-base bp-md:text-lg font-semibold text-foreground">준비 중</div>
        <div className="text-sm bp-md:text-base text-foreground/80">곧 상품이 업데이트됩니다.</div>
      </div>
    </div>
  );

  const SkeletonCard = () => (
    <div className="h-full animate-pulse rounded-2xl border border-border bg-card p-4 shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7">
      <div className="relative mb-3 aspect-square rounded-xl border border-border/50 bg-secondary/40 bp-sm:mb-4 bp-md:mb-5" />
      <div className="space-y-2 bp-sm:space-y-2.5 bp-md:space-y-3">
        <div className="h-3 bp-sm:h-4 bp-md:h-5 w-20 bp-sm:w-24 bp-md:w-28 rounded bg-muted/60 dark:bg-card/60" />
        <div className="h-4 bp-sm:h-5 bp-md:h-6 w-32 bp-sm:w-40 bp-md:w-48 rounded bg-muted/60 dark:bg-card/60" />
        <div className="h-5 bp-sm:h-6 bp-md:h-7 w-20 bp-sm:w-24 bp-md:w-28 rounded bg-muted/60 dark:bg-card/60" />
      </div>
    </div>
  );

  const MoreCard = () => (
    <Link
      href={moreHref}
      className={moreCardSurfaceClass}
    >
      <div className="text-center space-y-2 bp-sm:space-y-3 bp-md:space-y-4">
        <div className="w-14 h-14 bp-sm:w-16 bp-sm:h-16 bp-md:w-20 bp-md:h-20 rounded-full border border-border/60 bg-secondary mx-auto flex items-center justify-center transition-all duration-300 group-hover:shadow-sm">
          <ArrowRight className="h-6 w-6 bp-sm:h-7 bp-sm:w-7 bp-md:h-9 bp-md:w-9 text-foreground" />
        </div>
        <div className="space-y-1 bp-sm:space-y-1.5">
          <h3 className="text-sm bp-sm:text-base bp-md:text-lg bp-lg:text-xl font-bold text-foreground">더 많은 상품</h3>
          <p className="text-sm bp-md:text-base text-foreground/80">전체 보기</p>
        </div>
      </div>
    </Link>
  );

  const EmptyCard = () => (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-background p-4 text-center shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7">
      <div className="w-14 h-14 bp-sm:w-16 bp-sm:h-16 rounded-full bg-secondary border border-border/60 text-foreground flex items-center justify-center mb-3">
        <Inbox className="h-6 w-6 text-foreground" />
      </div>
      <div className="text-sm bp-sm:text-base font-semibold text-foreground">{emptyTitle ?? "등록된 상품이 없습니다"}</div>
      <div className="mt-1 text-sm text-foreground/80">{emptyDescription ?? "곧 상품이 업데이트됩니다."}</div>
    </div>
  );

  const ErrorCard = () => (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center text-foreground shadow-sm bp-sm:p-5 bp-md:p-6 bp-lg:p-7">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-secondary bp-sm:h-16 bp-sm:w-16">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-sm bp-sm:text-base font-semibold text-foreground">{errorTitle ?? "불러오지 못했어요"}</div>
      <div className="mt-1 text-sm text-foreground/80">{errorDescription ?? "네트워크 상태를 확인 후 다시 시도해 주세요."}</div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3 rounded-full">
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
            <h2 className="text-2xl bp-sm:text-3xl bp-md:text-4xl bp-lg:text-5xl font-bold text-foreground mb-1.5 bp-sm:mb-2">{title}</h2>
            {subtitle && <p className="text-xs bp-sm:text-sm bp-md:text-base bp-lg:text-xl text-muted-foreground">{subtitle}</p>}
          </div>
        )}

        <div className="relative">
          <div ref={viewportRef} className="overflow-hidden">
            <div className={`flex gap-3 bp-sm:gap-4 bp-md-only:gap-5 bp-lg:gap-6 ${shouldCenter ? "justify-center" : ""}`}>
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
                  className="h-9 w-9 rounded-full bp-sm:h-10 bp-sm:w-10 bp-md:h-12 bp-md:w-12"
                  onClick={() => scrollByPage("left")}
                >
                  <ChevronLeft className="h-4 w-4 bp-sm:h-4 bp-sm:w-4 bp-md:h-5 bp-md:w-5" />
                </Button>

                <Button
                  variant="elevated"
                  size="icon"
                  aria-label="다음 상품 보기"
                  disabled={!canNext}
                  className="h-9 w-9 rounded-full bp-sm:h-10 bp-sm:w-10 bp-md:h-12 bp-md:w-12"
                  onClick={() => scrollByPage("right")}
                >
                  <ChevronRight className="h-4 w-4 bp-sm:h-4 bp-sm:w-4 bp-md:h-5 bp-md:w-5" />
                </Button>
              </div>

              <p className="text-sm text-foreground/80 hidden bp-sm:block">드래그하거나 터치로 넘겨보세요</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
