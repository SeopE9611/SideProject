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
import { useEffect, useMemo, useState } from 'react';
import HeroSlider from '@/components/HeroSlider';
import HorizontalProducts, { type HItem } from '@/components/HorizontalProducts';
import { racketBrandLabel } from '@/lib/constants';

// ──────────────────────────────────────────────────────────────
// 타입 정의: API에서 내려오는 제품 구조 (현재 프로젝트의 응답 필드에 맞춰 정의)
// ──────────────────────────────────────────────────────────────
type ApiProduct = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  material?: 'polyester' | 'hybrid' | string;
  inventory?: { isFeatured?: boolean };
};

// ──────────────────────────────────────────────────────────────
// 상단 배너 슬라이드 데이터 (기존 유지)
// ──────────────────────────────────────────────────────────────
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
  // 카테고리 탭(프리미엄 섹션에서 사용)
  const [activeCategory, setActiveCategory] = useState<'polyester' | 'hybrid'>('polyester');

  // 전체 상품 + 로딩
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────────────────────────────
  // 데이터 로딩: /api/products?limit=48
  // 서버가 products 혹은 items 키로 내려와도 대응
  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // 홈 노출 대상: inventory.isFeatured === true
  // ──────────────────────────────────────────────────────────
  const featured = useMemo(() => allProducts.filter((p) => p?.inventory?.isFeatured), [allProducts]);

  // 소재별 필터링(프리미엄 섹션에서 사용할 두 그룹)
  const featuredPolyester = useMemo(() => featured.filter((p) => p.material === 'polyester'), [featured]);
  const featuredHybrid = useMemo(() => featured.filter((p) => p.material === 'hybrid'), [featured]);

  // 현재 탭에 따른 프리미엄 섹션 데이터
  const premiumItemsSource = activeCategory === 'polyester' ? featuredPolyester : featuredHybrid;

  // HorizontalProducts가 요구하는 HItem 형태로 매핑
  const premiumItems: HItem[] = useMemo(
    () =>
      premiumItemsSource.map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        images: p.images ?? [],
        brand: p.brand ?? '',
      })),
    [premiumItemsSource]
  );

  const [usedRackets, setUsedRackets] = useState<{ id: string; brand: string; model: string; price: number; images?: string[] }[]>([]);

  // 데이터 로드 (최신 등록 순 12개)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rackets?sort=createdAt_desc&limit=12', { credentials: 'include' });
        const list = await res.json();
        setUsedRackets(Array.isArray(list) ? list : []);
      } catch {
        setUsedRackets([]);
      }
    })();
  }, []);

  // 중고라켓 데이터- HorizontalProducts가 요구하는 HItem으로 매핑
  const usedRacketsItems: HItem[] = useMemo(
    () =>
      usedRackets.map((r) => ({
        _id: r.id, // HItem은 _id 키 사용
        name: r.model ?? '',
        price: r.price ?? 0,
        images: r.images ?? [],
        brand: racketBrandLabel?.(r.brand) ?? r.brand ?? '',
        href: `/rackets/${r.id}`,
      })),
    [usedRackets]
  );

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

            {/* 카테고리 탭(폴리/하이브리드) */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-lg">
                <button
                  onClick={() => setActiveCategory('polyester')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeCategory === 'polyester' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  브랜드로
                </button>
                <button
                  onClick={() => setActiveCategory('hybrid')}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeCategory === 'hybrid' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                >
                  교체할거야 그러니까 쉿
                </button>
              </div>
            </div>

            {/* 가로 캐러셀: HorizontalProducts(내부에서 가운데정렬/스냅/페이지스크롤/더보기 처리) */}
            <HorizontalProducts
              title="프리미엄 스트링"
              subtitle="프로가 선택하는 최고급 테니스 스트링"
              items={premiumItems}
              moreHref="/products"
              firstPageSlots={4} // 4칸(상품 3 + 더보기 1)
              moveMoreToSecondWhen5Plus={true} // 상품 5개 이상이면 '더보기'를 2페이지(5번째)로 이동
              loading={loading}
              showHeader={false}
            />
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
            <HorizontalProducts
              title="중고 라켓"
              subtitle="필요한 중고 라켓이 있다면 확인해보세요"
              items={usedRacketsItems} // 실제 중고 라켓 데이터로 교체
              moreHref="/products?tag=used"
              firstPageSlots={4}
              moveMoreToSecondWhen5Plus={true}
              loading={loading}
              showHeader={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
