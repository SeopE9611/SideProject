"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HeroSlider from "@/components/HeroSlider";
import HorizontalProducts, { type HItem } from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { Button } from "@/components/ui/button";
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from "@/lib/constants";
import type { HomePreviewData } from "@/lib/home/home-preview";
import {
  isSignupBonusActive,
  SIGNUP_BONUS_CAMPAIGN_ID,
  SIGNUP_BONUS_END_DATE,
  SIGNUP_BONUS_POINTS,
  SIGNUP_BONUS_START_DATE,
} from "@/lib/points.policy";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ClipboardList,
  Headset,
  Info,
  MessageSquareQuote,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Ticket,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HomeNoticePreview = dynamic(() => import("@/components/HomeNoticePreview"));

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

const getMerchandisingBadges = (product: ApiProduct): MerchandisingBadge[] => {
  const inventory = product.inventory;

  const isNew = isTruthyBadgeField(inventory?.isNew) || isTruthyBadgeField(product.isNew);
  const isFeatured = isTruthyBadgeField(inventory?.isFeatured);

  const badges: MerchandisingBadge[] = [];

  if (isNew) badges.push("NEW");
  if (isFeatured) badges.push("추천");

  return badges.slice(0, 2);
};
//  'all' + constants 기반 브랜드 키
const BRAND_KEYS = ["all", ...RACKET_BRANDS.map((b) => b.value as string)] as const;
type BrandKey = (typeof BRAND_KEYS)[number];

// 브랜드 탭 키(전체 + 상수)
const STRING_BRAND_KEYS = ["all", ...STRING_BRANDS.map((b) => b.value)] as const;
type StringBrandKey = (typeof STRING_BRAND_KEYS)[number];

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

const HOME_HERO_SLIDES = [
  {
    img: "/images/home/home-hero-stringing-workbench.webp",
    alt: "도깨비테니스 스트링 교체 작업대",
    href: "/services/apply",
    caption: "스트링 교체 신청",
  },
  {
    img: "/images/home/home-stringing-setup-clean.webp",
    alt: "테니스 라켓과 스트링 교체 도구",
    href: "/services",
    caption: "스트링 교체 프로세스",
  },
  {
    img: "/images/home/home-string-product-showcase.webp",
    alt: "테니스 스트링 상품 쇼케이스",
    href: "/products",
    caption: "추천 스트링",
  },
];

const surfaceCardInteractiveClass =
  "rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg";
const promoBannerClass =
  "group relative block h-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:h-28 bp-md:h-32 bp-lg:h-36";
const surfaceIconWrapClass =
  "flex items-center justify-center rounded-2xl border border-border/60 bg-secondary text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:shadow-md";
const processStepSurfaceClass =
  "group flex flex-col items-start rounded-2xl border border-border/60 bg-background p-4 text-left shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:border-primary/25 hover:shadow-md bp-sm:p-5";
const brandRailClass =
  "relative flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:hsl(var(--muted-foreground)/0.15)_transparent] [scrollbar-width:thin] bp-sm:gap-2.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30";
const getBrandTabClass = (isActive: boolean) =>
  cn(
    "shrink-0 whitespace-nowrap rounded-xl border px-5 py-2.5 text-ui-body-sm font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-300 bp-sm:px-6 bp-sm:py-3 bp-sm:text-ui-body bp-md:px-7",
    isActive
      ? "border-primary/40 bg-primary/10 text-primary shadow-sm dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      : "border-border/60 bg-card text-foreground hover:border-border hover:shadow-md",
  );

