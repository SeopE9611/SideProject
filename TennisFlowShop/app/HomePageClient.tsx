"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import HorizontalProducts from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from "@/lib/constants";
import type {
  HomePreviewData,
  HomePreviewPackage,
  HomePreviewProduct,
} from "@/lib/home/home-preview";
import {
  isSignupBonusActive,
  SIGNUP_BONUS_CAMPAIGN_ID,
  SIGNUP_BONUS_END_DATE,
  SIGNUP_BONUS_POINTS,
  SIGNUP_BONUS_START_DATE,
} from "@/lib/points.policy";
import { badgeToneVariant, usedBadgeMeta } from "@/lib/badge-style";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./HomePageClient.module.css";

const HomeNoticePreview = dynamic(() => import("@/components/HomeNoticePreview"));

type ApiProduct = HomePreviewProduct;

type MerchandisingBadge = "품절" | "SALE" | "NEW" | "추천" | "입고예정";

type HomeCardItem = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  brand?: string;
  href?: string;
  merchandisingBadges?: MerchandisingBadge[];
  inventory?: ApiProduct["inventory"];
  marketing?: RItem["marketing"];
};

const isTruthyBadgeField = (value: unknown) => value === true || value === "true" || value === 1;

const getMerchandisingBadges = (product: ApiProduct): MerchandisingBadge[] => {
  const inventory = product.inventory;
  const isNew = isTruthyBadgeField(inventory?.isNew) || isTruthyBadgeField(product.isNew);
  const isFeatured = isTruthyBadgeField(inventory?.isFeatured);
  const badges: MerchandisingBadge[] = [];

  if (isNew) badges.push("NEW");
  if (isFeatured) badges.push("추천");

  return badges.slice(0, 2);
};

const BRAND_KEYS = ["all", ...RACKET_BRANDS.map((b) => b.value as string)] as const;
type BrandKey = (typeof BRAND_KEYS)[number];

const STRING_BRAND_KEYS = ["all", ...STRING_BRANDS.map((b) => b.value)] as const;
type StringBrandKey = (typeof STRING_BRAND_KEYS)[number];

type BrandRailState = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  hasOverflow: boolean;
};

const BRAND_RAIL_SCROLL_EPSILON = 2;
const STRING_BRAND_RAIL_ID = "home-string-brand-rail";
const STRING_BRAND_RAIL_EDGE_PADDING = 40;

type PromoBanner = {
  key: string;
  label: string;
  img?: string;
  alt?: string;
  href?: string;
};

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

const APPLICATION_PATHS = {
  direct: {
    key: "direct",
    no: "01",
    label: "직접 선택",
    title: "원하는 스트링이\n정해져 있어요",
    description: "상품을 고른 뒤 텐션과 접수 방법을 바로 선택합니다.",
    detailTitle: "스트링과 텐션을 알고 있다면 바로 신청하세요.",
    detailDescription: "상품을 선택한 뒤 신청서를 바로 작성할 수 있어요.",
    checks: ["상품 페이지에서 스트링 선택", "텐션 직접 입력", "방문 또는 택배 접수 선택"],
    string: "직접 선택",
    tension: "직접 입력",
    method: "방문 / 택배",
    cta: "직접 선택하고 신청하기",
    href: "/products?from=apply",
  },
  consult: {
    key: "consult",
    no: "02",
    label: "추천받고 신청",
    title: "추천받고\n싶어요",
    description: "원하는 타구감과 플레이 스타일에 맞는 스트링을 추천받아요.",
    detailTitle: "어떤 스트링이 맞을지 고민된다면 플레이 스타일부터 선택해보세요.",
    detailDescription: "타구감, 스핀, 컨트롤처럼 원하는 플레이를 기준으로 추천을 확인합니다.",
    checks: ["플레이 목적 선택", "추천 상품 비교", "상담 후 텐션 결정"],
    string: "추천 상품",
    tension: "상담 후 결정",
    method: "방문 / 택배",
    cta: "내게 맞는 스트링 찾기",
    href: "/products/recommend",
  },
  own: {
    key: "own",
    no: "03",
    label: "보유 스트링",
    title: "보유한 스트링으로\n장착하고 싶어요",
    description: "가지고 있는 스트링을 맡기고 장착 서비스만 신청합니다.",
    detailTitle: "가지고 계신 스트링으로 장착만 신청할 수 있어요.",
    detailDescription: "스트링 정보와 원하는 텐션을 남기면 라켓 접수 후 장착을 진행해요.",
    checks: ["보유 스트링 정보 입력", "원하는 텐션 입력 또는 상담", "라켓 접수 방식 선택"],
    string: "보유 스트링",
    tension: "직접 입력 / 상담",
    method: "방문 / 택배",
    cta: "보유 스트링 장착 신청하기",
    href: "/services/apply?mode=single",
  },
} as const;

type ApplicationPathKey = keyof typeof APPLICATION_PATHS;

const PROCESS_STEPS = [
  {
    key: "apply",
    no: "01",
    tab: "교체 신청",
    title: "내 상황에 맞는\n신청 방법 선택",
    description: "직접 선택, 추천, 보유 스트링 중 지금 가장 편한 방식으로 시작합니다.",
    checks: ["신청 경로 선택", "스트링 또는 상담 선택", "접수 방식 확인"],
    progress: "25%",
    mockTitle: "교체 신청",
    question: "어떤 방식으로 시작할까요?",
    options: ["추천받고 신청", "원하는 스트링 직접 선택", "보유 스트링 장착"],
    cta: "다음 · 라켓 접수",
  },
  {
    key: "receive",
    no: "02",
    tab: "라켓 접수",
    title: "방문 또는 택배로\n라켓을 맡기세요",
    description: "매장 방문과 택배 접수 중 가능한 방법을 고르고 안내를 확인합니다.",
    checks: ["접수 방법 선택", "라켓 정보 입력", "도착 확인 안내"],
    progress: "50%",
    mockTitle: "라켓 접수",
    question: "라켓은 어떻게 맡기시나요?",
    options: ["매장 방문", "택배 접수"],
    cta: "다음 · 전문 장착",
  },
  {
    key: "stringing",
    no: "03",
    tab: "전문 장착",
    title: "선택한 조건으로\n정확하게 장착합니다",
    description: "스트링과 텐션 정보를 확인한 뒤 작업 상태를 안내합니다.",
    checks: ["스트링 정보 확인", "텐션 확인", "작업 완료 안내"],
    progress: "75%",
    mockTitle: "장착 진행",
    question: "작업 전 확인할 내용은 무엇인가요?",
    options: ["스트링", "텐션", "라켓 상태"],
    cta: "다음 · 수령 및 관리",
  },
  {
    key: "care",
    no: "04",
    tab: "수령 및 관리",
    title: "완성된 라켓을 받고\n다음 관리로 이어가세요",
    description: "수령 후 교체 이력을 라켓 케어에서 이어서 관리할 수 있습니다.",
    checks: ["수령 방법 확인", "교체 이력 저장", "다음 교체 시기 관리"],
    progress: "100%",
    mockTitle: "수령 안내",
    question: "완료 후 어떤 안내를 받을까요?",
    options: ["수령 안내", "교체 이력", "라켓 케어 연결"],
    cta: "교체서비스 신청하기",
  },
] as const;

