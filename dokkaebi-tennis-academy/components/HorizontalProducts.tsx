'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/badges/StatusBadge';

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

type HorizontalProductsProps = {
  /** 섹션 제목 */
  title: string;
  /** 섹션 부제목 */
  subtitle?: string;
  /** 노출할 상품 목록 */
  items: HItem[];
  /** “더 많은 상품” 카드 링크 */
  moreHref: string;
  /** 첫 페이지 카드 폭 */
  cardWidthClass?: string;
  /** 첫 페이지 슬롯 수(기본 4: 상품 3 + 더보기 1) */
  firstPageSlots?: number;
  /** 5개 이상이면 더보기를 2페이지로 보낼지 */
  moveMoreToSecondWhen5Plus?: boolean;
  /** 로딩 스켈레톤 개수 */
  skeletonCount?: number;
  /** 로딩 상태 */
  loading?: boolean;
  /** 헤더(제목/부제) 렌더 여부 (기본 true) */
  showHeader?: boolean;
};

export default function HorizontalProducts({
  title,
  subtitle,
  items,
  moreHref,
  cardWidthClass = 'w-[260px] sm:w-[280px] md:w-[300px] lg:w-[320px]',
  firstPageSlots = 4,
  moveMoreToSecondWhen5Plus = true,
  skeletonCount = 8,
  loading = false,
  showHeader = true, // 기본값: 헤더 출력
}: HorizontalProductsProps) {
  // 내부 상태/참조 (섹션 단위로 독립)
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLAnchorElement | HTMLDivElement | null>(null);
  const [isCentered, setIsCentered] = useState(false);

  // 슬롯 계산
  const PRODUCT_SLOTS = firstPageSlots - 1; // 마지막 1칸은 기본적으로 '더보기'
  const showMoreOnSecond = moveMoreToSecondWhen5Plus && items.length >= 5;

  const firstPageProducts = useMemo(() => (showMoreOnSecond ? items.slice(0, firstPageSlots) : items.slice(0, PRODUCT_SLOTS)), [items, showMoreOnSecond, firstPageSlots, PRODUCT_SLOTS]);
  const restProducts = useMemo(() => (showMoreOnSecond ? items.slice(firstPageSlots) : items.slice(PRODUCT_SLOTS)), [items, showMoreOnSecond, firstPageSlots, PRODUCT_SLOTS]);

  // 첫 페이지 플레이스홀더(보기 균형 유지)
  const fillerCount = Math.max(0, (showMoreOnSecond ? firstPageSlots : PRODUCT_SLOTS) - firstPageProducts.length);

  // 페이지 폭 스크롤
  const scrollByPage = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.95;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // 콘텐츠 < 컨테이너 → 가운데 정렬
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const container = scrollRef.current;
      const list = listRef.current;
      const first = firstCardRef.current;
      if (!container || !list || !first) return;

      const gap = parseFloat(getComputedStyle(list).gap || '0');
      const cw = first.getBoundingClientRect().width;
      const firstPageCount = firstPageProducts.length + fillerCount + (showMoreOnSecond ? 0 : 1);
      const contentWidth = firstPageCount * cw + (firstPageCount - 1) * gap;
      setIsCentered(contentWidth + 0.5 < container.clientWidth);
    });

    if (scrollRef.current) ro.observe(scrollRef.current);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [firstPageProducts.length, fillerCount, showMoreOnSecond]);

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900 relative rounded-2xl">
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10">
        {/* 타이틀 */}
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

        {/* 리스트 */}
        <div className="relative">
          <div ref={scrollRef} className="overflow-x-auto overflow-y-visible scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            <div ref={listRef} className={`flex gap-6 py-3 w-full px-4 snap-x snap-mandatory ${isCentered ? 'justify-center' : 'justify-start'}`}>
              {loading ? (
                <div className="flex gap-6 pb-4">
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} className={`flex-none ${cardWidthClass} rounded-2xl bg-white/80 dark:bg-slate-800/80 p-6 shadow-sm`}>
                      <div className="mb-6 h-48 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="h-4 mb-2 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-6 pb-4">
                  {/* 첫 페이지 상품 */}
                  {firstPageProducts.map((p, idx) => (
                    <Link
                      key={p._id}
                      href={p.href ?? `/products/${p._id}`}
                      ref={idx === 0 ? (firstCardRef as any) : undefined}
                      className={`group block flex-none ${cardWidthClass} snap-start
                        bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700
                        hover:ring-1 hover:ring-blue-300/60 dark:hover:ring-blue-500/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
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
                  ))}

                  {/* 부족분 플레이스홀더 */}
                  {Array.from({ length: fillerCount }).map((_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className={`flex-none ${cardWidthClass} snap-start rounded-2xl p-6 border-2 border-dashed
                        border-slate-300/70 dark:border-slate-600/70
                        bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700
                        text-center flex items-center justify-center`}
                    >
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 mx-auto" />
                        <div className="text-base font-semibold text-slate-700 dark:text-slate-200">준비 중인 상품</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">곧 업데이트됩니다</div>
                      </div>
                    </div>
                  ))}

                  {/* 더 많은 상품 – 5개 미만이면 1페이지에 렌더 */}
                  {!showMoreOnSecond && (
                    <Link
                      href={moreHref}
                      className={`group flex-none ${cardWidthClass} snap-start
                        bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700
                        rounded-2xl p-6 border-2 border-dashed border-blue-300 dark:border-blue-600
                        hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                        flex items-center justify-center`}
                    >
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                          <ArrowRight className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">더 많은 상품</h3>
                          <p className="text-sm text-blue-600 dark:text-blue-300">전체 컬렉션 보기</p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* 2페이지: 더보기 + 나머지 상품 */}
                  {showMoreOnSecond && (
                    <>
                      <Link
                        href={moreHref}
                        className={`group flex-none ${cardWidthClass} snap-start
                          bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700
                          rounded-2xl p-6 border-2 border-dashed border-blue-300 dark:border-blue-600
                          hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                          flex items-center justify-center`}
                      >
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                            <ArrowRight className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">더 많은 상품</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-300">전체 컬렉션 보기</p>
                          </div>
                        </div>
                      </Link>

                      {restProducts.map((p) => (
                        <Link
                          key={p._id}
                          href={p.href ?? `/products/${p._id}`}
                          className={`group block flex-none ${cardWidthClass} snap-start
                            bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700
                            hover:ring-1 hover:ring-blue-300/60 dark:hover:ring-blue-500/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                        >
                          <div className="relative mb-6 aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-4xl font-bold text-slate-400 dark:text-slate-500">{(p.brand ?? 'D').charAt(0)}</div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.brand}</div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">{p.name}</h3>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Number(p.price).toLocaleString()}원</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 페이지 스크롤 버튼 */}
          <div className="flex justify-center mt-8 gap-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
              onClick={() => scrollByPage('left')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
              onClick={() => scrollByPage('right')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
