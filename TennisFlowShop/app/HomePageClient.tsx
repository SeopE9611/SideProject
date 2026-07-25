"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import HorizontalProducts from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { badgeToneVariant, usedBadgeMeta } from "@/lib/badge-style";
import { RACKET_BRANDS, racketBrandLabel, stringBrandLabel } from "@/lib/constants";
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
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShoppingBag,
  Wrench,
} from "lucide-react";
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

type BrandRailState = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  hasOverflow: boolean;
};

const BRAND_RAIL_SCROLL_EPSILON = 2;
const RACKET_BRAND_RAIL_ID = "home-racket-brand-rail";
const BRAND_RAIL_EDGE_PADDING = 40;

type PromoBanner = {
  key: string;
  label: string;
  img?: string;
  alt?: string;
  href?: string;
};

const HOME_QUICK_LINKS = [
  {
    href: "/products",
    title: "스트링 쇼핑",
    description: "추천·인기 상품",
    icon: ShoppingBag,
  },
  {
    href: "/services#service-start",
    title: "교체서비스",
    description: "직접 선택·상담",
    icon: Wrench,
  },
  {
    href: "/rackets",
    title: "인증 중고 라켓",
    description: "구매·대여 재고",
    icon: BadgeCheck,
  },
  {
    href: "/academy",
    title: "테니스 아카데미",
    description: "레슨·클래스",
    icon: GraduationCap,
  },
] as const;

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
    description: "직접 선택, 추천, 보유 스트링 중 지금 가장 편한 방식으로 시작합니다.",
  },
  {
    key: "receive",
    no: "02",
    tab: "라켓 접수",
    description: "매장 방문과 택배 접수 중 가능한 방법을 고르고 안내를 확인합니다.",
  },
  {
    key: "stringing",
    no: "03",
    tab: "전문 장착",
    description: "스트링과 텐션 정보를 확인한 뒤 작업 상태를 안내합니다.",
  },
  {
    key: "care",
    no: "04",
    tab: "수령 및 관리",
    description: "수령 후 교체 이력을 라켓 케어에서 이어서 관리할 수 있습니다.",
  },
] as const;

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

