'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

import HeroSlider from '@/components/HeroSlider';
import HorizontalProducts, { type HItem } from '@/components/HorizontalProducts';
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Package, BadgeCheck, Wrench, BookOpen, Tags, MessageSquareText, Search } from 'lucide-react';
import Link from 'next/link';
import HomeMarketPreview from '@/components/HomeMarketPreview';
import HomeNoticePreview from '@/components/HomeNoticePreview';
import SignupBonusPromoPopup from '@/components/system/SignupBonusPromoPopup';
import { isSignupBonusActive, SIGNUP_BONUS_CAMPAIGN_ID, SIGNUP_BONUS_END_DATE, SIGNUP_BONUS_POINTS, SIGNUP_BONUS_START_DATE } from '@/lib/points.policy';
import SiteContainer from '@/components/layout/SiteContainer';

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
    img: 'dokkaebi(1).jpg',
    // imgMobile: '',
    alt: '이벤트',
    href: '/board/notice',
    caption: '신규 입고 & 이벤트',
    // objectPosition: 'center 20%',
  },
  {
    img: 'dokkaebi(1).jpg',
    alt: '서비스',
    href: '/services',
    caption: '장착 서비스 예약',
  },
  {
    img: 'dokkaebi(1).jpg',
    alt: '패키지',
    href: '/services/packages',
    caption: '스트링 패키지',
  },
  {
    img: 'dokkaebi(1).jpg',
    alt: '라켓과 스트링 디테일',
    href: '/products',
    caption: '추천 스트링',
  },
];

type PromoBanner = {
  key: string;
  /**
   * 줄바꿈(\n) 포함 가능
   * 예) "광고 문의\n010-1234-5678"
   */
  label: string;
  /**
   * 배너 이미지(없으면 텍스트 배너로 렌더)
   * - 내부 파일이면 /public 경로를 사용하세요. 예) "/banners/ad-1.jpg"
   * - 외부 URL도 가능 (현재 HeroSlider가 <img>를 사용 중)
   */
  img?: string;
  alt?: string;
  /**
   * 클릭 동작
   * - 내부 이동: "/services" 같은 path
   * - 전화 연결: "tel:01012345678"
   */
  href?: string;
};

// 히어로 하단 문의/광고 배너(4개 고정)
// TODO: 실제 운영 값으로 교체하세요 (전화번호/이미지/링크)
const PROMO_BANNERS: PromoBanner[] = [
  { key: 'teacher', label: '광고 문의\n010-0000-0000', href: '/support' },
  { key: 'stringing', label: '광고 문의\n010-0000-0000', href: '/support' },
  { key: 'used', label: '광고 문의\n010-0000-0000', href: '/support' },
  { key: 'ads', label: '광고 문의\n010-0000-0000', href: '/support' },
];

