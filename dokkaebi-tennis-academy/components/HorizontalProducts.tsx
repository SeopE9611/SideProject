'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/badges/StatusBadge';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaOptionsType, EmblaCarouselType } from 'embla-carousel';

export type HItem = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  href?: string;
  condition?: 'A' | 'B' | 'C' | 'D';
  rentalEnabled?: boolean;
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
};

export default function HorizontalProducts({ title, subtitle, items, moreHref, cardWidthClass, showHeader = true, firstPageSlots, moveMoreToSecondWhen5Plus, loading }: Props) {
  // 한 화면에 몇 장 보여줄지(2/3/4장 고정)
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const w = window.innerWidth;
      if (w < 640) {
        // 모바일
        setItemsPerPage(2);
      } else if (w < 1024) {
        // 태블릿
        setItemsPerPage(3);
      } else {
        // 데스크톱
        setItemsPerPage(4);
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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
    const list: Array<{ kind: 'item' | 'placeholder' | 'more' | 'skeleton'; data?: HItem }> = [];

    // 로딩 중일 때: 스켈레톤 카드만 채우기
    if (loading) {
      for (let i = 0; i < itemsPerPage; i++) {
        list.push({ kind: 'skeleton' });
      }
      return list;
    }

    // 데이터 0개: "준비 중인 상품" 플레이스홀더
    if (items.length === 0) {
      for (let i = 0; i < itemsPerPage; i++) {
        list.push({ kind: 'placeholder' });
      }
      return list;
    }

    // 아이템들 먼저 넣기
    items.forEach((it) => list.push({ kind: 'item', data: it }));

    // 1~(itemsPerPage - 1)개: 빈칸 + 더많은상품 카드로 한 화면 맞추기
    if (items.length < itemsPerPage) {
      const placeholderCount = Math.max(0, itemsPerPage - 1 - items.length);
      for (let i = 0; i < placeholderCount; i++) {
        list.push({ kind: 'placeholder' });
      }
      list.push({ kind: 'more' });
      return list;
    }

    // itemsPerPage 이상: 아이템 전부 + 더많은상품(맨 뒤)
    list.push({ kind: 'more' });
    return list;
  }, [items, itemsPerPage, loading]); // ← loading 의존성 추가

  const shouldCenter = slides.length <= itemsPerPage;

  // 슬라이드 폭: 2 / 3 / 4 장이 gap까지 포함해서 딱 맞도록 calc 사용
  const slideClass = cardWidthClass ?? 'flex-none basis-[calc((100%-24px)/2)] md:basis-[calc((100%-48px)/3)] lg:basis-[calc((100%-72px)/4)]';

  // Embla 설정
  //    - slidesToScroll 을 itemsPerPage 로 줘서
  //      버튼 클릭 시 "한 페이지(2/3/4장)씩" 이동
  const emblaOptions: EmblaOptionsType = {
    align: 'start',
    dragFree: false,
    containScroll: 'trimSnaps',
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
    emblaApi.on('select', handleSelect);
    // 슬라이드가 reInit(초기화/재계산) 될 때마다
    emblaApi.on('reInit', handleSelect);
    // 클린업 – 타입 에러나면 이 부분은 빼도 동작은 함
    // return () => {
    //   emblaApi.off('select', handleSelect);
    //   emblaApi.off('reInit', handleSelect);
    // };
  }, [emblaApi]);

  const scrollByPage = (dir: 'left' | 'right') => {
    if (!emblaApi) return;
    if (dir === 'left') emblaApi.scrollPrev();
    else emblaApi.scrollNext();
  };

  const ItemCard = ({ p }: { p: HItem }) => (
    <Link
      key={p._id}
      href={p.href ?? `/products/${p._id}`}
      className="group block h-full
        bg-white dark:bg-slate-900 rounded-xl p-4 md:p-5 lg:p-6 
        transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    >
      <div className="relative mb-3 md:mb-4 aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        {p.images?.[0] ? (
          <img src={p.images[0] || '/placeholder.svg'} alt={p.name} className="w-full h-full object-contain p-2 md:p-3" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center h-full text-3xl md:text-5xl font-bold text-slate-300 dark:text-slate-600">{(p.brand ?? 'D').charAt(0)}</div>
        )}

        {(typeof p.rentalEnabled === 'boolean' || p.condition) && (
          <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5 z-10">
            {typeof p.rentalEnabled === 'boolean' && !p.rentalEnabled && <StatusBadge kind="rental" state="unavailable" />}
            {p.condition && <StatusBadge kind="condition" state={p.condition} />}
          </div>
        )}
      </div>

      <div className="space-y-1.5 md:space-y-2">
        <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">{p.brand}</div>
        <h3
          className="text-sm md:text-base lg:text-lg font-semibold text-slate-900 dark:text-white 
          line-clamp-2 min-h-[2.5rem] md:min-h-[3rem] leading-snug"
        >
          {p.name}
        </h3>
        <div className="text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-white pt-1">{Number(p.price).toLocaleString()}원</div>
      </div>
    </Link>
  );

  const PlaceholderCard = () => (
    <div
      className="h-full rounded-xl p-4 md:p-5 lg:p-6 
      bg-slate-50 dark:bg-slate-800/50 
      flex flex-col items-center justify-center"
    >
      <div
        className="relative mb-3 md:mb-4 aspect-square w-full rounded-lg bg-slate-100 dark:bg-slate-700 
        flex items-center justify-center"
      >
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-200 dark:bg-slate-600" />
      </div>
      <div className="text-center space-y-1">
        <div className="text-sm md:text-base font-semibold text-slate-400 dark:text-slate-500">준비 중</div>
        <div className="text-xs md:text-sm text-slate-400 dark:text-slate-600">곧 업데이트</div>
      </div>
    </div>
  );

  const SkeletonCard = () => (
    <div
      className="h-full rounded-xl p-4 md:p-5 lg:p-6 
      bg-white dark:bg-slate-900 animate-pulse"
    >
      <div className="relative mb-3 md:mb-4 aspect-square rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="space-y-2 md:space-y-3">
        <div className="h-3 md:h-4 w-20 md:w-24 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 md:h-5 w-32 md:w-40 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-5 md:h-6 w-20 md:w-24 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );

  const MoreCard = () => (
    <Link
      href={moreHref}
      className="group h-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 md:p-5 lg:p-6 
        hover:bg-slate-100 dark:hover:bg-slate-700
        transition-all duration-300 flex items-center justify-center hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="text-center space-y-2 md:space-y-3">
        <div
          className="w-14 h-14 md:w-18 md:h-18 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto 
          flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
        >
          <ArrowRight className="h-6 w-6 md:h-8 md:w-8 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-slate-900 dark:text-white">더 많은 상품</h3>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">전체 보기</p>
        </div>
      </div>
    </Link>
  );

  // 렌더
  return (
    <section className="relative">
      <div className="relative z-10">
        {showHeader && (
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
            {subtitle && <p className="text-sm md:text-base lg:text-xl text-slate-600 dark:text-slate-400">{subtitle}</p>}
          </div>
        )}

        <div className="relative">
          <div ref={viewportRef} className="overflow-hidden">
            <div className={`flex gap-3 md:gap-4 lg:gap-6 ${shouldCenter ? 'justify-center' : ''}`}>
              {slides.map((s, i) => {
                if (s.kind === 'item') {
                  return (
                    <div key={`it-${s.data!._id}`} className={slideClass}>
                      <ItemCard p={s.data!} />
                    </div>
                  );
                }

                if (s.kind === 'skeleton') {
                  return (
                    <div key={`sk-${i}`} className={slideClass}>
                      <SkeletonCard />
                    </div>
                  );
                }

                if (s.kind === 'placeholder') {
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
            <div className="mt-6 md:mt-8 flex flex-col items-center gap-2">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="이전 상품 보기"
                  disabled={!canPrev}
                  className="rounded-full w-10 h-10 md:w-12 md:h-12 p-0 
                    bg-white dark:bg-slate-900 
                    border-0 shadow-md
                    hover:shadow-xl hover:scale-105
                    disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all duration-300"
                  onClick={() => scrollByPage('left')}
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="다음 상품 보기"
                  disabled={!canNext}
                  className="rounded-full w-10 h-10 md:w-12 md:h-12 p-0 
                    bg-white dark:bg-slate-900 
                    border-0 shadow-md
                    hover:shadow-xl hover:scale-105
                    disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all duration-300"
                  onClick={() => scrollByPage('right')}
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">드래그하거나 터치로 넘겨보세요</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
