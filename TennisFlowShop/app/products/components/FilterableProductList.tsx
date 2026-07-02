"use client";

import { FilterPanel } from "@/app/products/components/FilterPanel";
import ProductCard from "@/app/products/components/ProductCard";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { EmptyState, SummaryCard } from "@/components/public";
import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BENEFIT_FILTER_VALUES,
  BENEFIT_LABELS,
  type BenefitFilterValue,
  formatBenefitFilterLabel,
  parseBenefitFilters,
  serializeBenefitFilters,
} from "@/lib/benefit-labels";
import { stringMaterialLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, Filter, Grid3X3, List, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// 브랜드 리스트
const brands = [
  { label: "럭실론", value: "luxilon" },
  { label: "테크니화이버", value: "tecnifibre" },
  { label: "윌슨", value: "wilson" },
  { label: "바볼랏", value: "babolat" },
  { label: "헤드", value: "head" },
  { label: "요넥스", value: "yonex" },
  { label: "솔린코", value: "solinco" },
  // { label: "프린스", value: "prince" },
  { label: "던롭", value: "dunlop" },
  { label: "MSV", value: "msv" },
  { label: "볼키", value: "volkl" },
  { label: "탑스핀", value: "topspin" },
  { label: "기타", value: "other" },
];

// 브랜드 라벨 매핑 (소문자 key)
const brandLabelMap: Record<string, string> = Object.fromEntries(
  brands.map(({ value, label }) => [value, label]),
);

// 가격 필터 기본값
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 200000;
const DEFAULT_PRICE_RANGE: [number, number] = [DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE];

const activeFilterChipClass =
  "inline-flex max-w-[220px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 py-1 text-ui-label text-foreground";
const activeFilterRemoveButtonClass =
  "shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const QUICK_BENEFIT_FILTERS = BENEFIT_FILTER_VALUES.map((value) => ({
  label: value === "sale" ? "할인상품" : BENEFIT_LABELS[value],
  value,
  ariaLabel:
    value === "featured" ? "추천 상품 보기" : value === "new" ? "신상품 보기" : "할인 상품 보기",
}));
const quickToggleButtonClass = (isActive: boolean) =>
  cn(
    "h-10 shrink-0 whitespace-nowrap rounded-full border px-3 text-ui-body-sm transition-colors bp-sm:h-9",
    isActive
      ? "border-border bg-muted text-foreground shadow-sm hover:bg-muted/80"
      : "border-border bg-background text-muted-foreground hover:bg-muted/30",
  );

/**
 * 필터 가능한 상품 리스트 (infinite scroll 포함)
 */

type Props = {
  initialBrand?: string | null;
  initialMaterial?: string | null;
};

