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

  // 카드 공통 컴포넌트
  const ItemCard = ({ p }: { p: HItem }) => (
    <Link
      key={p._id}
      href={p.href ?? `/products/${p._id}`}
      className="group block h-full
        bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700
        hover:ring-1 hover:ring-blue-300/60 dark:hover:ring-blue-500/50
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative mb-6 aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl font-bold text-slate-400 dark:text-slate-500">{(p.brand ?? 'D').charAt(0)}</div>
        )}

        {(typeof p.rentalEnabled === 'boolean' || p.condition) && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
            {typeof p.rentalEnabled === 'boolean' && !p.rentalEnabled && <StatusBadge kind="rental" state="unavailable" />}
            {p.condition && <StatusBadge kind="condition" state={p.condition} />}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.brand}</div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">{p.name}</h3>
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Number(p.price).toLocaleString()}원</div>
      </div>
    </Link>
  );

  const PlaceholderCard = () => (
    <div
      className="h-full rounded-2xl p-6 border-2 border-dashed
        border-slate-300/70 dark:border-slate-600/70
        bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700"
    >
      <div className="relative mb-6 aspect-square rounded-xl overflow-hidden bg-white/40 dark:bg-slate-700/40 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-600" />
      </div>
      <div className="text-center space-y-2">
        <div className="text-base font-semibold text-slate-700 dark:text-slate-200">준비 중인 상품</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">곧 업데이트됩니다</div>
      </div>
    </div>
  );

  const SkeletonCard = () => (
    <div
      className="h-full rounded-2xl p-6 border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800 animate-pulse"
    >
      {/* 이미지 자리 스켈레톤 */}
      <div className="relative mb-6 aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700" />
      {/* 텍스트 자리 스켈레톤 3줄 */}
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-600" />
        <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-600" />
        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-600" />
      </div>
    </div>
  );

  const MoreCard = () => (
    <Link
      href={moreHref}
      className="group h-full
        bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700
        rounded-2xl p-6 border-2 border-dashed border-blue-300 dark:border-blue-600
        hover:border-blue-500 dark:hover:border-blue-400
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        flex items-center justify-center"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
          <ArrowRight className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">더 많은 상품</h3>
          <p className="text-sm text-blue-600 dark:text-blue-300">전체 컬렉션 보기</p>
        </div>
      </div>
    </Link>
  );

  // 렌더
  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900 relative rounded-2xl">
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10">
        {showHeader && (
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400" />
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400" />
            </div>
            {subtitle && <p className="text-xl text-slate-600 dark:text-slate-300">{subtitle}</p>}
          </div>
        )}

        <div className="relative">
          <div ref={viewportRef} className="overflow-hidden px-4">
            <div className={`flex gap-6 ${shouldCenter ? 'justify-center' : ''}`}>
              {slides.map((s, i) => {
                if (s.kind === 'item') {
                  return (
                    <div key={`it-${s.data!._id}`} className={slideClass}>
                      <ItemCard p={s.data!} />
                    </div>
                  );
                }

                // 로딩 중일 때 스켈레톤 카드
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

                // more
                return (
                  <div key={`more-${i}`} className={slideClass}>
                    <MoreCard />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 페이지 네비게이션:
              한 화면에 들어가는 카드 개수보다 전체 슬라이드가 많을 때만 노출 */}
          {slides.length > itemsPerPage && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {/* 좌우 네비게이션 버튼 */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="이전 상품 보기"
                  disabled={!canPrev}
                  className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 disabled:opacity-50"
                  onClick={() => scrollByPage('left')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="다음 상품 보기"
                  disabled={!canNext}
                  className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 disabled:opacity-50"
                  onClick={() => scrollByPage('right')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* 드래그 가능 안내 문구 */}
              <p className="text-xs text-slate-500 dark:text-slate-400">마우스 드래그(또는 터치)로도 좌우로 넘겨볼 수 있어요.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