const racketBrandRailClass =
  "relative flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const getRacketBrandTabClass = (isActive: boolean) =>
  cn(
    "min-h-9 shrink-0 whitespace-nowrap rounded-control border px-3.5 py-2 text-ui-label font-medium transition-[background-color,color,border-color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
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
  const [racketBrandRailState, setRacketBrandRailState] = useState<BrandRailState>({
    canScrollPrev: false,
    canScrollNext: false,
    hasOverflow: false,
  });
  const [activeApplicationPath, setActiveApplicationPath] = useState<ApplicationPathKey>("consult");
  const [activePurpose, setActivePurpose] = useState<PurposeKey>("comfort");
  const router = useRouter();
  const racketBrandRailRef = useRef<HTMLDivElement>(null);

  const getNextBrandRailState = useCallback((rail: HTMLDivElement): BrandRailState => {
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    return {
      canScrollPrev: rail.scrollLeft > BRAND_RAIL_SCROLL_EPSILON,
      canScrollNext: rail.scrollLeft < maxScrollLeft - BRAND_RAIL_SCROLL_EPSILON,
      hasOverflow: maxScrollLeft > BRAND_RAIL_SCROLL_EPSILON,
    };
  }, []);

  const updateRacketBrandRailState = useCallback(() => {
    const rail = racketBrandRailRef.current;
    if (!rail) return;
    const nextState = getNextBrandRailState(rail);

    setRacketBrandRailState((prev) =>
      prev.canScrollPrev === nextState.canScrollPrev &&
      prev.canScrollNext === nextState.canScrollNext &&
      prev.hasOverflow === nextState.hasOverflow
        ? prev
        : nextState,
    );
  }, [getNextBrandRailState]);

  const scrollBrandRail = useCallback(
    (railRef: { current: HTMLDivElement | null }, direction: -1 | 1) => {
      const rail = railRef.current;
      if (!rail) return;

      const distance = Math.max(180, rail.clientWidth * 0.7) * direction;
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rail.scrollBy({ left: distance, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [],
  );

  useEffect(() => {
    const rails = [racketBrandRailRef.current].filter((rail): rail is HTMLDivElement =>
      Boolean(rail),
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
    const rails = [{ rail: racketBrandRailRef.current, update: updateRacketBrandRailState }].filter(
      (item): item is { rail: HTMLDivElement; update: () => void } => Boolean(item.rail),
    );
    if (rails.length === 0) return;

    rails.forEach(({ rail, update }) => {
      update();
      rail.addEventListener("scroll", update, { passive: true });
    });
    const handleResize = () => rails.forEach(({ update }) => update());
    window.addEventListener("resize", handleResize);

    const resizeObserver =
      "ResizeObserver" in window
        ? new ResizeObserver(() => rails.forEach(({ update }) => update()))
        : null;
    rails.forEach(({ rail }) => resizeObserver?.observe(rail));

    return () => {
      rails.forEach(({ rail, update }) => rail.removeEventListener("scroll", update));
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [updateRacketBrandRailState]);

  useEffect(() => {
    const rail = racketBrandRailRef.current;
    if (!rail) return;
    const activeButton = rail.querySelector<HTMLButtonElement>(
      `[data-racket-brand="${activeBrand}"]`,
    );
    if (!activeButton) return;

    const railStart = rail.scrollLeft;
    const railEnd = railStart + rail.clientWidth;
    const buttonStart = activeButton.offsetLeft;
    const buttonEnd = buttonStart + activeButton.offsetWidth;
    const edgePadding = BRAND_RAIL_EDGE_PADDING;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    if (buttonStart < railStart + edgePadding) {
      rail.scrollTo({ left: Math.max(0, buttonStart - edgePadding), behavior });
    } else if (buttonEnd > railEnd - edgePadding) {
      rail.scrollTo({ left: buttonEnd - rail.clientWidth + edgePadding, behavior });
    }
  }, [activeBrand]);

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

    const url = new URL(window.location.href);
    const rb = url.searchParams.get("racketBrand") as BrandKey | null;

    if (rb && BRAND_KEYS.includes(rb)) {
      setActiveBrand(rb);
    }

    if (url.searchParams.has("stringBrand")) {
      url.searchParams.delete("stringBrand");
      window.history.replaceState(null, "", url.toString());
    }
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("racketBrand", activeBrand);
    url.searchParams.delete("stringBrand");

    window.history.replaceState(null, "", url.toString());
  }, [activeBrand]);

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

  useEffect(() => {
    if (!shouldLoadRackets) return;
    if (racketsFetchedRef.current.has(activeBrand)) return;
    racketsFetchedRef.current.add(activeBrand);
    void loadUsedRackets(activeBrand);
  }, [activeBrand, loadUsedRackets, shouldLoadRackets]);

  const sortedProductsByPurpose = useMemo(() => {
    return allProducts
      .map((product, index) => {
        const features = product.features;
        const score = getPurposeScore(features, activePurpose);

        return {
          product,
          index,
          score,
        };
      })
      .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
      .map(({ product }) => product);
  }, [activePurpose, allProducts]);

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
  const visibleRackets = usedRacketsSource.slice(0, 3);

  const usedRacketsLoading = Boolean(racketsLoadingByBrand[activeBrand]);
  const usedRacketsError = Boolean(racketsErrorByBrand[activeBrand]);
  const racketTotal = racketTotalsByBrand[activeBrand] ?? usedRacketsSource.length;
  const currentPath = APPLICATION_PATHS[activeApplicationPath];
  const activePurposeInfo =
    PURPOSES.find((purpose) => purpose.key === activePurpose) ?? PURPOSES[0];
  const recommendationMoreHref = useMemo(
    () => getPurposeProductHref(activePurpose),
    [activePurpose],
  );

  const stringProductsLoading = !shouldLoadStrings || loading;
  const stringProductsError = productsError;

  const retryStringProducts = () => {
    void fetchHomeProducts();
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
                  스트링 교체 전문점
                </span>

                <h1 className={styles.heroTitle}>
                  스트링 선택부터
                  <span className={styles.heroTitleSecondLine}>장착까지 한 번에</span>
                </h1>

                <p className="mt-5 max-w-2xl break-keep text-ui-body leading-relaxed text-surface-inverse-muted bp-sm:text-ui-body-lg">
                  상품을 고르는 순간부터 장착 완료까지 한 흐름으로 연결합니다. 직접 선택이 어렵다면
                  플레이 성향에 맞춰 추천받을 수 있어요.
                </p>

                <div className="mt-7 grid gap-2 bp-sm:flex bp-sm:flex-wrap">
                  <Link className={homeCtaHighlight} href="/products">
                    추천 스트링 보기
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>

                  <Link className={homeCtaDefault} href="/services#service-start">
                    교체서비스 신청
                  </Link>
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
              </div>
            </div>
          </div>
          <nav className={styles.quickNav} aria-label="주요 서비스 바로가기">
            {HOME_QUICK_LINKS.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className={styles.quickNavItem}>
                  <span className={styles.quickNavCopy}>
                    <strong className={styles.quickNavTitle}>{item.title}</strong>
                    <span className={styles.quickNavDescription}>{item.description}</span>
                  </span>

                  <span className={styles.quickNavIcon} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </nav>
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

      <section
        ref={stringsSectionRef}
        className={cn(styles.section, styles.stringSection)}
        id="strings"
      >
        <SiteContainer variant="wide" className={styles.wrap}>
          <header className={styles.stringSectionHeader}>
            <div>
              <p className={styles.stringSectionEyebrow}>01 · STRING CURATION</p>

              <h2 className={styles.stringSectionTitle}>플레이 스타일별 추천 스트링</h2>

              <p className={styles.stringSectionDescription}>
                복잡한 브랜드 필터 대신 원하는 플레이 기준을 선택하고 실제 상품부터 확인하세요.
              </p>
            </div>

            <Link className={cn(homeCtaOutline, styles.stringSectionMore)} href="/products">
              전체 스트링 보기
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </header>

          <div className={styles.purposeTabs} role="tablist" aria-label="스트링 추천 기준">
            {PURPOSES.map((purpose) => {
              const active = activePurpose === purpose.key;

              return (
                <button
                  key={purpose.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="home-string-curation-products"
                  onClick={() => setActivePurpose(purpose.key)}
                  className={cn(styles.purposeTab, active && styles.purposeTabActive)}
                >
                  {purpose.title}
                </button>
              );
            })}
          </div>

          <div className={styles.stringCuration}>
            <article className={styles.curationVisual}>
              <Image
                src="/images/home/home-string-product-showcase.webp"
                alt="테니스 스트링 상품 큐레이션"
                fill
                className="object-cover"
                sizes="(max-width: 767px) calc(100vw - 24px), (max-width: 1199px) calc(100vw - 48px), 420px"
              />

              <div className={styles.curationVisualOverlay} aria-hidden="true" />

              <div className={styles.curationVisualCopy}>
                <p className={styles.curationVisualKicker}>PLAY STYLE {activePurposeInfo.no}</p>

                <h3 className={styles.curationVisualTitle}>{activePurposeInfo.title}</h3>

                <p className={styles.curationVisualDescription}>{activePurposeInfo.desc}</p>

                <Link className={styles.curationVisualLink} href={recommendationMoreHref}>
                  이 기준 상품 더 보기
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>

            <div
              id="home-string-curation-products"
              className={styles.curationProducts}
              role="tabpanel"
              aria-live="polite"
            >
              <div className={styles.curationProductsHeader}>
                <div>
                  <p className={styles.curationProductsEyebrow}>추천 상품</p>

                  <h3 className={styles.curationProductsTitle}>
                    {activePurposeInfo.title} 기준으로 먼저 볼 상품
                  </h3>
                </div>
              </div>

              <HorizontalProducts
                title={activePurposeInfo.title}
                subtitle={activePurposeInfo.desc}
                items={premiumItems}
                moreHref={recommendationMoreHref}
                variant="home"
                showHeader={false}
                showMoreCard={false}
                loading={stringProductsLoading}
                error={stringProductsError}
                onRetry={retryStringProducts}
                emptyTitle="추천할 스트링이 없습니다"
                emptyDescription="다른 플레이 기준을 선택해보세요."
                errorTitle="스트링을 불러오지 못했어요"
                errorDescription="잠시 후 다시 시도해 주세요."
              />
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.stringingServiceSection} id="paths">
        <SiteContainer variant="wide" className={styles.wrap}>
          <header className={styles.stringingServiceHeader}>
            <div>
              <p className={styles.stringingServiceEyebrow}>02 · STRINGING SERVICE</p>
              <h2 className={styles.stringingServiceTitle}>
                신청 방법부터 수령까지,
                <span>한곳에서 확인하세요.</span>
              </h2>
            </div>
            <p className={styles.stringingServiceDescription}>
              직접 선택, 추천, 보유 스트링 중 편한 방법으로 시작하고
              <br />
              방문 또는 택배로 라켓을 맡길 수 있어요.
            </p>
          </header>

          <div className={styles.stringingServiceGrid}>
            <div className={styles.applicationPathColumn}>
              <div className={styles.applicationPathHeading}>
                <h3>어떻게 시작할까요?</h3>
                <p>현재 상황에 가장 가까운 방법을 선택하세요.</p>
              </div>
              <div className={styles.applicationPathTabs} role="tablist">
                {(Object.keys(APPLICATION_PATHS) as ApplicationPathKey[]).map((key) => {
                  const path = APPLICATION_PATHS[key];
                  const active = activeApplicationPath === key;
                  return (
                    <button
                      key={key}
                      id={`application-path-tab-${key}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls="application-path-panel"
                      onClick={() => setActiveApplicationPath(key)}
                      className={cn(
                        styles.applicationPathTab,
                        active && styles.applicationPathTabActive,
                      )}
                    >
                      <span>{path.no}</span>
                      {path.label}
                    </button>
                  );
                })}
              </div>

              <div
                id="application-path-panel"
                className={styles.applicationPathPanel}
                role="tabpanel"
                aria-labelledby={`application-path-tab-${activeApplicationPath}`}
              >
                <span className={styles.applicationPathLabel}>{currentPath.label}</span>
                <h3>{currentPath.detailTitle}</h3>
                <p>{currentPath.detailDescription}</p>
                <div className={styles.applicationPathChecks}>
                  {currentPath.checks.map((check) => (
                    <CheckLine key={check} inverse>
                      {check}
                    </CheckLine>
                  ))}
                </div>
                <Link
                  className={cn(homeCtaHighlight, styles.applicationPathCta)}
                  href={currentPath.href}
                >
                  {currentPath.cta}
                </Link>
              </div>
            </div>

            <div className={styles.serviceProcessColumn} id="process">
              <div className={styles.serviceProcessHeading}>
                <h3>교체는 이렇게 진행돼요.</h3>
                <p>신청부터 수령까지 네 단계로 진행됩니다.</p>
              </div>
              <ol className={styles.serviceProcessList}>
                {PROCESS_STEPS.map((step) => {
                  return (
                    <li key={step.key} className={styles.serviceProcessItem}>
                      <span className={styles.serviceProcessNumber}>{step.no}</span>
                      <div className={styles.serviceProcessCopy}>
                        <h3>{step.tab}</h3>
                        <p>{step.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Link className={cn(homeCtaDefault, styles.serviceProcessLink)} href="/services">
                교체서비스 전체 안내 보기
              </Link>
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.section} id="packages">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="03"
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
            <div className={styles.packageToolbar}>
              <p className="break-keep text-ui-body-sm text-muted-foreground">
                아래에서 횟수와 가격을 비교하고, 전체 안내에서 이용 조건을 확인하세요.
              </p>

              <Link
                className={cn(homeCtaOutline, styles.packageToolbarAction)}
                href="/services/packages"
              >
                패키지 전체 보기
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
            no="04"
            eyebrow="도깨비 인증 중고 라켓"
            title="도깨비에서 인증된 중고 라켓을 확인하세요."
            description="상태와 대여 가능 여부를 비교하고 전체 목록에서 더 많은 라켓을 확인할 수 있어요."
          />
          <div className={styles.racketShowcase}>
            <div className={styles.racketInventoryPanel}>
              <div className={styles.racketInventoryHeader}>
                <div>
                  <p className={styles.racketInventoryKicker}>최근 등록 라켓</p>
                  <h3 className={styles.racketInventoryTitle}>
                    {activeBrand === "all" ? "전체 브랜드" : racketBrandLabel(activeBrand)}
                  </h3>
                </div>
                <p className={styles.racketInventoryCount}>
                  {racketTotal > 0 ? `총 ${racketTotal}개` : "재고 확인 중"}
                </p>
              </div>
              <div className={styles.racketBrandRailWrap}>
                <button
                  type="button"
                  aria-label="이전 라켓 브랜드 보기"
                  aria-controls={RACKET_BRAND_RAIL_ID}
                  disabled={!racketBrandRailState.canScrollPrev}
                  onClick={() => scrollBrandRail(racketBrandRailRef, -1)}
                  className={styles.racketBrandRailButton}
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <div className={styles.racketBrandRailViewport}>
                  <div
                    id={RACKET_BRAND_RAIL_ID}
                    aria-label="중고 라켓 브랜드 필터"
                    className={racketBrandRailClass}
                    ref={racketBrandRailRef}
                  >
                    <button
                      type="button"
                      data-racket-brand="all"
                      aria-pressed={activeBrand === "all"}
                      onClick={() => setActiveBrand("all")}
                      className={getRacketBrandTabClass(activeBrand === "all")}
                    >
                      전체
                    </button>
                    {RACKET_BRANDS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        data-racket-brand={b.value}
                        aria-pressed={activeBrand === b.value}
                        onClick={() => setActiveBrand(b.value as BrandKey)}
                        className={getRacketBrandTabClass(activeBrand === b.value)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  {racketBrandRailState.hasOverflow && racketBrandRailState.canScrollPrev && (
                    <div className={styles.racketBrandRailFadeLeft} aria-hidden="true" />
                  )}
                  {racketBrandRailState.hasOverflow && racketBrandRailState.canScrollNext && (
                    <div className={styles.racketBrandRailFadeRight} aria-hidden="true" />
                  )}
                </div>
                <button
                  type="button"
                  aria-label="다음 라켓 브랜드 보기"
                  aria-controls={RACKET_BRAND_RAIL_ID}
                  disabled={!racketBrandRailState.canScrollNext}
                  onClick={() => scrollBrandRail(racketBrandRailRef, 1)}
                  className={styles.racketBrandRailButton}
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              {visibleRackets.length > 0 ? (
                <RacketInventoryList
                  activeBrand={activeBrand}
                  rackets={visibleRackets}
                  total={racketTotal}
                />
              ) : usedRacketsError ? (
                <EmptyPanel
                  title="중고 라켓을 불러오지 못했어요"
                  action={
                    usedRacketsError
                      ? () => loadUsedRackets(activeBrand, { force: true })
                      : undefined
                  }
                />
              ) : usedRacketsLoading || !shouldLoadRackets ? (
                <RacketInventorySkeleton />
              ) : (
                <div className={styles.racketEmpty}>
                  <div className={styles.racketEmptyCopy}>
                    <h3 className={cn(styles.uiTitle, "text-ui-section-title-lg text-foreground")}>
                      {activeBrand === "all"
                        ? "검수된 중고 라켓을 준비 중입니다."
                        : `현재 ${racketBrandLabel(activeBrand)} 중고 라켓이 없습니다.`}
                    </h3>
                    <p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">
                      {activeBrand === "all"
                        ? "전체 목록에서 입고 소식을 확인해 주세요."
                        : "다른 브랜드의 등록 라켓을 확인해 보세요."}
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
                      <Link className={homeCtaOutline} href="/rackets">
                        중고 라켓 전체 보기
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SiteContainer>
      </section>

      <section ref={communitySectionRef} className={styles.section} id="info">
        <SiteContainer variant="wide" className={styles.wrap}>
          <HomeEditorialHeader
            no="05"
            eyebrow="이용 안내"
            title="공지와 이용 안내를 확인하세요."
            description="운영 정보와 문의 경로를 확인하고, 교체 후에는 라켓 케어로 이어갈 수 있어요."
          />
          <div className={styles.infoGrid}>
            {shouldLoadCommunity ? (
              <HomeNoticePreview initialItems={initialHomeData?.notices} />
            ) : (
              <div className="h-[240px] animate-pulse rounded-panel border border-border bg-muted" />
            )}
            <div className={styles.utilityGrid}>
              {[
                ["비용 기준 확인", "장착비와 서비스 비용을 확인하세요.", "/services/pricing"],
                ["영업시간·매장 위치", "운영시간과 방문 위치를 확인하세요.", "/services/locations"],
                ["문의하기", "Q&A로 궁금한 점을 남기세요.", "/board/qna"],
                ["라켓 케어", "교체 이력과 다음 교체 시기를 관리하세요.", "/racket-care"],
              ].map(([title, desc, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-panel border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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

function getPurposeProductHref(purpose: PurposeKey) {
  const params = new URLSearchParams(PURPOSE_PRODUCT_QUERY[purpose]);

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

function RacketInventorySkeleton() {
  return (
    <div className={styles.racketInventoryList} aria-label="중고 라켓을 확인하고 있어요">
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.racketSkeletonRow} />
      ))}
    </div>
  );
}

function RacketInventoryList({
  activeBrand,
  rackets,
  total,
}: {
  activeBrand: BrandKey;
  rackets: RItem[];
  total: number;
}) {
  const moreHref =
    activeBrand === "all" ? "/rackets" : `/rackets?brand=${encodeURIComponent(activeBrand)}`;
  const remainingCount = Math.max(0, total - rackets.length);
  const moreLabel =
    activeBrand === "all"
      ? "중고 라켓 전체 보기"
      : `${racketBrandLabel(activeBrand)} 중고 라켓 전체 보기`;

  return (
    <>
      <div className={styles.racketInventoryList}>
        {rackets.map((racket) => (
          <RacketInventoryRow key={racket.id} racket={racket} />
        ))}
      </div>
      <div className={styles.racketInventoryFooter}>
        <Link href={moreHref} className={styles.racketInventoryMoreLink}>
          <span>{moreLabel}</span>
          {remainingCount > 0 && <small>{remainingCount}개 더 보기</small>}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}

function getRacketRowBadges(racket: RItem) {
  const badges: Array<{
    key: string;
    label: string;
    tone: Parameters<typeof badgeToneVariant>[0];
  }> = [];

  if (racket.status === "sold") badges.push({ key: "sold", label: "판매 완료", tone: "neutral" });
  if (racket.status === "rented") badges.push({ key: "rented", label: "대여 중", tone: "warning" });

  const conditionMeta = racket.condition ? usedBadgeMeta("condition", racket.condition) : null;
  if (conditionMeta) {
    badges.push({ key: "condition", label: `${racket.condition}급`, tone: conditionMeta.tone });
  }

  if (racket.marketing?.isNew) badges.push({ key: "new", label: "NEW", tone: "info" });
  if (racket.marketing?.isFeatured) badges.push({ key: "featured", label: "추천", tone: "brand" });

  return badges.slice(0, 2);
}

function RacketInventoryRow({ racket }: { racket: RItem }) {
  const effectivePrice = getEffectiveRacketPrice(racket);
  const discountRate = getRacketDiscountRate(racket);
  const rentalFee = Number(racket.rental?.fee?.d7);
  const rentalLabel =
    racket.status !== "sold" && racket.status !== "rented"
      ? racket.rental?.enabled && Number.isFinite(rentalFee) && rentalFee > 0
        ? `7일 대여: ${formatPrice(rentalFee)}`
        : racket.rental?.enabled
          ? "대여 가능"
          : null
      : null;
  const brandLabel = racketBrandLabel(racket.brand);
  const imageAlt = `${brandLabel} ${racket.model}`.trim();
  const rowBadges = getRacketRowBadges(racket);
  const hasDiscount = discountRate > 0 && effectivePrice < racket.price;

  return (
    <Link href={`/rackets/${racket.id}`} className={styles.racketInventoryRow}>
      <div className={styles.racketInventoryThumb}>
        <Image
          src={getImageSrc(racket.images)}
          alt={imageAlt || "중고 라켓 상품 이미지"}
          fill
          className="object-contain"
          sizes="(max-width: 767px) 84px, (max-width: 1199px) 88px, 92px"
        />
      </div>
      <div className={styles.racketInventoryInfo}>
        <div className={styles.racketInventoryBadges}>
          {rowBadges.map((badge) => (
            <Badge key={badge.key} variant={badgeToneVariant(badge.tone)} shape="pill">
              {badge.label}
            </Badge>
          ))}
        </div>
        <p className={styles.racketInventoryBrand}>{brandLabel}</p>
        <h4 className={styles.racketInventoryModel}>{racket.model}</h4>
      </div>
      <div className={styles.racketInventoryDeal}>
        <div className={styles.racketInventoryPriceLine}>
          <strong>{formatPrice(effectivePrice)}</strong>
          {hasDiscount && <span>{discountRate}% 할인</span>}
        </div>
        {hasDiscount && (
          <del className={styles.racketInventoryOriginalPrice}>{formatPrice(racket.price)}</del>
        )}
        {rentalLabel && <p className={styles.racketInventoryRental}>{rentalLabel}</p>}
      </div>
      <ArrowRight className={styles.racketInventoryArrow} aria-hidden="true" />
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
