'use client';

/**
 * 홈 메인 페이지
 * - HeroSlider(상단 배너)
 * - HorizontalProducts(가로 캐러셀) 2개: 프리미엄 스트링 / 중고 라켓
 *
 * 설계 포인트
 * 1) 데이터 준비(필터링/매핑)는 page.tsx에서 담당
 * 2) 캐러셀/가운데 정렬/스냅/페이지 스크롤/‘더보기’ 배치는 HorizontalProducts에 위임
 * 3) 섹션을 늘릴 때는 HorizontalProducts를 한 줄 더 호출하면 끝
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import HeroSlider from '@/components/HeroSlider';
import HorizontalProducts, { type HItem } from '@/components/HorizontalProducts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from '@/lib/constants';

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
  <HorizontalProducts title="중고 라켓" subtitle="최근 등록 순으로 미리보기" items={usedRacketsItems} moreHref="/rackets" firstPageSlots={4} moveMoreToSecondWhen5Plus={true} loading={loading} />;

  return (
    <div>
      {/* 상단 배너 */}
      <HeroSlider slides={SLIDES} />

      {/* 프리미엄 스트링 섹션 */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl m-4">
        <section className="py-20 bg-slate-50 dark:bg-slate-900 relative">
          {/* 장식 배경(기존 유지) */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(59,130,246,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
          </div>

          <div className="relative z-10">
            {/* 타이틀 */}
            <div className="text-center">
              <div className="inline-flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400" />
                <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">스트링</h2>
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400" />
              </div>
              {/* <p className="text-xl text-slate-600 dark:text-slate-300">프로가 선택하는 테니스 스트링</p> */}
            </div>

            {/* 스트링(브랜드 탭) */}
            <Tabs value={activeStringBrand} onValueChange={(v) => setActiveStringBrand(v as StringBrandKey)}>
              <TabsList className="mb-4 flex gap-2 overflow-x-auto">
                <TabsTrigger value="all">전체</TabsTrigger>
                {STRING_BRANDS.map((b) => (
                  <TabsTrigger key={b.value} value={b.value}>
                    {b.label}
                  </TabsTrigger>
                ))}
              </TabsList>

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
            </Tabs>
          </div>
        </section>
      </div>

      {/* 중고 라켓 섹션 */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl m-4">
        <section className="py-20 bg-slate-50 dark:bg-slate-900 relative">
          {/* 장식 배경(기존 유지) */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(-45deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
          </div>

          <div className="relative z-10">
            {/* 타이틀 */}
            <div className="text-center">
              <div className="inline-flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-blue-400" />
                <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">중고 라켓</h2>
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-purple-400" />
              </div>
              {/* <p className="text-xl text-slate-600 dark:text-slate-300">도깨비 테니스에서 관리하는 라켓을 활용해보세요</p> */}
            </div>

            {/* 가로 캐러셀: 재사용 (items만 교체) */}
            <Tabs value={activeBrand} onValueChange={(v) => setActiveBrand(v as BrandKey)}>
              <TabsList className="mb-4 flex gap-2 overflow-x-auto">
                {BRAND_KEYS.map((b) => (
                  <TabsTrigger key={b} value={b}>
                    {b === 'all' ? '전체' : racketBrandLabel(b)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <HorizontalProducts
                title="중고 라켓"
                subtitle={activeBrand === 'all' ? '최근 등록 순 미리보기' : `${racketBrandLabel(activeBrand)} 라켓`}
                items={usedRacketsItems}
                moreHref={activeBrand === 'all' ? '/rackets' : `/rackets?brand=${activeBrand}`}
                firstPageSlots={4}
                moveMoreToSecondWhen5Plus={true}
                loading={!rackByBrand[activeBrand]} // 탭 최초 로딩 시만 true
                showHeader={false}
              />
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
}