type ProcessStepKey = (typeof PROCESS_STEPS)[number]["key"];

const PURPOSES = [
  {
    key: "comfort",
    no: "01",
    title: "편안한 타구감",
    desc: "팔에 부담이 적고 부드러운 타구감을 원하는 분께 추천해요.",
  },
  {
    key: "spin",
    no: "02",
    title: "스핀",
    desc: "회전량을 높이고 공의 궤적을 적극적으로 만들고 싶은 분께 추천해요.",
  },
  {
    key: "control",
    no: "03",
    title: "컨트롤",
    desc: "코스와 깊이를 안정적으로 조절하고 싶은 분께 추천해요.",
  },
  {
    key: "durability",
    no: "04",
    title: "내구성",
    desc: "스트링이 자주 끊어지거나 오래 사용하고 싶은 분께 추천해요.",
  },
  {
    key: "beginner",
    no: "05",
    title: "처음 시작",
    desc: "처음 스트링을 고르는 분도 부담 없이 선택할 수 있어요.",
  },
] as const;

type PurposeKey = (typeof PURPOSES)[number]["key"];

type HomePageClientProps = {
  initialHomeData?: HomePreviewData | null;
};

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
  status?: string;
  marketing?: {
    isFeatured?: boolean;
    isNew?: boolean;
    isSale?: boolean;
    salePrice?: number;
  };
};

const formatPrice = (value: number) =>
  `${Math.max(0, Number(value) || 0).toLocaleString("ko-KR")}원`;
const getImageSrc = (images?: string[]) => {
  const src = images?.[0] || "/placeholder.svg";
  return src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;
};

const homeCtaHighlight = buttonVariants({ variant: "highlight", size: "tall" });
const homeCtaDefault = buttonVariants({ variant: "default", size: "tall" });
const homeCtaOutline = buttonVariants({ variant: "outline", size: "tall" });
const brandRailClass =
  "relative flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] bp-sm:gap-2.5 [&::-webkit-scrollbar]:hidden";
const getBrandTabClass = (isActive: boolean) =>
  cn(
    "min-h-11 shrink-0 whitespace-nowrap rounded-control border px-5 py-2.5 text-ui-body-sm font-medium transition-[background-color,color,border-color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    isActive
      ? "border-surface-inverse bg-surface-inverse text-surface-inverse-foreground"
      : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-muted/30",
  );

function HomeEditorialHeader({
  no,
  eyebrow,
  title,
  description,
}: {
  no: string;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionHeadMain}>
        <div className={styles.sectionNo}>
          <span className={styles.sectionNoCircle}>{no}</span>
          <span className={styles.sectionEyebrow}>{eyebrow}</span>
        </div>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}

