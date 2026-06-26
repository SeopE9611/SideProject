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
import { BadgeCheck, BookOpen, Clock, HelpCircle, Package, Plus, Scissors, Search, Star, Tags, Wrench } from "lucide-react";
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
    caption: "스트링 교체 신청",
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

const surfaceCardInteractiveClass =
  "rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg";
const promoBannerClass =
  "group relative block h-20 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:h-24 bp-md:h-28 bp-lg:h-32";
const surfaceIconWrapClass =
  "flex items-center justify-center rounded-2xl border border-border/60 bg-secondary text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 group-hover:shadow-md";
const processStepSurfaceClass =
  "group flex flex-col items-center rounded-2xl border border-border/60 bg-background p-4 text-center shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-md";
const brandRailClass =
  "relative flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:hsl(var(--muted-foreground)/0.15)_transparent] [scrollbar-width:thin] bp-sm:gap-2.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30";
const getBrandTabClass = (isActive: boolean) =>
  cn(
    "shrink-0 whitespace-nowrap rounded-xl border px-5 py-2.5 text-ui-body-sm font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-300 bp-sm:px-6 bp-sm:py-3 bp-sm:text-ui-body bp-md:px-7",
    isActive
      ? "border-primary/40 bg-primary/10 text-primary shadow-sm dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      : "border-border/60 bg-card text-foreground hover:border-border hover:shadow-md",
  );


type SituationKey = "broken" | "newRacket" | "unsure" | "price";

type SituationCta = {
  label: string;
  href: string;
  primary?: boolean;
};

type SituationAction = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: SituationCta[];
};

const SITUATIONS = [
  { key: "broken", icon: Scissors, label: "스트링이 끊어졌어요" },
  { key: "newRacket", icon: Plus, label: "새 라켓에 매고 싶어요" },
  { key: "unsure", icon: HelpCircle, label: "어떤 스트링이 맞는지 몰라요" },
  { key: "price", icon: Tags, label: "가격이 궁금해요" },
] as const;

const SITUATION_ACTIONS: Record<SituationKey, SituationAction> = {
  broken: {
    eyebrow: "빠른 교체",
    title: "끊어진 스트링은 빠르게 접수하세요",
    description: "보유 장비로 교체서비스를 신청하면 방문 또는 택배로 접수할 수 있습니다.",
    ctas: [
      { label: "교체서비스 신청", href: "/services/apply", primary: true },
      { label: "장착비 보기", href: "/services/pricing" },
    ],
  },
  newRacket: {
    eyebrow: "신규 장착",
    title: "새 라켓에 맞는 스트링을 함께 준비하세요",
    description: "라켓을 먼저 고른 뒤 플레이 스타일에 맞는 스트링과 텐션을 선택할 수 있습니다.",
    ctas: [
      { label: "라켓 둘러보기", href: "/rackets", primary: true },
      { label: "스트링 선택하기", href: "/products" },
    ],
  },
  unsure: {
    eyebrow: "맞춤 탐색",
    title: "처음이라면 추천 스트링부터 확인하세요",
    description: "반발력, 컨트롤, 내구성 기준으로 스트링을 비교하고 선택할 수 있습니다.",
    ctas: [
      { label: "추천 스트링 보기", href: "/products", primary: true },
      { label: "Q&A 문의", href: "/board/qna" },
    ],
  },
  price: {
    eyebrow: "가격 안내",
    title: "장착비와 서비스 비용을 먼저 확인하세요",
    description: "스트링 교체 전 장착 비용과 서비스 옵션을 확인할 수 있습니다.",
    ctas: [
      { label: "가격 안내 보기", href: "/services/pricing", primary: true },
      { label: "패키지 보기", href: "/services/packages" },
    ],
  },
};

type HomePageClientProps = {
  initialHomeData?: HomePreviewData | null;
};

