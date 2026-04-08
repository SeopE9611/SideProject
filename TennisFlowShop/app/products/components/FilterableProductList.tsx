"use client";

import { FilterPanel } from "@/app/products/components/FilterPanel";
import ProductCard from "@/app/products/components/ProductCard";
import { useInfiniteProducts } from "@/app/products/hooks/useInfiniteProducts";
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
import { cn } from "@/lib/utils";
import { Filter, Grid3X3, List, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// 브랜드 리스트
const brands = [
  { label: "럭실론", value: "luxilon" },
  { label: "테크니화이버", value: "tecnifibre" },
  { label: "윌슨", value: "wilson" },
  { label: "바볼랏", value: "babolat" },
  { label: "헤드", value: "head" },
  { label: "요넥스", value: "yonex" },
  { label: "솔린코", value: "solinco" },
  { label: "던롭", value: "dunlop" },
];

// 브랜드 라벨 매핑 (소문자 key)
const brandLabelMap: Record<string, string> = Object.fromEntries(
  brands.map(({ value, label }) => [value, label]),
);

// 가격 필터 기본값
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 200000;
const DEFAULT_PRICE_RANGE: [number, number] = [
  DEFAULT_MIN_PRICE,
  DEFAULT_MAX_PRICE,
];

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

  // 정렬 / 뷰 모드
  const [sortOption, setSortOption] = useState("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 필터 상태들
  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    initialBrand,
  );
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(
    initialMaterial,
  );
  const [selectedBounce, setSelectedBounce] = useState<number | null>(null);
  const [selectedDurability, setSelectedDurability] = useState<number | null>(
    null,
  );
  const [selectedSpin, setSelectedSpin] = useState<number | null>(null);
  const [selectedControl, setSelectedControl] = useState<number | null>(null);
  const [selectedComfort, setSelectedComfort] = useState<number | null>(null);
  const [priceRange, setPriceRange] =
    useState<[number, number]>(DEFAULT_PRICE_RANGE);

  // 모바일(Sheet) 전용: 임시 선택값(draft)
  // - Sheet 안에서 선택해도 즉시 서버 조회가 일어나지 않게 하기 위함
  // - "적용"을 눌렀을 때만 selectedXXX로 커밋한다
  const [draftBrand, setDraftBrand] = useState<string | null>(initialBrand);
  const [draftMaterial, setDraftMaterial] = useState<string | null>(
    initialMaterial,
  );
  const [draftBounce, setDraftBounce] = useState<number | null>(null);
  const [draftDurability, setDraftDurability] = useState<number | null>(null);
  const [draftSpin, setDraftSpin] = useState<number | null>(null);
  const [draftControl, setDraftControl] = useState<number | null>(null);
  const [draftComfort, setDraftComfort] = useState<number | null>(null);
  const [draftPriceRange, setDraftPriceRange] =
    useState<[number, number]>(DEFAULT_PRICE_RANGE);

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
    if (isInitializingRef.current) {
      const brand = searchParams.get("brand");
      setSelectedBrand(brand || null);

      const material = searchParams.get("material");
      if (material && material !== selectedMaterial)
        setSelectedMaterial(material);

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

      setSortOption(searchParams.get("sort") || "latest");

      const view = searchParams.get("view");
      setViewMode(view === "list" ? "list" : "grid");

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
    if ((material || null) !== selectedMaterial)
      setSelectedMaterial(material || null);

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
    if (durabilityVal !== selectedDurability)
      setSelectedDurability(durabilityVal);

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

    const sort = searchParams.get("sort") || "latest";
    if (sort !== sortOption) setSortOption(sort);

    const view = searchParams.get("view");
    const desiredView = view === "list" ? "list" : "grid";
    if (desiredView !== viewMode) setViewMode(desiredView as "grid" | "list");
  }, [searchParams]);

  // 기본 범위면 아예 min/max를 안 보내서 "가격 필터 미적용" 상태 유지
  const minPriceParam =
    priceRange[0] > DEFAULT_MIN_PRICE ? priceRange[0] : undefined;
  const maxPriceParam =
    priceRange[1] < DEFAULT_MAX_PRICE ? priceRange[1] : undefined;

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
    limit: 6,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    purpose: isApplyFlow ? "stringing" : undefined,
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
    sortOption,
    priceRange,
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
  const isInitialLikeLoading = isLoadingInitial || isUiTransitioning;
  const showInlineLoadingSkeleton = isInitialLikeLoading;
  const isCountLoading = isInitialLikeLoading || total === null;

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

  // 뷰포트가 bp-lg(>=1200)로 커지면 Sheet는 자동으로 닫기(취소)
  useEffect(() => {
    if (!showFilters) return;

    const mql = window.matchMedia("(min-width: 1200px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) cancelFiltersSheet();
    };

    // 이미 lg 이상이면 즉시 닫기
    if (mql.matches) {
      cancelFiltersSheet();
      return;
    }

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [showFilters, cancelFiltersSheet]);

  // active filter 개수 계산
  const priceChanged =
    priceRange[0] > DEFAULT_MIN_PRICE || priceRange[1] < DEFAULT_MAX_PRICE;
  const activeFiltersCount = [
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

  const draftPriceChanged =
    draftPriceRange[0] > DEFAULT_MIN_PRICE ||
    draftPriceRange[1] < DEFAULT_MAX_PRICE;
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
    setOrDelete(
      "power",
      selectedBounce !== null ? String(selectedBounce) : null,
    );
    setOrDelete(
      "control",
      selectedControl !== null ? String(selectedControl) : null,
    );
    setOrDelete("spin", selectedSpin !== null ? String(selectedSpin) : null);
    setOrDelete(
      "durability",
      selectedDurability !== null ? String(selectedDurability) : null,
    );
    setOrDelete(
      "comfort",
      selectedComfort !== null ? String(selectedComfort) : null,
    );
    setOrDelete("q", submittedQuery ? submittedQuery : null);

    // 기본값이면 URL에 굳이 남기지 않기(기존 동작 유지)
    setOrDelete(
      "sort",
      sortOption && sortOption !== "latest" ? sortOption : null,
    );
    setOrDelete("view", viewMode !== "grid" ? viewMode : null);
    setOrDelete(
      "minPrice",
      priceRange[0] > DEFAULT_MIN_PRICE ? String(priceRange[0]) : null,
    );
    setOrDelete(
      "maxPrice",
      priceRange[1] < DEFAULT_MAX_PRICE ? String(priceRange[1]) : null,
    );

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
    sortOption,
    viewMode,
    priceRange,
    router,
    pathname,
    searchParams,
  ]);
  // infinite scroll 관찰자
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingMore, hasMore, loadMore],
  );

  // 데스크톱(좌측 고정 패널): 선택 즉시 적용(=기존대로 selectedXXX 사용)
  const desktopFilterPanelProps = {
    selectedBrand,
    setSelectedBrand,
    selectedMaterial,
    setSelectedMaterial,
    selectedBounce,
    setSelectedBounce,
    selectedControl,
    setSelectedControl,
    selectedSpin,
    setSelectedSpin,
    selectedDurability,
    setSelectedDurability,
    selectedComfort,
    setSelectedComfort,
    searchQuery,
    setSearchQuery,
    priceRange,
    setPriceRange,
    resetKey,
    activeFiltersCount,
    onReset: handleResetAll,
    isLoadingInitial,
    showFilters,
    setShowFilters,
    brands,
    onClose: undefined,
    onSearchSubmit: handleSearchSubmit,
    onClearSearch: handleClearSearch,
    onClearInput: handleClearInput,
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
          side="right"
          className="w-[92vw] max-w-sm p-0 overflow-y-auto"
        >
          <FilterPanel {...mobileFilterPanelProps} />
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-4 bp-md:gap-8 bp-lg:grid-cols-4">
        {/* 필터 사이드바 */}
        <div
          className={cn(
            "hidden bp-lg:block",
            "space-y-4 md:space-y-6 bp-lg:col-span-1",
          )}
        >
          <div className="sticky top-20 self-start">
            <FilterPanel {...desktopFilterPanelProps} />
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="bp-lg:col-span-3">
          <div className="mb-6 bp-md:mb-8 space-y-3">
            <div className="flex items-center justify-between">
              <div
                className="text-base bp-sm:text-lg font-semibold text-foreground tabular-nums"
                aria-live="polite"
              >
                총{" "}
                {isCountLoading ? (
                  <Skeleton className="inline-block h-5 w-12 align-middle" />
                ) : (
                  <span className="text-primary font-bold">{total}</span>
                )}
                개
                {isCountLoading ? (
                  <Skeleton className="inline-block h-5 w-10 align-middle" />
                ) : (
                  <span className="ml-2 text-sm text-muted-foreground">
                    (표시중 {loadedCount}개)
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showFilters) cancelFiltersSheet();
                  else openFiltersSheet();
                }}
                className="bp-lg:hidden h-9 px-3 border-border hover:bg-primary/10 dark:hover:bg-primary/20 shrink-0"
                aria-expanded={showFilters}
                aria-label="필터 열기"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터{activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 bp-sm:justify-end">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center border border-border rounded-lg p-1 bg-card">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-9 p-0"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-9 p-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* 정렬 */}
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-9 w-[150px] bp-sm:w-[180px] rounded-lg border-2 focus:border-border dark:focus:border-border bg-card text-sm">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent className="dark:bg-card dark:border-border">
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="popular">인기순</SelectItem>
                  <SelectItem value="price-low">가격 낮은순</SelectItem>
                  <SelectItem value="price-high">가격 높은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 콘텐츠 */}
          {showInlineLoadingSkeleton ? (
            <div data-cy="products-initial-loading" className="space-y-4">
              <div
                className={cn(
                  "grid gap-4 bp-md:gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-xl:grid-cols-3"
                    : "grid-cols-1",
                )}
              >
                {Array.from({ length: viewMode === "grid" ? 6 : 4 }).map(
                  (_, index) => (
                    <div
                      key={`products-loading-skeleton-${index}`}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <Skeleton className="mb-4 aspect-[4/3] w-full rounded-lg" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="mt-2 h-4 w-1/2" />
                      <Skeleton className="mt-4 h-8 w-full rounded-md" />
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : error ? (
            <AsyncState
              kind="error"
              variant="page-center"
              resourceName="상품 목록"
              onAction={() => resetInfinite()}
            />
          ) : loadedCount === 0 ? (
            <div className="space-y-4">
              <AsyncState
                kind="empty"
                variant="page-center"
                title="검색 결과가 없습니다"
                description="다른 검색어나 필터를 시도해보세요"
                icon={<Search className="h-4 w-4" />}
              />
              <Button
                onClick={handleResetAll}
                variant="outline"
                className="border-border hover:bg-primary/10 dark:hover:bg-primary/20 bg-transparent"
              >
                필터 초기화
              </Button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-4 bp-md:gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 bp-sm:grid-cols-2 bp-xl:grid-cols-3"
                    : "grid-cols-1",
                )}
              >
                {productsList.map((product, i) => {
                  const isLast = i === productsList.length - 1;
                  return (
                    <div
                      key={product._id}
                      ref={isLast ? lastProductRef : undefined}
                    >
                      <ProductCard
                        product={product}
                        viewMode={viewMode}
                        brandLabel={
                          brandLabelMap[product.brand.toLowerCase()] ??
                          product.brand
                        }
                        isApplyFlow={isApplyFlow}
                      />
                    </div>
                  );
                })}
              </div>

              {/* 추가 로딩 표시 */}
              {isFetchingMore && (
                <div
                  aria-live="polite"
                  className="text-center py-4 flex justify-center items-center gap-2"
                >
                  <div className="h-4 w-4 rounded-full border-2 border-border border-t-transparent animate-spin" />
                  <Skeleton className="h-4 w-24" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
