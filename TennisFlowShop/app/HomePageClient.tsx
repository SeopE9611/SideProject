"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HorizontalProducts, { type HItem } from "@/components/HorizontalProducts";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import { SectionHeader } from "@/components/public/SectionHeader";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RACKET_BRANDS, racketBrandLabel, STRING_BRANDS, stringBrandLabel } from "@/lib/constants";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
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
  ReceiptText,
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
  features?: {
    power?: number;
    control?: number;
    spin?: number;
    durability?: number;
    comfort?: number;
  };
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
        const label = typeof obj.label === "string" ? obj.label : "";
        if (!label.trim()) return null;

        return {
          key: typeof obj.key === "string" && obj.key.trim() ? obj.key : `promo-${idx}`,
          label,
          img: typeof obj.img === "string" && obj.img.trim() ? obj.img : undefined,
          alt: typeof obj.alt === "string" && obj.alt.trim() ? obj.alt : undefined,
          href: typeof obj.href === "string" && obj.href.trim() ? obj.href : undefined,
        };
      })
      .filter((v): v is PromoBanner => Boolean(v))
      .slice(0, 4);
  } catch {
    return [];
  }
})();

const surfaceCardInteractiveClass =
  "rounded-control border border-border/70 bg-card shadow-none transition-[background-color,color,border-color,opacity] duration-300 hover:border-foreground/20 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring/30";



const brandRailClass =
  "relative flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:hsl(var(--muted-foreground)/0.15)_transparent] [scrollbar-width:thin] bp-sm:gap-2.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30";
const getBrandTabClass = (isActive: boolean) =>
  cn(
    "min-h-11 shrink-0 whitespace-nowrap rounded-control border px-5 py-2.5 text-ui-body-sm font-medium transition-[background-color,color,border-color,opacity] duration-300 bp-sm:px-6 bp-sm:py-3 bp-sm:text-ui-body bp-md:px-7",
    isActive
      ? "border-foreground/30 bg-brand-highlight-muted text-foreground ring-1 ring-brand-highlight/30"
      : "border-border/80 bg-card text-foreground hover:border-foreground/20 hover:bg-muted/30",
  );