export default function Home({ initialHomeData }: HomePageClientProps) {
  const [activeBrand, setActiveBrand] = useState<BrandKey>("all");
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>("all");
  const [activeSituation, setActiveSituation] = useState<SituationKey>("broken");
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
  const activeSituationAction = SITUATION_ACTIONS[activeSituation];
  const racketTotal = racketTotalsByBrand[activeBrand] ?? usedRacketsItems.length;
  const hasMoreRacketProducts = racketTotal > usedRacketsItems.length;
  const shouldShowUsedRacketsSection =
    !shouldLoadRackets || usedRacketsLoading || usedRacketsError || usedRacketsItems.length > 0;

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
      {/* 랜딩 히어로 + 상황 선택 */}
      <section className="py-7 bp-sm:py-9 bp-md:py-12">
        <SiteContainer>
          <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)] bp-lg:items-stretch">
            <PublicSurface
              padding="lg"
              className="flex min-h-[360px] flex-col justify-between overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),hsl(var(--card))] p-6 bp-sm:min-h-[360px] bp-sm:p-8 bp-lg:min-h-full bp-lg:p-9"
            >
              <div>
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-ui-label font-semibold text-primary">
                  스트링 교체 · 라켓 · 아카데미
                </span>
                <h1 className="mt-5 break-keep text-ui-hero-sm font-bold leading-tight tracking-tight text-foreground bp-sm:mt-6 bp-sm:text-ui-hero-md bp-md:text-ui-hero-lg bp-lg:text-[3.35rem]">
                  내 라켓에 딱 맞는 스트링, 빠르고 정확하게 매드립니다
                </h1>
                <p className="mt-4 max-w-xl break-keep text-ui-body leading-relaxed text-muted-foreground bp-sm:mt-5 bp-sm:text-ui-card-title">
                  방문도 택배도 OK. 도깨비테니스가 텐션부터 장착까지 책임집니다.
                </p>
              </div>
              <div className="mt-7 grid gap-2.5 bp-sm:mt-8 bp-sm:grid-cols-2 bp-lg:grid-cols-1 bp-xl:grid-cols-2">
                <Button asChild size="tall" className="w-full">
                  <Link href="/services/apply">스트링 교체 신청</Link>
                </Button>
                <Button asChild variant="outline" size="tall" className="w-full bg-background/70">
                  <Link href="/products">스트링 쇼핑하기</Link>
                </Button>
              </div>
            </PublicSurface>

            <PublicSurface padding="lg" className="p-5 bp-sm:p-6 bp-md:p-8">
              <SectionHeader
                eyebrow="처음 오셨다면 여기서 시작하세요"
                title="지금 어떤 도움이 필요하세요?"
                description="상황을 선택하면 다음 행동을 바로 안내해 드려요."
                align="left"
                className="mb-5 bp-sm:mb-6"
              />
              <div className="grid gap-4 bp-xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.9fr)] bp-xl:items-stretch">
                <div className="grid grid-cols-2 gap-3 bp-sm:gap-4">
                  {SITUATIONS.map((situation) => {
                    const Icon = situation.icon;
                    const isActive = activeSituation === situation.key;

                    return (
                      <button
                        key={situation.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveSituation(situation.key)}
                        className={cn(
                          "group flex min-h-28 flex-col gap-2.5 rounded-2xl border bg-card p-4 text-left shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring/20 bp-sm:min-h-32 bp-sm:gap-3 bp-sm:p-5 bp-lg:min-h-36 bp-lg:p-6",
                          isActive
                            ? "border-primary/50 bg-primary/5 shadow-md"
                            : "border-border/60 hover:border-primary/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,color,border-color,box-shadow,opacity] duration-300",
                            isActive
                              ? "border-primary/40 bg-primary text-primary-foreground"
                              : "border-border/60 bg-secondary text-foreground group-hover:shadow-md",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="break-keep text-ui-body-sm font-semibold leading-relaxed text-foreground bp-sm:text-ui-card-title">
                          {situation.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex h-full flex-col justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4 bp-sm:p-6">
                  <div>
                    <span className="inline-flex rounded-full bg-background px-3 py-1 text-ui-label font-semibold text-primary shadow-sm">
                      {activeSituationAction.eyebrow}
                    </span>
                    <h3 className="mt-3 break-keep text-ui-card-title-lg font-semibold text-foreground bp-sm:mt-4 bp-sm:text-ui-section-title">
                      {activeSituationAction.title}
                    </h3>
                    <p className="mt-2.5 break-keep text-ui-body-sm leading-relaxed text-muted-foreground bp-sm:mt-3 bp-sm:text-ui-body">
                      {activeSituationAction.description}
                    </p>
                  </div>
                  <div className="mt-5 grid gap-2 bp-sm:mt-6 bp-sm:grid-cols-2 bp-xl:grid-cols-1 2xl:grid-cols-2">
                    {activeSituationAction.ctas.map((cta) => (
                      <Button
                        key={cta.label}
                        asChild
                        variant={cta.primary ? "default" : "outline"}
                        size="tall"
                        className="w-full"
                      >
                        <Link href={cta.href}>{cta.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PublicSurface>
          </div>
        </SiteContainer>
      </section>

      {/* 프로모션/이벤트 배너 */}
      <SiteContainer variant="wide" className="px-0">
        <section className="pb-8 bp-sm:pb-10 bp-md:pb-12">
          <div className="mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0">
            <SectionHeader
              eyebrow="프로모션"
              title="이벤트와 추천 소식"
              description="진행 중인 혜택과 추천 안내를 확인하세요."
              align="center"
              className="mb-5 bp-sm:mb-6"
            />
          </div>
          <HeroSlider slides={SLIDES} variant="compact" />
          {PROMO_BANNERS.length > 0 && (
            <div className="mt-4 bp-sm:mt-5 bp-md:mt-6">
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
            </div>
          )}
        </section>
      </SiteContainer>

      {/* 서비스 플로우 */}
      <section className="py-8 bp-sm:py-10 bp-md:py-12">
        <SiteContainer>
          <PublicSurface padding="lg" className="bp-md:p-10">
            <SectionHeader
              title="스트링 교체 프로세스"
              description="처음 방문해도 쉽게 이해할 수 있어요"
              align="center"
              className="mb-8 bp-sm:mb-10"
            />
            <div className="mb-8 bp-sm:mb-10 grid gap-6 bp-sm:gap-8 grid-cols-2 bp-lg:grid-cols-4">
              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <BookOpen className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    1
                  </div>
                </div>
                <h3 className="mb-1 text-ui-label font-medium text-foreground bp-sm:mb-1.5 bp-sm:text-ui-body-sm">
                  신청 방식 선택
                </h3>
                <p className="text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  구매·대여·보유 중 선택
                </p>
              </div>
              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <Package className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    2
                  </div>
                </div>
                <h3 className="mb-1 text-ui-label font-medium text-foreground bp-sm:mb-1.5 bp-sm:text-ui-body-sm">
                  방문/택배
                </h3>
                <p className="text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  방문 예약 또는 택배 발송
                </p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <Wrench className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    3
                  </div>
                </div>
                <h3 className="mb-1 text-ui-label font-medium text-foreground bp-sm:mb-1.5 bp-sm:text-ui-body-sm">
                  작업 진행
                </h3>
                <p className="text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  장착/텐션 세팅 후 검수
                </p>
              </div>

              <div className={processStepSurfaceClass}>
                <div className="relative mb-3 bp-sm:mb-4">
                  <div className={cn("h-14 w-14 bp-sm:h-16 bp-sm:w-16", surfaceIconWrapClass)}>
                    <BadgeCheck className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-ui-caption font-semibold text-primary-foreground">
                    4
                  </div>
                </div>
                <h3 className="mb-1 text-ui-label font-medium text-foreground bp-sm:mb-1.5 bp-sm:text-ui-body-sm">
                  수령
                </h3>
                <p className="text-ui-label leading-relaxed text-muted-foreground bp-sm:text-ui-body-sm">
                  방문 수령 또는 배송
                </p>
              </div>
            </div>
          </PublicSurface>
        </SiteContainer>
      </section>

      {/* 스트링 섹션 */}
      <section ref={stringsSectionRef} className="py-9 bp-sm:py-11 bp-md:py-14">
        <SiteContainer>
          <SectionHeader
            title="스트링"
            description="프로가 선택하는 테니스 스트링"
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <PublicSurface
            variant="muted"
            padding="sm"
            className="mb-8 border-border/60 bg-muted/20 bp-sm:mb-10"
          >
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
                ? "브랜드로 골라보기"
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

      {/* 이용 안내 섹션 */}
      <section className="py-8 bp-sm:py-10 bp-md:py-12">
        <SiteContainer>
          <SectionHeader
            title="이용 안내"
            description="운영 소식은 간단히 확인하고, 필요한 안내 메뉴로 이동하세요."
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <div className="grid gap-3 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
            <Link
                href="/services/pricing"
                className={cn(surfaceCardInteractiveClass, "group flex min-h-28 items-center gap-4 p-5")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Tags className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-ui-card-title font-semibold text-foreground">비용 기준 확인</p>
                  <p className="text-ui-body-sm text-muted-foreground">장착비와 서비스 옵션을 미리 확인하세요.</p>
                </div>
            </Link>
            <Link
                href="/services/locations"
                className={cn(surfaceCardInteractiveClass, "group flex min-h-28 items-center gap-4 p-5")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-ui-card-title font-semibold text-foreground">운영 정보 확인</p>
                  <p className="text-ui-body-sm text-muted-foreground">방문 전 운영 시간과 접수 방식을 확인하세요.</p>
                </div>
            </Link>
            <Link
                href="/board/qna"
                className={cn(surfaceCardInteractiveClass, "group flex min-h-28 items-center gap-4 p-5")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-ui-card-title font-semibold text-foreground">문의하기</p>
                  <p className="text-ui-body-sm text-muted-foreground">궁금한 점을 남기고 답변을 받아보세요.</p>
                </div>
            </Link>
            <Link
                href="/reviews"
                className={cn(surfaceCardInteractiveClass, "group flex min-h-28 items-center gap-4 p-5")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                  <Star className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-ui-card-title font-semibold text-foreground">이용 후기</p>
                  <p className="text-ui-body-sm text-muted-foreground">실제 이용자의 후기를 확인하세요.</p>
                </div>
            </Link>
          </div>
        </SiteContainer>
      </section>

      {/* 공지사항 섹션 */}
      <section ref={communitySectionRef} className="py-8 bp-sm:py-10 bp-md:py-12">
        <SiteContainer>
          <SectionHeader
            title="공지사항"
            description="운영 소식은 하단에서 간단히 확인하세요."
            align="center"
            className="mb-6 bp-sm:mb-8"
          />
          <div className="mx-auto max-w-4xl">
            {shouldLoadCommunity ? (
              <HomeNoticePreview initialItems={initialHomeData?.notices} />
            ) : (
              <PublicSurface
                variant="muted"
                padding="none"
                className="h-[220px] animate-pulse border-border/60"
              />
            )}
          </div>
        </SiteContainer>
      </section>

      {/* 중고 라켓 섹션 */}
      {shouldShowUsedRacketsSection && (
        <section ref={racketsSectionRef} className="py-9 bp-sm:py-11 bp-md:py-14">
        <SiteContainer>
          <SectionHeader
            title="중고 라켓"
            description="도깨비테니스에서 관리하는 라켓을 활용해보세요"
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <PublicSurface
            variant="muted"
            padding="sm"
            className="mb-8 border-border/60 bg-muted/20 bp-sm:mb-10"
          >
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
          <HorizontalProducts
            title="중고 라켓"
            subtitle={
              activeBrand === "all" ? "도깨비테니스 중고" : `${racketBrandLabel(activeBrand)} 중고`
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
                ? "등록된 중고 라켓이 없습니다"
                : "해당 브랜드 중고 라켓이 없습니다"
            }
            emptyDescription={
              activeBrand === "all" ? "곧 상품이 업데이트됩니다." : "다른 브랜드를 선택해 보세요."
            }
            errorTitle="중고 라켓을 불러오지 못했어요"
            errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요."
            showHeader={false}
          />
        </SiteContainer>
        </section>
      )}

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