export default function Home({ initialHomeData }: HomePageClientProps) {
  const [activeBrand, setActiveBrand] = useState<BrandKey>("all");
  const [activeStringBrand, setActiveStringBrand] = useState<StringBrandKey>("all");
  const [stringBrandRailState, setStringBrandRailState] = useState<BrandRailState>({
    canScrollPrev: false,
    canScrollNext: false,
    hasOverflow: false,
  });
  const [activeApplicationPath, setActiveApplicationPath] = useState<ApplicationPathKey>("consult");
  const [activeStepKey, setActiveStepKey] = useState<ProcessStepKey>("apply");
  const [activePurpose, setActivePurpose] = useState<PurposeKey>("comfort");
  const router = useRouter();
  const stringBrandRailRef = useRef<HTMLDivElement>(null);
  const racketBrandRailRef = useRef<HTMLDivElement>(null);

  const updateStringBrandRailState = useCallback(() => {
    const rail = stringBrandRailRef.current;
    if (!rail) return;

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextState: BrandRailState = {
      canScrollPrev: rail.scrollLeft > BRAND_RAIL_SCROLL_EPSILON,
      canScrollNext: rail.scrollLeft < maxScrollLeft - BRAND_RAIL_SCROLL_EPSILON,
      hasOverflow: maxScrollLeft > BRAND_RAIL_SCROLL_EPSILON,
    };

    setStringBrandRailState((prev) =>
      prev.canScrollPrev === nextState.canScrollPrev &&
      prev.canScrollNext === nextState.canScrollNext &&
      prev.hasOverflow === nextState.hasOverflow
        ? prev
        : nextState,
    );
  }, []);

  const scrollStringBrandRail = useCallback((direction: -1 | 1) => {
    const rail = stringBrandRailRef.current;
    if (!rail) return;

    const distance = Math.max(180, rail.clientWidth * 0.7) * direction;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: distance, behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

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
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      rail.scrollLeft += delta;
    };

    rails.forEach((rail) => rail.addEventListener("wheel", handleWheel, { passive: false }));
    return () => rails.forEach((rail) => rail.removeEventListener("wheel", handleWheel));
  }, []);

  useEffect(() => {
    const rail = stringBrandRailRef.current;
    if (!rail) return;

    updateStringBrandRailState();
    const handleScroll = () => updateStringBrandRailState();
    const handleResize = () => updateStringBrandRailState();
    rail.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(updateStringBrandRailState) : null;
    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [updateStringBrandRailState]);

  useEffect(() => {
    const rail = stringBrandRailRef.current;
    if (!rail) return;
    const activeButton = rail.querySelector<HTMLButtonElement>(
      `[data-string-brand="${activeStringBrand}"]`,
    );
    if (!activeButton) return;

    const railStart = rail.scrollLeft;
    const railEnd = railStart + rail.clientWidth;
    const buttonStart = activeButton.offsetLeft;
    const buttonEnd = buttonStart + activeButton.offsetWidth;
    const edgePadding = STRING_BRAND_RAIL_EDGE_PADDING;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    if (buttonStart < railStart + edgePadding) {
      rail.scrollTo({ left: Math.max(0, buttonStart - edgePadding), behavior });
    } else if (buttonEnd > railEnd - edgePadding) {
      rail.scrollTo({ left: buttonEnd - rail.clientWidth + edgePadding, behavior });
    }
  }, [activeStringBrand]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rb = params.get("racketBrand") as BrandKey | null;
    const sb = params.get("stringBrand") as StringBrandKey | null;

    if (rb && BRAND_KEYS.includes(rb)) setActiveBrand(rb);
    if (sb && STRING_BRAND_KEYS.includes(sb)) setActiveStringBrand(sb);
  }, []);

  const firstRender = useRef(true);
  const communitySectionRef = useRef<HTMLElement | null>(null);
  const stringsSectionRef = useRef<HTMLElement | null>(null);
  const racketsSectionRef = useRef<HTMLElement | null>(null);
  const hasInitialProducts = Boolean(initialHomeData?.products);
  const hasInitialRackets = Boolean(initialHomeData?.rackets);
  const hasInitialCommunity = Boolean(initialHomeData?.notices);
  const hasInitialPackages = Array.isArray(initialHomeData?.packages);
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
      const id = window.requestIdleCallback(() => triggerPreload(), { timeout: 900 });
      return () => window.cancelIdleCallback(id);
    }
    const rafId = requestAnimationFrame(() => triggerPreload());
    return () => cancelAnimationFrame(rafId);
  }, []);

  const [allProducts, setAllProducts] = useState<ApiProduct[]>(
    initialHomeData?.products?.items ?? [],
  );
  const [loading, setLoading] = useState(!hasInitialProducts);
  const [productsError, setProductsError] = useState(false);
  const [rackByBrand, setRackByBrand] = useState<Record<string, RItem[]>>(
    initialHomeData?.rackets ? { all: initialHomeData.rackets.items } : {},
  );
  const [racketTotalsByBrand, setRacketTotalsByBrand] = useState<Record<string, number>>(
    initialHomeData?.rackets ? { all: initialHomeData.rackets.total } : {},
  );
  const [racketsLoadingByBrand, setRacketsLoadingByBrand] = useState<Record<string, boolean>>({});
  const [racketsErrorByBrand, setRacketsErrorByBrand] = useState<Record<string, boolean>>({});
  const racketsFetchedRef = useRef(new Set<BrandKey>());
  const [homePackages, setHomePackages] = useState<HomePreviewPackage[]>(
    initialHomeData?.packages ?? [],
  );
  const [packagesLoading, setPackagesLoading] = useState(!hasInitialPackages);
  const [packagesError, setPackagesError] = useState(false);

  const fetchHomePackages = useCallback(async () => {
    if (hasInitialPackages) return;

    setPackagesLoading(true);
    setPackagesError(false);

    try {
      const res = await fetch("/api/packages/settings", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.packages)) throw new Error("Invalid packages response");

      setHomePackages(
        data.packages
          .filter((pkg: HomePreviewPackage) => pkg.isActive)
          .sort((a: HomePreviewPackage, b: HomePreviewPackage) => a.sortOrder - b.sortOrder),
      );
    } catch {
      setHomePackages([]);
      setPackagesError(true);
    } finally {
      setPackagesLoading(false);
    }
  }, [hasInitialPackages]);

  useEffect(() => {
    if (hasInitialPackages) return;
    void fetchHomePackages();
  }, [fetchHomePackages, hasInitialPackages]);

  const loadUsedRackets = useCallback(async (brand: BrandKey, options?: { force?: boolean }) => {
    if (options?.force) racketsFetchedRef.current.delete(brand);
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
      setRackByBrand((prev) => ({ ...prev, [brand]: items }));
      setRacketTotalsByBrand((prev) => ({ ...prev, [brand]: total }));
    } catch {
      setRacketsErrorByBrand((prev) => ({ ...prev, [brand]: true }));
    } finally {
      setRacketsLoadingByBrand((prev) => ({ ...prev, [brand]: false }));
    }
  }, []);

  const fetchHomeProducts = useCallback(async () => {
    setLoading(true);
    setProductsError(false);

    try {
      const res = await fetch("/api/products?limit=10", { credentials: "include" });
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

  useEffect(() => {
    if (!shouldLoadStrings || activeStringBrand === "all") return;
    if (stringByBrand[activeStringBrand]) return;
    void loadStringBrand(activeStringBrand);
  }, [activeStringBrand, loadStringBrand, shouldLoadStrings, stringByBrand]);

  useEffect(() => {
    if (!shouldLoadRackets) return;
    if (racketsFetchedRef.current.has(activeBrand)) return;
    racketsFetchedRef.current.add(activeBrand);
    void loadUsedRackets(activeBrand);
  }, [activeBrand, loadUsedRackets, shouldLoadRackets]);

  const homeStringProducts = useMemo(() => allProducts, [allProducts]);
  const premiumItemsSource = useMemo(() => {
    if (activeStringBrand === "all") return homeStringProducts;
    return stringByBrand[activeStringBrand] ?? [];
  }, [activeStringBrand, homeStringProducts, stringByBrand]);

  const sortedProductsByPurpose = useMemo(() => {
    return premiumItemsSource
      .map((product, index) => {
        const features = product.features;
        const score = getPurposeScore(features, activePurpose);
        return { product, index, score };
      })
      .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
      .map(({ product }) => product);
  }, [activePurpose, premiumItemsSource]);

  const premiumItems: HomeCardItem[] = useMemo(
    () =>
      sortedProductsByPurpose.map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        images: p.images ?? [],
        brand: stringBrandLabel(p.brand),
        href: `/products/${p._id}`,
        merchandisingBadges: getMerchandisingBadges(p),
        inventory: p.inventory,
      })),
    [sortedProductsByPurpose],
  );

  const usedRacketsSource = rackByBrand[activeBrand] ?? [];
  const carouselRackets = usedRacketsSource.slice(0, 10);

  const usedRacketsLoading = Boolean(racketsLoadingByBrand[activeBrand]);
  const usedRacketsError = Boolean(racketsErrorByBrand[activeBrand]);
  const racketTotal = racketTotalsByBrand[activeBrand] ?? usedRacketsSource.length;
  const currentPath = APPLICATION_PATHS[activeApplicationPath];
  const heroPath = currentPath;
  const currentStepIndex = PROCESS_STEPS.findIndex((step) => step.key === activeStepKey);
  const currentStep = PROCESS_STEPS[currentStepIndex] ?? PROCESS_STEPS[0];
  const activePurposeInfo =
    PURPOSES.find((purpose) => purpose.key === activePurpose) ?? PURPOSES[0];
  const recommendationMoreHref = useMemo(
    () => getPurposeProductHref(activePurpose, activeStringBrand),
    [activePurpose, activeStringBrand],
  );
  const stringProductsLoading =
    !shouldLoadStrings ||
    (activeStringBrand === "all" ? loading : Boolean(stringsLoadingByBrand[activeStringBrand]));
  const stringProductsError =
    activeStringBrand === "all" ? productsError : Boolean(stringsErrorByBrand[activeStringBrand]);
  const retryStringProducts = () => {
    if (activeStringBrand === "all") {
      void fetchHomeProducts();
      return;
    }
    void loadStringBrand(activeStringBrand);
  };
  return (
    <div className={styles.page}>
      <SignupBonusPromoPopup
        promo={signupPromo}
        onPrimaryClick={() => router.push("/login?tab=register")}
      />

      <section className={styles.hero}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.heroShell}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <span className="w-fit rounded-full bg-brand-highlight px-3 py-1.5 text-ui-label font-medium text-brand-highlight-foreground">
                  스트링 교체서비스
                </span>
                <h1 className={styles.heroTitle}>
                  스트링부터 텐션까지
                  <span className={styles.heroOutline}>내 플레이에 맞게</span>
                </h1>
                <p className="mt-5 max-w-2xl break-keep text-ui-body leading-relaxed text-surface-inverse-muted bp-sm:text-ui-body-lg">
                  스트링 선택부터 텐션 상담, 라켓 접수와 수령까지. 복잡한 교체 과정을 쉽게
                  안내해드려요.
                </p>
                <div className="mt-7 grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                  <Link className={homeCtaHighlight} href="/services/apply">
                    교체서비스 신청하기 <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <Link className={homeCtaDefault} href="/products/recommend">
                    내게 맞는 스트링 찾기
                  </Link>
                </div>
                <div className={styles.heroTrust}>
                  {[
                    ["방문·택배", "두 가지 접수 방식"],
                    ["직접 선택·상담", "준비 상태에 맞춘 신청"],
                    ["패키지", "반복 교체 이용 가능"],
                  ].map(([title, desc]) => (
                    <div key={title} className={styles.heroTrustItem}>
                      <strong>{title}</strong>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.heroVisual}>
                <div className={styles.heroImageWrap}>
                  <Image
                    src="/images/home/home-hero-stringing-workbench.webp"
                    alt="도깨비테니스 스트링 교체 작업대"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1199px) calc(100vw - 24px), 680px"
                  />
                </div>
                <div className={styles.heroPlan}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-ui-label font-medium uppercase tracking-[0.12em] text-surface-inverse-muted">
                        MY STRINGING PLAN
                      </p>
                      <h2 className={cn(styles.marketingTitle, "mt-2 text-ui-section-title")}>
                        교체 신청 미리보기
                      </h2>
                    </div>
                    <span className="rounded-full bg-brand-highlight px-2.5 py-1 text-ui-caption font-medium text-brand-highlight-foreground">
                      선택
                    </span>
                  </div>
                  <div className={styles.heroPlanModes}>
                    {(Object.keys(APPLICATION_PATHS) as ApplicationPathKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={activeApplicationPath === key}
                        onClick={() => setActiveApplicationPath(key)}
                        className={cn(
                          "rounded-control border px-3 py-2 text-left text-ui-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                          activeApplicationPath === key
                            ? "border-brand-highlight bg-brand-highlight text-brand-highlight-foreground"
                            : "border-surface-inverse-foreground/15 bg-card/10 text-surface-inverse-foreground hover:border-surface-inverse-foreground/30",
                        )}
                      >
                        {APPLICATION_PATHS[key].label}
                      </button>
                    ))}
                  </div>
                  <div className={styles.heroPlanDetails}>
                    <PlanCell label="스트링" value={heroPath.string} />
                    <PlanCell label="텐션" value={heroPath.tension} />
                    <PlanCell label="접수 방법" value={heroPath.method} />
                    <PlanCell label="선택 방식" value={heroPath.label} />
                  </div>
                  <Link className={cn(homeCtaHighlight, "mt-5 w-full")} href={heroPath.href}>
                    {heroPath.cta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>

      {PROMO_BANNERS.length > 0 && (
        <section className="pb-6">
          <SiteContainer variant="wide" className={styles.wrap}>
            <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-md:grid-cols-4">
              {PROMO_BANNERS.map((banner) => {
                const title = banner.label.split("\n")[0] || "안내";
                const inner = (
                  <>
                    {banner.img ? (
                      <img
                        src={banner.img}
                        alt={banner.alt ?? title}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted" />
                    )}
                    <div className="relative z-10 flex h-full items-center justify-center bg-card/80 p-4 text-center text-ui-card-title font-medium text-foreground">
                      {title}
                    </div>
                  </>
                );
                if (banner.href?.startsWith("/")) {
                  return (
                    <Link
                      key={banner.key}
                      href={banner.href}
                      className="relative block h-24 overflow-hidden rounded-panel border border-border bg-card"
                    >
                      {inner}
                    </Link>
                  );
                }
                if (banner.href) {
                  return (
                    <a
                      key={banner.key}
                      href={banner.href}
                      className="relative block h-24 overflow-hidden rounded-panel border border-border bg-card"
                    >
                      {inner}
                    </a>
                  );
                }
                return (
                  <div
                    key={banner.key}
                    className="relative block h-24 overflow-hidden rounded-panel border border-border bg-card"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </SiteContainer>
        </section>
      )}

      <section className={styles.section} id="paths">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="01"
            eyebrow="신청 방식 선택"
            title="지금 상황에 맞는 신청 방법을 선택하세요."
            description={
              <>
                원하는 스트링을 직접 선택하거나 추천받을 수 있어요.
                <br />
                보유한 스트링으로 장착만 신청하는 것도 가능합니다.
              </>
            }
          />
          <div className={styles.pathGrid}>
            {(Object.keys(APPLICATION_PATHS) as ApplicationPathKey[]).map((key) => {
              const path = APPLICATION_PATHS[key];
              const active = activeApplicationPath === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveApplicationPath(key)}
                  className={cn(
                    styles.pathCard,
                    active ? styles.pathCardActive : styles.pathCardIdle,
                  )}
                >
                  <span className="text-ui-label font-medium text-muted-foreground">
                    {path.no} · {path.label}
                  </span>
                  <span
                    className={cn(
                      "absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border",
                      active
                        ? "border-brand-highlight bg-brand-highlight text-brand-highlight-foreground"
                        : "border-border bg-muted text-foreground",
                    )}
                  >
                    ↗
                  </span>
                  <h3
                    className={cn(
                      styles.marketingTitle,
                      "mt-10 whitespace-pre-line text-ui-section-title leading-tight text-foreground",
                    )}
                  >
                    {path.title}
                  </h3>
                  <p className="mt-3 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
                    {path.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-ui-label font-medium text-foreground">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-brand-highlight" : "bg-muted",
                      )}
                    />
                    {active ? "선택됨" : "선택하기"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.pathDetail}>
            <div className={styles.detailCopy}>
              <span className="rounded-full bg-brand-highlight-muted px-3 py-1.5 text-ui-label font-medium text-foreground">
                {currentPath.label}
              </span>
              <h3
                className={cn(
                  styles.marketingTitle,
                  "mt-5 text-ui-section-title-lg leading-tight text-foreground",
                )}
              >
                {currentPath.detailTitle}
              </h3>
              <p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">
                {currentPath.detailDescription}
              </p>
              <div className="mt-6 grid gap-2">
                {currentPath.checks.map((check) => (
                  <CheckLine key={check}>{check}</CheckLine>
                ))}
              </div>
              <Link className={cn(homeCtaHighlight, "mt-6")} href={currentPath.href}>
                {currentPath.cta}
              </Link>
            </div>
            <div className={styles.detailPreview}>
              <p className="text-ui-label font-medium uppercase tracking-[0.12em] text-surface-inverse-muted">
                신청 요약
              </p>
              <PreviewLine label="스트링" value={currentPath.string} />
              <PreviewLine label="텐션" value={currentPath.tension} />
              <PreviewLine label="접수 방법" value={currentPath.method} />
              <PreviewLine label="다음 이동" value={currentPath.cta} />
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.section}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="02"
            eyebrow="주요 서비스"
            title="교체서비스에 필요한 메뉴를 한곳에서 확인하세요."
            description={
              <>
                교체 신청부터 스트링 추천, 패키지와 가격 안내까지
                <br />
                필요한 메뉴를 빠르게 확인할 수 있어요.
              </>
            }
          />
          <div className={styles.bento}>
            <Link href="/services/apply" className={styles.bentoMain}>
              <div className={styles.bentoMainInner}>
                <div className={styles.bentoImageWrap}>
                  <Image
                    src="/images/home/home-stringing-setup-clean.webp"
                    alt="스트링 교체 준비가 된 라켓과 도구"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1199px) 100vw, 820px"
                  />
                </div>
                <div className={styles.bentoCopy}>
                  <span className="w-fit rounded-full bg-brand-highlight px-3 py-1.5 text-ui-label font-medium text-brand-highlight-foreground">
                    스트링 교체서비스
                  </span>
                  <h3 className={styles.bentoTitle}>라켓을 맡기는 순간부터 수령할 때까지</h3>
                  <p className={styles.bentoDescription}>
                    신청서 작성, 접수 방식 선택, 스트링·텐션 확인, 작업 완료 안내를 순서대로
                    확인하세요.
                  </p>
                  <span className={cn(homeCtaHighlight, styles.bentoCta)}>
                    교체서비스 시작하기 <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
            <div className={styles.bentoSide}>
              {[
                [
                  "내게 맞는 스트링 찾기",
                  "플레이 스타일에 맞는 스트링 추천",
                  "/products/recommend",
                ],
                ["교체 패키지", "교체 횟수에 맞는 패키지", "/services/packages"],
                ["가격·이용 안내", "장착 비용과 이용 방법 확인", "/services/pricing"],
              ].map(([title, desc, href]) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    styles.bentoSideCard,
                    "group flex min-h-32 items-center justify-between rounded-panel border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                  )}
                >
                  <span>
                    <strong className="block text-ui-card-title-lg font-medium text-foreground">{title}</strong>
                    <span className="mt-2 block break-keep text-ui-body-sm text-muted-foreground">
                      {desc}
                    </span>
                  </span>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-highlight-muted text-foreground">
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.section} id="process">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="03"
            eyebrow="교체 진행 순서"
            title="신청부터 수령까지 필요한 정보만 보여드려요."
            description="단계를 선택하면 준비할 내용과 진행 방법을 미리 확인할 수 있어요."
          />
          <div className={styles.processWrap}>
            <div className={styles.stepTabs}>
              {PROCESS_STEPS.map((step) => {
                const active = activeStepKey === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveStepKey(step.key)}
                    className={cn(
                      "min-w-40 border-b border-r border-border px-4 py-4 text-left font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                      active
                        ? "bg-surface-inverse text-surface-inverse-foreground"
                        : "bg-card text-foreground hover:bg-muted/30",
                    )}
                  >
                    <small
                      className={cn(
                        "mb-1 block font-medium",
                        active ? "text-brand-highlight" : "text-muted-foreground",
                      )}
                    >
                      {step.no}
                    </small>
                    {step.tab}
                  </button>
                );
              })}
            </div>
            <div className={styles.stepBody}>
              <div className={styles.stepCopy}>
                <p className="text-ui-label font-medium">단계 {currentStep.no}</p>
                <h3
                  className={cn(
                    styles.marketingTitle,
                    "mt-4 whitespace-pre-line text-ui-page-title leading-tight",
                  )}
                >
                  {currentStep.title}
                </h3>
                <p className="mt-4 break-keep text-ui-body leading-relaxed">
                  {currentStep.description}
                </p>
                <div className="mt-6 grid gap-2">
                  {currentStep.checks.map((check) => (
                    <CheckLine key={check} inverse>
                      {check}
                    </CheckLine>
                  ))}
                </div>
                {currentStepIndex < PROCESS_STEPS.length - 1 ? (
                  <button
                    type="button"
                    className={cn(homeCtaDefault, "mt-7")}
                    onClick={() => setActiveStepKey(PROCESS_STEPS[currentStepIndex + 1].key)}
                  >
                    다음 단계 보기
                  </button>
                ) : (
                  <Link className={cn(homeCtaDefault, "mt-7")} href="/services/apply">
                    교체서비스 신청하기
                  </Link>
                )}
              </div>
              <div className={styles.stepVisual}>
                <div
                  className={styles.formMock}
                  role="img"
                  aria-label="교체서비스 신청 화면 미리보기"
                >
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <strong className="font-medium">{currentStep.mockTitle}</strong>
                    <span className="text-ui-label text-muted-foreground">진행 예시</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-highlight"
                      style={{ width: currentStep.progress }}
                    />
                  </div>
                  <h4 className="mt-6 break-keep text-ui-section-title font-medium text-foreground">
                    {currentStep.question}
                  </h4>
                  <div className="mt-4 grid gap-2">
                    {currentStep.options.map((option, idx) => (
                      <div
                        key={option}
                        className={cn(
                          "flex items-center justify-between rounded-control border px-4 py-3",
                          idx === 0
                            ? "border-surface-inverse bg-surface-inverse text-surface-inverse-foreground"
                            : "border-border bg-card text-foreground",
                        )}
                      >
                        <span>{option}</span>
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full",
                            idx === 0 ? "bg-brand-highlight" : "bg-muted",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-control bg-brand-highlight px-4 py-3 text-center font-medium text-brand-highlight-foreground">
                    {currentStep.cta}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.trustSection}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.trustLayout}>
            <div>
              <span className="rounded-full bg-brand-highlight px-3 py-1.5 text-ui-label font-medium text-brand-highlight-foreground">
                도깨비테니스 교체서비스
              </span>
              <h2 className={cn(styles.marketingTitle, "mt-5 text-ui-page-title leading-tight")}>
                신청부터 장착 완료까지, 진행 과정을 한눈에 확인하세요.
              </h2>
              <p className="mt-5 break-keep text-ui-body leading-relaxed text-surface-inverse-muted">
                스트링 선택부터 수령 안내까지 교체 과정에 필요한 내용을 단계별로 확인할 수 있어요.
              </p>
            </div>
            <div className={styles.trustMatrix}>
              {[
                ["신청 내용 확인", "라켓, 스트링, 텐션과 접수 방법을 신청 전에 한 번 더 확인해요."],
                [
                  "필요한 항목만 선택",
                  "직접 선택과 추천 중 내게 필요한 방법으로 시작할 수 있어요.",
                ],
                ["작업 과정 안내", "라켓 접수부터 장착 완료까지 진행 과정을 확인할 수 있어요."],
                ["교체 이력 관리", "완료된 교체 내역은 라켓 케어에서 이어서 관리할 수 있어요."],
              ].map(([title, copy], idx) => (
                <div
                  key={title}
                  className="border-b border-surface-inverse-foreground/15 p-6 last:border-b-0 bp-sm:border-r bp-sm:even:border-r-0 bp-sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <b className="font-medium text-brand-highlight-ink">0{idx + 1}</b>
                  <h3 className="mt-3 text-ui-card-title-lg font-medium">{title}</h3>
                  <p className="mt-2 break-keep text-ui-body-sm leading-relaxed text-surface-inverse-muted">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SiteContainer>
      </section>

      <section ref={stringsSectionRef} className={styles.section} id="strings">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="04"
            eyebrow="플레이 목적별 추천"
            title="플레이 스타일에 맞는 스트링을 찾아보세요."
            description="편안함, 스핀, 컨트롤, 내구성 중 원하는 기준을 선택하면 관련 스트링을 먼저 보여드려요."
          />
          <div className={styles.recoLayout}>
            <div className={styles.purposeList}>
              {PURPOSES.map((purpose) => (
                <button
                  key={purpose.key}
                  type="button"
                  aria-pressed={activePurpose === purpose.key}
                  onClick={() => setActivePurpose(purpose.key)}
                  className={cn(
                    "flex min-w-40 items-center justify-between rounded-control border px-4 py-4 text-left font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                    activePurpose === purpose.key
                      ? "border-surface-inverse bg-surface-inverse text-surface-inverse-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted/30",
                  )}
                >
                  <span>{purpose.title}</span>
                  <span
                    className={
                      activePurpose === purpose.key
                        ? "text-brand-highlight"
                        : "text-muted-foreground"
                    }
                  >
                    {purpose.no}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.recoPanel}>
              <div className={styles.recoImageWrap}>
                <Image
                  src="/images/home/home-string-product-showcase.webp"
                  alt="테니스 스트링 상품 쇼케이스"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1199px) 100vw, 920px"
                />
              </div>
              <div className={styles.recoContent}>
                <h3
                  className={cn(styles.marketingTitle, "text-ui-section-title-lg text-foreground")}
                >
                  {activePurposeInfo.title}
                </h3>
                <p className="mt-2 break-keep text-ui-body text-muted-foreground">
                  {activePurposeInfo.desc}
                </p>
                <div className="mt-5 flex max-w-full items-center gap-2 overflow-hidden">
                  <button
                    type="button"
                    aria-label="이전 브랜드 보기"
                    aria-controls={STRING_BRAND_RAIL_ID}
                    disabled={!stringBrandRailState.canScrollPrev}
                    onClick={() => scrollStringBrandRail(-1)}
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground transition-[background-color,color,border-color,opacity] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-40 bp-sm:inline-flex"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <div
                      id={STRING_BRAND_RAIL_ID}
                      className={brandRailClass}
                      ref={stringBrandRailRef}
                    >
                      <button
                        type="button"
                        data-string-brand="all"
                        aria-pressed={activeStringBrand === "all"}
                        onClick={() => setActiveStringBrand("all")}
                        className={getBrandTabClass(activeStringBrand === "all")}
                      >
                        전체
                      </button>
                      {STRING_BRANDS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          data-string-brand={b.value}
                          aria-pressed={activeStringBrand === b.value}
                          onClick={() => setActiveStringBrand(b.value as StringBrandKey)}
                          className={getBrandTabClass(activeStringBrand === b.value)}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    {stringBrandRailState.hasOverflow && stringBrandRailState.canScrollPrev && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent" />
                    )}
                    {stringBrandRailState.hasOverflow && stringBrandRailState.canScrollNext && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="다음 브랜드 보기"
                    aria-controls={STRING_BRAND_RAIL_ID}
                    disabled={!stringBrandRailState.canScrollNext}
                    onClick={() => scrollStringBrandRail(1)}
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground transition-[background-color,color,border-color,opacity] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-40 bp-sm:inline-flex"
                  >
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <HorizontalProducts
                  title={activePurposeInfo.title}
                  subtitle={activePurposeInfo.desc}
                  items={premiumItems}
                  moreHref={recommendationMoreHref}
                  variant="home"
                  showHeader={false}
                  showMoreCard={true}
                  loading={stringProductsLoading}
                  error={stringProductsError}
                  onRetry={retryStringProducts}
                  emptyTitle="추천할 스트링이 없습니다"
                  emptyDescription="다른 플레이 기준이나 브랜드를 선택해보세요."
                  errorTitle="스트링을 불러오지 못했어요"
                  errorDescription="잠시 후 다시 시도해 주세요."
                />
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.section} id="packages">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="05"
            eyebrow="패키지 비교"
            title="스트링을 자주 교체한다면 패키지로 편리하게 이용하세요."
            description={
              <>
                이용 횟수와 가격, 회당 금액과 절감 혜택을
                <br />
                한눈에 비교해보세요.
              </>
            }
          />
          <div className={styles.packages}>
            <div className={styles.packageIntro}>
              <h3 className={cn(styles.marketingTitle, "text-ui-section-title-lg")}>
                필요한 횟수에 맞춰 패키지를 선택하세요.
              </h3>
              <p className="mt-4 break-keep text-ui-body leading-relaxed">
                교체 횟수와 가격을 비교해 내게 맞는 패키지를 선택할 수 있어요.
              </p>
              <Link className={cn(homeCtaDefault, "mt-6")} href="/services/packages">
                패키지 자세히 보기
              </Link>
            </div>
            <div className={styles.packageTable}>
              {packagesError ? (
                <div className="space-y-4 p-6 text-ui-body text-muted-foreground">
                  <div>
                    <strong className="block text-ui-card-title font-medium text-foreground">
                      패키지 정보를 불러오지 못했어요.
                    </strong>
                    <p className="mt-2">
                      잠시 후 다시 시도하거나 전체 패키지 안내에서 확인해 주세요.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={homeCtaOutline} type="button" onClick={fetchHomePackages}>
                      다시 시도
                    </button>
                    <Link className={homeCtaOutline} href="/services/packages">
                      패키지 전체 보기
                    </Link>
                  </div>
                </div>
              ) : homePackages.length > 0 ? (
                homePackages.map((pkg) => <PackageRow key={pkg.id} pkg={pkg} />)
              ) : (
                <div className="p-6 text-ui-body text-muted-foreground">
                  {packagesLoading
                    ? "패키지 정보를 불러오는 중입니다."
                    : "현재 표시할 패키지가 없습니다. 패키지 전체 안내에서 이용 가능 여부를 확인해 주세요."}
                </div>
              )}
            </div>
          </div>
        </SiteContainer>
      </section>

      <section ref={racketsSectionRef} className={styles.section} id="rackets">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="06"
            eyebrow="도깨비 인증 중고 라켓"
            title={
              <>
                검수된 중고 라켓을
                <br />
                한눈에 살펴보세요.
              </>
            }
            description={
              <>
                실제 등록된 라켓의 상태, 가격과 대여 가능 여부를
                <br />
                카드별로 비교하며 확인할 수 있어요.
              </>
            }
          />
          <div className={brandRailClass} ref={racketBrandRailRef}>
            <button
              type="button"
              aria-pressed={activeBrand === "all"}
              onClick={() => setActiveBrand("all")}
              className={getBrandTabClass(activeBrand === "all")}
            >
              전체
            </button>
            {RACKET_BRANDS.map((b) => (
              <button
                key={b.value}
                type="button"
                aria-pressed={activeBrand === b.value}
                onClick={() => setActiveBrand(b.value as BrandKey)}
                className={getBrandTabClass(activeBrand === b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className={styles.racketShow}>
            {carouselRackets.length > 0 ? (
              <HomeRacketCarousel
                activeBrand={activeBrand}
                rackets={carouselRackets}
                total={racketTotal}
              />
            ) : usedRacketsError ? (
              <EmptyPanel
                title="중고 라켓을 불러오지 못했어요"
                action={usedRacketsError ? () => loadUsedRackets(activeBrand, { force: true }) : undefined}
              />
            ) : usedRacketsLoading || !shouldLoadRackets ? (
              <RacketCarouselSkeleton />
            ) : (
              <div className={styles.racketEmpty}>
                <div className={styles.racketEmptyCopy}>
                  <h3
                    className={cn(
                      styles.marketingTitle,
                      "text-ui-section-title-lg text-foreground",
                    )}
                  >
                    검수된 중고 라켓을 준비 중입니다.
                  </h3>
                  <p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">
                    {activeBrand === "all"
                      ? "현재 준비된 중고 라켓이 없습니다."
                      : `현재 ${racketBrandLabel(activeBrand)} 중고 라켓이 없습니다.`}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {activeBrand !== "all" && (
                      <button
                        type="button"
                        className={homeCtaOutline}
                        onClick={() => setActiveBrand("all")}
                      >
                        전체 브랜드 보기
                      </button>
                    )}
                    <Link className={homeCtaHighlight} href="/rackets">
                      중고 라켓 목록 보기
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SiteContainer>
      </section>

      <section ref={communitySectionRef} className={styles.section} id="info">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="07"
            eyebrow="이용 안내"
            title="접수 방법과 필요한 안내를 한곳에서 확인하세요."
            description="공지사항과 이용 메뉴를 확인하고, 교체 후에는 라켓 케어로 이어갈 수 있습니다."
          />
          <div className={styles.infoGrid}>
            {shouldLoadCommunity ? (
              <HomeNoticePreview initialItems={initialHomeData?.notices} />
            ) : (
              <div className="h-[260px] animate-pulse rounded-panel border border-border bg-muted" />
            )}
            <div className={styles.utilityGrid}>
              {[
                [
                  "방문·택배 접수 방법",
                  "접수 전 준비사항과 진행 절차를 확인합니다.",
                  "/services/apply",
                ],
                ["비용 기준 확인", "장착비와 서비스 비용을 안내합니다.", "/services/pricing"],
                ["영업시간·매장 위치", "운영시간과 위치를 확인합니다.", "/services/locations"],
                ["문의하기", "Q&A로 궁금한 점을 남깁니다.", "/board/qna"],
                ["이용 후기", "실제 교체 경험을 확인합니다.", "/reviews"],
              ].map(([title, desc, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-panel border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <strong className="block text-ui-card-title font-medium text-foreground">
                    {title}
                  </strong>
                  <span className="mt-2 block break-keep text-ui-body-sm font-normal leading-relaxed text-muted-foreground">
                    {desc}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.careBanner}>
            <div>
              <p className="text-ui-label font-medium text-muted-foreground">교체 후 관리</p>
              <h3
                className={cn(
                  styles.marketingTitle,
                  "mt-2 text-ui-section-title-lg text-foreground",
                )}
              >
                교체 이력은 라켓 케어에서 이어서 관리하세요.
              </h3>
              <p className="mt-2 break-keep text-ui-body text-muted-foreground">
                완료된 교체 이력을 저장하면 다음 교체 시기와 라켓 상태를 확인할 수 있어요.
              </p>
            </div>
            <Link className={homeCtaOutline} href="/racket-care">
              라켓 케어 알아보기
            </Link>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}

const PURPOSE_PRODUCT_QUERY: Record<PurposeKey, string> = {
  comfort: "comfort=80",
  spin: "spin=80",
  control: "control=80",
  durability: "durability=80",
  beginner: "comfort=70&control=70",
};

function getPurposeProductHref(purpose: PurposeKey, brand: StringBrandKey) {
  const params = new URLSearchParams(PURPOSE_PRODUCT_QUERY[purpose]);

  if (brand !== "all") {
    params.set("brand", brand);
  }

  return `/products?${params.toString()}#product-list`;
}

function getPurposeScore(features: ApiProduct["features"], purpose: PurposeKey) {
  switch (purpose) {
    case "comfort":
      return Number(features?.comfort ?? 0);
    case "spin":
      return Number(features?.spin ?? 0);
    case "control":
      return Number(features?.control ?? 0);
    case "durability":
      return Number(features?.durability ?? 0);
    case "beginner":
      return Number(features?.comfort ?? 0) + Number(features?.control ?? 0);
    default:
      return 0;
  }
}

function PlanCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-surface-inverse-foreground/15 bg-card/10 p-3">
      <span className="block text-ui-caption text-surface-inverse-muted">{label}</span>
      <strong className="mt-1 block text-ui-body-sm font-medium text-surface-inverse-foreground">
        {value}
      </strong>
    </div>
  );
}

function CheckLine({ children, inverse = false }: { children: string; inverse?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-ui-body-sm font-medium",
        inverse ? "text-brand-highlight-foreground" : "text-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          inverse
            ? "bg-surface-inverse text-surface-inverse-foreground"
            : "bg-brand-highlight text-brand-highlight-foreground",
        )}
      >
        <Check aria-hidden="true" className="h-3 w-3" />
      </span>
      {children}
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-surface-inverse-foreground/15 py-4">
      <span className="text-ui-body-sm text-surface-inverse-muted">{label}</span>
      <strong className="text-right text-ui-body-sm font-medium text-surface-inverse-foreground">
        {value}
      </strong>
    </div>
  );
}

function PackageRow({ pkg }: { pkg: HomePreviewPackage }) {
  const perSession = pkg.sessions > 0 ? Math.round(pkg.price / pkg.sessions) : null;
  const savings = pkg.originalPrice > pkg.price ? pkg.originalPrice - pkg.price : 0;
  return (
    <div className={cn(styles.packageRow, pkg.isPopular && styles.packageRowPopular)}>
      <div className={styles.packageSessions}>
        <b className="text-ui-section-title font-semibold text-foreground">{pkg.sessions}회</b>
        {pkg.isPopular && (
          <span className="ml-2 rounded-full bg-brand-highlight px-2 py-1 text-ui-caption font-medium text-brand-highlight-foreground">
            추천
          </span>
        )}
      </div>
      <div className={styles.packageMeta}>
        <strong className="block text-ui-card-title font-medium text-foreground">{pkg.name}</strong>
        <span className={styles.packageDescription}>{pkg.description}</span>
      </div>
      <div className={styles.packagePrice}>
        <strong className="block text-ui-card-title font-semibold text-foreground">
          {formatPrice(pkg.price)}
        </strong>
        <span className={styles.packagePriceSub}>
          {perSession ? `회당 ${formatPrice(perSession)}` : "회당 금액 확인 필요"}
          {savings > 0 ? ` · ${formatPrice(savings)} 절감` : ""}
        </span>
      </div>
      <Link
        className={cn(homeCtaOutline, styles.packageAction)}
        href={`/services/packages/checkout?package=${pkg.id}`}
      >
        이 패키지 보기
      </Link>
    </div>
  );
}

function RacketCarouselSkeleton() {
  return (
    <div className={styles.racketCarousel} aria-label="중고 라켓을 확인하고 있어요">
      <div className={styles.racketSkeletonGrid}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.racketSkeletonCard} />
        ))}
      </div>
    </div>
  );
}

function HomeRacketCarousel({
  activeBrand,
  rackets,
  total,
}: {
  activeBrand: BrandKey;
  rackets: RItem[];
  total: number;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const moreHref =
    activeBrand === "all" ? "/rackets" : `/rackets?brand=${encodeURIComponent(activeBrand)}`;
  const remainingCount = Math.max(0, total - rackets.length);
  const hasMore = remainingCount > 0;
  const moreTitle = hasMore
    ? "더 많은 중고 라켓"
    : activeBrand === "all"
      ? "전체 중고 라켓"
      : `${racketBrandLabel(activeBrand)} 중고 라켓`;
  const moreDescription = hasMore ? "목록에서 전체 보기" : "목록에서 자세히 보기";
  const itemCount = rackets.length + 1;
  const shouldCenter = itemCount <= 2;

  const updateScrollState = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCanScrollPrev(carouselApi.canScrollPrev());
    setCanScrollNext(carouselApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;
    updateScrollState(api);
    api.on("select", updateScrollState);
    api.on("reInit", updateScrollState);
    return () => {
      api.off("select", updateScrollState);
      api.off("reInit", updateScrollState);
    };
  }, [api, updateScrollState]);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(0, true);
    api.reInit();
    updateScrollState(api);
  }, [activeBrand, api, rackets.length, updateScrollState]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: shouldCenter ? "center" : "start", dragFree: false, containScroll: "trimSnaps" }}
      className={styles.racketCarousel}
      aria-label="도깨비 인증 중고 라켓 목록"
    >
      <CarouselContent className={cn(styles.racketCarouselTrack, shouldCenter && styles.racketCarouselTrackCentered)}>
        {rackets.map((racket) => (
          <CarouselItem key={racket.id} className={styles.racketCarouselItem}>
            <RacketPreviewCard racket={racket} />
          </CarouselItem>
        ))}
        <CarouselItem className={styles.racketCarouselItem}>
          <Link href={moreHref} className={cn(styles.racketCard, styles.racketMoreCard)}>
            <div className={styles.racketMoreCardBody}>
              <span className={styles.racketMoreCardKicker}>중고 라켓 목록</span>
              <strong className={styles.racketMoreCardTitle}>{moreTitle}</strong>
              <span className={styles.racketMoreCardDescription}>{moreDescription}</span>
              {hasMore && (
                <span className={styles.racketMoreCardCount}>{remainingCount}개 더 보기</span>
              )}
              <span className={styles.racketMoreCardIcon} aria-hidden="true">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </Link>
        </CarouselItem>
      </CarouselContent>
      {(canScrollPrev || canScrollNext) && (
        <div className={styles.racketCarouselControls}>
          <button
            type="button"
            className={styles.racketCarouselControl}
            onClick={() => api?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="이전 중고 라켓 보기"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.racketCarouselControl}
            onClick={() => api?.scrollNext()}
            disabled={!canScrollNext}
            aria-label="다음 중고 라켓 보기"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </Carousel>
  );
}

function RacketPreviewCard({ racket }: { racket: RItem }) {
  const effectivePrice = getEffectiveRacketPrice(racket);
  const discountRate = getRacketDiscountRate(racket);
  const conditionMeta = racket.condition ? usedBadgeMeta("condition", racket.condition) : null;
  const rentalFee = Number(racket.rental?.fee?.d7);
  const rentalLabel =
    racket.status === "sold"
      ? "판매 완료"
      : racket.status === "rented"
        ? "현재 대여 중"
        : racket.rental?.enabled && Number.isFinite(rentalFee) && rentalFee > 0
          ? `7일 대여료 ${formatPrice(rentalFee)}`
          : racket.rental?.enabled
            ? "대여 옵션 있음"
            : "판매 상품";
  const brandLabel = racketBrandLabel(racket.brand);
  const imageAlt = `${brandLabel} ${racket.model}`.trim();
  const showConditionBadge = !racket.marketing?.isFeatured || !racket.marketing?.isNew;

  return (
    <Link href={`/rackets/${racket.id}`} className={styles.racketCard}>
      <div className={styles.racketCardImage}>
        <Image
          src={getImageSrc(racket.images)}
          alt={imageAlt || "중고 라켓 상품 이미지"}
          fill
          className="object-contain"
          sizes="(max-width: 767px) 112px, (max-width: 1199px) 42vw, 28vw"
        />
      </div>
      <div className={styles.racketCardBody}>
        <div className={styles.racketCardBadges}>
          {racket.marketing?.isFeatured && (
            <Badge variant={badgeToneVariant("brand")} shape="pill">
              추천
            </Badge>
          )}
          {racket.marketing?.isNew && (
            <Badge variant={badgeToneVariant("info")} shape="pill">
              NEW
            </Badge>
          )}
          {conditionMeta && showConditionBadge && (
            <Badge variant={badgeToneVariant(conditionMeta.tone)} shape="pill">
              {racket.condition}급
            </Badge>
          )}
        </div>
        <p className={styles.racketCardBrand}>{brandLabel}</p>
        <h3 className={styles.racketCardModel}>{racket.model}</h3>
        <div className={styles.racketCardMeta}>
          <p className={styles.racketCardPrice}>{formatPrice(effectivePrice)}</p>
          {discountRate > 0 && (
            <span className={styles.racketCardDiscount}>{discountRate}% 할인</span>
          )}
        </div>
        <p className={styles.racketCardRental}>{rentalLabel}</p>
      </div>
    </Link>
  );
}

function EmptyPanel({ title, action }: { title: string; action?: () => void }) {
  return (
    <div className="rounded-panel border border-border bg-card p-6 text-center">
      <p className="break-keep text-ui-card-title font-medium text-foreground">{title}</p>
      {action && (
        <button type="button" className={cn(homeCtaOutline, "mt-4")} onClick={action}>
          다시 시도
        </button>
      )}
    </div>
  );
}
