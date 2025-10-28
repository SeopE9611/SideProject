'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight, Play, Phone, MapPin, Target, Shield, Clock, Award, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import HeroSlider from '@/components/HeroSlider';

type ApiProduct = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  material?: 'polyester' | 'hybrid' | string;
  inventory?: { isFeatured?: boolean };
};

const SLIDES = [
  {
    img: 'https://www.nexentire.com/webzine/201803/kr/assets/images/contents/009_01.png',
    alt: '이벤트',
    href: '/board/notice',
    caption: '신규 입고 & 이벤트',
  },
  {
    img: 'https://media.istockphoto.com/id/610007642/photo/detail-of-tennis-racket-in-the-stringing-machine.jpg?s=612x612&w=0&k=20&c=AFlkWluNV3MciJWcOrFwQABV6xLGXSAbFic5hZ6ixdM=',
    alt: '서비스',
    href: '/services',
    caption: '장착 서비스 예약',
  },
  {
    img: 'https://media.babolat.com/image/upload/f_auto,q_auto,c_scale,w_692,h_364/v1738055514/Web_content/Tennis/Secondary/2025/Pure-Drive/bags_692x364.png',
    alt: '패키지',
    href: '/services/packages',
    caption: '스트링 패키지',
  },
  {
    img: 'https://nickrivettsport.co.uk/cdn/shop/products/image_fe9519a6-64c4-4fe8-8bfb-e99e9a5f8e60.jpg?v=1633608123&width=1445',
    alt: '라켓과 스트링 디테일',
    href: '/products',
    caption: '추천 스트링',
  },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<'polyester' | 'hybrid'>('polyester');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 서버가 products 혹은 items 키로 내려와도 대응
        const res = await fetch('/api/products?limit=48', { credentials: 'include' });
        const json = await res.json();
        const items: ApiProduct[] = json.products ?? json.items ?? [];
        setAllProducts(items);
      } catch {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 메인 노출 기준: inventory.isFeatured === true
  const featured = useMemo(() => allProducts.filter((p) => p?.inventory?.isFeatured), [allProducts]);

  const featuredPolyester = useMemo(() => featured.filter((p) => p.material === 'polyester'), [featured]);

  const featuredHybrid = useMemo(() => featured.filter((p) => p.material === 'hybrid'), [featured]);

  const displayList = activeCategory === 'polyester' ? featuredPolyester : featuredHybrid;

  // 4칸(= 3개 + 더보기) 고정 노출용
  const SLOT_COUNT = 4;
  const PRODUCT_SLOTS = SLOT_COUNT - 1; // 마지막 1칸은 '더 많은 상품'
  const visible = displayList.slice(0, PRODUCT_SLOTS);
  const fillerCount = Math.max(0, PRODUCT_SLOTS - visible.length);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <HeroSlider slides={SLIDES} />

      <section className="py-20 bg-slate-50 dark:bg-slate-900 relative">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">프리미엄 스트링</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-300">프로가 선택하는 최고급 테니스 스트링</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-lg">
              <button
                onClick={() => setActiveCategory('polyester')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'polyester' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                폴리에스터
              </button>
              <button
                onClick={() => setActiveCategory('hybrid')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'hybrid' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                하이브리드
              </button>
            </div>
          </div>

          <div className="relative">
            <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-visible scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="flex gap-6 py-3" style={{ width: 'max-content' }}>
                {loading ? (
                  // 스켈레톤
                  <div className="flex gap-6 pb-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex-none w-[320px] rounded-2xl bg-white/80 dark:bg-slate-800/80 p-6 shadow-sm">
                        <div className="mb-6 h-48 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="h-4 mb-2 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-6 pb-4" style={{ width: 'max-content' }}>
                    {visible.map((p) => (
                      <Link
                        key={p._id}
                        href={`/products/${p._id}`}
                        className={`group block flex-none w-[320px] bg-white dark:bg-slate-800 rounded-2xl p-6
              border border-slate-200 dark:border-slate-700
              hover:ring-1 hover:ring-blue-300/60 dark:hover:ring-blue-500/50
              transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                      >
                        {/* 이미지 영역*/}
                        <div
                          className={`relative mb-6 aspect-square rounded-xl overflow-hidden
              bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600`}
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-4xl font-bold text-slate-400 dark:text-slate-500">{(p.brand ?? 'D').charAt(0)}</div>
                          )}
                        </div>

                        {/* 텍스트 영역 */}
                        <div className="space-y-3">
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.brand}</div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">{p.name}</h3>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Number(p.price).toLocaleString()}원</div>
                        </div>
                      </Link>
                    ))}
                    {/* 플레이스홀더 카드 (준비 중) */}
                    {Array.from({ length: fillerCount }).map((_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className={`flex-none w-[320px] rounded-2xl p-6 border-2 border-dashed
              border-slate-300/70 dark:border-slate-600/70
              bg-gradient-to-br from-slate-50 to-slate-100
              dark:from-slate-800 dark:to-slate-700
              text-center flex items-center justify-center`}
                      >
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 mx-auto" />
                          <div className="text-base font-semibold text-slate-700 dark:text-slate-200">준비 중인 상품</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">곧 업데이트됩니다</div>
                        </div>
                      </div>
                    ))}
                    {/* 더보기 카드 */}
                    <Link
                      href="/products"
                      className={`group flex-none w-[320px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700
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
                          <p className="text-sm text-blue-600 dark:text-blue-300">전체 스트링 컬렉션 보기</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollLeft}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollRight}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-900 relative">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">중고 라켓</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-300">중고 라켓</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-lg">
              <button
                onClick={() => setActiveCategory('polyester')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'polyester' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                카테고리는
              </button>
              <button
                onClick={() => setActiveCategory('hybrid')}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === 'hybrid' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                뭘넣을까
              </button>
            </div>
          </div>

          <div className="relative">
            <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-visible scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="flex gap-6 py-3" style={{ width: 'max-content' }}>
                {loading ? (
                  // 스켈레톤
                  <div className="flex gap-6 pb-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex-none w-[320px] rounded-2xl bg-white/80 dark:bg-slate-800/80 p-6 shadow-sm">
                        <div className="mb-6 h-48 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="h-4 mb-2 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-6 pb-4" style={{ width: 'max-content' }}>
                    {visible.map((p) => (
                      <Link
                        key={p._id}
                        href={`/products/${p._id}`}
                        className={`group block flex-none w-[320px] bg-white dark:bg-slate-800 rounded-2xl p-6
              border border-slate-200 dark:border-slate-700
              hover:ring-1 hover:ring-blue-300/60 dark:hover:ring-blue-500/50
              transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                      >
                        {/* 이미지 영역*/}
                        <div
                          className={`relative mb-6 aspect-square rounded-xl overflow-hidden
              bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600`}
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-4xl font-bold text-slate-400 dark:text-slate-500">{(p.brand ?? 'D').charAt(0)}</div>
                          )}
                        </div>

                        {/* 텍스트 영역 */}
                        <div className="space-y-3">
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.brand}</div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">{p.name}</h3>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Number(p.price).toLocaleString()}원</div>
                        </div>
                      </Link>
                    ))}
                    {/* 플레이스홀더 카드 (준비 중) */}
                    {Array.from({ length: fillerCount }).map((_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className={`flex-none w-[320px] rounded-2xl p-6 border-2 border-dashed
              border-slate-300/70 dark:border-slate-600/70
              bg-gradient-to-br from-slate-50 to-slate-100
              dark:from-slate-800 dark:to-slate-700
              text-center flex items-center justify-center`}
                      >
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 mx-auto" />
                          <div className="text-base font-semibold text-slate-700 dark:text-slate-200">준비 중인 상품</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">곧 업데이트됩니다</div>
                        </div>
                      </div>
                    ))}
                    {/* 더보기 카드 */}
                    <Link
                      href="/products"
                      className={`group flex-none w-[320px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700
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
                          <p className="text-sm text-blue-600 dark:text-blue-300">전체 스트링 컬렉션 보기</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollLeft}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-12 h-12 p-0 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500"
                onClick={scrollRight}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="py-20 bg-white dark:bg-slate-800 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center mb-16">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600"></div>
            <div className="px-8">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Award,
                title: '전문 경력',
                description: '검증된 전문성',
                color: 'blue',
                detail: '수년 간 축적된 노하우로 최고의 서비스를 제공합니다',
              },
              {
                icon: Shield,
                title: '품질 보장',
                description: 'A/S 완벽 지원',
                color: 'indigo',
                detail: '모든 제품과 서비스에 대해 완벽한 품질을 보장합니다',
              },
              {
                icon: Clock,
                title: '빠른 배송',
                description: '당일/익일 배송',
                color: 'purple',
                detail: '주문 후 24시간 내 빠른 배송으로 만족도를 높입니다',
              },
              {
                icon: Star,
                title: '고객 만족',
                description: '4.9/5 평점',
                color: 'blue',
                detail: '5,000명 이상의 고객이 인정한 최고의 서비스',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative text-center p-8 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-slate-300 dark:border-slate-500 group-hover:border-blue-400 transition-colors duration-300"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-slate-300 dark:border-slate-500 group-hover:border-blue-400 transition-colors duration-300"></div>

                <div className="space-y-4">
                  <div className={`inline-flex p-4 rounded-full bg-${feature.color}-100 dark:bg-${feature.color}-900/30`}>
                    <feature.icon className={`h-8 w-8 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-medium">{feature.description}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* 추천 섹션 */}
      {/* <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_11px),repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_11px)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400"></div>
              <h2 className="text-4xl lg:text-6xl font-bold text-white">전문가 추천</h2>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400"></div>
            </div>
            <p className="text-xl text-slate-300">프로 선수와 코치들이 인정한 스트링 전문성</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: '김재민',
                title: '낚시신공',
                image: '/expert-kim-minsu.jpg',
                quote: '도깨비 테니스의 스트링 장착 기술은 정말 뛰어납니다. 매번 완벽한 텐션으로 제 플레이를 한 단계 끌어올려 주죠.',
                rating: 5,
                specialty: '금붕어 낚아봄',
              },
              {
                name: '윤형섭',
                title: '비숍',
                image: '/expert-park-jiyoung.jpg',
                quote: '15년간 다양한 스트링 샵을 이용해봤지만, 이곳만큼 정밀하고 신뢰할 수 있는 곳은 없었습니다.',
                rating: 5,
                specialty: '검밑솔전문가',
              },
              {
                name: '쿠키선수',
                title: '귀여워',
                image: '/expert-lee-junho.jpg',
                quote: '하이브리드 스트링 세팅을 완벽하게 해주셔서 파워와 컨트롤을 동시에 얻을 수 있었습니다.',
                rating: 5,
                specialty: '귀여움대회우승자',
              },
            ].map((expert, index) => (
              <div key={index} className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">{expert.name.charAt(0)}</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">{expert.name}</h3>
                    <p className="text-blue-300 text-sm font-medium">{expert.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{expert.specialty}</p>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  {[...Array(expert.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <blockquote className="text-slate-200 text-center leading-relaxed italic">"{expert.quote}"</blockquote>

                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/30 group-hover:border-blue-400/70 transition-colors duration-300"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/30 group-hover:border-purple-400/70 transition-colors duration-300"></div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white">당신도 전문가의 서비스를 경험해보세요</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link href="/contact" className="flex items-center gap-3">
                    <Phone className="h-5 w-5" />
                    상담 받기
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-2 border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 px-8 py-4 text-lg font-semibold bg-transparent rounded-xl transition-all duration-300">
                  <Link href="/services/locations" className="flex items-center gap-3">
                    <MapPin className="h-5 w-5" />
                    매장 찾기
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section> */}
    </div>
  );
}
