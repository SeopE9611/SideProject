"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CommerceBadge } from "@/components/badges/CommerceBadge";
import { RacketBadge } from "@/components/badges/RacketBadge";
import { SemanticBadge } from "@/components/badges/SemanticBadge";
import SiteContainer from "@/components/layout/SiteContainer";
import SignupBonusPromoPopup from "@/components/system/SignupBonusPromoPopup";
import { RACKET_BRANDS, racketBrandLabel, stringBrandLabel } from "@/lib/constants";
import type {
  HomePreviewData,
  HomePreviewPackage,
  HomePreviewProduct,
  HomePreviewRacket,
  HomePreviewSection,
  HomePreviewStatus,
  HomeProductGroupKey,
} from "@/lib/home/home-preview";
import {
  isSignupBonusActive,
  SIGNUP_BONUS_CAMPAIGN_ID,
  SIGNUP_BONUS_END_DATE,
  SIGNUP_BONUS_POINTS,
  SIGNUP_BONUS_START_DATE,
} from "@/lib/points.policy";
import { getEffectiveRacketPrice, getRacketDiscountRate } from "@/lib/racket-pricing";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { isStringProductSoldOut } from "@/lib/products/string-stock";
import { commerceBadgeSpecs, type RacketAvailabilityState } from "@/lib/badge-style";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./HomePageRedesign.module.css";

type HomePageRedesignProps = {
  initialHomeData?: HomePreviewData | null;
  initialHomeStatus?: HomePreviewStatus;
};

type ProductFilter = HomeProductGroupKey;
type ConciergeKey = "comfort" | "spin" | "power";
type BrandKey = "all" | (typeof RACKET_BRANDS)[number]["value"];
type RacketRequestStatus = "loading" | "success" | "error";
type SectionRequestStatus = "idle" | "loading" | "success" | "error";
type RecoverableSection = Exclude<HomePreviewSection, "rackets">;

type HomePreviewRecoveryResponse = {
  data: HomePreviewData;
  status: Partial<HomePreviewStatus>;
};

const HERO_SLIDES = [
  {
    eyebrow: "STRINGING STUDIO",
    title: ["스트링 선택부터", "장착까지 한 번에"],
    description: "원하는 타구감을 고르고 방문이나 택배로 편하게 장착을 맡겨보세요",
    primary: { label: "추천 스트링 보기", href: "/products" },
    secondary: { label: "교체서비스 신청", href: "/services#service-start" },
    image: "/images/home/home-hero-stringing-workbench.webp",
    alt: "도깨비테니스 스트링 교체 작업대",
  },
  {
    eyebrow: "CURATED FOR YOUR GAME",
    title: ["내 플레이에 맞는", "스트링을 찾아보세요"],
    description: "편안함, 스핀, 컨트롤 등 원하는 기준에 맞춰 스트링을 추천해드려요",
    primary: { label: "플레이별 추천 보기", href: "/products/recommend" },
    secondary: { label: "전체 상품 보기", href: "/products" },
    image: "/images/home/home-string-product-showcase.webp",
    alt: "플레이 스타일별 추천 테니스 스트링",
  },
  {
    eyebrow: "DOKKAEBI ACADEMY",
    title: ["배우는 즐거움부터", "꾸준한 라켓 관리까지"],
    description: "현재 모집 중인 수업을 확인하고 라켓 관리까지 한곳에서 이용해보세요",
    primary: { label: "모집 클래스 보기", href: "/academy" },
    secondary: { label: "아카데미 신청", href: "/academy/apply" },
    image: "/brand/academy-hero-tennis-court.webp",
    alt: "도깨비테니스 아카데미 레슨",
  },
] as const;

const PRODUCT_FILTERS: Array<{ key: ProductFilter; label: string }> = [
  { key: "curated", label: "도깨비 추천" },
  { key: "new", label: "신상품" },
  { key: "comfort", label: "편안한 타구감" },
  { key: "spin", label: "스핀" },
  { key: "control", label: "컨트롤" },
  { key: "durability", label: "내구성" },
  { key: "beginner", label: "처음 시작" },
];

