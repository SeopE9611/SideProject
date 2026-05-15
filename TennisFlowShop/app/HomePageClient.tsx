"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HeroSlider from "@/components/HeroSlider";
import HorizontalProducts, { type HItem } from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { Button } from "@/components/ui/button";
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from "@/lib/constants";
import { isSignupBonusActive, SIGNUP_BONUS_CAMPAIGN_ID, SIGNUP_BONUS_END_DATE, SIGNUP_BONUS_POINTS, SIGNUP_BONUS_START_DATE } from "@/lib/points.policy";
import { cn } from "@/lib/utils";
import { BadgeCheck, BookOpen, Package, Search, Tags, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HomeNoticePreview = dynamic(() => import("@/components/HomeNoticePreview"));
const HomeMarketPreview = dynamic(() => import("@/components/HomeMarketPreview"));

// 타입 정의: API에서 내려오는 제품 구조 (현재 프로젝트의 응답 필드에 맞춰 정의)
type ApiProduct = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  isNew?: boolean | string | number;
  material?: "polyester" | "hybrid" | string;
  inventory?: {
    isFeatured?: boolean | string | number;
    isNew?: boolean | string | number;
    isSale?: boolean | string | number;
    salePrice?: number | string | null;
    status?: "instock" | "outofstock" | "backorder" | string;
    stock?: number | string | null;
    lowStock?: number | string | null;
    manageStock?: boolean | string | number;
    allowBackorder?: boolean | string | number;
  };
};

const isTruthyBadgeField = (value: unknown) => value === true || value === "true" || value === 1;

type MerchandisingBadge = NonNullable<HItem["merchandisingBadges"]>[number];

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getMerchandisingBadges = (product: ApiProduct): MerchandisingBadge[] => {
  const inventory = product.inventory;

  const stock = toFiniteNumber(inventory?.stock);
  const salePrice = toFiniteNumber(inventory?.salePrice);

  const isOutOfStock = inventory?.status === "outofstock" || (isTruthyBadgeField(inventory?.manageStock) && stock <= 0);

  const isSale = isTruthyBadgeField(inventory?.isSale) && salePrice > 0;

  const isNew = isTruthyBadgeField(inventory?.isNew) || isTruthyBadgeField(product.isNew);

  const isFeatured = isTruthyBadgeField(inventory?.isFeatured);

  const isBackorder = inventory?.status === "backorder";

  const badges: MerchandisingBadge[] = [];

  if (isOutOfStock) badges.push("품절");
  if (isSale) badges.push("SALE");
  if (isNew) badges.push("NEW");
  if (isFeatured) badges.push("추천");
  if (isBackorder) badges.push("입고예정");

  return badges.slice(0, 2);
};
//  'all' + constants 기반 브랜드 키
const BRAND_KEYS = ["all", ...RACKET_BRANDS.map((b) => b.value as string)] as const;
type BrandKey = (typeof BRAND_KEYS)[number];

// 브랜드 탭 키(전체 + 상수)
const STRING_BRAND_KEYS = ["all", ...STRING_BRANDS.map((b) => b.value)] as const;
type StringBrandKey = (typeof STRING_BRAND_KEYS)[number];