const APPLICATION_PATHS = [
  {
    key: "direct",
    title: "직접 선택",
    cardTitle: "원하는 스트링이 정해져 있어요",
    description: "원하는 스트링과 텐션을 선택해 바로 신청할 수 있어요.",
    cardDescription: "스트링과 텐션을 직접 선택해 바로 신청합니다.",
    previewCta: "직접 선택하고 신청하기",
    cardCta: "직접 선택하고 신청하기",
    href: "/products?from=apply",
    stringValue: "직접 선택",
    tensionValue: "직접 선택 또는 상담",
  },
  {
    key: "recommend",
    title: "추천받고 신청",
    cardTitle: "추천받고 싶어요",
    description: "스트링이나 텐션을 잘 몰라도 추천받으며 신청할 수 있어요.",
    cardDescription: "플레이 스타일과 원하는 타구감을 바탕으로\n알맞은 스트링을 추천받습니다.",
    previewCta: "추천받고 신청하기",
    cardCta: "내게 맞는 스트링 찾기",
    href: "/products/recommend",
    stringValue: "추천 후 선택",
    tensionValue: "추천 또는 상담 후 결정",
  },
  {
    key: "own",
    title: "보유 스트링 장착",
    cardTitle: "보유한 스트링으로 장착하고 싶어요",
    description: "가지고 있는 스트링으로 장착 서비스만 신청할 수 있어요.",
    cardDescription: "가지고 있는 스트링을 보내거나 방문해\n장착 서비스만 신청합니다.",
    previewCta: "보유 스트링 장착 신청",
    cardCta: "보유 스트링 장착 신청",
    href: "/services/apply?mode=single",
    stringValue: "보유 스트링",
    tensionValue: "직접 선택 또는 상담",
  },
] as const;
const STRINGING_STEPS = [
  {
    key: "apply",
    label: "01 교체 신청",
    title: "내 상황에 맞는 신청 방법을 선택하세요.",
    description: "원하는 스트링을 직접 고르거나 추천을 받은 뒤,\n방문 또는 택배 접수 방식으로 신청합니다.",
    bullets: ["추천받고 신청하기", "원하는 스트링 직접 선택하기", "보유 스트링 장착 신청하기"],
    cta: "다음: 접수 방법 선택",
  },
  {
    key: "receive",
    label: "02 라켓 접수",
    title: "편한 방법으로 라켓을 맡겨주세요.",
    description: "매장에 직접 방문하거나 택배로 라켓을 보낼 수 있어요.\n선택한 접수 방법에 맞춰 필요한 내용을 안내해드려요.",
    bullets: ["방문 접수", "택배 접수", "접수 내용 확인"],
    cta: "다음: 전문 장착 확인",
  },
  {
    key: "work",
    label: "03 전문 장착",
    title: "선택한 내용으로 꼼꼼하게 장착해드려요.",
    description: "신청한 스트링과 텐션을 확인한 뒤\n전문 장비로 스트링 교체 작업을 진행합니다.",
    bullets: ["스트링 확인", "텐션 확인", "전문 장비 작업"],
    cta: "다음: 수령 방법 확인",
  },
  {
    key: "pickup",
    label: "04 수령 및 관리",
    title: "작업이 끝나면 수령 방법을 안내해드려요.",
    description: "방문 수령 또는 택배 발송으로 라켓을 받아보세요.\n완료된 교체 이력은 라켓 케어에서 이어서 관리할 수 있어요.",
    bullets: ["방문 수령", "택배 발송", "교체 이력 관리"],
    cta: "교체서비스 신청하기",
  },
] as const;
const STRING_PURPOSES = [
  { key: "comfort", label: "편안한 타구감", subtitle: "편안한 타구감 추천", title: "팔 부담을 줄이고 편안하게", description: "부드러운 타구감과 편안함을 원하는 분께\n어울리는 스트링을 보여드려요.", href: "/products?comfort=80#product-list" },
  { key: "spin", label: "스핀", subtitle: "스핀 추천", title: "회전을 더 적극적으로", description: "공에 회전을 더하고 싶은 분께\n스핀 성능을 고려한 스트링을 추천해드려요.", href: "/products?spin=80#product-list" },
  { key: "control", label: "컨트롤", subtitle: "컨트롤 추천", title: "원하는 곳으로 정확하게", description: "안정적인 타구감과 방향 제어를 중요하게 생각하는 분께\n알맞은 스트링을 보여드려요.", href: "/products?control=80#product-list" },
  { key: "durability", label: "내구성", subtitle: "내구성 추천", title: "더 오래 사용할 수 있도록", description: "스트링이 자주 끊어지거나 교체 주기가 짧은 분께\n내구성을 고려한 제품을 추천해드려요.", href: "/products?durability=80#product-list" },
  { key: "beginner", label: "처음 시작하는 분", subtitle: "처음 시작하는 분께 추천", title: "처음이라면 부담 없이", description: "스트링 선택이 익숙하지 않은 분도\n편안하게 사용할 수 있는 제품부터 살펴보세요.", href: "/products?comfort=70&control=70#product-list" },
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
  const [activeApplicationPath, setActiveApplicationPath] = useState<(typeof APPLICATION_PATHS)[number]["key"]>("recommend");
  const [activeStepKey, setActiveStepKey] = useState<(typeof STRINGING_STEPS)[number]["key"]>("apply");
  const [activePurposeKey, setActivePurposeKey] = useState<(typeof STRING_PURPOSES)[number]["key"]>("comfort");
  const selectedApplicationPath = APPLICATION_PATHS.find((item) => item.key === activeApplicationPath) ?? APPLICATION_PATHS[1];
  const selectedStep = STRINGING_STEPS.find((item) => item.key === activeStepKey) ?? STRINGING_STEPS[0];
  const selectedPurpose = STRING_PURPOSES.find((item) => item.key === activePurposeKey) ?? STRING_PURPOSES[0];

  // 현재 탭 기준의 리스트 소스 (브랜드 필터)
  const premiumItemsSource = useMemo(() => {
    if (activeStringBrand === "all") return homeStringProducts;
    return stringByBrand[activeStringBrand] ?? [];
  }, [activeStringBrand, homeStringProducts, stringByBrand]);

  const purposeSortedSource = useMemo(() => {
    const getScore = (product: ApiProduct) => {
      const features = product.features;
      if (activePurposeKey === "beginner") {
        return Number(features?.comfort ?? 0) + Number(features?.control ?? 0);
      }
      return Number(features?.[activePurposeKey] ?? 0);
    };

    return premiumItemsSource
      .map((product, index) => ({ product, index }))
      .sort((a, b) => {
        const scoreDiff = getScore(b.product) - getScore(a.product);
        return scoreDiff || a.index - b.index;
      })
      .map(({ product }) => product);
  }, [activePurposeKey, premiumItemsSource]);

  // HorizontalProducts 매핑 (브랜드 라벨 표시)
  const premiumItems: HItem[] = useMemo(
    () =>
      purposeSortedSource.map((p) => {
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
    [purposeSortedSource],
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

  const homePackages = initialHomeData?.packages ?? [];
  const showcaseRackets = rackByBrand[activeBrand] ?? [];
  const featuredRacket = showcaseRackets[0];
  const secondaryRackets = showcaseRackets.slice(1, 4);

  // throw new Error('[TEST] app/error.tsx 동작 확인용(홈 페이지)');
  return (
    <div className="bg-background">
      <SignupBonusPromoPopup promo={signupPromo} onPrimaryClick={() => router.push("/login?tab=register")} />
      <SiteContainer variant="wide" className="px-0">
        <section className="mx-3 pt-3 bp-sm:mx-4 bp-sm:pt-4 bp-md:mx-6 bp-md:pt-6 bp-lg:mx-0">
          <div className="overflow-hidden rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse text-surface-inverse-foreground shadow-soft">
            <div className="grid gap-0 bp-lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] bp-lg:items-stretch">
              <div className="flex flex-col justify-center p-5 bp-sm:p-8 bp-md:p-10 bp-lg:p-12">
                <Badge variant="signal_solid" className="w-fit">스트링 교체서비스</Badge>
                <h1 className="mt-5 max-w-3xl break-keep font-brand-heading text-ui-page-title font-semibold tracking-tight text-surface-inverse-foreground bp-md:text-ui-page-title-lg bp-lg:font-brand-display">스트링 교체,<br />내 플레이에 맞게.</h1>
                <p className="mt-4 max-w-2xl break-keep text-ui-body leading-relaxed text-surface-inverse-muted bp-sm:text-ui-body-lg">스트링 선택부터 텐션 상담, 라켓 접수와 수령까지.<br className="hidden bp-sm:block" /> 복잡한 교체 과정을 쉽게 안내해드려요.</p>
                <div className="mt-6 grid gap-2 bp-sm:flex bp-sm:flex-wrap bp-sm:gap-3"><Button asChild variant="highlight" size="tall" wrap="responsive"><Link href="/services/apply">교체서비스 신청하기</Link></Button><Button asChild variant="inverse" size="tall" wrap="responsive"><Link href="/products">내게 맞는 스트링 찾기</Link></Button></div>
                <div className="mt-6 grid gap-3 border-t border-surface-inverse-foreground/15 pt-5 bp-md:grid-cols-3">{[["방문·택배 접수","편한 방법으로 라켓을 맡길 수 있어요."],["직접 선택·상담 가능","알고 있는 항목만 선택해도 됩니다."],["패키지 이용 가능","자주 교체한다면 패키지를 이용할 수 있어요."]].map(([title, desc]) => <div key={title} className="rounded-control border border-surface-inverse-foreground/15 p-3"><strong className="block text-ui-body-sm text-surface-inverse-foreground">{title}</strong><span className="mt-1 block break-keep text-ui-label leading-relaxed text-surface-inverse-muted">{desc}</span></div>)}</div>
              </div>
              <div className="border-t border-surface-inverse-foreground/15 p-4 bp-sm:p-6 bp-lg:border-l bp-lg:border-t-0 bp-lg:p-8">
                <Card variant="inverse" className="h-full rounded-panel border-surface-inverse-foreground/15 bg-surface-inverse shadow-none"><CardContent className="flex h-full flex-col p-5 bp-sm:p-6"><span className="text-ui-label font-semibold tracking-[0.16em] text-surface-inverse-muted">MY STRINGING PLAN</span><h2 className="mt-3 text-ui-section-title font-semibold text-surface-inverse-foreground">교체 신청 미리보기</h2><div className="mt-5 grid gap-2 bp-sm:grid-cols-3 bp-lg:grid-cols-1 bp-xl:grid-cols-3">{APPLICATION_PATHS.map((item) => { const selected = item.key === activeApplicationPath; return <button key={item.key} type="button" aria-pressed={selected} onClick={() => setActiveApplicationPath(item.key)} className={cn("min-h-11 rounded-control border px-3 py-2 text-ui-label font-medium transition-[background-color,color,border-color,opacity] focus:outline-none focus:ring-2 focus:ring-ring/30", selected ? "border-brand-highlight bg-brand-highlight-muted text-foreground ring-1 ring-brand-highlight/30" : "border-surface-inverse-foreground/15 text-surface-inverse-muted hover:bg-surface-inverse-foreground/10")}><span aria-hidden="true" className="mr-1">{selected ? "●" : "○"}</span>{item.title}</button>; })}</div><p className="mt-5 break-keep text-ui-body leading-relaxed text-surface-inverse-muted">{selectedApplicationPath.description}</p><dl className="mt-5 grid gap-3 rounded-panel border border-surface-inverse-foreground/15 p-4 text-ui-body-sm">{[["스트링", selectedApplicationPath.stringValue], ["텐션", selectedApplicationPath.tensionValue], ["접수 방법", "방문 또는 택배"]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4"><dt className="text-surface-inverse-muted">{label}</dt><dd className="font-semibold text-surface-inverse-foreground">{value}</dd></div>)}</dl><Button asChild variant="highlight" size="tall" wrap="responsive" className="mt-auto"><Link href={selectedApplicationPath.href}>{selectedApplicationPath.previewCta}</Link></Button></CardContent></Card>
              </div>
            </div>
          </div>
        </section>
      </SiteContainer>

      {PROMO_BANNERS.length > 0 && (
        <SiteContainer variant="wide" className="px-0">
          <section className="mx-3 mt-4 bp-sm:mx-4 bp-sm:mt-5 bp-md:mx-6 bp-md:mt-6 bp-lg:mx-0">
            <div className="grid grid-cols-1 gap-3 bp-sm:grid-cols-2 bp-sm:gap-4 bp-md:grid-cols-4">
              {PROMO_BANNERS.map((banner) => {
                const title = banner.label.split("\n")[0] || "프로모션";
                const inner = (
                  <>
                    {banner.img ? (
                      <img
                        src={banner.img}
                        alt={banner.alt ?? title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted/30" />
                    )}
                    <div className="absolute inset-0 bg-card/70" />
                    <div className="relative z-10 flex h-full items-center justify-center p-4 text-center">
                      <div className="text-ui-card-title-lg font-semibold leading-tight text-foreground bp-sm:text-ui-section-title">
                        {title}
                      </div>
                    </div>
                  </>
                );
                const className =
                  "group relative block h-24 overflow-hidden rounded-panel border border-border/80 bg-card shadow-sm transition-[background-color,color,border-color,opacity] hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring/30 bp-sm:h-28 bp-md:h-32";

                if (banner.href?.startsWith("/")) {
                  return (
                    <Link key={banner.key} href={banner.href} className={className} aria-label={title}>
                      {inner}
                    </Link>
                  );
                }
                if (banner.href) {
                  return (
                    <a key={banner.key} href={banner.href} className={className} aria-label={title}>
                      {inner}
                    </a>
                  );
                }
                return (
                  <div key={banner.key} className={className} aria-label={title}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        </SiteContainer>
      )}

      <section className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><SectionHeader variant="brand" eyebrow="신청 방법 선택" title="지금 알고 있는 만큼만 선택하세요." description={"원하는 스트링을 이미 정했다면 바로 신청하고,\n잘 모르겠다면 추천부터 받을 수 있어요.\n보유한 스트링으로 장착만 신청하는 것도 가능합니다."} align="center" className="mb-8 bp-sm:mb-10" /><div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]"><div className="grid gap-3">{APPLICATION_PATHS.map((item) => { const selected = item.key === activeApplicationPath; return <button key={item.key} type="button" aria-pressed={selected} onClick={() => setActiveApplicationPath(item.key)} className={cn("rounded-panel border p-5 text-left transition-[background-color,color,border-color,opacity] focus:outline-none focus:ring-2 focus:ring-ring/30", selected ? "border-foreground/30 bg-brand-highlight-muted ring-1 ring-brand-highlight/30" : "border-border/80 bg-card hover:border-foreground/20 hover:bg-muted/20")}><span className="text-ui-label font-semibold text-muted-foreground">{selected ? "선택됨" : "신청 방법"}</span><h3 className="mt-2 break-keep text-ui-card-title-lg font-semibold text-foreground">{item.cardTitle}</h3><p className="mt-2 whitespace-pre-line break-keep text-ui-body-sm leading-relaxed text-muted-foreground">{item.cardDescription}</p><span className="mt-4 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground">{item.cardCta}<ChevronRight className="h-3.5 w-3.5" /></span></button>; })}</div><PublicSurface variant="feature" padding="lg" className="border-border/80 bg-card shadow-sm"><h3 className="break-keep text-ui-section-title font-semibold text-foreground">무엇을 골라야 할지 몰라도 괜찮아요.</h3><p className="mt-3 whitespace-pre-line break-keep text-ui-body leading-relaxed text-muted-foreground">플레이 빈도와 원하는 타구감을 알려주시면\n알맞은 스트링과 텐션을 찾을 수 있도록 도와드려요.\n추천 결과를 확인한 뒤 바로 교체를 신청할 수 있습니다.</p><dl className="mt-5 grid gap-3 text-ui-body-sm">{[["신청 방법","추천받고 신청"],["스트링","추천 결과에서 선택"],["텐션","추천 또는 상담 후 결정"],["접수 방법","방문 또는 택배"]].map(([label,value]) => <div key={label} className="flex justify-between gap-4 rounded-control bg-muted/30 px-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold text-foreground">{value}</dd></div>)}</dl><Button asChild variant="highlight" size="tall" wrap="responsive" className="mt-5"><Link href="/products">맞춤 스트링 찾기</Link></Button></PublicSurface></div></SiteContainer></section>

      <section className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><SectionHeader variant="brand" eyebrow="주요 서비스" title={"교체 신청에 필요한 메뉴를\n한곳에서 확인하세요."} description={"교체서비스 신청을 중심으로 스트링 추천,\n패키지와 이용 안내를 빠르게 확인할 수 있어요."} align="center" className="mb-8 bp-sm:mb-10" /><div className="grid gap-4 bp-lg:grid-cols-[1.2fr_0.8fr]"><Link href="/services/apply" className="group rounded-hero border border-border/80 bg-card p-6 shadow-soft transition-[background-color,color,border-color,opacity] hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring/30 bp-md:p-8"><Badge variant="signal" className="w-fit">스트링 교체서비스</Badge><h3 className="mt-5 break-keep text-ui-section-title-lg font-semibold text-foreground">라켓을 맡기기 전부터<br />수령할 때까지</h3><p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">신청서 작성, 접수 방법 선택, 스트링·텐션 확인, 작업 완료 안내를 순서대로 확인할 수 있어요.</p><span className="mt-8 inline-flex items-center gap-1 text-ui-body font-semibold text-foreground">교체서비스 시작하기<ChevronRight className="h-4 w-4" /></span></Link><div className="grid gap-4 bp-sm:grid-cols-3 bp-lg:grid-cols-1">{[["/products","내게 맞는 스트링 찾기","플레이 스타일과 원하는 타구감에 맞춰 추천받아요.","추천 시작하기"],["/services/packages","교체 패키지","자주 교체한다면 횟수형 패키지로\n더 편리하게 이용할 수 있어요.","패키지 살펴보기"],["/services/pricing","가격·이용 안내","장착 비용과 방문·택배 접수 방법을\n미리 확인하세요.","이용 방법 확인하기"]].map(([href,title,desc,cta]) => <Link key={title} href={href} className="group rounded-panel border border-border/80 bg-card p-5 transition-[background-color,color,border-color,opacity] hover:border-foreground/20 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring/30"><h3 className="break-keep text-ui-card-title font-semibold text-foreground">{title}</h3><p className="mt-2 whitespace-pre-line break-keep text-ui-body-sm leading-relaxed text-muted-foreground">{desc}</p><span className="mt-4 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground">{cta}<ChevronRight className="h-3.5 w-3.5" /></span></Link>)}</div></div></SiteContainer></section>

      <section className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><PublicSurface variant="feature" padding="lg" className="border-border/80 bg-card shadow-sm bp-md:p-10"><SectionHeader variant="brand" eyebrow="교체 진행 순서" title={"신청부터 수령까지\n차근차근 진행해요."} description={"각 단계를 선택하면 준비할 내용과\n진행 방법을 확인할 수 있어요."} align="center" className="mb-8 bp-sm:mb-10" /><div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-3 bp-md:mx-0 bp-md:grid bp-md:grid-cols-4 bp-md:px-0">{STRINGING_STEPS.map((step) => <button key={step.key} type="button" aria-pressed={step.key === activeStepKey} onClick={() => setActiveStepKey(step.key)} className={cn("min-h-12 shrink-0 rounded-control border px-4 py-2 text-ui-body-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/30", step.key === activeStepKey ? "border-foreground/30 bg-brand-highlight-muted text-foreground ring-1 ring-brand-highlight/30" : "border-border/80 bg-card text-muted-foreground hover:bg-muted/20")}>{step.label}</button>)}</div><div className="mt-5 grid gap-5 bp-lg:grid-cols-[1fr_0.85fr] bp-lg:items-stretch"><div className="rounded-panel border border-border/70 bg-card p-5 bp-md:p-7"><h3 className="break-keep text-ui-section-title font-semibold text-foreground">{selectedStep.title}</h3><p className="mt-3 whitespace-pre-line break-keep text-ui-body leading-relaxed text-muted-foreground">{selectedStep.description}</p><ul className="mt-5 grid gap-2">{selectedStep.bullets.map((item) => <li key={item} className="flex items-center gap-2 rounded-control bg-muted/30 px-4 py-3 text-ui-body-sm font-medium text-foreground"><span aria-hidden="true">●</span>{item}</li>)}</ul><Button asChild variant={selectedStep.key === "pickup" ? "highlight" : "outline"} size="tall" wrap="responsive" className="mt-5"><Link href="/services/apply">{selectedStep.cta}</Link></Button></div><div className="overflow-hidden rounded-panel border border-border/70 bg-muted/20"><img src="/images/home/home-stringing-setup-clean.webp" alt="테니스 라켓과 스트링 교체 도구" className="h-64 w-full object-cover bp-lg:h-full" loading="lazy" decoding="async" /></div></div></PublicSurface></SiteContainer></section>

      <section className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><SectionHeader variant="brand" eyebrow="도깨비테니스 교체서비스" title={"신청부터 장착까지\n한 번에 확인하세요."} description={"스트링 선택, 라켓 접수, 장착과 수령 과정을\n단계별로 알기 쉽게 안내해드려요."} align="center" className="mb-8 bp-sm:mb-10" /><div className="grid gap-3 bp-sm:grid-cols-2 bp-lg:grid-cols-4">{[["신청 내용 확인","라켓, 스트링, 텐션과 접수 방법을\n한 번에 확인합니다."],["필요한 항목만 선택","직접 선택과 추천 경로를 나눠\n필요한 내용만 보여드려요."],["작업 과정 안내","접수부터 장착, 완료와 수령까지\n진행 과정을 확인할 수 있어요."],["교체 이력 관리","완료된 교체 이력은 라켓 케어에서\n계속 관리할 수 있어요."]].map(([title,desc]) => <Card key={title} variant="feature" className="rounded-panel shadow-none"><CardContent className="p-5"><h3 className="text-ui-card-title font-semibold text-foreground">{title}</h3><p className="mt-2 whitespace-pre-line break-keep text-ui-body-sm leading-relaxed text-muted-foreground">{desc}</p></CardContent></Card>)}</div></SiteContainer></section>

      <section ref={stringsSectionRef} className="py-10 bp-sm:py-12 bp-md:py-16"><SiteContainer><SectionHeader variant="brand" eyebrow="맞춤 스트링 추천" title="브랜드보다 원하는 플레이 느낌부터 선택하세요." description={"편안함, 스핀, 컨트롤과 내구성 등\n원하는 기준을 고르면 알맞은 스트링을 추천해드려요."} align="center" className="mb-8 bp-sm:mb-10" /><PublicSurface variant="feature" padding="sm" className="mb-8 border-border/80 bg-card shadow-sm bp-sm:mb-10"><div className="grid gap-5 bp-lg:grid-cols-[0.8fr_1.2fr] bp-lg:items-start"><div className="flex gap-2 overflow-x-auto pb-2 bp-lg:grid bp-lg:overflow-visible bp-lg:pb-0">{STRING_PURPOSES.map((purpose) => <button key={purpose.key} type="button" aria-pressed={purpose.key === activePurposeKey} onClick={() => setActivePurposeKey(purpose.key)} className={cn("min-h-11 shrink-0 rounded-control border px-4 py-2 text-ui-body-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/30", purpose.key === activePurposeKey ? "border-foreground/30 bg-brand-highlight-muted text-foreground ring-1 ring-brand-highlight/30" : "border-border/80 bg-card text-muted-foreground hover:bg-muted/20")}>{purpose.label}</button>)}</div><div className="rounded-panel border border-border/70 bg-card p-5"><h3 className="break-keep text-ui-section-title font-semibold text-foreground">{selectedPurpose.title}</h3><p className="mt-3 whitespace-pre-line break-keep text-ui-body leading-relaxed text-muted-foreground">{selectedPurpose.description}</p><Button asChild variant="outline" size="tall" wrap="responsive" className="mt-5"><Link href={selectedPurpose.href}>추천 상품 보기</Link></Button></div></div><div className="mt-6 flex justify-center"><div ref={stringBrandRailRef} className={brandRailClass}><button type="button" aria-pressed={activeStringBrand === "all"} onClick={() => setActiveStringBrand("all")} className={getBrandTabClass(activeStringBrand === "all")}>전체</button>{STRING_BRANDS.map((b) => <button key={b.value} type="button" aria-pressed={activeStringBrand === b.value} onClick={() => setActiveStringBrand(b.value as StringBrandKey)} className={getBrandTabClass(activeStringBrand === b.value)}>{b.label}</button>)}</div></div></PublicSurface><HorizontalProducts variant="home" title="스트링" subtitle={activeStringBrand === "all" ? selectedPurpose.subtitle : `${stringBrandLabel(activeStringBrand)} · ${selectedPurpose.subtitle}`} items={premiumItems.slice(0, 10)} showMoreCard={hasMoreStringProducts} moreHref={activeStringBrand === "all" ? "/products" : `/products?brand=${activeStringBrand}`} firstPageSlots={4} moveMoreToSecondWhen5Plus={true} error={activeStringBrand === "all" ? productsError : Boolean(stringsErrorByBrand[activeStringBrand])} onRetry={() => { if (activeStringBrand === "all") { void fetchHomeProducts(); return; } void loadStringBrand(activeStringBrand); }} emptyTitle={activeStringBrand === "all" ? "등록된 스트링이 없습니다" : "해당 브랜드 스트링이 없습니다"} emptyDescription={activeStringBrand === "all" ? "곧 상품이 업데이트됩니다." : "다른 브랜드를 선택해 보세요."} errorTitle="스트링을 불러오지 못했어요" errorDescription="네트워크/서버 상태를 확인 후 다시 시도해 주세요." showHeader={false} loading={!shouldLoadStrings || (activeStringBrand === "all" ? loading : Boolean(stringsLoadingByBrand[activeStringBrand]))} /></SiteContainer></section>

      <section className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <SectionHeader
            variant="brand"
            eyebrow="교체 패키지"
            title={"자주 교체한다면\n패키지로 더 편리하게 이용하세요."}
            description={"이용 횟수와 혜택을 한눈에 비교하고,\n교체할 때마다 간편하게 사용할 수 있어요."}
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <div className="grid gap-4 bp-lg:grid-cols-[0.75fr_1.25fr]">
            <PublicSurface variant="feature" padding="lg" className="border-border/80 bg-card shadow-sm">
              <h3 className="break-keep text-ui-section-title font-semibold text-foreground">
                다음 교체도 미리 준비해보세요.
              </h3>
              <p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">
                횟수형 패키지를 구매하면 반복 결제 없이 필요한 시점에 교체서비스를 신청할 수 있어요.
              </p>
              <Button asChild variant="highlight" size="tall" wrap="responsive" className="mt-5">
                <Link href="/services/packages">패키지 자세히 보기</Link>
              </Button>
            </PublicSurface>
            {homePackages.length > 0 ? (
              <div className="grid gap-3 bp-md:grid-cols-3">
                {homePackages.map((pkg) => {
                  const perSession = pkg.sessions > 0 ? Math.round(pkg.price / pkg.sessions) : 0;
                  const saving =
                    pkg.originalPrice && pkg.originalPrice > pkg.price ? pkg.originalPrice - pkg.price : 0;

                  return (
                    <Link
                      key={pkg.id}
                      href={`/services/packages/checkout?package=${pkg.id}`}
                      className={cn(
                        "group rounded-panel border bg-card p-5 transition-[background-color,color,border-color,opacity] hover:border-foreground/20 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring/30",
                        pkg.isPopular
                          ? "border-foreground/30 ring-1 ring-brand-highlight/30"
                          : "border-border/80",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-ui-card-title font-semibold text-foreground">{pkg.name}</h3>
                        {pkg.isPopular && <Badge variant="signal">추천</Badge>}
                      </div>
                      <p className="mt-3 text-ui-section-title font-semibold text-foreground">
                        {pkg.price.toLocaleString("ko-KR")}원
                      </p>
                      <p className="mt-1 text-ui-body-sm text-muted-foreground">
                        {pkg.sessions}회{perSession > 0 ? ` · 회당 ${perSession.toLocaleString("ko-KR")}원` : ""}
                      </p>
                      {saving > 0 && (
                        <p className="mt-2 text-ui-label font-semibold text-foreground">
                          {saving.toLocaleString("ko-KR")}원 절감
                        </p>
                      )}
                      <span className="mt-5 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground">
                        이 패키지 보기
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <PublicSurface variant="feature" className="border-border/80 text-center shadow-none">
                <p className="text-ui-section-title font-semibold text-foreground">
                  패키지 정보를 확인해 주세요.
                </p>
                <p className="mx-auto mt-3 max-w-xl break-keep text-ui-body text-muted-foreground">
                  현재 이용 가능한 패키지는 패키지 안내에서 확인할 수 있어요.
                </p>
              </PublicSurface>
            )}
          </div>
        </SiteContainer>
      </section>

      <section ref={racketsSectionRef} className="py-10 bp-sm:py-12 bp-md:py-16">
        <SiteContainer>
          <SectionHeader
            variant="brand"
            eyebrow="도깨비 인증 중고 라켓"
            title={"검수된 중고 라켓을\n한눈에 살펴보세요."}
            description={"대표 라켓과 최근 등록된 라켓을 함께 확인하고,\n구매·대여 후 스트링 교체까지 이어서 이용할 수 있어요."}
            align="center"
            className="mb-8 bp-sm:mb-10"
          />
          <PublicSurface variant="feature" padding="sm" className="mb-6 border-border/80 bg-card shadow-sm">
            <div ref={racketBrandRailRef} className={brandRailClass}>
              <button
                type="button"
                aria-pressed={activeBrand === "all"}
                onClick={() => setActiveBrand("all")}
                className={getBrandTabClass(activeBrand === "all")}
              >
                전체
              </button>
              {RACKET_BRANDS.map((brand) => (
                <button
                  key={brand.value}
                  type="button"
                  aria-pressed={activeBrand === brand.value}
                  onClick={() => setActiveBrand(brand.value as BrandKey)}
                  className={getBrandTabClass(activeBrand === brand.value)}
                >
                  {brand.label}
                </button>
              ))}
            </div>
          </PublicSurface>
          {!shouldLoadRackets || usedRacketsLoading ? (
            <PublicSurface variant="feature" className="h-72 animate-pulse border-border/80 shadow-none" />
          ) : usedRacketsError ? (
            <PublicSurface variant="feature" className="border-border/80 text-center shadow-none">
              <p className="text-ui-section-title font-semibold text-foreground">
                중고 라켓을 불러오지 못했어요
              </p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => loadUsedRackets(activeBrand)}>
                다시 불러오기
              </Button>
            </PublicSurface>
          ) : !featuredRacket ? (
            <PublicSurface variant="feature" className="border-border/80 text-center shadow-none">
              <p className="text-ui-section-title font-semibold text-foreground">
                {activeBrand === "all" ? "검수된 중고 라켓을 준비 중입니다." : "해당 브랜드 중고 라켓이 없습니다."}
              </p>
              <p className="mx-auto mt-3 max-w-xl break-keep text-ui-body text-muted-foreground">
                {activeBrand === "all"
                  ? "상태 확인이 끝난 라켓부터 순차적으로 소개해 드릴게요."
                  : "다른 브랜드를 선택해 보세요."}
              </p>
            </PublicSurface>
          ) : (
            <div className="grid gap-4 bp-lg:grid-cols-[1.05fr_0.95fr]">
              {(() => {
                const regularPrice = featuredRacket.price ?? 0;
                const displayPrice = getEffectiveRacketPrice(featuredRacket);
                const discountRate = getRacketDiscountRate(featuredRacket);

                return (
                  <Link
                    href={`/rackets/${featuredRacket.id}`}
                    className="group overflow-hidden rounded-hero border border-border/80 bg-card shadow-soft focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <div className="aspect-[16/10] bg-muted/30">
                      <img
                        src={featuredRacket.images?.[0] ?? "/placeholder.svg"}
                        alt={featuredRacket.model}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="p-5 bp-md:p-6">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="signal" className="w-fit">PRE-OWNED RACKETS</Badge>
                        {discountRate > 0 && <Badge variant="signal_solid">{discountRate}% 할인</Badge>}
                        {featuredRacket.condition && <Badge variant="signal">{featuredRacket.condition}급</Badge>}
                        {featuredRacket.rental?.enabled && <Badge variant="signal">대여 가능</Badge>}
                      </div>
                      <h3 className="mt-4 break-keep text-ui-section-title font-semibold text-foreground">
                        검수된 라켓을<br />교체서비스와 함께 이용해보세요.
                      </h3>
                      <p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">
                        구매 또는 대여 후 원하는 스트링을 선택해 바로 교체를 신청할 수 있어요.
                      </p>
                      <p className="mt-4 font-semibold text-foreground">
                        {racketBrandLabel?.(featuredRacket.brand) ?? featuredRacket.brand} · {featuredRacket.model}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2 text-ui-body-sm">
                        <span className="font-semibold text-foreground">{displayPrice.toLocaleString("ko-KR")}원</span>
                        {discountRate > 0 && (
                          <span className="text-muted-foreground line-through">
                            {regularPrice.toLocaleString("ko-KR")}원
                          </span>
                        )}
                      </div>
                      <span className="mt-5 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground">
                        중고 라켓 둘러보기
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })()}
              <div className="grid gap-3">
                {secondaryRackets.map((racket) => {
                  const regularPrice = racket.price ?? 0;
                  const displayPrice = getEffectiveRacketPrice(racket);
                  const discountRate = getRacketDiscountRate(racket);

                  return (
                    <Link
                      key={racket.id}
                      href={`/rackets/${racket.id}`}
                      className="group grid grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-panel border border-border/80 bg-card p-3 transition-[background-color,color,border-color,opacity] hover:border-foreground/20 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring/30 bp-sm:grid-cols-[128px_minmax(0,1fr)]"
                    >
                      <img
                        src={racket.images?.[0] ?? "/placeholder.svg"}
                        alt={racket.model}
                        className="h-24 w-full rounded-control object-cover bp-sm:h-28"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {discountRate > 0 && <Badge variant="signal_solid">{discountRate}% 할인</Badge>}
                          {racket.condition && <Badge variant="signal">{racket.condition}급</Badge>}
                          {racket.rental?.enabled && <Badge variant="signal">대여 가능</Badge>}
                        </div>
                        <h3 className="truncate text-ui-card-title font-semibold text-foreground">{racket.model}</h3>
                        <p className="mt-1 text-ui-body-sm text-muted-foreground">
                          {racketBrandLabel?.(racket.brand) ?? racket.brand}
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-2 text-ui-body-sm">
                          <span className="font-semibold text-foreground">
                            {displayPrice.toLocaleString("ko-KR")}원
                          </span>
                          {discountRate > 0 && (
                            <span className="text-muted-foreground line-through">
                              {regularPrice.toLocaleString("ko-KR")}원
                            </span>
                          )}
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-ui-label font-semibold text-foreground">
                          상세 보기
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
                <Button asChild variant="outline" size="tall" wrap="responsive">
                  <Link href={activeBrand === "all" ? "/rackets" : `/rackets?brand=${activeBrand}`}>
                    중고 라켓 둘러보기
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SiteContainer>
      </section>

      <section ref={communitySectionRef} className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><SectionHeader variant="brand" eyebrow="이용 안내" title={"교체서비스 이용 전\n필요한 내용을 확인하세요."} description={"공지사항, 접수 방법, 비용과 영업시간,\n문의 메뉴를 한곳에서 확인할 수 있어요."} align="center" className="mb-8 bp-sm:mb-10" /><div className="grid gap-4 bp-lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] bp-lg:items-stretch">{shouldLoadCommunity ? <HomeNoticePreview initialItems={initialHomeData?.notices} /> : <PublicSurface variant="muted" padding="none" className="h-[260px] animate-pulse border-border/60" />}<div className="grid gap-3 bp-sm:grid-cols-2">{[["/services/locations","방문·택배 접수 방법","라켓을 맡기는 방법과 준비할 내용을 확인하세요.",ClipboardList],["/services/pricing","비용 기준 확인","장착비와 서비스 비용을 확인하세요.",ReceiptText],["/services/locations","영업시간·매장 위치","영업시간과 매장 위치를 확인하세요.",Info],["/board/qna","문의하기","궁금한 내용을 Q&A로 남겨주세요.",Headset],["/reviews","이용 후기","실제 스트링 교체 후기를 확인하세요.",MessageSquareQuote]].map(([href,title,desc,Icon]) => { const IconComponent = Icon as typeof ClipboardList; return <Link key={title as string} href={href as string} className={cn(surfaceCardInteractiveClass,"group flex min-h-28 items-start gap-4 p-5")}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border/70 bg-secondary text-foreground"><IconComponent className="h-5 w-5" /></div><div><h3 className="break-keep text-ui-card-title font-semibold text-foreground">{title as string}</h3><p className="mt-1 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">{desc as string}</p></div></Link>; })}</div></div></SiteContainer></section>

      <section className="py-8 bp-sm:py-10 bp-md:py-14"><SiteContainer><PublicSurface variant="floating" padding="lg" className="border-border/80 bg-card shadow-sm"><div className="grid gap-4 bp-md:grid-cols-[1fr_auto] bp-md:items-center"><div><Badge variant="signal" className="w-fit">교체 후 관리</Badge><h2 className="mt-3 break-keep text-ui-section-title font-semibold text-foreground">교체 이력은 라켓 케어에서<br />이어서 관리하세요.</h2><p className="mt-3 break-keep text-ui-body leading-relaxed text-muted-foreground">완료된 교체 이력을 저장하면 다음 교체 시기와 라켓 상태를 확인할 수 있어요.</p></div><Button asChild variant="outline" size="tall" wrap="responsive"><Link href="/racket-care">라켓 케어 알아보기</Link></Button></div></PublicSurface></SiteContainer></section>
    </div>
  );
}
