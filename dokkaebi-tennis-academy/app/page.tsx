'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import HeroSlider from '@/components/HeroSlider';
import HorizontalProducts, { type HItem } from '@/components/HorizontalProducts';
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// 타입 정의: API에서 내려오는 제품 구조 (현재 프로젝트의 응답 필드에 맞춰 정의)
type ApiProduct = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  material?: 'polyester' | 'hybrid' | string;
  inventory?: { isFeatured?: boolean };
};

//  'all' + constants 기반 브랜드 키
const BRAND_KEYS = ['all', ...RACKET_BRANDS.map((b) => b.value as string)] as const;
type BrandKey = (typeof BRAND_KEYS)[number];

// 브랜드 탭 키(전체 + 상수)
const STRING_BRAND_KEYS = ['all', ...STRING_BRANDS.map((b) => b.value)] as const;
type StringBrandKey = (typeof STRING_BRAND_KEYS)[number];

// 상단 배너 슬라이드 데이터
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
  const [activeBrand, setActiveBrand] = useState<BrandKey>('all');
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>('all');
  const router = useRouter();
  // 마운트 후 URL에서 초깃값 한 번만 읽기
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rb = params.get('racketBrand') as BrandKey | null;
    const sb = params.get('stringBrand') as StringBrandKey | null;

    if (rb && BRAND_KEYS.includes(rb)) {
      setActiveBrand(rb);
    }
    if (sb && STRING_BRAND_KEYS.includes(sb)) {
      setActiveStringBrand(sb);
    }
  }, []);

  // 상태 → URL 반영
  //  첫 렌더링 여부
  const firstRender = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 첫 렌더링이면 URL 수정하지 않음
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('racketBrand', activeBrand);
    url.searchParams.set('stringBrand', activeStringBrand);
    window.history.replaceState(null, '', url.toString());
  }, [activeBrand, activeStringBrand]);

  // 전체 상품 + 로딩
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // 탭별 데이터 캐시: brand -> items
  type RItem = {
    id: string;
    brand: string;
    model: string;
    price: number;
    images?: string[];
    condition?: 'A' | 'B' | 'C' | 'D';
    rental?: { enabled: boolean; deposit?: number; fee?: { d7?: number; d15?: number; d30?: number } };
  };
  const [rackByBrand, setRackByBrand] = useState<Record<string, RItem[]>>({});

  // 데이터 로딩: /api/products?limit=48
  // 서버가 products 혹은 items 키로 내려와도 대응
  useEffect(() => {
    (async () => {
      try {
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

  // 홈 노출 대상: 전체 스트링 상품 (등록 순으로)
  const homeStringProducts = useMemo(() => {
    // 필요하면 여기서 category === 'string' 으로 한 번 더 거를 수도 있음
    // 예: return allProducts.filter((p) => p.category === 'string');
    return allProducts;
  }, [allProducts]);

  /* 추천 상품은 위에 먼저, 나머지는 그 뒤에 같은 우선 순위 정렬할경우 주석해제하기.
    const homeStringProducts = useMemo(() => {
    const list = [...allProducts];

     return list.sort((a, b) => {
      const fa = a?.inventory?.isFeatured ? 1 : 0;
      const fb = b?.inventory?.isFeatured ? 1 : 0;

      if (fa !== fb) return fb - fa; // 추천상품 먼저
      // createdAt 기준 최신 순 정렬 (필드 이름에 맞게 조정)
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
   }, [allProducts]);
*/
  // 현재 탭 기준의 리스트 소스 (브랜드 필터)
  const premiumItemsSource = useMemo(() => {
    const base = homeStringProducts;
    if (activeStringBrand === 'all') return base;
    return base.filter((p) => (p.brand ?? '').toLowerCase() === activeStringBrand);
  }, [homeStringProducts, activeStringBrand]);

  // HorizontalProducts 매핑 (브랜드 라벨 표시)
  const premiumItems: HItem[] = useMemo(
    () =>
      premiumItemsSource.map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        images: p.images ?? [],
        brand: stringBrandLabel(p.brand),
        href: `/products/${p._id}`,
      })),
    [premiumItemsSource]
  );

  const [usedRackets, setUsedRackets] = useState<{ id: string; brand: string; model: string; price: number; images?: string[] }[]>([]);

  // 탭 변경 시 해당 브랜드만 최초 1회 로드
  useEffect(() => {
    (async () => {
      if (rackByBrand[activeBrand]) return; // 캐시 있으면 스킵

      const qs = activeBrand === 'all' ? '?sort=createdAt_desc&limit=12' : `?brand=${activeBrand}&sort=createdAt_desc&limit=12`;

      const res = await fetch(`/api/rackets${qs}`, { credentials: 'include' });
      const list = await res.json();
      setRackByBrand((prev) => ({ ...prev, [activeBrand]: Array.isArray(list) ? list : [] }));
    })();
  }, [activeBrand, rackByBrand]);

  // 중고라켓 데이터- HorizontalProducts가 요구하는 HItem으로 매핑
  const usedRacketsItems: HItem[] = useMemo(() => {
    const src = rackByBrand[activeBrand] ?? []; // 탭별 소스 선택
    return src.map((r) => ({
      _id: r.id,
      name: r.model ?? '',
      price: r.price ?? 0,
      images: r.images ?? [],
      brand: racketBrandLabel?.(r.brand) ?? r.brand ?? '',
      href: `/rackets/${r.id}`,
      // 배지에 사용할 원본값 그대로 전달
      condition: r.condition as 'A' | 'B' | 'C' | 'D' | undefined,
      rentalEnabled: r?.rental?.enabled ?? undefined,
    }));
  }, [rackByBrand, activeBrand]);

  // 섹션 렌더 — moreHref를 /rackets로
  // <HorizontalProducts title="중고 라켓" subtitle="최근 등록 순으로 미리보기" items={usedRacketsItems} moreHref="/rackets" firstPageSlots={4} moveMoreToSecondWhen5Plus={true} loading={loading} />;

  return (
    <div>
      {/* 상단 배너 */}
      <HeroSlider slides={SLIDES} />

      <div className="bg-white dark:bg-slate-950 rounded-2xl m-4 shadow-sm text-[30px]">
        <Button className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow hover:from-indigo-600 hover:to-blue-600 text-[30px]" onClick={() => router.push(`/rackets`)}>
          (테스트중입니다.) 라켓 구매 + 스트링 + 교체서비스 동시작업하기
        </Button>
      </div>

      {/* 프리미엄 스트링 섹션 */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl m-4 shadow-sm">
        <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 opacity-60" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
            {/* 타이틀 */}
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">스트링</h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">프로가 선택하는 테니스 스트링</p>
            </div>

            <div className="mb-8 md:mb-10">
              <div className="flex justify-center">
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide px-4 max-w-full">
                  <button
                    onClick={() => setActiveStringBrand('all')}
                    className={`
                      shrink-0 px-5 md:px-7 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold 
                      transition-all duration-300 whitespace-nowrap
                      ${
                        activeStringBrand === 'all'
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 hover:shadow-sm'
                      }
                    `}
                  >
                    전체
                  </button>
                  {STRING_BRANDS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setActiveStringBrand(b.value as StringBrandKey)}
                      className={`
                        shrink-0 px-5 md:px-7 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold 
                        transition-all duration-300 whitespace-nowrap
                        ${
                          activeStringBrand === b.value
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 hover:shadow-sm'
                        }
                      `}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <HorizontalProducts
              title="스트링"
              subtitle={activeStringBrand === 'all' ? '브랜드로 골라보기' : `${stringBrandLabel(activeStringBrand)} 추천`}
              items={premiumItems}
              moreHref={activeStringBrand === 'all' ? '/products' : `/products?brand=${activeStringBrand}`}
              firstPageSlots={4}
              moveMoreToSecondWhen5Plus={true}
              loading={loading}
              showHeader={false}
            />
          </div>
        </section>
      </div>

      {/* 중고 라켓 섹션 */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl m-4 shadow-sm">
        <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 opacity-60" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
            {/* 타이틀 */}
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">중고 라켓</h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">도깨비 테니스에서 관리하는 라켓을 활용해보세요</p>
            </div>

            <div className="mb-8 md:mb-10">
              <div className="flex justify-center">
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide px-4 max-w-full">
                  {BRAND_KEYS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setActiveBrand(b as BrandKey)}
                      className={`
                        shrink-0 px-5 md:px-7 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold 
                        transition-all duration-300 whitespace-nowrap
                        ${
                          activeBrand === b
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 hover:shadow-sm'
                        }
                      `}
                    >
                      {b === 'all' ? '전체' : racketBrandLabel(b)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <HorizontalProducts
              title="중고 라켓"
              subtitle={activeBrand === 'all' ? '최근 등록 순 미리보기' : `${racketBrandLabel(activeBrand)} 라켓`}
              items={usedRacketsItems}
              moreHref={activeBrand === 'all' ? '/rackets' : `/rackets?brand=${activeBrand}`}
              firstPageSlots={4}
              moveMoreToSecondWhen5Plus={true}
              loading={!rackByBrand[activeBrand]}
              showHeader={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
