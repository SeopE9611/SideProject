"use client";

import { FilterPanel } from "@/app/products/components/FilterPanel";
import ProductCard from "@/app/products/components/ProductCard";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
import { ActiveFilterBar, CatalogCardSkeleton, type ActiveFilterItem } from "@/components/commerce";
import { EmptyState, SummaryCard } from "@/components/public";
import AsyncState from "@/components/system/AsyncState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  BENEFIT_FILTER_VALUES,
  BENEFIT_LABELS,
  type BenefitFilterValue,
  formatBenefitFilterLabel,
  parseBenefitFilters,
  serializeBenefitFilters,
} from "@/lib/benefit-labels";
import { stringMaterialLabel } from "@/lib/constants";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { cn } from "@/lib/utils";
import { Check, Filter, Grid3X3, List, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

const QUICK_BENEFIT_FILTERS = BENEFIT_FILTER_VALUES.map((value) => ({
  label: value === "sale" ? "할인상품" : BENEFIT_LABELS[value],
  value,
  ariaLabel:
    value === "featured" ? "추천 상품 보기" : value === "new" ? "신상품 보기" : "할인 상품 보기",
}));
const quickToggleButtonClass = (isActive: boolean) =>
  cn(
    "h-10 shrink-0 whitespace-nowrap rounded-control border px-3 text-ui-body-sm transition-colors bp-sm:h-9",
    isActive
      ? "border-brand-highlight-ink/30 bg-brand-highlight-muted text-brand-highlight-ink hover:bg-brand-highlight-muted/80"
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
  const productActionCount = ENABLE_STRING_STANDALONE_ORDER ? 2 : 1;

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

  const loadedCount = (productsList ?? []).length;
  const showInlineLoadingSkeleton = isLoadingInitial && loadedCount === 0;
  const hasInitialFetchSettled = total !== null || error !== null;
  const canShowEmptyState = hasInitialFetchSettled && loadedCount === 0 && !isLoadingInitial;
  const isCountLoading = total === null && loadedCount === 0;
  const isBackgroundRefreshing = isLoadingInitial && loadedCount > 0;

  // 검색 제출 handler
  const handleSearchSubmit = useCallback(() => {
    // 새 검색이면 submittedQuery 바꾸고 페이징 리셋
    setSubmittedQuery(searchQuery);
    // resetInfinite를 직접 호출해서 새로 고침 보장 (훅 내부에서 감지 안할 경우 대비)
    resetInfinite();
  }, [searchQuery, resetInfinite]);

  // 검색 초기화
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedQuery("");
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

  const activeFilterItems: ActiveFilterItem[] = [
    ...(submittedQuery
      ? [{ id: "search", label: `검색어 "${submittedQuery}"`, removeLabel: "검색어 필터 해제", onRemove: () => { setSearchQuery(""); setSubmittedQuery(""); resetInfinite(); } }]
      : []),
    ...(selectedBrand ? [{ id: "brand", label: `브랜드 ${brandLabelMap[selectedBrand] ?? selectedBrand}`, removeLabel: "브랜드 필터 해제", onRemove: () => setSelectedBrand(null) }] : []),
    ...(selectedMaterial ? [{ id: "material", label: `재질 ${stringMaterialLabel(selectedMaterial)}`, removeLabel: "재질 필터 해제", onRemove: () => setSelectedMaterial(null) }] : []),
    ...(selectedBounce !== null ? [{ id: "bounce", label: `반발력 ${getScoreLabel(selectedBounce)}`, removeLabel: "반발력 필터 해제", onRemove: () => setSelectedBounce(null) }] : []),
    ...(selectedControl !== null ? [{ id: "control", label: `컨트롤 ${getScoreLabel(selectedControl)}`, removeLabel: "컨트롤 필터 해제", onRemove: () => setSelectedControl(null) }] : []),
    ...(selectedSpin !== null ? [{ id: "spin", label: `스핀 ${getScoreLabel(selectedSpin)}`, removeLabel: "스핀 필터 해제", onRemove: () => setSelectedSpin(null) }] : []),
    ...(selectedDurability !== null ? [{ id: "durability", label: `내구성 ${getScoreLabel(selectedDurability)}`, removeLabel: "내구성 필터 해제", onRemove: () => setSelectedDurability(null) }] : []),
    ...(selectedComfort !== null ? [{ id: "comfort", label: `편안함 ${getScoreLabel(selectedComfort)}`, removeLabel: "편안함 필터 해제", onRemove: () => setSelectedComfort(null) }] : []),
    ...(exposureLabel ? [{ id: "benefit", label: exposureLabel, removeLabel: "혜택 필터 해제", onRemove: () => setExposureFilter([]) }] : []),
    ...(priceChanged ? [{ id: "price", label: getPriceChipLabel(priceRange), removeLabel: "가격 필터 해제", onRemove: () => setPriceRange(DEFAULT_PRICE_RANGE) }] : []),
  ];

  return (
    <>
      <Sheet open={showFilters} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          data-kakao-widget-hide="1"
          side={isMobileViewport ? "bottom" : "left"}
          className={
            isMobileViewport
              ? "max-h-[85dvh] overflow-hidden rounded-t-2xl p-0"
              : "h-dvh w-[min(420px,calc(100vw-24px))] max-w-none overflow-hidden p-0"
          }
        >
          <FilterPanel {...(isMobileViewport ? mobileFilterPanelProps : desktopFilterPanelProps)} />
        </SheetContent>
      </Sheet>

      <div>
        {/* 상품 목록 */}
        <div className="min-w-0">
          <div className="mb-6 space-y-3 bp-md:mb-8">
            <SummaryCard className="overflow-hidden" contentClassName="p-4 bp-sm:p-5 bp-lg:p-6">
              <div className="grid min-w-0 gap-3 bp-md:grid-cols-[minmax(0,1fr)_auto] bp-md:items-end bp-md:gap-6">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-ui-label font-semibold uppercase tracking-[0.14em] text-primary">
                    String Catalog
                  </p>
                  <h2 className="text-ui-card-title-lg font-semibold text-foreground">
                    스트링 상품
                  </h2>
                  <p className="max-w-2xl text-ui-body-sm leading-6 text-muted-foreground">
                    플레이 성향과 성능, 가격 조건을 조합해 원하는 스트링을 찾아보세요.
                  </p>
                </div>

                <div className="min-w-0 bp-md:text-right">
                  <div
                    className="flex min-h-6 flex-wrap items-baseline gap-x-1 gap-y-0.5 text-ui-body font-semibold tabular-nums text-foreground bp-md:justify-end"
                    aria-live="polite"
                  >
                    <span>{productCountPrefix}</span>
                    {isCountLoading ? (
                      <Skeleton className="inline-block h-5 w-12 align-middle" />
                    ) : (
                      <span className="font-semibold text-primary">{(total ?? 0).toLocaleString()}</span>
                    )}
                    <span>개</span>
                    {isCountLoading ? (
                      <Skeleton className="inline-block h-4 w-20 align-middle" />
                    ) : (
                      <span className="text-ui-body-sm font-normal text-muted-foreground">
                        (표시중 {loadedCount.toLocaleString()}개)
                      </span>
                    )}
                  </div>
                  {isBackgroundRefreshing ? (
                    <span className="mt-2 inline-flex w-fit rounded-full border border-border bg-muted/30 px-2.5 py-1 text-ui-label font-medium text-muted-foreground bp-md:ml-auto">
                      조회 중...
                    </span>
                  ) : null}
                </div>
              </div>
            </SummaryCard>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
              {isMobileViewport ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (showFilters) cancelFiltersSheet();
                        else openFiltersSheet();
                      }}
                      className="h-10 shrink-0 whitespace-nowrap rounded-control border-border px-3 hover:bg-muted/30"
                      aria-expanded={showFilters}
                      aria-label={showFilters ? "필터 닫기" : "필터 열기"}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      필터{panelFiltersCount > 0 && `(${panelFiltersCount})`}
                    </Button>
                    <div className="min-w-0">
                      <Select value={sortOption} onValueChange={setSortOption}>
                        <SelectTrigger className="h-10 w-full min-w-0 rounded-control border-border bg-background text-ui-body-sm focus:border-border dark:focus:border-border">
                          <SelectValue placeholder="정렬" />
                        </SelectTrigger>
                        <SelectContent className="border-border dark:bg-card">
                          <SelectItem value="latest">최신순</SelectItem>
                          <SelectItem value="reviews-desc">후기 많은순</SelectItem>
                          <SelectItem value="price-low">가격 낮은순</SelectItem>
                          <SelectItem value="price-high">가격 높은순</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="relative min-w-0">
                    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 pr-6 whitespace-nowrap">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleToggleIncludeSoldOut}
                        className={quickToggleButtonClass(!includeSoldOut)}
                        aria-pressed={!includeSoldOut}
                        aria-label={includeSoldOut ? "품절 상품 포함 중" : "품절 상품 제외 중"}
                      >
                        {!includeSoldOut && <Check className="mr-1.5 h-3.5 w-3.5" />}
                        품절 제외
                      </Button>
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent" />
                  </div>
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (showFilters) cancelFiltersSheet();
                        else openFiltersSheet();
                      }}
                      className="h-9 shrink-0 whitespace-nowrap rounded-control border-border px-3 hover:bg-muted/30"
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

                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleIncludeSoldOut}
                      className={quickToggleButtonClass(!includeSoldOut)}
                      aria-pressed={!includeSoldOut}
                      aria-label={includeSoldOut ? "품절 상품 포함 중" : "품절 상품 제외 중"}
                    >
                      {!includeSoldOut && <Check className="mr-1.5 h-3.5 w-3.5" />}
                      품절 제외
                    </Button>
                    <div className="flex shrink-0 items-center rounded-control border border-border bg-card p-1">
                      <Button type="button" variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 w-9 p-0" aria-label="그리드 보기" aria-pressed={viewMode === "grid"}><Grid3X3 className="h-4 w-4" /></Button>
                      <Button type="button" variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 w-9 p-0" aria-label="리스트 보기" aria-pressed={viewMode === "list"}><List className="h-4 w-4" /></Button>
                    </div>
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="h-9 w-[150px] rounded-control border-border bg-background text-ui-body-sm focus:border-border bp-lg:w-[180px] dark:focus:border-border">
                        <SelectValue placeholder="정렬" />
                      </SelectTrigger>
                      <SelectContent className="border-border dark:bg-card">
                        <SelectItem value="latest">최신순</SelectItem>
                        <SelectItem value="reviews-desc">후기 많은순</SelectItem>
                        <SelectItem value="price-low">가격 낮은순</SelectItem>
                        <SelectItem value="price-high">가격 높은순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {hasAppliedPanelFilters ? (
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm bp-sm:p-4">
                <ActiveFilterBar items={activeFilterItems} onResetAll={handleResetAll} />
              </div>
            ) : null}
          </div>

          {/* 콘텐츠 */}
          {showInlineLoadingSkeleton ? (
            <div data-cy="products-initial-loading" className="space-y-4">
              <div
                className={cn(
                  "grid gap-4 bp-md:gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4"
                    : "grid-cols-1",
                )}
              >
                <CatalogCardSkeleton
                  viewMode={viewMode}
                  count={viewMode === "grid" ? 12 : 4}
                  actionCount={productActionCount}
                  mediaAspectClassName="aspect-[5/4] bp-md:aspect-square"
                />
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
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4"
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
                <div
                  className={cn(
                    "mt-4 grid grid-cols-1 gap-4 bp-md:gap-6",
                    viewMode === "grid" && "bp-sm:grid-cols-2 bp-lg:grid-cols-3 bp-2xl:grid-cols-4",
                  )}
                >
                  <CatalogCardSkeleton
                    viewMode={viewMode}
                    count={viewMode === "grid" ? 4 : 1}
                    actionCount={productActionCount}
                    mediaAspectClassName="aspect-[5/4] bp-md:aspect-square"
                  />
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