const SITUATIONS = [
  {
    key: "broken",
    icon: Wrench,
    label: "스트링 교체 신청",
    description: "보유 라켓을 방문·택배로 접수하고 교체를 시작해요.",
    href: "/services/apply",
  },
  {
    key: "unsure",
    icon: Search,
    label: "내 라켓에 맞는 스트링 찾기",
    description: "플레이 스타일에 맞춰 스트링을 비교해 보세요.",
    href: "/products",
  },
  {
    key: "price",
    icon: Ticket,
    label: "패키지 이용권 보기",
    description: "자주 교체한다면 횟수형 패키지로 준비하세요.",
    href: "/services/packages",
  },
  {
    key: "newRacket",
    icon: ShoppingBag,
    label: "중고 라켓 둘러보기",
    description: "검수된 라켓을 구매·대여하고 스트링까지 연결해요.",
    href: "/rackets",
  },
] as const;

type HomePageClientProps = {
  initialHomeData?: HomePreviewData | null;
};

export default function Home({ initialHomeData }: HomePageClientProps) {
  const [activeBrand, setActiveBrand] = useState<BrandKey>("all");
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>("all");
  const router = useRouter();
  const stringBrandRailRef = useRef<HTMLDivElement>(null);
  const racketBrandRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rails = [stringBrandRailRef.current, racketBrandRailRef.current].filter(
      (rail): rail is HTMLDivElement => Boolean(rail),
    );

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;

      const rail = event.currentTarget as HTMLDivElement;
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;

      if (maxScrollLeft <= 0) return;

      const absDeltaX = Math.abs(event.deltaX);
      const absDeltaY = Math.abs(event.deltaY);
      const delta = absDeltaX > absDeltaY ? event.deltaX : event.deltaY;

      if (delta === 0) return;

      const atStart = rail.scrollLeft <= 0;
      const atEnd = rail.scrollLeft >= maxScrollLeft - 1;

      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) {
        return;
      }

      event.preventDefault();
      rail.scrollLeft += delta;
    };

    rails.forEach((rail) => {
      rail.addEventListener("wheel", handleWheel, { passive: false });
    });

    return () => {
      rails.forEach((rail) => {
        rail.removeEventListener("wheel", handleWheel);
      });
    };
  }, []);

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
  const hasInitialProducts = Boolean(initialHomeData?.products);
  const hasInitialRackets = Boolean(initialHomeData?.rackets);
  const hasInitialCommunity = Boolean(initialHomeData?.notices);
  const [shouldLoadCommunity, setShouldLoadCommunity] = useState(hasInitialCommunity);
  const [shouldLoadStrings, setShouldLoadStrings] = useState(hasInitialProducts);
  const [shouldLoadRackets, setShouldLoadRackets] = useState(hasInitialRackets);
  const stringsFetchedRef = useRef(hasInitialProducts);
  const [stringByBrand, setStringByBrand] = useState<Record<string, ApiProduct[]>>({});
  const [allProductsTotal, setAllProductsTotal] = useState(initialHomeData?.products?.total ?? 0);
  const [stringTotalsByBrand, setStringTotalsByBrand] = useState<Record<string, number>>({});
  const [stringsLoadingByBrand, setStringsLoadingByBrand] = useState<Record<string, boolean>>({});
  const [stringsErrorByBrand, setStringsErrorByBrand] = useState<Record<string, boolean>>({});

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
      { root: null, rootMargin: "900px 0px", threshold: 0.01 },
    );

    const targets = [
      communitySectionRef.current,
      stringsSectionRef.current,
      racketsSectionRef.current,
    ].filter((v): v is HTMLElement => Boolean(v));
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const triggerPreload = () => {
      setShouldLoadCommunity(true);
      setShouldLoadStrings(true);
      setShouldLoadRackets(true);
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => triggerPreload(), {
        timeout: 900,
      });
      return () => window.cancelIdleCallback(id);
    }
    const rafId = requestAnimationFrame(() => triggerPreload());
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 전체 상품 + 로딩
  // 홈 공개 미리보기 데이터는 사용자별 데이터가 아니므로 서버 initialData로 먼저 렌더링해
  // 초기 빈 화면/스켈레톤 시간을 줄이고, 클라이언트 fetch는 실패/재시도 fallback으로 유지한다.
  const [allProducts, setAllProducts] = useState<ApiProduct[]>(
    initialHomeData?.products?.items ?? [],
  );
  const [loading, setLoading] = useState(!hasInitialProducts);
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
    marketing?: {
      isFeatured?: boolean;
      isNew?: boolean;
      isSale?: boolean;
      salePrice?: number;
    };
  };
  const [rackByBrand, setRackByBrand] = useState<Record<string, RItem[]>>(
    initialHomeData?.rackets ? { all: initialHomeData.rackets.items } : {},
  );
  const [racketTotalsByBrand, setRacketTotalsByBrand] = useState<Record<string, number>>(
    initialHomeData?.rackets ? { all: initialHomeData.rackets.total } : {},
  );
  const [racketsLoadingByBrand, setRacketsLoadingByBrand] = useState<Record<string, boolean>>({});
  const [racketsErrorByBrand, setRacketsErrorByBrand] = useState<Record<string, boolean>>({});

  const loadUsedRackets = useCallback(async (brand: BrandKey) => {
    setRacketsLoadingByBrand((prev) => ({ ...prev, [brand]: true }));
    setRacketsErrorByBrand((prev) => ({ ...prev, [brand]: false }));

    try {
      const qs =
        brand === "all"
          ? "?sort=createdAt_desc&limit=10&withTotal=1"
          : `?brand=${brand}&sort=createdAt_desc&limit=10&withTotal=1`;

      const res = await fetch(`/api/rackets${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const items: RItem[] = Array.isArray(json) ? json : (json.items ?? []);
      const total = typeof json?.total === "number" ? json.total : items.length;
      setRackByBrand((prev) => ({
        ...prev,
        [brand]: items,
      }));
      setRacketTotalsByBrand((prev) => ({ ...prev, [brand]: total }));
    } catch {
      // “빈 목록”과 구분하기 위해 error 플래그를 세움
      setRackByBrand((prev) => ({ ...prev, [brand]: [] }));
      setRacketTotalsByBrand((prev) => ({ ...prev, [brand]: 0 }));
      setRacketsErrorByBrand((prev) => ({ ...prev, [brand]: true }));
    } finally {
      setRacketsLoadingByBrand((prev) => ({ ...prev, [brand]: false }));
    }
  }, []);

  const fetchHomeProducts = useCallback(async () => {
    setLoading(true);
    setProductsError(false);

    try {
      const res = await fetch("/api/products?limit=10", {
        credentials: "include",
      });
      // status code 기반으로 실패 판정 (빈 목록과 “에러”를 분리)
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const items: ApiProduct[] = json.products ?? json.items ?? [];
      const total =
        typeof json?.pagination?.total === "number" ? json.pagination.total : items.length;
      setAllProducts(items);
      setAllProductsTotal(total);
    } catch {
      setAllProducts([]);
      setAllProductsTotal(0);
      setProductsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStringBrand = useCallback(async (brand: StringBrandKey) => {
    if (brand === "all") return;
    setStringsLoadingByBrand((prev) => ({ ...prev, [brand]: true }));
    setStringsErrorByBrand((prev) => ({ ...prev, [brand]: false }));
    try {
      const res = await fetch(`/api/products?brand=${brand}&sort=createdAt_desc&limit=10`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: ApiProduct[] = json.products ?? json.items ?? [];
      const total =
        typeof json?.pagination?.total === "number" ? json.pagination.total : items.length;
      setStringByBrand((prev) => ({ ...prev, [brand]: items }));
      setStringTotalsByBrand((prev) => ({ ...prev, [brand]: total }));
    } catch {
      setStringByBrand((prev) => ({ ...prev, [brand]: [] }));
      setStringTotalsByBrand((prev) => ({ ...prev, [brand]: 0 }));
      setStringsErrorByBrand((prev) => ({ ...prev, [brand]: true }));
    } finally {
      setStringsLoadingByBrand((prev) => ({ ...prev, [brand]: false }));
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
    if (activeStringBrand === "all") return homeStringProducts;
    return stringByBrand[activeStringBrand] ?? [];
  }, [activeStringBrand, homeStringProducts, stringByBrand]);

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
          inventory: p.inventory,
        };
      }),
    [premiumItemsSource],
  );
  useEffect(() => {
    if (!shouldLoadStrings || activeStringBrand === "all") return;
    if (stringByBrand[activeStringBrand]) return;
    void loadStringBrand(activeStringBrand);
  }, [activeStringBrand, loadStringBrand, shouldLoadStrings, stringByBrand]);
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
      marketing: r.marketing,
      merchandisingBadges: [
        ...(r.marketing?.isFeatured ? (["추천"] as const) : []),
        ...(r.marketing?.isNew ? (["NEW"] as const) : []),
      ],
    }));
  }, [rackByBrand, activeBrand]);

  const stringTotal =
    activeStringBrand === "all"
      ? allProductsTotal
      : (stringTotalsByBrand[activeStringBrand] ?? premiumItems.length);
  const hasMoreStringProducts = stringTotal > premiumItems.length;

  const usedRacketsLoading = Boolean(racketsLoadingByBrand[activeBrand]);
  const usedRacketsError = Boolean(racketsErrorByBrand[activeBrand]);
  const racketTotal = racketTotalsByBrand[activeBrand] ?? usedRacketsItems.length;
  const hasMoreRacketProducts = racketTotal > usedRacketsItems.length;

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
      {/* 상단 통합 랜딩 히어로 + 히어로 하단 배너 */}
      <SiteContainer variant="wide" className="px-0">
        <section className="mx-3 pt-3 bp-sm:mx-4 bp-sm:pt-4 bp-md:mx-6 bp-md:pt-6 bp-lg:mx-0">
          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm">
            <div className="grid gap-0 bp-lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] bp-lg:items-stretch">
              <div className="flex flex-col p-5 bp-sm:p-8 bp-md:p-10">
                <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-ui-label font-semibold text-primary">
                  Dokkaebi Tennis Stringing & Gear
                </span>
                <h1 className="mt-4 max-w-3xl break-keep text-ui-page-title font-semibold tracking-tight text-foreground bp-sm:mt-5 bp-md:text-ui-page-title-lg">
                  내 라켓에 맞는 스트링 교체와 테니스 용품을{" "}
                  <span className="whitespace-nowrap">한 번에</span>
                </h1>
                <p className="mt-4 max-w-2xl break-keep text-ui-body leading-relaxed text-muted-foreground bp-sm:text-ui-body-lg">
                  스트링 선택부터 교체 접수, 패키지 이용까지 도깨비테니스에서 편하게 시작하세요.
                </p>
                <div className="mt-6 grid gap-2 bp-sm:flex bp-sm:flex-wrap bp-sm:gap-3">
                  <Button asChild size="tall">
                    <Link href="/services/apply">교체서비스 신청</Link>
                  </Button>
                  <Button asChild size="tall" variant="outline">
                    <Link href="/products">스트링 둘러보기</Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 bp-sm:mt-5">
                  {["방문·택배 접수", "스트링/텐션 선택", "패키지 이용 가능"].map((point) => (
                    <span
                      key={point}
                      className="rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-ui-label font-semibold text-muted-foreground"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-border/60 bg-muted/20 p-3 bp-sm:p-4 bp-lg:border-l bp-lg:border-t-0">
                <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background shadow-sm">
                  <div className="[&>section>div]:mx-0 [&>section>div]:rounded-[1.5rem]">
                    <HeroSlider
                      slides={HOME_HERO_SLIDES}
                      slideClassName="h-[200px] bp-sm:h-[230px] bp-md-only:h-[320px] bp-lg:h-[360px]"
                      imageClassName="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* 히어로 하단: 문의/광고 배너(운영값 있을 때만 노출) */}
        {PROMO_BANNERS.length > 0 && (
          <section className="mt-4 bp-sm:mt-5 bp-md:mt-6">
            <div className="mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0">
              <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-sm:gap-4 bp-md:grid-cols-4">
                {PROMO_BANNERS.map((b) => {
                  const title = (b.label ?? "").split("\n")[0] || "광고 문의";

                  const inner = (
                    <>
                      {b.img ? (
                        <>
                          <img
                            src={b.img}
                            alt={b.alt ?? title}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-background/50" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-muted/30" />
                      )}

                      <div className="relative z-10 flex h-full items-center justify-center p-4 text-center">
                        <div className="text-foreground">
                          <div className="text-ui-card-title-lg font-semibold leading-tight tracking-normal bp-sm:text-ui-section-title bp-md:text-ui-section-title-lg">
                            {title}
                          </div>
                        </div>
                      </div>
                    </>
                  );

                  if (b.href?.startsWith("/")) {
                    return (
                      <Link
                        key={b.key}
                        href={b.href}
                        className={promoBannerClass}
                        aria-label={title}
                      >
                        {inner}
                      </Link>
                    );
                  }

                  if (b.href) {
                    return (
                      <a key={b.key} href={b.href} className={promoBannerClass} aria-label={title}>
                        {inner}
                      </a>
                    );
                  }

                  return (
                    <div key={b.key} className={promoBannerClass} aria-label={title}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </SiteContainer>

      {/* 빠른 액션 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <SectionHeader
            eyebrow="처음 오셨다면 여기서 시작하세요"
            title="지금 어떤 도움이 필요하세요?"
            description="자주 찾는 메뉴를 카드에서 바로 선택할 수 있어요."
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <div className="grid gap-3 bp-sm:grid-cols-2 bp-sm:gap-4 bp-lg:grid-cols-4">
            {SITUATIONS.map((situation) => {
              const Icon = situation.icon;
              const isPrimary = situation.key === "broken";

              return (
                <Link
                  key={situation.key}
                  href={situation.href}
                  className={cn(
                    "group flex min-h-36 flex-col justify-between rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:border-primary/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:min-h-40",
                    isPrimary
                      ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                      : "hover:bg-muted/20",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-secondary text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:bg-primary group-hover:text-primary-foreground",
                      isPrimary && "border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-5 block">
                    <span className="block break-keep text-ui-card-title font-semibold text-foreground">
                      {situation.label}
                    </span>
                    <span className="mt-2 block break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                      {situation.description}
                    </span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-ui-label font-semibold text-foreground/80 transition-colors group-hover:text-primary">
                    {isPrimary ? "교체서비스 신청하기" : "바로가기"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </SiteContainer>
      </section>

      {/* 서비스 플로우 */}
      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <PublicSurface padding="lg" className="bp-md:p-10">
            <SectionHeader
              title="스트링 교체 프로세스"
              description="접수부터 수령까지 필요한 단계만 간단히 안내해 드려요."
              align="center"
              className="mb-8 bp-sm:mb-10"
            />
            <div className="mb-5 overflow-hidden rounded-[1.5rem] border border-border/60 bg-background shadow-sm bp-sm:mb-6 bp-md:mb-8">
              <img
                src="/images/home/home-stringing-setup-clean.webp"
                alt="테니스 라켓과 스트링 교체 도구"
                className="h-36 w-full object-cover bp-sm:h-44 bp-md:h-56"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="grid gap-3 bp-sm:gap-4 bp-md:grid-cols-2 bp-lg:grid-cols-4">
              <div className={processStepSurfaceClass}>
                <div className="relative mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <ClipboardList className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    1
                  </div>
                </div>
                <h3 className="mb-1.5 text-ui-card-title font-semibold text-foreground">
                  라켓 접수
                </h3>
                <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  보유 라켓 또는 구매·대여 라켓의 접수 방식을 선택합니다.
                </p>
              </div>
              <div className={processStepSurfaceClass}>
                <div className="relative mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <SlidersHorizontal className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    2
                  </div>
                </div>
                <h3 className="mb-1.5 text-ui-card-title font-semibold text-foreground">
                  스트링/텐션 선택
                </h3>
                <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  플레이 스타일에 맞는 스트링과 텐션 정보를 입력합니다.
                </p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <Wrench className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    3
                  </div>
                </div>
                <h3 className="mb-1.5 text-ui-card-title font-semibold text-foreground">
                  전문 장착
                </h3>
                <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  장착 작업과 텐션 세팅 후 라켓 상태를 함께 확인합니다.
                </p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <PackageCheck className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    4
                  </div>
                </div>
                <h3 className="mb-1.5 text-ui-card-title font-semibold text-foreground">수령</h3>
                <p className="break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                  방문 수령 또는 배송으로 완성된 라켓을 받아보세요.
                </p>
              </div>
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>

      {/* 이용 안내 섹션 */}
      <section ref={communitySectionRef} className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <SectionHeader
            title="이용 안내"
            description="운영 소식은 간단히 확인하고, 필요한 안내 메뉴로 이동하세요."
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] bp-lg:items-stretch">
            {shouldLoadCommunity ? (
              <HomeNoticePreview initialItems={initialHomeData?.notices} />
            ) : (
              <PublicSurface
                variant="muted"
                padding="none"
                className="h-[260px] animate-pulse border-border/60"
              />
            )}
            <div className="grid gap-3 bp-sm:grid-cols-2">
              <Link
                href="/services/pricing"
                className={cn(
                  surfaceCardInteractiveClass,
                  "group flex min-h-24 items-center gap-4 p-5",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <p className="break-keep text-ui-card-title font-semibold text-foreground">
                  비용 기준 확인
                </p>
              </Link>
              <Link
                href="/services/locations"
                className={cn(
                  surfaceCardInteractiveClass,
                  "group flex min-h-24 items-center gap-4 p-5",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Info className="h-5 w-5" />
                </div>
                <p className="break-keep text-ui-card-title font-semibold text-foreground">
                  운영 정보 확인
                </p>
              </Link>
              <Link
                href="/board/qna"
                className={cn(
                  surfaceCardInteractiveClass,
                  "group flex min-h-24 items-center gap-4 p-5",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Headset className="h-5 w-5" />
                </div>
                <p className="break-keep text-ui-card-title font-semibold text-foreground">
                  문의하기
                </p>
              </Link>
              <Link
                href="/reviews"
                className={cn(
                  surfaceCardInteractiveClass,
                  "group flex min-h-24 items-center gap-4 p-5",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <MessageSquareQuote className="h-5 w-5" />
                </div>
                <p className="break-keep text-ui-card-title font-semibold text-foreground">
                  이용 후기
                </p>
              </Link>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* 스트링 섹션 */}
      <section ref={stringsSectionRef} className="py-12 bp-sm:py-14 bp-md:py-20">
        <SiteContainer>
          <SectionHeader
            eyebrow="Recommended Strings"
            title="추천 스트링"
            description="교체서비스와 함께 선택하기 좋은 인기 스트링을 브랜드별로 둘러보세요."
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <PublicSurface
            variant="muted"
            padding="sm"
            className="mb-8 border-border/60 bg-muted/20 bp-sm:mb-10"
          >
            <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm bp-sm:mb-5">
              <img
                src="/images/home/home-string-product-showcase.webp"
                alt="테니스 스트링 상품 쇼케이스"
                className="h-32 w-full object-cover bp-sm:h-44 bp-md:h-52"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="-mx-3 mb-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] bp-sm:mx-0 bp-sm:grid bp-sm:grid-cols-3 bp-sm:px-0 bp-sm:pb-0 bp-sm:[scrollbar-width:auto] [&::-webkit-scrollbar]:hidden bp-sm:[&::-webkit-scrollbar]:block">
              {[
                [
                  "입문자 추천",
                  "부드러운 타구감과 쉬운 컨트롤",
                  "추천 상품 보기",
                  "/products?comfort=80&control=70#product-list",
                ],
                [
                  "스핀 추천",
                  "회전량을 높이고 싶은 플레이어에게",
                  "스핀형 보기",
                  "/products?spin=80#product-list",
                ],
                [
                  "내구성 추천",
                  "자주 끊어지는 사용자에게",
                  "내구성형 보기",
                  "/products?durability=80#product-list",
                ],
              ].map(([title, description, cta, href]) => (
                <Link
                  key={title}
                  href={href}
                  className="group min-w-[12.5rem] rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:min-w-0 bp-sm:p-4"
                >
                  <p className="text-ui-card-title font-semibold text-foreground">{title}</p>
                  <p className="mt-1 break-keep text-ui-label leading-relaxed text-muted-foreground bp-sm:mt-1.5 bp-sm:text-ui-body-sm">
                    {description}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground/80 transition-colors group-hover:text-primary bp-sm:mt-3">
                    {cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex justify-center">
              <div ref={stringBrandRailRef} className={brandRailClass}>
                <button
                  onClick={() => setActiveStringBrand("all")}
                  className={getBrandTabClass(activeStringBrand === "all")}
                >
                  전체
                </button>
                {STRING_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveStringBrand(b.value as StringBrandKey)}
                    className={getBrandTabClass(activeStringBrand === b.value)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
              좌우 스와이프하거나 마우스 휠로 더 많은 브랜드를 볼 수 있어요.
            </p>
          </PublicSurface>

          <HorizontalProducts
            title="스트링"
            subtitle={
              activeStringBrand === "all"
                ? "인기 스트링"
                : `${stringBrandLabel(activeStringBrand)} 추천`
            }
            items={premiumItems.slice(0, 10)}
            showMoreCard={hasMoreStringProducts}
            moreHref={
              activeStringBrand === "all" ? "/products" : `/products?brand=${activeStringBrand}`
            }
            firstPageSlots={4}
            moveMoreToSecondWhen5Plus={true}
            error={
              activeStringBrand === "all"
                ? productsError
                : Boolean(stringsErrorByBrand[activeStringBrand])
            }
            onRetry={() => {
              if (activeStringBrand === "all") {
                void fetchHomeProducts();
                return;
              }
              void loadStringBrand(activeStringBrand);
            }}
            emptyTitle={
              activeStringBrand === "all"
                ? "등록된 스트링이 없습니다"
                : "해당 브랜드 스트링이 없습니다"
            }
            emptyDescription={
              activeStringBrand === "all"
                ? "곧 상품이 업데이트됩니다."
                : "다른 브랜드를 선택해 보세요."
            }
            errorTitle="스트링을 불러오지 못했어요"
            errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요."
            showHeader={false}
            loading={
              !shouldLoadStrings ||
              (activeStringBrand === "all"
                ? loading
                : Boolean(stringsLoadingByBrand[activeStringBrand]))
            }
          />
        </SiteContainer>
      </section>

      {/* 중고 라켓 섹션 */}
      <section ref={racketsSectionRef} className="py-12 bp-sm:py-14 bp-md:py-20">
        <SiteContainer>
          <SectionHeader
            eyebrow="Pre-owned Rackets"
            title="도깨비 인증 중고 라켓"
            description="검수된 중고 라켓을 구매·대여하고 스트링 교체까지 이어서 이용해보세요."
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <PublicSurface
            variant="muted"
            padding="sm"
            className="mb-8 border-border/60 bg-muted/20 bp-sm:mb-10"
          >
            <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm bp-sm:mb-5">
              <img
                src="/images/home/home-racket-section-showcase.webp"
                alt="도깨비 인증 중고 라켓 쇼케이스"
                className="h-32 w-full object-cover bp-sm:h-40 bp-md:h-48"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex justify-center">
              <div ref={racketBrandRailRef} className={brandRailClass}>
                <button
                  onClick={() => setActiveBrand("all")}
                  className={getBrandTabClass(activeBrand === "all")}
                >
                  전체
                </button>
                {RACKET_BRANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setActiveBrand(b.value as BrandKey)}
                    className={getBrandTabClass(activeBrand === b.value)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-ui-label text-muted-foreground bp-sm:text-ui-body-sm">
              좌우 스와이프하거나 마우스 휠로 더 많은 브랜드를 볼 수 있어요.
            </p>
          </PublicSurface>
          {shouldLoadRackets &&
          !usedRacketsLoading &&
          !usedRacketsError &&
          usedRacketsItems.length === 0 ? (
            <PublicSurface variant="muted" className="border-border/60 bg-muted/20 text-center">
              <p className="text-ui-section-title font-semibold text-foreground">
                {activeBrand === "all"
                  ? "검수된 중고 라켓을 준비 중입니다."
                  : "해당 브랜드 중고 라켓이 없습니다."}
              </p>
              <p className="mx-auto mt-3 max-w-xl break-keep text-ui-body text-muted-foreground">
                {activeBrand === "all"
                  ? "상태 확인이 끝난 라켓부터 순차적으로 소개해 드릴게요."
                  : "다른 브랜드를 선택해 보세요."}
              </p>
            </PublicSurface>
          ) : (
            <HorizontalProducts
              title="중고 라켓"
              subtitle={
                activeBrand === "all"
                  ? "도깨비테니스 중고"
                  : `${racketBrandLabel(activeBrand)} 중고`
              }
              items={usedRacketsItems.slice(0, 10)}
              showMoreCard={hasMoreRacketProducts}
              moreHref={activeBrand === "all" ? "/rackets" : `/rackets?brand=${activeBrand}`}
              firstPageSlots={4}
              moveMoreToSecondWhen5Plus={true}
              loading={!shouldLoadRackets || usedRacketsLoading}
              error={usedRacketsError}
              onRetry={() => loadUsedRackets(activeBrand)}
              emptyTitle={
                activeBrand === "all"
                  ? "검수된 중고 라켓을 준비 중입니다"
                  : "해당 브랜드 중고 라켓이 없습니다"
              }
              emptyDescription={
                activeBrand === "all"
                  ? "상태 확인이 끝난 라켓부터 순차적으로 소개해 드릴게요."
                  : "다른 브랜드를 선택해 보세요."
              }
              errorTitle="중고 라켓을 불러오지 못했어요"
              errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요."
              showHeader={false}
            />
          )}
        </SiteContainer>
      </section>

      {/* 라켓 검색 바로가기 (Hero 아래 CTA 블록) */}
      {/* <section className="py-6 bp-sm:py-8">
        <SiteContainer>
          <Link href="/rackets/finder" className="group block">
            <div className={cn("flex flex-col gap-5 p-6 bp-sm:p-7 bp-md:flex-row bp-md:items-center bp-md:justify-between bp-md:p-8", surfaceCardInteractiveClass)}>
              <div className="flex items-center gap-4 bp-sm:gap-5">
                <div className={cn("h-12 w-12 bp-sm:h-14 bp-sm:w-14", surfaceIconWrapClass)}>
                  <Search className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-ui-body bp-sm:text-ui-card-title-lg font-semibold text-foreground">라켓 검색</div>
                  <p className="mt-1.5 text-ui-body-sm bp-sm:text-ui-body text-muted-foreground leading-relaxed">
                    <span className="block bp-sm:inline">헤드/무게/밸런스/RA/SW</span>
                    <span className="block bp-sm:inline bp-sm:ml-1">범위로 중고 라켓을 빠르게 좁혀보세요.</span>
                  </p>
                </div>
              </div>

              <div className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border/70 bg-card px-5 py-2.5 text-ui-body-sm bp-sm:text-ui-body font-semibold text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:shadow-md">
                바로가기
              </div>
            </div>
          </Link>
        </SiteContainer>
      </section> */}
    </div>
  );
}