export default function FilterableProductList({
  initialBrand = null,
  initialMaterial = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isApplyFlow = searchParams.get("from") === "apply";
  const includeSoldOut = searchParams.get("includeSoldOut") === "true";

  // 정렬 / 뷰 모드
  const [sortOption, setSortOption] = useState("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // 필터 상태들
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrand);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(initialMaterial);
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null);
  const [selectedDurability, setSelectedDurability] = useState<number | null>(null);
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null);
  const [selectedControl, setSelectedControl] = useState<number | null>(null);
  const [selectedComfort, setSelectedComfort] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [exposureFilter, setExposureFilter] = useState<BenefitFilterValue[]>([]);

  // 모바일(Sheet) 전용: 임시 선택값(draft)
  // - Sheet 안에서 선택해도 즉시 서버 조회가 일어나지 않게 하기 위함
  // - "적용"을 눌렀을 때만 selectedXXX로 커밋한다
  const [draftBrand, setDraftBrand] = useState<string | null>(initialBrand);
  const [draftMaterial, setDraftMaterial] = useState<string | null>(initialMaterial);
  const [draftBounce, setDraftBounce] = useState<number | null>(null);
  const [draftDurability, setDraftDurability] = useState<number | null>(null);
  const [draftSpin, setDraftSpin] = useState<number | null>(null);
  const [draftControl, setDraftControl] = useState<number | null>(null);
  const [draftComfort, setDraftComfort] = useState<number | null>(null);
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);

  // 모바일에서 검색 입력도 draft로만 관리 (취소 시 되돌리기 위함)
  const [draftSearchQuery, setDraftSearchQuery] = useState("");

  // 검색어: 입력 중인 것 / 실제 제출되어 조회에 쓰이는 것
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // 토글 (모바일용)
  const [showFilters, setShowFilters] = useState(false);

  // 애니메이션 / 리셋 key
  const [resetKey, setResetKey] = useState(0);

  // 모바일 Sheet 안에서만 리셋 애니메이션/초기화 트리거
  const [draftResetKey, setDraftResetKey] = useState(0);

  // URL sync 초기화/변경 관리 (루프 방지)
  const isInitializingRef = useRef(true);
  const lastSerializedRef = useRef("");

  // 초기 URL -> 상태
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (matches) setViewMode("grid");
    };
    syncViewport(mql.matches);
    const onChange = (e: MediaQueryListEvent) => syncViewport(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isInitializingRef.current) {
      const brand = searchParams.get("brand");
      setSelectedBrand(brand || null);

      const material = searchParams.get("material");
      if (material && material !== selectedMaterial) setSelectedMaterial(material);

      const bounce = searchParams.get("power");
      setSelectedBounce(bounce ? Number(bounce) : null);

      const control = searchParams.get("control");
      setSelectedControl(control ? Number(control) : null);

      const spin = searchParams.get("spin");
      setSelectedSpin(spin ? Number(spin) : null);

      const durability = searchParams.get("durability");
      setSelectedDurability(durability ? Number(durability) : null);

      const comfort = searchParams.get("comfort");
      setSelectedComfort(comfort ? Number(comfort) : null);

      const minPrice = searchParams.get("minPrice");
      const maxPrice = searchParams.get("maxPrice");
      setPriceRange([
        minPrice ? Number(minPrice) : DEFAULT_MIN_PRICE,
        maxPrice ? Number(maxPrice) : DEFAULT_MAX_PRICE,
      ]);

      setExposureFilter(parseBenefitFilters(searchParams.get("exposure")));

      setSortOption(searchParams.get("sort") || "latest");

      const view = searchParams.get("view");
      setViewMode(isMobileViewport ? "grid" : view === "list" ? "list" : "grid");

      const q = searchParams.get("q") || "";
      setSearchQuery(q);
      setSubmittedQuery(q);

      lastSerializedRef.current = searchParams.toString();
      isInitializingRef.current = false;
      return;
    }

    // 뒤로/앞으로 등 URL 변화 동기화 (필터 관련만, 검색은 submittedQuery 기준)

    const brand = searchParams.get("brand");
    if ((brand || null) !== selectedBrand) setSelectedBrand(brand || null);

    const material = searchParams.get("material");
    if ((material || null) !== selectedMaterial) setSelectedMaterial(material || null);

    const bounce = searchParams.get("power");
    const bounceVal = bounce ? Number(bounce) : null;
    if (bounceVal !== selectedBounce) setSelectedBounce(bounceVal);

    const control = searchParams.get("control");
    const controlVal = control ? Number(control) : null;
    if (controlVal !== selectedControl) setSelectedControl(controlVal);

    const spin = searchParams.get("spin");
    const spinVal = spin ? Number(spin) : null;
    if (spinVal !== selectedSpin) setSelectedSpin(spinVal);

    const durability = searchParams.get("durability");
    const durabilityVal = durability ? Number(durability) : null;
    if (durabilityVal !== selectedDurability) setSelectedDurability(durabilityVal);

    const comfort = searchParams.get("comfort");
    const comfortVal = comfort ? Number(comfort) : null;
    if (comfortVal !== selectedComfort) setSelectedComfort(comfortVal);

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const pr: [number, number] = [
      minPrice ? Number(minPrice) : DEFAULT_MIN_PRICE,
      maxPrice ? Number(maxPrice) : DEFAULT_MAX_PRICE,
    ];
    if (pr[0] !== priceRange[0] || pr[1] !== priceRange[1]) setPriceRange(pr);

    const nextExposure = parseBenefitFilters(searchParams.get("exposure"));
    if (nextExposure.join(",") !== exposureFilter.join(",")) setExposureFilter(nextExposure);

    const sort = searchParams.get("sort") || "latest";
    if (sort !== sortOption) setSortOption(sort);

    const view = searchParams.get("view");
    const desiredView = isMobileViewport ? "grid" : view === "list" ? "list" : "grid";
    if (desiredView !== viewMode) setViewMode(desiredView as "grid" | "list");
  }, [searchParams, isMobileViewport]);

  // 기본 범위면 아예 min/max를 안 보내서 "가격 필터 미적용" 상태 유지
  const minPriceParam = priceRange[0] > DEFAULT_MIN_PRICE ? priceRange[0] : undefined;
  const maxPriceParam = priceRange[1] < DEFAULT_MAX_PRICE ? priceRange[1] : undefined;

  // 서버 필터링 + 무한 스크롤
  const {
    products: productsList,
    total,
    isLoadingInitial,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    reset: resetInfinite,
  } = useInfiniteProducts({
    brand: selectedBrand ?? undefined,
    material: selectedMaterial ?? undefined,
    power: selectedBounce ?? undefined,
    control: selectedControl ?? undefined,
    spin: selectedSpin ?? undefined,
    durability: selectedDurability ?? undefined,
    comfort: selectedComfort ?? undefined,
    q: submittedQuery,
    sort: sortOption,
    limit: 12,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    purpose: isApplyFlow ? "stringing" : undefined,
    exposure: serializeBenefitFilters(exposureFilter) ?? "all",
    includeSoldOut,
  });

  /**
   * 전환(Transition) 플래그
   * - 필터/검색 변경 직후 products가 먼저 비워지면서 "0개"가 1프레임 찍히는 문제를 막는다.
   * - useLayoutEffect로 "페인트 전에" 플래그를 켜서 사용자가 깜빡임을 보지 않게 한다.
   */
  const [isUiTransitioning, setIsUiTransitioning] = useState(false);
  const sawLoadingRef = useRef(false);

  // "서버 조회에 영향을 주는 값"들만 묶어서 키로 만든다. (viewMode 같은 UI-only 값은 제외)
  const filterKey = useMemo(() => {
    return [
      selectedBrand ?? "",
      selectedMaterial ?? "",
      selectedBounce ?? "",
      selectedDurability ?? "",
      selectedSpin ?? "",
      selectedControl ?? "",
      selectedComfort ?? "",
      submittedQuery ?? "",
      sortOption ?? "",
      priceRange[0],
      priceRange[1],
      exposureFilter.join(","),
      includeSoldOut ? "includeSoldOut" : "excludeSoldOut",
    ].join("|");
  }, [
    selectedBrand,
    selectedMaterial,
    selectedBounce,
    selectedDurability,
    selectedSpin,
    selectedControl,
    selectedComfort,
    submittedQuery,
    exposureFilter,
    sortOption,
    priceRange,
    includeSoldOut,
  ]);

  // 필터 키가 바뀌는 "그 순간"에 전환 플래그 ON (페인트 전에 실행)
  useLayoutEffect(() => {
    // 초기 URL → 상태 동기화 중에는 기존 로딩 흐름을 우선한다
    if (isInitializingRef.current) return;

    setIsUiTransitioning(true);
    sawLoadingRef.current = false;
  }, [filterKey]);

  // 전환 플래그 OFF 조건:
  // - 전환 중(isUiTransitioning)이고,
  // - 로딩을 한 번이라도 봤고(isLoadingInitial을 true로 봤고),
  // - 다시 isLoadingInitial이 false가 되면(= 1페이지 응답 완료) 전환 종료
  useEffect(() => {
    if (!isUiTransitioning) return;

    if (isLoadingInitial) {
      sawLoadingRef.current = true;
      return;
    }

    if (sawLoadingRef.current && !isLoadingInitial) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }

    // 에러 시에도 스켈레톤이 붙잡고 있지 않도록 해제
    if (error) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }
  }, [isUiTransitioning, isLoadingInitial, error]);

  const loadedCount = (productsList ?? []).length;
  const showInlineLoadingSkeleton = isLoadingInitial && loadedCount === 0;
  const hasInitialFetchSettled = total !== null || error !== null;
  const canShowEmptyState = hasInitialFetchSettled && loadedCount === 0 && !isLoadingInitial;
  const isCountLoading = total === null && loadedCount === 0;
  const isBackgroundRefreshing = isUiTransitioning && loadedCount > 0;

  // 검색 제출 handler
  const handleSearchSubmit = useCallback(() => {
    // 새 검색이면 submittedQuery 바꾸고 페이징 리셋
    setSubmittedQuery(searchQuery);
    // resetInfinite를 직접 호출해서 새로 고침 보장 (훅 내부에서 감지 안할 경우 대비)
    setIsUiTransitioning(true);
    resetInfinite();
  }, [searchQuery, resetInfinite]);

  // 검색 초기화
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedQuery("");
    setIsUiTransitioning(true);
    resetInfinite();
  }, [resetInfinite]);

  // 필터 초기화
  const handleResetAll = useCallback(() => {
    setResetKey((k) => k + 1);
    setSelectedBrand(null);
    setSelectedMaterial(null);
    setSelectedBounce(null);
    setSelectedDurability(null);
    setSelectedSpin(null);
    setSelectedControl(null);
    setSelectedComfort(null);
    setPriceRange(DEFAULT_PRICE_RANGE);
    setExposureFilter([]);
    setSortOption("latest");
    setViewMode("grid");
    setSearchQuery("");
    setSubmittedQuery("");
    setIsUiTransitioning(true);
    resetInfinite();
  }, [resetInfinite]);

  const handleClearInput = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleToggleIncludeSoldOut = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (includeSoldOut) {
      params.delete("includeSoldOut");
    } else {
      params.set("includeSoldOut", "true");
    }

    const newSearch = params.toString();
    lastSerializedRef.current = newSearch;
    setIsUiTransitioning(true);
    router.replace(`${pathname}${newSearch ? `?${newSearch}` : ""}`, { scroll: false });
  }, [includeSoldOut, pathname, router, searchParams]);

  // draft를 현재 applied(selectedXXX) 상태로 동기화 (Sheet 열 때 / 취소할 때 사용)
  const syncDraftFromApplied = useCallback(() => {
    setDraftBrand(selectedBrand);
    setDraftMaterial(selectedMaterial);
    setDraftBounce(selectedBounce);
    setDraftDurability(selectedDurability);
    setDraftSpin(selectedSpin);
    setDraftControl(selectedControl);
    setDraftComfort(selectedComfort);
    setDraftPriceRange(priceRange);
    setDraftSearchQuery(searchQuery);
  }, [
    selectedBrand,
    selectedMaterial,
    selectedBounce,
    selectedDurability,
    selectedSpin,
    selectedControl,
    selectedComfort,
    priceRange,
    searchQuery,
  ]);

  // Sheet 열기: 열릴 때마다 draft를 applied로 맞춰서 "현재 상태"를 보여준다
  const openFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(true);
  }, [syncDraftFromApplied]);

  // Sheet 취소(닫기): draft를 applied로 되돌리고 닫는다
  const cancelFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(false);
  }, [syncDraftFromApplied]);

  // Sheet 적용: draft -> applied로 커밋 + 페이징 리셋 + 닫기
  const applyFiltersSheet = useCallback(() => {
    setSelectedBrand(draftBrand);
    setSelectedMaterial(draftMaterial);
    setSelectedBounce(draftBounce);
    setSelectedDurability(draftDurability);
    setSelectedSpin(draftSpin);
    setSelectedControl(draftControl);
    setSelectedComfort(draftComfort);
    setPriceRange(draftPriceRange);

    // 검색은 "제출된 값"만 서버 조회에 쓰이므로, 적용 시점에 submittedQuery를 갱신
    setSearchQuery(draftSearchQuery);
    setSubmittedQuery(draftSearchQuery);
    setIsUiTransitioning(true);
    resetInfinite(); // 여기서만 서버 재조회 발생
    setShowFilters(false); // 적용 후 닫기
  }, [
    draftBrand,
    draftMaterial,
    draftBounce,
    draftDurability,
    draftSpin,
    draftControl,
    draftComfort,
    draftPriceRange,
    draftSearchQuery,
    resetInfinite,
  ]);

  // 모바일에서만 "초기화" (draft만 초기화; 적용 전까진 실제 결과는 안 바뀜)
  const handleResetAllDraft = useCallback(() => {
    setDraftResetKey((k) => k + 1);
    setDraftBrand(null);
    setDraftMaterial(null);
    setDraftBounce(null);
    setDraftDurability(null);
    setDraftSpin(null);
    setDraftControl(null);
    setDraftComfort(null);
    setDraftPriceRange(DEFAULT_PRICE_RANGE);
    setDraftSearchQuery("");
  }, []);

  // Sheet overlay/ESC로 닫히는 경우도 "취소"로 처리
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (open) openFiltersSheet();
      else cancelFiltersSheet();
    },
    [openFiltersSheet, cancelFiltersSheet],
  );

  // FilterPanel에서 제어 가능한 조건만 필터 버튼/패널 카운트에 반영한다.
  const priceChanged = priceRange[0] > DEFAULT_MIN_PRICE || priceRange[1] < DEFAULT_MAX_PRICE;
  const panelFiltersCount = [
    selectedBrand,
    selectedMaterial,
    selectedBounce,
    selectedDurability,
    selectedSpin,
    selectedControl,
    selectedComfort,
    submittedQuery,
    priceChanged,
  ].filter(Boolean).length;
  const hasAppliedPanelFilters = panelFiltersCount > 0;
  const hasAnyAppliedFilters = hasAppliedPanelFilters || exposureFilter.length > 0;

  const draftPriceChanged =
    draftPriceRange[0] > DEFAULT_MIN_PRICE || draftPriceRange[1] < DEFAULT_MAX_PRICE;
  const activeDraftCount = [
    draftBrand,
    draftMaterial,
    draftBounce,
    draftDurability,
    draftSpin,
    draftControl,
    draftComfort,
    draftSearchQuery,
    draftPriceChanged,
  ].filter(Boolean).length;
  const exposureLabel = formatBenefitFilterLabel(exposureFilter);
  const productCountPrefix = exposureLabel ? `${exposureLabel} 상품 총` : "총";
  const getScoreLabel = (value: number) => `${value} 이상`;
  const getPriceChipLabel = (range: [number, number]) => {
    if (range[0] === 0 && range[1] === 10000) return "1만원 이하";
    if (range[0] === 10000 && range[1] === 20000) return "1만원 ~ 2만원";
    if (range[0] === 20000 && range[1] === 30000) return "2만원 ~ 3만원";
    if (range[0] === 30000 && range[1] === 200000) return "3만원 이상";
    return `가격 ${range[0]}원 ~ ${range[1]}원`;
  };
  const handleToggleExposure = useCallback((value: BenefitFilterValue) => {
    setExposureFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }, []);

  // 상태 -> URL 반영 (검색어는 submittedQuery만)
  useEffect(() => {
    if (isInitializingRef.current) return;

    // 현재 URL을 기반으로 시작: from=apply 같은 "기타 쿼리"를 유지하기 위함
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string | null) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete("brand", selectedBrand);
    setOrDelete("material", selectedMaterial);
    setOrDelete("power", selectedBounce !== null ? String(selectedBounce) : null);
    setOrDelete("control", selectedControl !== null ? String(selectedControl) : null);
    setOrDelete("spin", selectedSpin !== null ? String(selectedSpin) : null);
    setOrDelete("durability", selectedDurability !== null ? String(selectedDurability) : null);
    setOrDelete("comfort", selectedComfort !== null ? String(selectedComfort) : null);
    setOrDelete("q", submittedQuery ? submittedQuery : null);
    setOrDelete("exposure", serializeBenefitFilters(exposureFilter));
    setOrDelete("includeSoldOut", includeSoldOut ? "true" : null);

    // 기본값이면 URL에 굳이 남기지 않기(기존 동작 유지)
    setOrDelete("sort", sortOption && sortOption !== "latest" ? sortOption : null);
    setOrDelete("view", !isMobileViewport && viewMode !== "grid" ? viewMode : null);
    setOrDelete("minPrice", priceRange[0] > DEFAULT_MIN_PRICE ? String(priceRange[0]) : null);
    setOrDelete("maxPrice", priceRange[1] < DEFAULT_MAX_PRICE ? String(priceRange[1]) : null);

    const newSearch = params.toString();
    if (newSearch === lastSerializedRef.current) return;
    lastSerializedRef.current = newSearch;

    const nextUrl = `${pathname}${newSearch ? `?${newSearch}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [
    selectedBrand,
    selectedMaterial,
    selectedBounce,
    selectedDurability,
    selectedSpin,
    selectedControl,
    selectedComfort,
    submittedQuery,
    exposureFilter,
    sortOption,
    viewMode,
    isMobileViewport,
    priceRange,
    includeSoldOut,
    router,
    pathname,
    searchParams,
  ]);
  // infinite scroll 관찰자
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore || isLoadingInitial || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isFetchingMore && !isLoadingInitial) {
          loadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, hasMore, isLoadingInitial, loadMore],
  );

  // 데스크톱/모바일 공통: 패널 안에서는 draft만 변경하고 적용 시 커밋
  const desktopFilterPanelProps = {
    selectedBrand: draftBrand,
    setSelectedBrand: setDraftBrand,
    selectedMaterial: draftMaterial,
    setSelectedMaterial: setDraftMaterial,
    selectedBounce: draftBounce,
    setSelectedBounce: setDraftBounce,
    selectedControl: draftControl,
    setSelectedControl: setDraftControl,
    selectedSpin: draftSpin,
    setSelectedSpin: setDraftSpin,
    selectedDurability: draftDurability,
    setSelectedDurability: setDraftDurability,
    selectedComfort: draftComfort,
    setSelectedComfort: setDraftComfort,
    searchQuery: draftSearchQuery,
    setSearchQuery: setDraftSearchQuery,
    priceRange: draftPriceRange,
    setPriceRange: setDraftPriceRange,
    resetKey: draftResetKey,
    activeFiltersCount: activeDraftCount,
    onReset: handleResetAllDraft,
    isLoadingInitial,
    showFilters,
    setShowFilters,
    brands,
    onClose: cancelFiltersSheet,
    onSearchSubmit: applyFiltersSheet,
    onClearSearch: () => setDraftSearchQuery(""),
    onClearInput: () => setDraftSearchQuery(""),
  };

  // 모바일(Sheet): draft만 변경 → "적용"에서만 커밋
  const mobileFilterPanelProps = {
    selectedBrand: draftBrand,
    setSelectedBrand: setDraftBrand,
    selectedMaterial: draftMaterial,
    setSelectedMaterial: setDraftMaterial,
    selectedBounce: draftBounce,
    setSelectedBounce: setDraftBounce,
    selectedControl: draftControl,
    setSelectedControl: setDraftControl,
    selectedSpin: draftSpin,
    setSelectedSpin: setDraftSpin,
    selectedDurability: draftDurability,
    setSelectedDurability: setDraftDurability,
    selectedComfort: draftComfort,
    setSelectedComfort: setDraftComfort,
    searchQuery: draftSearchQuery,
    setSearchQuery: setDraftSearchQuery,
    priceRange: draftPriceRange,
    setPriceRange: setDraftPriceRange,
    resetKey: draftResetKey,
    activeFiltersCount: activeDraftCount,
    onReset: handleResetAllDraft,
    isLoadingInitial,
    showFilters,
    setShowFilters,
    brands,
    onClose: cancelFiltersSheet, // X/닫기 = 취소
    onSearchSubmit: applyFiltersSheet, // "검색" 버튼/엔터 = 적용+닫기+조회
    onClearSearch: () => setDraftSearchQuery(""),
    onClearInput: () => setDraftSearchQuery(""),
  };

  return (
    <>
      <Sheet open={showFilters} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          data-kakao-widget-hide="1"
          side={isMobileViewport ? "bottom" : "left"}
          className={
            isMobileViewport
              ? "max-h-[85dvh] rounded-t-2xl p-0 overflow-y-auto"
              : "h-dvh w-[min(420px,calc(100vw-24px))] max-w-none overflow-y-auto p-0"
          }
        >
          <FilterPanel {...(isMobileViewport ? mobileFilterPanelProps : desktopFilterPanelProps)} />
        </SheetContent>
      </Sheet>

      <div>
        {/* 상품 목록 */}
        <div className="min-w-0">
          <div className="mb-6 space-y-3 bp-md:mb-8">
            <SummaryCard className="overflow-hidden" contentClassName="p-4 bp-sm:p-5">
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-end bp-sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-primary">
                    String Catalog
                  </p>
                  <div
                    className="flex min-h-6 flex-wrap items-center gap-x-1 text-ui-body font-semibold tabular-nums text-foreground bp-sm:text-ui-card-title-lg"
                    aria-live="polite"
                  >
                    {productCountPrefix}{" "}
                    {isCountLoading ? (
                      <Skeleton className="inline-block h-5 w-12 align-middle" />
                    ) : (
                      <span className="font-semibold text-primary">{total}</span>
                    )}
                    개
                    {isCountLoading ? (
                      <Skeleton className="inline-block h-5 w-10 align-middle" />
                    ) : (
                      <span className="ml-1 text-ui-body-sm font-normal text-muted-foreground">
                        (표시중 {loadedCount}개)
                      </span>
                    )}
                  </div>
                </div>
                {isBackgroundRefreshing ? (
                  <span className="w-fit rounded-full border border-border bg-muted/30 px-2.5 py-1 text-ui-label font-medium text-muted-foreground">
                    조회 중...
                  </span>
                ) : null}
              </div>
            </SummaryCard>
            {hasAppliedPanelFilters && (
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-ui-body-sm font-medium text-foreground">적용 중인 조건</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAll}
                    className="h-7 whitespace-nowrap px-2 text-ui-label"
                  >
                    전체 초기화
                  </Button>
                </div>
                <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                  {submittedQuery && (
                    <span className={activeFilterChipClass}>
                      {`검색어 "${submittedQuery}"`}
                      <button
                        type="button"
                        aria-label="검색어 필터 해제"
                        onClick={() => {
                          setIsUiTransitioning(true);
                          setSearchQuery("");
                          setSubmittedQuery("");
                          resetInfinite();
                        }}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedBrand && (
                    <span className={activeFilterChipClass}>
                      브랜드 {brandLabelMap[selectedBrand] ?? selectedBrand}
                      <button
                        type="button"
                        aria-label="브랜드 필터 해제"
                        onClick={() => setSelectedBrand(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedMaterial && (
                    <span className={activeFilterChipClass}>
                      재질 {stringMaterialLabel(selectedMaterial)}
                      <button
                        type="button"
                        aria-label="재질 필터 해제"
                        onClick={() => setSelectedMaterial(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedBounce !== null && (
                    <span className={activeFilterChipClass}>
                      반발력 {getScoreLabel(selectedBounce)}
                      <button
                        type="button"
                        aria-label="반발력 필터 해제"
                        onClick={() => setSelectedBounce(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedControl !== null && (
                    <span className={activeFilterChipClass}>
                      컨트롤 {getScoreLabel(selectedControl)}
                      <button
                        type="button"
                        aria-label="컨트롤 필터 해제"
                        onClick={() => setSelectedControl(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedSpin !== null && (
                    <span className={activeFilterChipClass}>
                      스핀 {getScoreLabel(selectedSpin)}
                      <button
                        type="button"
                        aria-label="스핀 필터 해제"
                        onClick={() => setSelectedSpin(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedDurability !== null && (
                    <span className={activeFilterChipClass}>
                      내구성 {getScoreLabel(selectedDurability)}
                      <button
                        type="button"
                        aria-label="내구성 필터 해제"
                        onClick={() => setSelectedDurability(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedComfort !== null && (
                    <span className={activeFilterChipClass}>
                      편안함 {getScoreLabel(selectedComfort)}
                      <button
                        type="button"
                        aria-label="편안함 필터 해제"
                        onClick={() => setSelectedComfort(null)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {exposureLabel && (
                    <span className={activeFilterChipClass}>
                      {exposureLabel}
                      <button
                        type="button"
                        aria-label="혜택 필터 해제"
                        onClick={() => setExposureFilter([])}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {priceChanged && (
                    <span className={activeFilterChipClass}>
                      {getPriceChipLabel(priceRange)}
                      <button
                        type="button"
                        aria-label="가격 필터 해제"
                        onClick={() => setPriceRange(DEFAULT_PRICE_RANGE)}
                        className={activeFilterRemoveButtonClass}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex flex-col gap-3 bp-xl:flex-row bp-xl:items-center bp-xl:justify-between">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 bp-xl:w-auto bp-xl:overflow-visible bp-xl:pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showFilters) cancelFiltersSheet();
                      else openFiltersSheet();
                    }}
                    className="h-10 min-w-[88px] shrink-0 whitespace-nowrap border-border px-3 hover:bg-muted/30 bp-sm:h-9"
                    aria-expanded={showFilters}
                    aria-label={showFilters ? "필터 닫기" : "필터 열기"}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    필터{panelFiltersCount > 0 && `(${panelFiltersCount})`}
                  </Button>
                  {QUICK_BENEFIT_FILTERS.map((option) => {
                    const isActive = exposureFilter.includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleExposure(option.value)}
                        className={quickToggleButtonClass(isActive)}
                        aria-pressed={isActive}
                        aria-label={option.ariaLabel}
                      >
                        {isActive && <Check className="mr-1.5 h-3.5 w-3.5" />}
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 bp-xl:ml-auto bp-xl:w-auto bp-xl:flex-nowrap bp-xl:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleIncludeSoldOut}
                    className={cn(quickToggleButtonClass(!includeSoldOut), "shrink-0")}
                    aria-pressed={!includeSoldOut}
                    aria-label={includeSoldOut ? "품절 상품 포함 중" : "품절 상품 제외 중"}
                  >
                    {!includeSoldOut && <Check className="mr-1.5 h-3.5 w-3.5" />}
                    품절 제외
                  </Button>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2 bp-xl:flex-none">
                    {/* 뷰 모드 토글 */}
                    {!isMobileViewport && (
                      <div className="flex shrink-0 items-center rounded-lg border border-border bg-card p-1">
                        <Button
                          type="button"
                          variant={viewMode === "grid" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("grid")}
                          className="h-8 w-9 p-0"
                          aria-label="그리드 보기"
                          aria-pressed={viewMode === "grid"}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                          className="h-8 w-9 p-0"
                          aria-label="리스트 보기"
                          aria-pressed={viewMode === "list"}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* 정렬 */}
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="h-10 min-w-[140px] flex-1 rounded-xl border-border bg-background text-ui-body-sm focus:border-border bp-sm:h-9 bp-sm:w-[180px] bp-sm:flex-none dark:focus:border-border">
                        <SelectValue placeholder="정렬" />
                      </SelectTrigger>
                      <SelectContent className="border-border dark:bg-card">
                        <SelectItem value="latest">최신순</SelectItem>
                        <SelectItem value="reviews-desc">리뷰 많은순</SelectItem>
                        <SelectItem value="price-low">가격 낮은순</SelectItem>
                        <SelectItem value="price-high">가격 높은순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 콘텐츠 */}
          {showInlineLoadingSkeleton ? (
            <div data-cy="products-initial-loading" className="space-y-4">
              <div
                className={cn(
                  "grid gap-4 bp-md:gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-2xl:grid-cols-3 bp-3xl:grid-cols-4"
                    : "grid-cols-1",
                )}
              >
                {Array.from({ length: viewMode === "grid" ? 12 : 4 }).map((_, index) => (
                  <div
                    key={`products-loading-skeleton-${index}`}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <Skeleton className="mb-4 aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                    <Skeleton className="mt-4 h-8 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <AsyncState
              kind="error"
              variant="page-center"
              resourceName="상품 목록"
              onAction={() => resetInfinite()}
            />
          ) : canShowEmptyState ? (
            <EmptyState
              title="검색 결과가 없습니다"
              description={
                hasAnyAppliedFilters
                  ? "조건에 맞는 상품이 없습니다. 필터를 줄이거나 전체 초기화를 눌러 다시 확인해보세요."
                  : "다른 검색어나 필터를 시도해보세요"
              }
              icon={<Search className="h-5 w-5" />}
              action={
                <Button
                  type="button"
                  onClick={handleResetAll}
                  variant="outline"
                  className="border-border bg-transparent hover:bg-muted/30"
                >
                  필터 초기화
                </Button>
              }
              className="rounded-2xl bg-card shadow-sm"
            />
          ) : (
            <>
              <div
                aria-busy={isBackgroundRefreshing}
                className={cn(
                  "grid gap-4 bp-md:gap-6 transition-opacity",
                  isBackgroundRefreshing && "opacity-70",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-2xl:grid-cols-3 bp-3xl:grid-cols-4"
                    : "grid-cols-1",
                )}
              >
                {productsList.map((product, i) => {
                  const isLast = i === productsList.length - 1;
                  return (
                    <div key={product._id} ref={isLast ? lastProductRef : undefined}>
                      <ProductCard
                        product={product}
                        viewMode={viewMode}
                        brandLabel={brandLabelMap[product.brand.toLowerCase()] ?? product.brand}
                        isApplyFlow={isApplyFlow}
                      />
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadMore}
                    disabled={isFetchingMore}
                    className="min-w-[140px] rounded-xl border-border hover:bg-muted/30"
                    aria-label="상품 더 불러오기"
                  >
                    {isFetchingMore ? "불러오는 중..." : "상품 더 보기"}
                  </Button>
                </div>
              )}

              {/* 추가 로딩 표시 */}
              {isFetchingMore && (
                <div className="mt-4 grid grid-cols-1 gap-4 bp-md:gap-6 bp-sm:grid-cols-2 bp-2xl:grid-cols-3 bp-3xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`products-fetching-skeleton-${index}`}
                      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                    >
                      <Skeleton className="mb-4 aspect-[4/3] w-full rounded-lg" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                      <Skeleton className="mt-4 h-8 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              )}

              {!hasMore && productsList.length > 0 && (
                <p className="mt-6 text-center text-ui-body-sm text-muted-foreground">
                  모든 상품을 불러왔습니다.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