// 상단 배너 슬라이드 데이터
const SLIDES = [
  {
    img: "dokkaebibanner.png",
    // imgMobile: '',
    alt: "이벤트",
    href: "/board/event",
    caption: "신규 입고 & 이벤트",
    // objectPosition: 'center 20%',
  },
  {
    img: "dokkaebibanner.png",
    alt: "서비스",
    href: "/services",
    caption: "교체서비스 시작하기",
  },
  {
    img: "dokkaebibanner.png",
    alt: "패키지",
    href: "/services/packages",
    caption: "스트링 패키지",
  },
  {
    img: "dokkaebibanner.png",
    alt: "라켓과 스트링 디테일",
    href: "/products",
    caption: "추천 스트링",
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
// 운영에서는 NEXT_PUBLIC_HOME_PROMO_BANNERS_JSON 로 주입
// - 미설정/파싱 실패 시: 섹션 숨김(더미 노출 방지)
// - 최대 4개만 사용
// - label에 줄바꿈이 필요하면 JSON 문자열에서 "\\n" 로 넣기
const PROMO_BANNERS: PromoBanner[] = (() => {
  const raw = process.env.NEXT_PUBLIC_HOME_PROMO_BANNERS_JSON;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((v, idx): PromoBanner | null => {
        if (!v || typeof v !== "object") return null;
        const obj = v as Record<string, unknown>;

        const key = typeof obj.key === "string" && obj.key.trim() ? obj.key : `promo-${idx}`;
        const label = typeof obj.label === "string" ? obj.label : "";
        if (!label.trim()) return null;

        const img = typeof obj.img === "string" && obj.img.trim() ? obj.img : undefined;
        const alt = typeof obj.alt === "string" && obj.alt.trim() ? obj.alt : undefined;
        const href = typeof obj.href === "string" && obj.href.trim() ? obj.href : undefined;

        return { key, label, img, alt, href };
      })
      .filter((v): v is PromoBanner => Boolean(v))
      .slice(0, 4);
  } catch {
    return [];
  }
})();

const surfaceCardInteractiveClass = "rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg";
const surfaceIconWrapClass = "flex items-center justify-center rounded-2xl border border-border/60 bg-secondary text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:shadow-md";
const surfacePanelClass = "rounded-3xl border border-border bg-card shadow-sm";
const processStepSurfaceClass = "group flex flex-col items-center rounded-2xl border border-border/60 bg-background p-4 text-center shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-md";

export default function Home() {
  const [activeBrand, setActiveBrand] = useState<BrandKey>("all");
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>("all");
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
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rb = params.get("racketBrand") as BrandKey | null;
    const sb = params.get("stringBrand") as StringBrandKey | null;

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
  const communitySectionRef = useRef<HTMLElement | null>(null);
  const stringsSectionRef = useRef<HTMLElement | null>(null);
  const racketsSectionRef = useRef<HTMLElement | null>(null);
  const [shouldLoadCommunity, setShouldLoadCommunity] = useState(false);
  const [shouldLoadStrings, setShouldLoadStrings] = useState(false);
  const [shouldLoadRackets, setShouldLoadRackets] = useState(false);
  const stringsFetchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 첫 렌더링이면 URL 수정하지 않음
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("racketBrand", activeBrand);
    url.searchParams.set("stringBrand", activeStringBrand);
    window.history.replaceState(null, "", url.toString());
  }, [activeBrand, activeStringBrand]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoadCommunity(true);
      setShouldLoadStrings(true);
      setShouldLoadRackets(true);
      return;
    }

    // 홈 첫 화면에 없는 섹션만 viewport 근처(여유 margin)에서 로드를 시작
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === communitySectionRef.current) {
            setShouldLoadCommunity(true);
            observer.unobserve(entry.target);
          }
          if (entry.target === stringsSectionRef.current) {
            setShouldLoadStrings(true);
            observer.unobserve(entry.target);
          }
          if (entry.target === racketsSectionRef.current) {
            setShouldLoadRackets(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "300px 0px", threshold: 0.01 },
    );

    const targets = [communitySectionRef.current, stringsSectionRef.current, racketsSectionRef.current].filter((v): v is HTMLElement => Boolean(v));
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  // 전체 상품 + 로딩
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  // 탭별 데이터 캐시: brand -> items
  type RItem = {
    id: string;
    brand: string;
    model: string;
    price: number;
    images?: string[];
    condition?: "A" | "B" | "C" | "D";
    rental?: {
      enabled: boolean;
      deposit?: number;
      fee?: { d7?: number; d15?: number; d30?: number };
    };
  };
  const [rackByBrand, setRackByBrand] = useState<Record<string, RItem[]>>({});
  const [racketsLoadingByBrand, setRacketsLoadingByBrand] = useState<Record<string, boolean>>({});
  const [racketsErrorByBrand, setRacketsErrorByBrand] = useState<Record<string, boolean>>({});

  const loadUsedRackets = useCallback(async (brand: BrandKey) => {
    setRacketsLoadingByBrand((prev) => ({ ...prev, [brand]: true }));
    setRacketsErrorByBrand((prev) => ({ ...prev, [brand]: false }));

    try {
      const qs = brand === "all" ? "?sort=createdAt_desc&limit=12" : `?brand=${brand}&sort=createdAt_desc&limit=12`;

      const res = await fetch(`/api/rackets${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const list = await res.json();
      setRackByBrand((prev) => ({
        ...prev,
        [brand]: Array.isArray(list) ? list : [],
      }));
    } catch {
      // “빈 목록”과 구분하기 위해 error 플래그를 세움
      setRackByBrand((prev) => ({ ...prev, [brand]: [] }));
      setRacketsErrorByBrand((prev) => ({ ...prev, [brand]: true }));
    } finally {
      setRacketsLoadingByBrand((prev) => ({ ...prev, [brand]: false }));
    }
  }, []);

  const fetchHomeProducts = useCallback(async () => {
    setLoading(true);
    setProductsError(false);

    try {
      const res = await fetch("/api/products?limit=48", {
        credentials: "include",
      });
      // status code 기반으로 실패 판정 (빈 목록과 “에러”를 분리)
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const items: ApiProduct[] = json.products ?? json.items ?? [];
      setAllProducts(items);
    } catch {
      setAllProducts([]);
      setProductsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoadStrings || stringsFetchedRef.current) return;
    stringsFetchedRef.current = true;
    void fetchHomeProducts();
  }, [fetchHomeProducts, shouldLoadStrings]);

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
    if (activeStringBrand === "all") return base;
    return base.filter((p) => (p.brand ?? "").toLowerCase() === activeStringBrand);
  }, [homeStringProducts, activeStringBrand]);

  // HorizontalProducts 매핑 (브랜드 라벨 표시)
  const premiumItems: HItem[] = useMemo(
    () =>
      premiumItemsSource.map((p) => {
        return {
          _id: p._id,
          name: p.name,
          price: p.price,
          images: p.images ?? [],
          brand: stringBrandLabel(p.brand),
          href: `/products/${p._id}`,
          merchandisingBadges: getMerchandisingBadges(p),
        };
      }),
    [premiumItemsSource],
  );
  // 탭 변경 시 해당 브랜드만 최초 1회 로드
  useEffect(() => {
    if (!shouldLoadRackets) return;
    if (rackByBrand[activeBrand]) return; // 캐시 있으면 스킵
    void loadUsedRackets(activeBrand);
  }, [activeBrand, rackByBrand, loadUsedRackets, shouldLoadRackets]);

  // 중고라켓 데이터- HorizontalProducts가 요구하는 HItem으로 매핑
  const usedRacketsItems: HItem[] = useMemo(() => {
    const src = rackByBrand[activeBrand] ?? []; // 탭별 소스 선택
    return src.map((r) => ({
      _id: r.id,
      name: r.model ?? "",
      price: r.price ?? 0,
      images: r.images ?? [],
      brand: racketBrandLabel?.(r.brand) ?? r.brand ?? "",
      href: `/rackets/${r.id}`,
      // 배지에 사용할 원본값 그대로 전달
      condition: r.condition as "A" | "B" | "C" | "D" | undefined,
      rentalEnabled: r?.rental?.enabled ?? undefined,
    }));
  }, [rackByBrand, activeBrand]);

  const usedRacketsLoading = Boolean(racketsLoadingByBrand[activeBrand]);
  const usedRacketsError = Boolean(racketsErrorByBrand[activeBrand]);

  // throw new Error('[TEST] app/error.tsx 동작 확인용(홈 페이지)');
  return (
    <div>
      <SignupBonusPromoPopup
        promo={signupPromo}
        onPrimaryClick={() => {
          // 회원가입 탭으로 이동
          router.push("/login?tab=register");
        }}
      />
      {/* 상단 배너 + 히어로 하단 배너 */}
      <SiteContainer variant="wide" className="px-0">
        <HeroSlider slides={SLIDES} />
        {/* 히어로 하단: 문의/광고 배너(운영값 있을 때만 노출) */}
        {PROMO_BANNERS.length > 0 && (
          <section className="mt-4 bp-sm:mt-5 bp-md:mt-6">
            <div className="mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0">
              <div className="grid grid-cols-2 bp-xxs:grid-cols-1 bp-md-only:grid-cols-4 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4">
                {PROMO_BANNERS.map((b) => {
                  const title = (b.label ?? "").split("\n")[0] || "광고 문의";

                  const baseClass =
                    "group relative block h-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:h-28 bp-md:h-32 bp-lg:h-36";

                  const inner = (
                    <>
                      {b.img ? (
                        <>
                          <img src={b.img} alt={b.alt ?? title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                          <div className="absolute inset-0 bg-background/50" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-muted/30" />
                      )}

                      <div className="relative z-10 flex h-full items-center justify-center p-4 text-center">
                        <div className="text-foreground">
                          <div className="text-lg bp-sm:text-xl bp-md:text-2xl font-bold leading-tight tracking-normal">{title}</div>
                        </div>
                      </div>
                    </>
                  );

                  if (b.href?.startsWith("/")) {
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
          </section>
        )}
      </SiteContainer>

      {/* 목적 선택 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <div className="mb-8 bp-sm:mb-10 text-center">
            <p className="mb-2 text-sm font-semibold text-primary">처음 오셨다면 여기서 시작하세요</p>
            <h2 className="font-brand-bold text-2xl bp-sm:text-3xl font-bold text-foreground tracking-normal">무엇을 도와드릴까요?</h2>
            <p className="mt-2 bp-sm:mt-3 text-sm bp-sm:text-base text-muted-foreground">원하는 목적을 고르면 필요한 단계로 바로 이동할 수 있어요.</p>
          </div>
          <div className="grid gap-4 bp-sm:gap-5 bp-md:gap-6 grid-cols-1 bp-md:grid-cols-2 bp-xl:grid-cols-3">
            <Link href="/services/apply" className={cn("group relative flex h-full flex-col gap-4 p-5 bp-sm:p-6 bp-md:p-7 border-primary/40 bg-primary/5", surfaceCardInteractiveClass)}>
              <BadgeCheck className="absolute right-5 top-5 h-5 w-5 text-primary" />
              <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                <Wrench className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-primary">가장 많이 찾는 시작</p>
                <h3 className="text-base bp-sm:text-lg font-semibold break-keep text-foreground">스트링 교체를 신청하고 싶어요</h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-foreground/80">보유 라켓이 있거나 새 스트링을 구매해서 장착까지 맡기고 싶을 때 선택하세요.</p>
              </div>
            </Link>

            <Link href="/products?from=apply" className={cn("group flex h-full flex-col gap-4 p-5 bp-sm:p-6 bp-md:p-7", surfaceCardInteractiveClass)}>
              <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                <Package className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div>
                <h3 className="text-base bp-sm:text-lg font-semibold break-keep text-foreground">새 스트링을 고르고 장착까지 맡길래요</h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-foreground/80">스트링을 새로 선택하고 교체서비스까지 한 번에 진행합니다.</p>
              </div>
            </Link>

            <Link href="/rackets?from=apply" className={cn("group flex h-full flex-col gap-4 p-5 bp-sm:p-6 bp-md:p-7", surfaceCardInteractiveClass)}>
              <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                <Tags className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div>
                <h3 className="text-base bp-sm:text-lg font-semibold break-keep text-foreground">라켓 구매/대여 후 바로 사용할 수 있게 세팅할래요</h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-foreground/80">라켓을 구매하거나 대여하면서 스트링 장착까지 함께 진행합니다.</p>
              </div>
            </Link>

            <Link href="/academy" className={cn("group flex h-full flex-col gap-4 p-5 bp-sm:p-6 bp-md:p-7", surfaceCardInteractiveClass)}>
              <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                <BookOpen className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div>
                <h3 className="text-base bp-sm:text-lg font-semibold break-keep text-foreground">레슨을 신청하고 싶어요</h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-foreground/80">아카데미 클래스와 레슨 신청 안내를 확인합니다.</p>
              </div>
            </Link>

            <Link href="/mypage" className={cn("group flex h-full flex-col gap-4 p-5 bp-sm:p-6 bp-md:p-7", surfaceCardInteractiveClass)}>
              <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                <Search className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
              </div>
              <div>
                <h3 className="text-base bp-sm:text-lg font-semibold break-keep text-foreground">내 주문/신청 상태를 확인하고 싶어요</h3>
                <p className="mt-2 text-sm leading-relaxed break-keep text-foreground/80">주문, 교체서비스, 대여, 아카데미 신청 상태를 확인합니다.</p>
              </div>
            </Link>
          </div>
        </SiteContainer>
      </section>
      {/* 라켓 검색 바로가기 (Hero 아래 CTA 블록) */}
      <section className="py-6 bp-sm:py-8">
        <SiteContainer>
          <Link href="/rackets/finder" className="group block">
            <div className={cn("flex flex-col gap-5 p-6 bp-sm:p-7 bp-md:flex-row bp-md:items-center bp-md:justify-between bp-md:p-8", surfaceCardInteractiveClass)}>
              <div className="flex items-start gap-4 bp-sm:gap-5">
                <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                  <Search className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                </div>
                <div className="min-w-0">
                  <div className="text-base bp-sm:text-lg font-bold text-foreground">라켓 검색</div>
                  <p className="mt-1.5 text-sm bp-sm:text-base text-muted-foreground">헤드/무게/밸런스/RA/SW 범위로 중고 라켓을 빠르게 좁혀보세요.</p>
                </div>
              </div>

              <div className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border/70 bg-card px-5 py-2.5 text-sm bp-sm:text-base font-semibold text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:shadow-md">
                바로가기
              </div>
            </div>
          </Link>
        </SiteContainer>
      </section>

      {/* 공지사항/중고거래 섹션 */}
      <section ref={communitySectionRef} className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <div className="mb-8 bp-sm:mb-10 text-center">
            <h2 className="font-brand-bold text-2xl bp-sm:text-3xl font-bold text-foreground tracking-normal">소식 & 커뮤니티</h2>
            <p className="mt-2 bp-sm:mt-3 text-sm bp-sm:text-base text-muted-foreground">공지사항과 중고 거래 최신 소식을 확인하세요</p>
          </div>
          <div className="grid gap-5 bp-sm:gap-6 bp-lg:grid-cols-2">
            {shouldLoadCommunity ? (
              <>
                <HomeNoticePreview />
                <HomeMarketPreview />
              </>
            ) : (
              <>
                <div className="h-[300px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm" />
                <div className="h-[300px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm" />
              </>
            )}
          </div>
        </SiteContainer>
      </section>

      {/* 서비스 플로우 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <div className={cn("p-6 bp-sm:p-8 bp-md:p-10", surfacePanelClass)}>
            <div className="mb-8 bp-sm:mb-10 text-center">
              <h2 className="font-brand-bold text-2xl bp-sm:text-3xl font-bold text-foreground tracking-normal">스트링 교체 프로세스</h2>
              <p className="mt-2 bp-sm:mt-3 text-sm bp-sm:text-base text-muted-foreground">처음 방문해도 쉽게 이해할 수 있어요</p>
            </div>
            <div className="mb-8 bp-sm:mb-10 grid gap-6 bp-sm:gap-8 grid-cols-2 bp-lg:grid-cols-4">
              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <BookOpen className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</div>
                </div>
                <h3 className="mb-1 bp-sm:mb-1.5 text-sm bp-sm:text-base font-semibold text-foreground">신청 방식 선택</h3>
                <p className="text-sm text-foreground/80">스트링 구매·라켓 구매/대여·보유 장비 중 선택</p>
              </div>
              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <Package className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</div>
                </div>
                <h3 className="mb-1 bp-sm:mb-1.5 text-sm bp-sm:text-base font-semibold text-foreground">방문/택배</h3>
                <p className="text-sm text-foreground/80">방문 예약 또는 택배 발송</p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <Wrench className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">3</div>
                </div>
                <h3 className="mb-1 bp-sm:mb-1.5 text-sm bp-sm:text-base font-semibold text-foreground">작업 진행</h3>
                <p className="text-sm text-foreground/80">장착/텐션 세팅 후 검수</p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <BadgeCheck className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">4</div>
                </div>
                <h3 className="mb-1 bp-sm:mb-1.5 text-sm bp-sm:text-base font-semibold text-foreground">수령</h3>
                <p className="text-sm text-foreground/80">방문 수령 또는 배송</p>
              </div>
            </div>
            <div className="text-center">
              <Button asChild variant="default" size="tall" className="px-6 bp-sm:px-8 text-sm bp-sm:text-base">
                <Link href="/services/apply">
                  <Wrench className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                  교체서비스 시작하기
                </Link>
              </Button>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* 스트링 섹션 */}
      <section ref={stringsSectionRef} className="py-12 bp-sm:py-14 bp-md:py-20">
        <SiteContainer>
          <div className="mb-8 bp-sm:mb-10 text-center">
            <h2 className="font-brand-bold text-2xl bp-sm:text-3xl bp-md:text-4xl font-bold text-foreground tracking-normal">스트링</h2>
            <p className="mt-2 bp-sm:mt-3 text-sm bp-sm:text-base text-muted-foreground">프로가 선택하는 테니스 스트링</p>
          </div>
          <div className="mb-8 bp-sm:mb-10">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 bp-sm:gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveStringBrand("all")}
                  className={`shrink-0 px-5 bp-sm:px-6 bp-md:px-7 py-2.5 bp-sm:py-3 rounded-xl text-sm bp-sm:text-base font-semibold transition-[background-color,color,border-color,box-shadow,opacity] duration-300 whitespace-nowrap ${activeStringBrand === "all" ? "bg-foreground text-background shadow-lg" : "bg-card border border-border/60 text-foreground hover:border-border hover:shadow-md"}`}
                >
                  전체
                </button>
                {STRING_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveStringBrand(b.value as StringBrandKey)}
                    className={`shrink-0 px-5 bp-sm:px-6 bp-md:px-7 py-2.5 bp-sm:py-3 rounded-xl text-sm bp-sm:text-base font-semibold transition-[background-color,color,border-color,box-shadow,opacity] duration-300 whitespace-nowrap ${activeStringBrand === b.value ? "bg-foreground text-background shadow-lg" : "bg-card border border-border/60 text-foreground hover:border-border hover:shadow-md"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <HorizontalProducts
            title="스트링"
            subtitle={activeStringBrand === "all" ? "브랜드로 골라보기" : `${stringBrandLabel(activeStringBrand)} 추천`}
            items={premiumItems}
            moreHref={activeStringBrand === "all" ? "/products" : `/products?brand=${activeStringBrand}`}
            firstPageSlots={4}
            moveMoreToSecondWhen5Plus={true}
            error={productsError}
            onRetry={fetchHomeProducts}
            emptyTitle={activeStringBrand === "all" ? "등록된 스트링이 없습니다" : "해당 브랜드 스트링이 없습니다"}
            emptyDescription={activeStringBrand === "all" ? "곧 상품이 업데이트됩니다." : "다른 브랜드를 선택해 보세요."}
            errorTitle="스트링을 불러오지 못했어요"
            errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요."
            showHeader={false}
            loading={!shouldLoadStrings || loading}
          />
        </SiteContainer>
      </section>

      {/* 중고 라켓 섹션 */}
      <section ref={racketsSectionRef} className="py-12 bp-sm:py-14 bp-md:py-20">
        <SiteContainer>
          <div className="mb-8 bp-sm:mb-10 text-center">
            <h2 className="font-brand-bold text-2xl bp-sm:text-3xl bp-md:text-4xl font-bold text-foreground tracking-normal">중고 라켓</h2>
            <p className="mt-2 bp-sm:mt-3 text-sm bp-sm:text-base text-muted-foreground">도깨비테니스에서 관리하는 라켓을 활용해보세요</p>
          </div>
          <div className="mb-8 bp-sm:mb-10">
            <div className="flex justify-center">
              <div className="flex items-center gap-2 bp-sm:gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveBrand("all")}
                  className={`shrink-0 px-5 bp-sm:px-6 bp-md:px-7 py-2.5 bp-sm:py-3 rounded-xl text-sm bp-sm:text-base font-semibold transition-[background-color,color,border-color,box-shadow,opacity] duration-300 whitespace-nowrap ${activeBrand === "all" ? "bg-foreground text-background shadow-lg" : "bg-card border border-border/60 text-foreground hover:border-border hover:shadow-md"}`}
                >
                  전체
                </button>
                {RACKET_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveBrand(b.value as BrandKey)}
                    className={`shrink-0 px-5 bp-sm:px-6 bp-md:px-7 py-2.5 bp-sm:py-3 rounded-xl text-sm bp-sm:text-base font-semibold transition-[background-color,color,border-color,box-shadow,opacity] duration-300 whitespace-nowrap ${activeBrand === b.value ? "bg-foreground text-background shadow-lg" : "bg-card border border-border/60 text-foreground hover:border-border hover:shadow-md"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <HorizontalProducts
            title="중고 라켓"
            subtitle={activeBrand === "all" ? "도깨비테니스 중고" : `${racketBrandLabel(activeBrand)} 중고`}
            items={usedRacketsItems}
            moreHref={activeBrand === "all" ? "/rackets" : `/rackets?brand=${activeBrand}`}
            firstPageSlots={4}
            moveMoreToSecondWhen5Plus={true}
            loading={!shouldLoadRackets || usedRacketsLoading}
            error={usedRacketsError}
            onRetry={() => loadUsedRackets(activeBrand)}
            emptyTitle={activeBrand === "all" ? "등록된 중고 라켓이 없습니다" : "해당 브랜드 중고 라켓이 없습니다"}
            emptyDescription={activeBrand === "all" ? "곧 상품이 업데이트됩니다." : "다른 브랜드를 선택해 보세요."}
            errorTitle="중고 라켓을 불러오지 못했어요"
            errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요."
            showHeader={false}
          />
        </SiteContainer>
      </section>
    </div>
  );
}