export default function Home() {
  const [activeBrand, setActiveBrand] = useState<BrandKey>('all');
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>('all');
  const router = useRouter();

  // 회원가입 프로모션 이벤트
  const signupPromo = useMemo(
    () => ({
      enabled: isSignupBonusActive(),
      campaignId: SIGNUP_BONUS_CAMPAIGN_ID,
      amount: SIGNUP_BONUS_POINTS,
      startDate: SIGNUP_BONUS_START_DATE || null,
      endDate: SIGNUP_BONUS_END_DATE || null,
    }),
    [],
  );

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
    [premiumItemsSource],
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

  const [notices, setNotices] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [hotPosts, setHotPosts] = useState<Array<{ id: string; title: string; type: string; likesCount?: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/boards?type=notice&limit=3', { credentials: 'include' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.items)) {
          setNotices(json.items.slice(0, 3));
        }
      } catch {
        setNotices([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/community/posts?sort=popular&limit=4', { credentials: 'include' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.items)) {
          setHotPosts(json.items.slice(0, 4));
        }
      } catch {
        setHotPosts([]);
      }
    })();
  }, []);
  // throw new Error('[TEST] app/error.tsx 동작 확인용(홈 페이지)');
  return (
    <div>
      <SignupBonusPromoPopup
        promo={signupPromo}
        onPrimaryClick={() => {
          // 회원가입 탭으로 이동
          router.push('/login?tab=register');
        }}
      />
      {/* 상단 배너 + 히어로 하단 배너 */}
      <SiteContainer variant="wide" className="px-0">
        <HeroSlider slides={SLIDES} />
        {/* 히어로 하단: 문의/광고 배너 4개 */}
        {/* <section className="mt-3 bp-sm:mt-4 bp-md:mt-5">
          <div className="mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0">
            <div className="grid grid-cols-2 bp-xxs:grid-cols-1 bp-md-only:grid-cols-4 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4">
              {PROMO_BANNERS.map((b) => {
                const title = (b.label ?? '').split('\n')[0] || '광고 문의';

                const baseClass =
                  'group relative block h-24 bp-sm:h-28 bp-md:h-32 bp-lg:h-32 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring focus:ring-black/10 dark:focus:ring-white/10';

                const inner = (
                  <>
                    {b.img ? (
                      <>
                        <img src={b.img} alt={b.alt ?? title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/0" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950" />
                    )}

                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />

                    <div className="relative z-10 flex h-full items-center justify-center p-4 text-center">
                      <div className={b.img ? 'text-white' : 'text-slate-900 dark:text-white'}>
                        <div className="text-2xl bp-sm:text-2xl font-bold leading-tight">{title}</div>
                      </div>
                    </div>
                  </>
                );

                if (b.href?.startsWith('/')) {
                  return (
                    <Link key={b.key} href={b.href} className={baseClass} aria-label={title}>
                      {inner}
                    </Link>
                  );
                }

                if (b.href) {
                  return (
                    <a key={b.key} href={b.href} className={baseClass} aria-label={title}>
                      {inner}
                    </a>
                  );
                }

                return (
                  <div key={b.key} className={baseClass} aria-label={title}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </section> */}
      </SiteContainer>

      {/* 빠른 메뉴 */}
      <section className="py-8 bp-sm:py-10 bp-md:py-12">
        <SiteContainer>
          <div className="mb-6 bp-sm:mb-8 text-center">
            <h2 className="text-xl bp-sm:text-2xl font-bold text-slate-900 dark:text-white">빠른 메뉴</h2>
            <p className="mt-1.5 bp-sm:mt-2 text-xs bp-sm:text-sm text-slate-600 dark:text-slate-400">원하는 서비스를 바로 이용하세요</p>
          </div>
          <div className="grid gap-3 bp-sm:gap-4 bp-md:gap-5 grid-cols-2 bp-md-only:grid-cols-4 bp-lg:grid-cols-4">
            <Link
              href="/services/apply"
              className="group flex h-full flex-col items-center gap-2 bp-sm:gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 bp-sm:p-5 bp-md:p-6 transition-all hover:scale-105 hover:shadow-lg dark:from-slate-900 dark:to-slate-800"
            >
              <div className="flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900 dark:text-blue-300 dark:group-hover:bg-blue-600">
                <Wrench className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div className="text-center">
                <h3 className="text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">교체 서비스 신청</h3>
                <p className="mt-0.5 bp-sm:mt-1 text-[10px] bp-sm:text-xs line-clamp-2 text-slate-600 dark:text-slate-400">라켓/스트링 선택 후 한 번에</p>
              </div>
            </Link>

            <Link
              href="/services/tension-guide"
              className="group flex h-full flex-col items-center gap-2 bp-sm:gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 bp-sm:p-5 bp-md:p-6 transition-all hover:scale-105 hover:shadow-lg dark:from-slate-900 dark:to-slate-800"
            >
              <div className="flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900 dark:text-emerald-300 dark:group-hover:bg-emerald-600">
                <BookOpen className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div className="text-center">
                <h3 className="text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">장착/텐션 가이드</h3>
                <p className="mt-0.5 bp-sm:mt-1 text-[10px] bp-sm:text-xs line-clamp-2 text-slate-600 dark:text-slate-400">초보도 쉽게 고르기</p>
              </div>
            </Link>

            <Link
              href="/board/market"
              className="group flex h-full flex-col items-center gap-2 bp-sm:gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 bp-sm:p-5 bp-md:p-6 transition-all hover:scale-105 hover:shadow-lg dark:from-slate-900 dark:to-slate-800"
            >
              <div className="flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-900 dark:text-amber-300 dark:group-hover:bg-amber-600">
                <Tags className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div className="text-center">
                <h3 className="text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">중고 거래</h3>
                <p className="mt-0.5 bp-sm:mt-1 text-[10px] bp-sm:text-xs line-clamp-2 text-slate-600 dark:text-slate-400">라켓/스트링/장비 거래</p>
              </div>
            </Link>

            <Link
              href="/board"
              className="group flex h-full flex-col items-center gap-2 bp-sm:gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 bp-sm:p-5 bp-md:p-6 transition-all hover:scale-105 hover:shadow-lg dark:from-slate-900 dark:to-slate-800"
            >
              <div className="flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-900 dark:text-violet-300 dark:group-hover:bg-violet-600">
                <MessageSquareText className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div className="text-center">
                <h3 className="text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">커뮤니티</h3>
                <p className="mt-0.5 bp-sm:mt-1 text-[10px] bp-sm:text-xs line-clamp-2 text-slate-600 dark:text-slate-400">리뷰·자유·사용기</p>
              </div>
            </Link>
          </div>
        </SiteContainer>
      </section>
      {/* 라켓 파인더 바로가기 (Hero 아래 CTA 블록) */}
      <section className="py-5 bp-sm:py-6">
        <SiteContainer>
          <Link href="/rackets/finder" className="group block">
            <div
              className="
            rounded-2xl border border-slate-200 dark:border-slate-800
            bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950
            p-5 bp-sm:p-6
            flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between
            gap-4
            transition-all hover:shadow-lg
          "
            >
              <div className="flex items-start gap-4">
                <div
                  className="
                flex h-12 w-12 items-center justify-center rounded-xl
                bg-blue-100 text-blue-600
                dark:bg-blue-950/40 dark:text-blue-300
              "
                >
                  <Search className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm bp-sm:text-base font-bold text-slate-900 dark:text-white">라켓 파인더</div>
                  <p className="mt-1 text-xs bp-sm:text-sm text-slate-600 dark:text-slate-400">헤드/무게/밸런스/RA/SW 범위로 중고 라켓을 빠르게 좁혀보세요.</p>
                </div>
              </div>

              <div
                className="
              shrink-0 inline-flex items-center justify-center
              rounded-lg px-4 py-2
              text-xs bp-sm:text-sm font-semibold
              bg-slate-900 text-white
              dark:bg-white dark:text-slate-900
              transition-colors
              group-hover:bg-slate-800 dark:group-hover:bg-slate-100
            "
              >
                바로가기
              </div>
            </div>
          </Link>
        </SiteContainer>
      </section>

      {/* 공지사항/중고거래 섹션 */}
      <section className="py-6 bp-sm:py-8">
        <SiteContainer>
          <div className="grid gap-6 bp-sm:gap-8 bp-lg:grid-cols-2">
            <HomeNoticePreview />
            <HomeMarketPreview />
          </div>
        </SiteContainer>
      </section>

      {/* 서비스 플로우 */}
      <section className="py-8 bp-sm:py-10 bp-md:py-12">
        <SiteContainer>
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 bp-sm:p-8 dark:from-slate-900 dark:to-slate-800">
            <div className="mb-6 bp-sm:mb-8 text-center">
              <h2 className="text-xl bp-sm:text-2xl font-bold text-slate-900 dark:text-white">스트링 교체 프로세스</h2>
              <p className="mt-1.5 bp-sm:mt-2 text-xs bp-sm:text-sm text-slate-600 dark:text-slate-400">처음 방문해도 쉽게 이해할 수 있어요</p>
            </div>
            <div className="mb-6 bp-sm:mb-8 grid gap-4 bp-sm:gap-6 grid-cols-2 bp-lg:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 bp-sm:mb-3 flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                  <BookOpen className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                </div>
                <div className="mb-0.5 bp-sm:mb-1 text-[10px] bp-sm:text-xs font-semibold text-slate-500 dark:text-slate-400">STEP 1</div>
                <h3 className="mb-0.5 bp-sm:mb-1 text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">신청서 작성</h3>
                <p className="text-[10px] bp-sm:text-xs text-slate-600 dark:text-slate-400">라켓/스트링/옵션 선택</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 bp-sm:mb-3 flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                  <Package className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                </div>
                <div className="mb-0.5 bp-sm:mb-1 text-[10px] bp-sm:text-xs font-semibold text-slate-500 dark:text-slate-400">STEP 2</div>
                <h3 className="mb-0.5 bp-sm:mb-1 text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">방문·택배</h3>
                <p className="text-[10px] bp-sm:text-xs text-slate-600 dark:text-slate-400">방문 예약 또는 택배 발송</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-2 bp-sm:mb-3 flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300">
                  <Wrench className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                </div>
                <div className="mb-0.5 bp-sm:mb-1 text-[10px] bp-sm:text-xs font-semibold text-slate-500 dark:text-slate-400">STEP 3</div>
                <h3 className="mb-0.5 bp-sm:mb-1 text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">작업 진행</h3>
                <p className="text-[10px] bp-sm:text-xs text-slate-600 dark:text-slate-400">장착/텐션 세팅 후 검수</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-2 bp-sm:mb-3 flex h-10 w-10 bp-sm:h-12 bp-sm:w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300">
                  <BadgeCheck className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                </div>
                <div className="mb-0.5 bp-sm:mb-1 text-[10px] bp-sm:text-xs font-semibold text-slate-500 dark:text-slate-400">STEP 4</div>
                <h3 className="mb-0.5 bp-sm:mb-1 text-sm bp-sm:text-base font-semibold text-slate-900 dark:text-white">수령</h3>
                <p className="text-[10px] bp-sm:text-xs text-slate-600 dark:text-slate-400">방문 수령 또는 배송</p>
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/services/apply"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 bp-sm:px-6 py-2.5 bp-sm:py-3 text-xs bp-sm:text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Wrench className="h-3.5 w-3.5 bp-sm:h-4 bp-sm:w-4" />
                지금 신청하기
              </Link>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* 스트링 섹션 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <div className="mb-6 bp-sm:mb-8 text-center">
            <h2 className="text-2xl bp-sm:text-3xl font-bold text-slate-900 dark:text-white">스트링</h2>
            <p className="mt-1.5 bp-sm:mt-2 text-xs bp-sm:text-sm text-slate-600 dark:text-slate-400">프로가 선택하는 테니스 스트링</p>
          </div>
          <div className="mb-6 bp-sm:mb-8">
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 bp-sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveStringBrand('all')}
                  className={`
                  shrink-0 px-4 bp-sm:px-5 bp-md:px-6 py-2 bp-sm:py-2.5 rounded-full text-xs bp-sm:text-sm font-semibold 
                  transition-all duration-300 whitespace-nowrap
                  ${activeStringBrand === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
                >
                  전체
                </button>
                {STRING_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveStringBrand(b.value as StringBrandKey)}
                    className={`
                    shrink-0 px-4 bp-sm:px-5 bp-md:px-6 py-2 bp-sm:py-2.5 rounded-full text-xs bp-sm:text-sm font-semibold
                    transition-all duration-300 whitespace-nowrap
                    ${activeStringBrand === b.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
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
        </SiteContainer>
      </section>

      {/* 중고 라켓 섹션 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <div className="mb-6 bp-sm:mb-8 text-center">
            <h2 className="text-2xl bp-sm:text-3xl font-bold text-slate-900 dark:text-white">중고 라켓</h2>
            <p className="mt-1.5 bp-sm:mt-2 text-xs bp-sm:text-sm text-slate-600 dark:text-slate-400">도깨비 테니스에서 관리하는 라켓을 활용해보세요</p>
          </div>
          <div className="mb-6 bp-sm:mb-8">
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 bp-sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveBrand('all')}
                  className={`
                  shrink-0 px-4 bp-sm:px-5 bp-md:px-6 py-2 bp-sm:py-2.5 rounded-full text-xs bp-sm:text-sm font-semibold
                  transition-all duration-300 whitespace-nowrap
                  ${activeBrand === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
                >
                  전체
                </button>
                {RACKET_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveBrand(b.value as BrandKey)}
                    className={`
                    shrink-0 px-4 bp-sm:px-5 bp-md:px-6 py-2 bp-sm:py-2.5 rounded-full text-xs bp-sm:text-sm font-semibold 
                    transition-all duration-300 whitespace-nowrap
                    ${activeBrand === b.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                  `}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <HorizontalProducts
            title="중고 라켓"
            subtitle={activeBrand === 'all' ? '도깨비 테니스 중고' : `${racketBrandLabel(activeBrand)} 중고`}
            items={usedRacketsItems}
            moreHref={activeBrand === 'all' ? '/rackets' : `/rackets?brand=${activeBrand}`}
            firstPageSlots={4}
            moveMoreToSecondWhen5Plus={true}
            loading={false}
            showHeader={false}
          />
        </SiteContainer>
      </section>
    </div>
  );
}