const CONCIERGE_CHOICES: Array<{
  key: ConciergeKey;
  label: string;
  title: [string, string];
  description: string;
  recommendation: string;
  href: string;
}> = [
  {
    key: "comfort",
    label: "팔이 편한 세팅",
    title: ["팔 부담은 줄이고", "타구감은 더 부드럽게"],
    description:
      "엘보 부담이 있거나 편안한 타구감을 원하는 분께 멀티필라멘트와 낮은 텐션 조합을 추천합니다.",
    recommendation: "편안함 80점 이상 스트링",
    href: "/products?comfort=80#product-list",
  },
  {
    key: "spin",
    label: "스핀 중심 세팅",
    title: ["회전은 선명하게", "컨트롤은 안정적으로"],
    description:
      "베이스라인에서 강한 회전을 만드는 플레이어에게 스핀 성능이 높은 폴리 스트링을 제안합니다.",
    recommendation: "스핀 80점 이상 스트링",
    href: "/products?spin=80#product-list",
  },
  {
    key: "power",
    label: "반발력 중심 세팅",
    title: ["힘을 덜 들여도", "공은 더 깊게"],
    description:
      "짧은 스윙에서도 볼 스피드와 비거리를 얻고 싶은 분께 반발력이 높은 조합을 권합니다.",
    recommendation: "반발력 80점 이상 스트링",
    href: "/products?power=80#product-list",
  },
];

const PROMO_BANNERS = (() => {
  const raw = process.env.NEXT_PUBLIC_HOME_PROMO_BANNERS_JSON;
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((value, index) => {
        if (!value || typeof value !== "object") return null;
        const item = value as Record<string, unknown>;
        const label = typeof item.label === "string" ? item.label.trim() : "";
        if (!label) return null;

        return {
          key:
            typeof item.key === "string" && item.key.trim()
              ? item.key
              : `home-promo-${index}`,
          label,
          href: typeof item.href === "string" ? item.href : undefined,
        };
      })
      .filter(
        (
          value,
        ): value is {
          key: string;
          label: string;
          href: string | undefined;
        } => Boolean(value),
      )
      .slice(0, 4);
  } catch {
    return [];
  }
})();

const isTruthy = (value: unknown) => value === true || value === "true" || value === 1;
const formatPrice = (value: number) =>
  `${Math.max(0, Number(value) || 0).toLocaleString("ko-KR")}원`;
const getImageSrc = (images?: string[]) => {
  const src = images?.[0] || "/placeholder.svg";
  return src.startsWith("/") || src.startsWith("http") ? src : `/${src}`;
};

const getDiscountRate = (regularPrice: number, salePrice: number) => {
  if (!Number.isFinite(regularPrice) || !Number.isFinite(salePrice) || regularPrice <= 0)
    return undefined;
  if (salePrice <= 0 || salePrice >= regularPrice) return undefined;
  return ((regularPrice - salePrice) / regularPrice) * 100;
};

const getRacketAvailability = (status?: string): RacketAvailabilityState | null => {
  if (status === "sold") return "sold";
  if (status === "rented") return "rented";
  if (status === "inactive") return "unavailable";
  return null;
};

const formatNoticeDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export default function HomePageRedesign({
  initialHomeData,
  initialHomeStatus,
}: HomePageRedesignProps) {
  const router = useRouter();
  const [activeHero, setActiveHero] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [activeProductFilter, setActiveProductFilter] =
    useState<ProductFilter>("curated");
  const [activeConcierge, setActiveConcierge] = useState<ConciergeKey>("comfort");
  const [activeBrand, setActiveBrand] = useState<BrandKey>("all");
  const [productGroups, setProductGroups] = useState(initialHomeData?.products?.groups);
  const [packages, setPackages] = useState(initialHomeData?.packages ?? []);
  const [notices, setNotices] = useState(initialHomeData?.notices ?? []);
  const [sectionRequestStatus, setSectionRequestStatus] = useState<
    Record<RecoverableSection, SectionRequestStatus>
  >({
    products: initialHomeStatus?.products === "error" ? "error" : "success",
    packages: initialHomeStatus?.packages === "error" ? "error" : "success",
    notices: initialHomeStatus?.notices === "error" ? "error" : "success",
  });
  const [racketsByBrand, setRacketsByBrand] = useState<Record<string, HomePreviewRacket[]>>(
    initialHomeData?.rackets ? { all: initialHomeData.rackets.items } : {},
  );
  const [racketRequestStatus, setRacketRequestStatus] = useState<
    Partial<Record<BrandKey, RacketRequestStatus>>
  >(initialHomeStatus?.rackets === "error" ? { all: "error" } : {});
  const racketRequestStatusRef = useRef<Partial<Record<BrandKey, RacketRequestStatus>>>(
    initialHomeStatus?.rackets === "error" ? { all: "error" } : {},
  );
  const racketRequestControllers = useRef(new Map<BrandKey, AbortController>());
  const recoveryController = useRef<AbortController | null>(null);
  const recoveryRequestId = useRef(0);
  const automaticRecoveryStarted = useRef(false);

  const recoverSections = useCallback(async (sections: readonly RecoverableSection[]) => {
    if (sections.length === 0 || recoveryController.current) return;

    const controller = new AbortController();
    const requestId = ++recoveryRequestId.current;
    recoveryController.current = controller;
    setSectionRequestStatus((current) => {
      const next = { ...current };
      sections.forEach((section) => { next[section] = "loading"; });
      return next;
    });

    try {
      const response = await fetch(`/api/home-preview?sections=${sections.join(",")}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("data" in payload) || !("status" in payload)) {
        throw new Error("Invalid home preview response");
      }
      const result = payload as HomePreviewRecoveryResponse;
      if (controller.signal.aborted || requestId !== recoveryRequestId.current) return;

      if (result.status.products === "success" && result.data.products) {
        setProductGroups(result.data.products.groups);
      }
      if (result.status.packages === "success" && result.data.packages) {
        setPackages(result.data.packages);
      }
      if (result.status.notices === "success" && result.data.notices) {
        setNotices(result.data.notices);
      }
      setSectionRequestStatus((current) => {
        const next = { ...current };
        sections.forEach((section) => {
          next[section] = result.status[section] === "success" ? "success" : "error";
        });
        return next;
      });
    } catch {
      if (!controller.signal.aborted && requestId === recoveryRequestId.current) {
        setSectionRequestStatus((current) => {
          const next = { ...current };
          sections.forEach((section) => { next[section] = "error"; });
          return next;
        });
      }
    } finally {
      if (recoveryController.current === controller) recoveryController.current = null;
    }
  }, []);

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
    if (heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % HERO_SLIDES.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const loadRackets = async (brand: BrandKey) => {
    const currentStatus = racketRequestStatusRef.current[brand];
    if (currentStatus === "loading" || currentStatus === "success") return;

    const controller = new AbortController();
    racketRequestControllers.current.set(brand, controller);
    racketRequestStatusRef.current[brand] = "loading";
    setRacketRequestStatus((current) => ({ ...current, [brand]: "loading" }));
    try {
      const query =
        brand === "all"
          ? "?sort=createdAt_desc&limit=8&withTotal=1"
          : `?brand=${encodeURIComponent(brand)}&sort=createdAt_desc&limit=8&withTotal=1`;
      const response = await fetch(`/api/rackets${query}`, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Failed to load rackets: ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(items)) throw new Error("Invalid racket response");
      if (!controller.signal.aborted) {
        setRacketsByBrand((current) => ({ ...current, [brand]: items }));
        racketRequestStatusRef.current[brand] = "success";
        setRacketRequestStatus((current) => ({ ...current, [brand]: "success" }));
      }
    } catch {
      if (!controller.signal.aborted) {
        racketRequestStatusRef.current[brand] = "error";
        setRacketRequestStatus((current) => ({ ...current, [brand]: "error" }));
      }
    } finally {
      if (racketRequestControllers.current.get(brand) === controller) {
        racketRequestControllers.current.delete(brand);
      }
    }
  };

  useEffect(() => {
    // 공개 HTML 미리보기는 유지하고, 쿠키가 반영되는 API로 최초 전체 목록을 재검증합니다.
    void loadRackets("all");
    // 최초 마운트에서 한 번만 재검증합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (automaticRecoveryStarted.current) return;
    automaticRecoveryStarted.current = true;
    const failedSections = (["products", "packages", "notices"] as const).filter(
      (section) => initialHomeStatus?.[section] === "error",
    );
    void recoverSections(failedSections);
  }, [initialHomeStatus, recoverSections]);

  useEffect(() => () => {
    recoveryRequestId.current += 1;
    recoveryController.current?.abort();
    recoveryController.current = null;
  }, []);

  useEffect(() => {
    const controllers = racketRequestControllers.current;
    return () => {
      controllers.forEach((controller, brand) => {
        controller.abort();
        if (racketRequestStatusRef.current[brand] === "loading") {
          delete racketRequestStatusRef.current[brand];
        }
      });
      controllers.clear();
    };
  }, []);

  const selectBrand = (brand: BrandKey) => {
    setActiveBrand(brand);
    void loadRackets(brand);
  };

  const visibleProducts = productGroups?.[activeProductFilter] ?? [];

  const concierge =
    CONCIERGE_CHOICES.find((choice) => choice.key === activeConcierge) ??
    CONCIERGE_CHOICES[0];
  const visibleRackets = (racketsByBrand[activeBrand] ?? []).slice(0, 4);
  const hero = HERO_SLIDES[activeHero];

  return (
    <div className={styles.page}>
      <SignupBonusPromoPopup
        promo={signupPromo}
        onPrimaryClick={() => router.push("/login?tab=register")}
      />

      <section
        className={styles.heroSection}
        aria-label="주요 캠페인"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.heroStage}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>{hero.eyebrow}</p>
              <h1>
                <span>{hero.title[0]}</span>
                <span>{hero.title[1]}</span>
              </h1>
              <p className={styles.heroDescription}>{hero.description}</p>
              <div className={styles.heroActions}>
                <Link href={hero.primary.href} className={styles.primaryButton}>
                  {hero.primary.label}
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link href={hero.secondary.href} className={styles.secondaryButton}>
                  {hero.secondary.label}
                </Link>
              </div>
            </div>

            <div className={styles.heroMedia} key={hero.image}>
              <Image
                src={hero.image}
                alt={hero.alt}
                fill
                priority={activeHero === 0}
                className={styles.heroImage}
                sizes="(max-width: 767px) calc(100vw - 24px), 720px"
              />
              <div className={styles.heroShade} aria-hidden="true" />
            </div>

            <div className={styles.heroBottom}>
              <div className={styles.heroDots} aria-label="캠페인 선택">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.eyebrow}
                    type="button"
                    aria-label={`${index + 1}번째 캠페인 보기`}
                    aria-current={index === activeHero}
                    onClick={() => setActiveHero(index)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                  </button>
                ))}
              </div>
              <nav className={styles.heroShortcuts} aria-label="빠른 메뉴">
                <Link href="/products">스트링 쇼핑 <ArrowRight aria-hidden="true" /></Link>
                <Link href="/products/recommend">맞춤 추천 <ArrowRight aria-hidden="true" /></Link>
                <Link href="/services#service-start">교체 신청 <ArrowRight aria-hidden="true" /></Link>
              </nav>
            </div>
          </div>

          {PROMO_BANNERS.length > 0 && (
            <div className={styles.promoStrip} aria-label="진행 중인 프로모션">
              {PROMO_BANNERS.map((promo) =>
                promo.href ? (
                  <Link key={promo.key} href={promo.href}>
                    {promo.label.split("\n")[0]}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <span key={promo.key}>{promo.label.split("\n")[0]}</span>
                ),
              )}
            </div>
          )}
        </SiteContainer>
      </section>

      <section className={styles.productSection} id="strings">
        <SiteContainer variant="wide" className={styles.wrap}>
          <SectionHeader
            eyebrow="THIS WEEK'S CURATION"
            title="지금 추천하는 스트링"
            description="지금 판매 중인 스트링 중 도깨비테니스가 추천하는 상품을 모았습니다"
            href="/products"
            linkLabel="전체 스트링 보기"
          />

          <div className={styles.filterTabs} role="tablist" aria-label="스트링 상품 분류">
            {PRODUCT_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={activeProductFilter === filter.key}
                onClick={() => setActiveProductFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {sectionRequestStatus.products === "loading" ? (
            <div className={styles.loadingRail} aria-label="상품 정보를 불러오는 중">
              {[0, 1, 2, 3].map((item) => <span key={item} />)}
            </div>
          ) : sectionRequestStatus.products === "error" ? (
            <EmptyState
              title="상품 정보를 불러오지 못했습니다"
              href="/products"
              linkLabel="전체 스트링 보기"
              onRetry={() => void recoverSections(["products"])}
            />
          ) : visibleProducts.length > 0 ? (
            <div className={styles.productRail}>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  ensureNewBadge={activeProductFilter === "new"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                activeProductFilter === "new"
                  ? "현재 등록된 신상품이 없습니다"
                  : "조건에 맞는 스트링을 준비하고 있습니다"
              }
              href="/products"
              linkLabel="전체 스트링 보기"
            />
          )}
          <p className={styles.swipeHint}>옆으로 밀어 다른 상품도 확인하세요.</p>
        </SiteContainer>
      </section>

      <section className={styles.conciergeSection} id="concierge">
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.conciergeGrid}>
            <div className={styles.conciergeIntro}>
              <p className={styles.sectionEyebrow}>STRING CONCIERGE</p>
              <h2>나에게 맞는 스트링<br />1분이면 찾을 수 있어요</h2>
              <p>
                어려운 소재명 대신 원하는 플레이 감각을 골라보세요. 상품 탐색부터
                교체서비스 신청까지 한 흐름으로 연결합니다.
              </p>
              <div className={styles.conciergeTabs} role="tablist" aria-label="플레이 성향 선택">
                {CONCIERGE_CHOICES.map((choice, index) => (
                  <button
                    key={choice.key}
                    type="button"
                    role="tab"
                    aria-selected={activeConcierge === choice.key}
                    onClick={() => setActiveConcierge(choice.key)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.conciergeResult}>
              <div className={styles.conciergeMedia}>
                <Image
                  src="/images/home/home-stringing-setup-clean.webp"
                  alt="전문 스트링 교체 작업대"
                  fill
                  className={styles.coverImage}
                  sizes="(max-width: 767px) calc(100vw - 24px), 460px"
                />
              </div>
              <div className={styles.conciergeCopy} key={concierge.key}>
                <p>YOUR SETUP</p>
                <h3>
                  <span>{concierge.title[0]}</span>
                  <span>{concierge.title[1]}</span>
                </h3>
                <p>{concierge.description}</p>
                <dl>
                  <dt>추천 기준</dt>
                  <dd>{concierge.recommendation}</dd>
                </dl>
                <Link href={concierge.href} className={styles.primaryButton}>
                  이 기준 상품 보기
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>

      <section className={styles.racketSection} id="rackets">
        <SiteContainer variant="wide" className={styles.wrap}>
          <SectionHeader
            eyebrow="CERTIFIED PRE-OWNED"
            title="검수된 중고 라켓"
            description="상태와 스펙을 직접 확인한 라켓만 보여드려요"
            href="/rackets"
            linkLabel="중고 라켓 전체 보기"
          />

          <div className={styles.brandTabs} role="tablist" aria-label="중고 라켓 브랜드">
            <button
              type="button"
              role="tab"
              aria-selected={activeBrand === "all"}
              onClick={() => void selectBrand("all")}
            >
              전체
            </button>
            {RACKET_BRANDS.map((brand) => (
              <button
                key={brand.value}
                type="button"
                role="tab"
                aria-selected={activeBrand === brand.value}
                onClick={() => void selectBrand(brand.value)}
              >
                {brand.label}
              </button>
            ))}
          </div>

          {visibleRackets.length > 0 ? (
            <div className={styles.racketRail} aria-live="polite">
              {visibleRackets.map((racket) => (
                <RacketCard key={racket.id} racket={racket} />
              ))}
            </div>
          ) : racketRequestStatus[activeBrand] === "loading" ? (
            <div className={styles.loadingRail} aria-label="중고 라켓을 불러오는 중">
              {[0, 1, 2, 3].map((item) => <span key={item} />)}
            </div>
          ) : racketRequestStatus[activeBrand] === "error" ? (
            <EmptyState
              title="중고 라켓 정보를 불러오지 못했습니다"
              href="/rackets"
              linkLabel="전체 재고 확인하기"
              onRetry={() => void loadRackets(activeBrand)}
            />
          ) : (
            <EmptyState
              title={`${activeBrand === "all" ? "" : `${racketBrandLabel(activeBrand)} `}중고 라켓을 준비하고 있습니다.`}
              href="/rackets"
              linkLabel="전체 재고 확인하기"
            />
          )}
          <p className={styles.swipeHint}>옆으로 밀어 다른 라켓도 확인하세요.</p>
        </SiteContainer>
      </section>

      <section className={styles.experienceSection}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <header className={styles.experienceHeader}>
            <div>
              <p className={styles.sectionEyebrow}>PLAY BETTER, LONGER</p>
              <h2>테니스를 시작하는 순간부터<br />라켓 관리까지</h2>
            </div>
            <p>
              배우는 시간부터 라켓을 다시 준비하는 순간까지,
              도깨비테니스가 다음 플레이를 함께 만듭니다.
            </p>
          </header>

          <div className={styles.experienceGrid}>
            <ExperienceCard
              href="/academy"
              image="/brand/academy-hero-tennis-court.webp"
              alt="도깨비테니스 아카데미 레슨"
              eyebrow="ACADEMY"
              title={["현재 모집 중인", "레슨과 클래스"]}
              description="기초부터 실전까지 내 수준에 맞는 수업을 찾아보세요"
              action="클래스 보기"
              wide
            />
            <ExperienceCard
              href="/racket-care"
              image="/images/home/home-racket-section-showcase.webp"
              alt="관리를 기다리는 테니스 라켓"
              eyebrow="RACKET CARE"
              title={["교체 이력과 다음 관리", "시기를 한눈에"]}
              description="스트링 교체 기록과 라켓 상태를 꾸준히 관리해보세요"
              action="내 라켓 관리"
            />
          </div>
        </SiteContainer>
      </section>

      <section className={styles.packageSection}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <SectionHeader
            eyebrow="STRINGING PACKAGES"
            title="자주 교체한다면 패키지로 더 간편하게"
            description="교체 주기와 필요한 횟수에 맞춰 패키지를 선택해보세요"
            href="/services/packages"
            linkLabel="패키지 전체 보기"
          />

          {sectionRequestStatus.packages === "loading" ? (
            <div className={styles.packageLoading} aria-label="패키지 정보를 불러오는 중">
              {[0, 1, 2].map((item) => <span key={item} />)}
            </div>
          ) : sectionRequestStatus.packages === "error" ? (
            <EmptyState
              title="패키지 정보를 불러오지 못했습니다"
              href="/services/packages"
              linkLabel="패키지 안내 보기"
              onRetry={() => void recoverSections(["packages"])}
            />
          ) : packages.length > 0 ? (
            <div className={styles.packageGrid}>
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} featured={pkg.isPopular} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="이용 가능한 교체 패키지를 준비하고 있습니다."
              href="/services/packages"
              linkLabel="패키지 안내 보기"
            />
          )}
        </SiteContainer>
      </section>

      <section className={styles.trustSection}>
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.trustGrid}>
            <div className={styles.trustIntro}>
              <p className={styles.sectionEyebrow}>WHY DOKKAEBI TENNIS</p>
              <h2>스트링 선택부터<br />라켓 관리까지 한곳에서</h2>
              <Link href="/reviews">
                실제 이용 후기 보기
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            {[
              ["01", "상품 선택", "플레이 성향과 제품 특성을 비교해 알맞은 스트링을 고릅니다"],
              ["02", "전문 장착", "방문이나 택배로 접수하고 원하는 텐션으로 장착합니다"],
              ["03", "이력 관리", "마지막 교체일과 라켓별 관리 기록을 이어서 확인합니다"],
            ].map(([number, title, description]) => (
              <article key={number} className={styles.trustItem}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </SiteContainer>
      </section>

      <section className={styles.supportSection} id="support">
        <SiteContainer variant="wide" className={styles.wrap}>
          <div className={styles.noticeRow}>
            <span>NOTICE</span>
            {sectionRequestStatus.notices === "loading" ? (
              <span className={styles.noticeStatus} aria-live="polite">공지사항을 불러오는 중입니다</span>
            ) : sectionRequestStatus.notices === "error" ? (
              <span className={styles.noticeStatus} aria-live="polite">
                공지사항을 불러오지 못했습니다
                <button type="button" onClick={() => void recoverSections(["notices"])}>다시 시도</button>
              </span>
            ) : notices[0] ? (
              <Link href={`/board/notice/${notices[0]._id}`}>
                <time>{formatNoticeDate(notices[0].createdAt)}</time>
                {notices[0].title}
              </Link>
            ) : (
              <Link href="/board/notice">새로운 공지사항을 확인하세요</Link>
            )}
            <Link href="/board/notice">전체 보기 <ArrowRight aria-hidden="true" /></Link>
          </div>

          <nav className={styles.supportCards} aria-label="자주 찾는 이용 안내">
            {[
              ["방문 접수", "매장 위치와 운영시간", "/services/locations"],
              ["빠른 상담", "문의 게시판으로 상담하기", "/board/qna"],
              ["비용 안내", "장착비와 서비스 비용", "/services/pricing"],
            ].map(([eyebrow, title, href]) => (
              <Link key={href} href={href}>
                <span>{eyebrow}</span>
                <strong>{title}</strong>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </SiteContainer>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <header className={styles.sectionHeader}>
      <div>
        <p className={styles.sectionEyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link href={href} className={styles.textLink}>
        {linkLabel}
        <ArrowRight aria-hidden="true" />
      </Link>
    </header>
  );
}

function ProductCard({
  product,
  ensureNewBadge,
}: {
  product: HomePreviewProduct;
  ensureNewBadge: boolean;
}) {
  const price = getEffectiveProductPrice(product);
  const isDiscounted = price < product.price;
  const badges = commerceBadgeSpecs(
    {
      isSoldOut: isStringProductSoldOut(product),
      isSale: isDiscounted,
      isRecommended: isTruthy(product.inventory?.isFeatured),
      isNew: isTruthy(product.inventory?.isNew) || isTruthy(product.isNew),
      discountRate: getDiscountRate(product.price, price),
    },
    "image",
    { ensureNew: ensureNewBadge },
  );

  return (
    <article className={styles.productCard}>
      <Link href={`/products/${product._id}`}>
        <div className={styles.productImage}>
          <Image
            src={getImageSrc(product.images)}
            alt={product.name}
            fill
            className={styles.containImage}
            sizes="(max-width: 767px) 82vw, (max-width: 1199px) 25vw, 300px"
          />
          {badges.length > 0 && (
            <div className={styles.productBadges}>
              {badges.map((badge) => (
                <SemanticBadge
                  key={badge.label}
                  tone={badge.tone}
                  emphasis={badge.emphasis}
                  size={badge.size}
                  shape={badge.shape}
                >
                  {badge.label}
                </SemanticBadge>
              ))}
            </div>
          )}
        </div>
        <div className={styles.productMeta}>
          <p>{stringBrandLabel(product.brand)}</p>
          <h3>{product.name}</h3>
          <small>
            {product.features?.comfort ? `편안함 ${product.features.comfort}` : "스트링 상품"}
            {product.features?.control ? ` · 컨트롤 ${product.features.control}` : ""}
          </small>
          <div>
            <strong>{formatPrice(price)}</strong>
            {isDiscounted && <del>{formatPrice(product.price)}</del>}
          </div>
        </div>
      </Link>
    </article>
  );
}

function RacketCard({ racket }: { racket: HomePreviewRacket }) {
  const price = getEffectiveRacketPrice(racket);
  const discountRate = getRacketDiscountRate(racket);
  const brand = racketBrandLabel(racket.brand);
  const availability = getRacketAvailability(racket.status);
  const marketingBadges = commerceBadgeSpecs(
    {
      isSale: racket.marketing?.isSale === true,
      isRecommended: racket.marketing?.isFeatured === true,
      isNew: racket.marketing?.isNew === true,
      discountRate,
    },
    "image",
  );
  const badgeCountBeforeMarketing = Number(Boolean(availability)) + 1;
  const visibleMarketingBadges = marketingBadges.slice(0, Math.max(0, 3 - badgeCountBeforeMarketing));

  return (
    <article className={styles.racketCard}>
      <Link href={`/rackets/${racket.id}`}>
        <div className={styles.racketImage}>
          <Image
            src={getImageSrc(racket.images)}
            alt={`${brand} ${racket.model}`}
            fill
            className={styles.containImage}
            sizes="(max-width: 767px) 82vw, (max-width: 1199px) 25vw, 300px"
          />
          <div className={styles.racketBadges}>
            {availability && (
              <RacketBadge kind="availability" state={availability} surface="image" />
            )}
            {racket.condition ? (
              <RacketBadge kind="condition" state={racket.condition} surface="image" />
            ) : (
              <RacketBadge kind="inspection" surface="image" />
            )}
            {visibleMarketingBadges.map((badge) => (
              <SemanticBadge
                key={badge.label}
                tone={badge.tone}
                emphasis={badge.emphasis}
                size={badge.size}
                shape={badge.shape}
              >
                {badge.label}
              </SemanticBadge>
            ))}
          </div>
        </div>
        <div className={styles.racketMeta}>
          <p>{brand}</p>
          <h3>{racket.model}</h3>
          <small>
            {racket.rental?.enabled ? "구매 · 대여 가능" : "구매 가능"}
            {racket.marketing?.isNew ? " · 신규 등록" : ""}
          </small>
          <div>
            <strong>{formatPrice(price)}</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}

function ExperienceCard({
  href,
  image,
  alt,
  eyebrow,
  title,
  description,
  action,
  wide = false,
}: {
  href: string;
  image: string;
  alt: string;
  eyebrow: string;
  title: [string, string];
  description: string;
  action: string;
  wide?: boolean;
}) {
  return (
    <Link href={href} className={wide ? styles.experienceCardWide : styles.experienceCard}>
      <Image
        src={image}
        alt={alt}
        fill
        className={styles.coverImage}
        sizes={wide ? "(max-width: 767px) calc(100vw - 24px), 760px" : "520px"}
      />
      <div className={styles.experienceShade} aria-hidden="true" />
      <div className={styles.experienceCopy}>
        <p>{eyebrow}</p>
        <h3><span>{title[0]}</span><span>{title[1]}</span></h3>
        <small>{description}</small>
        <strong>{action} <ArrowRight aria-hidden="true" /></strong>
      </div>
    </Link>
  );
}

function PackageCard({
  pkg,
  featured,
}: {
  pkg: HomePreviewPackage;
  featured: boolean;
}) {
  const perSession = pkg.sessions > 0 ? Math.round(pkg.price / pkg.sessions) : 0;

  return (
    <article className={featured ? styles.packageCardFeatured : styles.packageCard}>
      <div className={styles.packageBadge}>
        {featured ? (
          <CommerceBadge kind="recommended" surface="inline" size="md" />
        ) : (
          <SemanticBadge tone="neutral" emphasis="soft" size="md">
            교체 패키지
          </SemanticBadge>
        )}
      </div>
      <h3>{pkg.name}</h3>
      <strong>{pkg.sessions}회</strong>
      <small>{pkg.description || `유효기간 ${pkg.validityDays}일`}</small>
      <div className={styles.packagePrice}>
        <b>{formatPrice(pkg.price)}</b>
        {perSession > 0 && <span>회당 {formatPrice(perSession)}</span>}
      </div>
      <Link href={`/services/packages/checkout?package=${pkg.id}`}>
        패키지 보기
        <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function EmptyState({
  title,
  href,
  linkLabel,
  onRetry,
}: {
  title: string;
  href: string;
  linkLabel: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.emptyState} aria-live="polite">
      <p>{title}</p>
      <div>
        {onRetry && <button type="button" onClick={onRetry}>다시 시도</button>}
        <Link href={href}>{linkLabel} <ArrowRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
