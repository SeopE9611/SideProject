"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, SummaryCard } from "@/components/public";
import AsyncState from "@/components/system/AsyncState";
import { Search, Filter, Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useSWRInfinite from "swr/infinite";
import RacketCard from "./RacketCard";
import RacketFilterPanel from "./RacketFilterPanel";
import { SkeletonProductCard } from "@/app/products/components/SkeletonProductCard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { RACKET_BRANDS, racketBrandLabel } from "@/lib/constants";
import {
  formatBenefitFilterLabel,
  parseBenefitFilters,
  serializeBenefitFilters,
} from "@/lib/benefit-labels";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return data;
};

type RacketItem = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: "A" | "B" | "C";
  images: string[];
  status: "available" | "sold" | "rented" | "inactive";
  rental?: {
    enabled: boolean;
    deposit: number;
    fee: { d7: number; d15: number; d30: number };
  };
  ratingAvg?: number;
  ratingAverage?: number;
  ratingCount?: number;
  reviewCount?: number;
};

// withTotal=1 응답은 페이지별 목록과 필터 조건 기준 전체 개수를 포함한다.
type RacketsApiResponse = { items: RacketItem[]; total: number };

const RACKETS_PAGE_SIZE = 12;

const brands = RACKET_BRANDS.map(({ value, label }) => ({ value, label }));

const activeFilterChipClass =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2 py-1 text-ui-label";

const parsePriceParam = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

type Props = {
  initialBrand?: string | null;
  initialCondition?: string | null;
};

export default function FilterableRacketList({
  initialBrand = null,
  initialCondition = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isApplyFlow = searchParams.get("from") === "apply";

  // 정렬 / 뷰 모드
  const [sortOption, setSortOption] = useState("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterSheetViewport, setIsFilterSheetViewport] = useState(false);
  const [rentOnly, setRentOnly] = useState(() => searchParams.get("rentOnly") === "1");

  // 필터 상태들
  const [selectedBrand, setSelectedBrand] = useState<string | null>(initialBrand);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(initialCondition);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [exposureFilter, setExposureFilter] = useState<string[]>([]);

  // 검색어
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  // 모바일(Sheet) 전용 임시 선택값(draft)
  // - Sheet에서 선택해도 즉시 SWR 재요청이 일어나지 않게 함
  // - "검색/적용" 버튼에서만 selectedXXX로 커밋
  const [draftBrand, setDraftBrand] = useState<string | null>(initialBrand);
  const [draftCondition, setDraftCondition] = useState<string | null>(initialCondition);
  const [draftPriceMin, setDraftPriceMin] = useState<number | null>(null);
  const [draftPriceMax, setDraftPriceMax] = useState<number | null>(null);
  const [draftExposureFilter, setDraftExposureFilter] = useState<string[]>([]);
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [draftRentOnly, setDraftRentOnly] = useState(() => searchParams.get("rentOnly") === "1");
  const [draftResetKey, setDraftResetKey] = useState(0);

  // 토글 (모바일용)
  const [showFilters, setShowFilters] = useState(false);

  // 애니메이션 / 리셋 key
  const [resetKey, setResetKey] = useState(0);

  // URL sync 초기화/변경 관리
  const isInitializingRef = useRef(true);
  const lastSerializedRef = useRef("");

  // 초기 URL -> 상태
  useEffect(() => {
    if (isInitializingRef.current) {
      const brand = searchParams.get("brand");
      setSelectedBrand(brand || null);

      const cond = searchParams.get("cond");
      setSelectedCondition(cond || null);

      const minPrice = searchParams.get("minPrice");
      const maxPrice = searchParams.get("maxPrice");
      setPriceMin(parsePriceParam(minPrice));
      setPriceMax(parsePriceParam(maxPrice));

      setExposureFilter(parseBenefitFilters(searchParams.get("exposure")));
      setSortOption(searchParams.get("sort") || "latest");

      const view = searchParams.get("view");
      setViewMode(view === "list" ? "list" : "grid");

      const rent = searchParams.get("rentOnly");
      setRentOnly(rent === "1");

      const q = searchParams.get("q") || "";
      setSearchQuery(q);
      setSubmittedQuery(q);

      lastSerializedRef.current = searchParams.toString();
      isInitializingRef.current = false;
      return;
    }

    // URL 변화 동기화
    const brand = searchParams.get("brand");
    if ((brand || null) !== selectedBrand) setSelectedBrand(brand || null);

    const cond = searchParams.get("cond");
    if ((cond || null) !== selectedCondition) setSelectedCondition(cond || null);

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const nextMin = parsePriceParam(minPrice);
    const nextMax = parsePriceParam(maxPrice);
    if (nextMin !== priceMin) setPriceMin(nextMin);
    if (nextMax !== priceMax) setPriceMax(nextMax);

    const nextExposure = parseBenefitFilters(searchParams.get("exposure"));
    if (nextExposure.join(",") !== exposureFilter.join(",")) setExposureFilter(nextExposure);
    const sort = searchParams.get("sort") || "latest";
    if (sort !== sortOption) setSortOption(sort);

    const urlRentOnly = searchParams.get("rentOnly") === "1";
    if (urlRentOnly !== rentOnly) setRentOnly(urlRentOnly);

    const view = searchParams.get("view");
    const desiredView = view === "list" ? "list" : "grid";
    if (desiredView !== viewMode) setViewMode(desiredView as "grid" | "list");
  }, [searchParams]);

  // API 호출
  const query = new URLSearchParams();
  query.set("withTotal", "1");
  if (rentOnly) query.set("rentOnly", "1");
  if (selectedBrand) query.set("brand", selectedBrand);
  if (selectedCondition) query.set("cond", selectedCondition);
  if (submittedQuery) query.set("q", submittedQuery);
  if (priceMin !== null) query.set("minPrice", String(priceMin));
  if (priceMax !== null) query.set("maxPrice", String(priceMax));
  {
    const serializedExposure = serializeBenefitFilters(exposureFilter);
    if (serializedExposure) query.set("exposure", serializedExposure);
  }
  query.set("sort", sortOption || "latest");
  const getKey = (pageIndex: number, previousPageData: RacketsApiResponse | null) => {
    if (previousPageData && previousPageData.items.length === 0) return null;

    const pageQuery = new URLSearchParams(query);
    pageQuery.set("page", String(pageIndex + 1));
    pageQuery.set("limit", String(RACKETS_PAGE_SIZE));
    return `/api/rackets?${pageQuery.toString()}`;
  };
  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite<RacketsApiResponse>(getKey, fetcher, {
      revalidateOnFocus: false, // 탭/창 복귀 시 재요청 방지
      revalidateOnReconnect: false, // (원하면 true 유지 가능)
    });

  const [isUiTransitioning, setIsUiTransitioning] = useState(false);
  const sawLoadingRef = useRef(false);

  /**
   * 중요:
   * filterKey에는 "네트워크 재요청(SWR key 변경)"을 유발하는 값을 넣는다.
   * brand/cond/q/rentOnly에 더해 priceMin/priceMax/sortOption도 서버 필터/정렬로
   * 처리하므로 변경 시 전환 스켈레톤을 동일하게 적용한다.
   */
  const filterKey = useMemo(() => {
    return [
      selectedBrand ?? "",
      selectedCondition ?? "",
      submittedQuery ?? "",
      rentOnly ? "1" : "0",
      priceMin !== null ? String(priceMin) : "",
      priceMax !== null ? String(priceMax) : "",
      exposureFilter.join(","),
      sortOption || "latest",
    ].join("|");
  }, [
    selectedBrand,
    selectedCondition,
    submittedQuery,
    rentOnly,
    priceMin,
    priceMax,
    exposureFilter,
    sortOption,
  ]);

  useLayoutEffect(() => {
    if (isInitializingRef.current) return;
    setIsUiTransitioning(true);
    sawLoadingRef.current = false;
  }, [filterKey]);

  useEffect(() => {
    if (!isUiTransitioning) return;

    const loadingNow = isLoading || isValidating; //  SWR 로딩/재검증을 함께

    if (loadingNow) {
      sawLoadingRef.current = true;
      return;
    }

    if (sawLoadingRef.current && !loadingNow) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }

    if (error) {
      setIsUiTransitioning(false);
      sawLoadingRef.current = false;
    }
  }, [isUiTransitioning, isLoading, isValidating, error]);

  // 최초 진입에만 카드 스켈레톤을 표시하고, 필터 변경 중에는 기존 목록을 유지한다.
  const showInlineLoadingSkeleton = isLoading && !data;
  const isInitialLikeLoading = showInlineLoadingSkeleton;
  const isBackgroundRefreshing = !!data && (isValidating || isUiTransitioning);

  const products = useMemo(() => data?.flatMap((page) => page.items ?? []) ?? [], [data]);
  const total = Number(data?.[0]?.total ?? 0);
  const visibleProducts = products;
  const hasMore = products.length < total;
  const isLoadingMore = isValidating && !!data && size > data.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    void setSize((currentSize) => currentSize + 1);
  }, [isLoadingMore, hasMore, setSize]);

  // 검색 제출
  const handleSearchSubmit = useCallback(() => {
    setSubmittedQuery(searchQuery);
    setIsUiTransitioning(true);
    mutate();
  }, [searchQuery, mutate]);

  // 검색 초기화
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSubmittedQuery("");
    setIsUiTransitioning(true);
    mutate();
  }, [mutate]);

  // 필터 초기화
  const handleResetAll = useCallback(() => {
    setResetKey((k) => k + 1);
    setSelectedBrand(null);
    setSelectedCondition(null);
    setPriceMin(null);
    setPriceMax(null);
    setExposureFilter([]);
    setSortOption("latest");
    setViewMode("grid");
    setRentOnly(false);
    setSearchQuery("");
    setSubmittedQuery("");
    setIsUiTransitioning(true);
    mutate();
  }, [mutate]);

  const handleClearInput = useCallback(() => {
    setSearchQuery("");
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const syncViewport = (matches: boolean) => {
      setIsFilterSheetViewport(matches);
      if (matches) setViewMode("grid");
    };
    syncViewport(mql.matches);
    const onChange = (e: MediaQueryListEvent) => syncViewport(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const effectiveViewMode: "grid" | "list" = isFilterSheetViewport ? "grid" : viewMode;

  // draft를 현재 applied(selected) 값으로 동기화 (Sheet 열 때/취소할 때)
  const syncDraftFromApplied = useCallback(() => {
    setDraftBrand(selectedBrand);
    setDraftCondition(selectedCondition);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);
    setDraftExposureFilter(exposureFilter);
    setDraftSearchQuery(searchQuery);
    setDraftRentOnly(rentOnly);
  }, [selectedBrand, selectedCondition, priceMin, priceMax, exposureFilter, searchQuery, rentOnly]);

  // Sheet 열기: 열릴 때마다 draft를 applied로 맞춰서 "현재 상태"를 보여줌
  const openFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(true);
  }, [syncDraftFromApplied]);

  // Sheet 취소(닫기): draft를 applied로 되돌리고 닫기
  const cancelFiltersSheet = useCallback(() => {
    syncDraftFromApplied();
    setShowFilters(false);
  }, [syncDraftFromApplied]);

  // Sheet 적용(=검색): draft -> applied로 커밋 + 닫기
  const applyFiltersSheet = useCallback(() => {
    setSelectedBrand(draftBrand);
    setSelectedCondition(draftCondition);
    setPriceMin(draftPriceMin);
    setPriceMax(draftPriceMax);
    setRentOnly(draftRentOnly);
    setExposureFilter(draftExposureFilter);

    // 검색어는 submittedQuery만 서버 요청에 반영되므로 적용 시점에 커밋
    setSearchQuery(draftSearchQuery);
    setSubmittedQuery(draftSearchQuery);
    setIsUiTransitioning(true);
    setShowFilters(false);
    // key가 바뀌면 SWR이 자동으로 새로 fetch함 (mutate 강제 호출은 불필요)
  }, [
    draftBrand,
    draftCondition,
    draftPriceMin,
    draftPriceMax,
    draftRentOnly,
    draftExposureFilter,
    draftSearchQuery,
  ]);

  // 모바일 Sheet에서만 "초기화"(draft만 초기화)
  const handleResetAllDraft = useCallback(() => {
    setDraftResetKey((k) => k + 1);
    setDraftBrand(null);
    setDraftCondition(null);
    setDraftPriceMin(null);
    setDraftPriceMax(null);
    setDraftRentOnly(false);
    setDraftExposureFilter([]);
    setDraftSearchQuery("");
  }, []);

  // overlay/ESC로 닫히는 경우도 "취소"로 처리
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (open) openFiltersSheet();
      else cancelFiltersSheet();
    },
    [openFiltersSheet, cancelFiltersSheet],
  );

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoadingMore, hasMore, loadMore],
  );

  // active filter 개수
  const priceChanged = priceMin !== null || priceMax !== null;
  const activeFiltersCount = [
    selectedBrand,
    selectedCondition,
    submittedQuery,
    priceChanged,
    rentOnly,
    exposureFilter.length > 0,
  ].filter(Boolean).length;
  const draftPriceChanged = draftPriceMin !== null || draftPriceMax !== null;
  const activeDraftCount = [
    draftBrand,
    draftCondition,
    draftSearchQuery,
    draftPriceChanged,
    draftRentOnly,
    draftExposureFilter.length > 0,
  ].filter(Boolean).length;

  const exposureLabel = formatBenefitFilterLabel(exposureFilter);
  const racketCountPrefix = `${rentOnly ? "대여 가능 " : ""}${exposureLabel ? `${exposureLabel} 라켓 총` : "총"}`;
  const racketCountSuffix = exposureLabel ? "개" : "개 라켓";

  // 상태 -> URL 반영
  useEffect(() => {
    if (isInitializingRef.current) return;

    // 현재 URL을 기반으로 시작: from=apply 같은 "기타 쿼리"를 유지하기 위함
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string | null) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete("brand", selectedBrand);
    setOrDelete("cond", selectedCondition);
    setOrDelete("q", submittedQuery ? submittedQuery : null);
    setOrDelete("sort", sortOption && sortOption !== "latest" ? sortOption : null);
    setOrDelete("view", viewMode !== "grid" ? viewMode : null);
    setOrDelete("minPrice", priceMin !== null ? String(priceMin) : null);
    setOrDelete("maxPrice", priceMax !== null ? String(priceMax) : null);
    setOrDelete("rentOnly", rentOnly ? "1" : null);
    setOrDelete("exposure", serializeBenefitFilters(exposureFilter));

    const newSearch = params.toString();
    if (newSearch === lastSerializedRef.current) return;
    lastSerializedRef.current = newSearch;

    const nextUrl = `${pathname}${newSearch ? `?${newSearch}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [
    selectedBrand,
    selectedCondition,
    submittedQuery,
    sortOption,
    viewMode,
    priceMin,
    priceMax,
    rentOnly,
    exposureFilter,
    router,
    pathname,
    searchParams,
  ]);

  // 데스크톱/모바일 공통: 패널 안에서는 draft만 변경하고 적용 시 커밋
  const desktopFilterPanelProps = {
    selectedBrand: draftBrand,
    setSelectedBrand: setDraftBrand,
    selectedCondition: draftCondition,
    setSelectedCondition: setDraftCondition,
    searchQuery: draftSearchQuery,
    setSearchQuery: setDraftSearchQuery,
    priceMin: draftPriceMin,
    priceMax: draftPriceMax,
    onChangePriceMin: setDraftPriceMin,
    onChangePriceMax: setDraftPriceMax,
    rentOnly: draftRentOnly,
    setRentOnly: setDraftRentOnly,
    exposureFilter: draftExposureFilter,
    onExposureChange: setDraftExposureFilter,
    resetKey: draftResetKey,
    activeFiltersCount: activeDraftCount,
    onReset: handleResetAllDraft,
    isLoadingInitial: isLoading,
    showFilters,
    setShowFilters,
    brands,
    onClose: cancelFiltersSheet,
    onSearchSubmit: applyFiltersSheet,
    onClearSearch: () => setDraftSearchQuery(""),
    onClearInput: () => setDraftSearchQuery(""),
  };

  // 모바일(Sheet): draft만 변경 → "검색/적용"에서만 커밋
  const mobileFilterPanelProps = {
    selectedBrand: draftBrand,
    setSelectedBrand: setDraftBrand,
    selectedCondition: draftCondition,
    setSelectedCondition: setDraftCondition,
    searchQuery: draftSearchQuery,
    setSearchQuery: setDraftSearchQuery,
    priceMin: draftPriceMin,
    priceMax: draftPriceMax,
    onChangePriceMin: setDraftPriceMin,
    onChangePriceMax: setDraftPriceMax,
    rentOnly: draftRentOnly,
    setRentOnly: setDraftRentOnly,
    exposureFilter: draftExposureFilter,
    onExposureChange: setDraftExposureFilter,
    resetKey: draftResetKey,
    activeFiltersCount: activeDraftCount,
    onReset: handleResetAllDraft,
    isLoadingInitial: isLoading,
    showFilters,
    setShowFilters,
    brands,
    onClose: cancelFiltersSheet, // X/닫기 = 취소
    onSearchSubmit: applyFiltersSheet, // "검색" = 적용+닫기
    onClearSearch: () => setDraftSearchQuery(""),
    onClearInput: () => setDraftSearchQuery(""),
  };

  return (
    <>
      <Sheet open={showFilters} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          data-kakao-widget-hide="1"
          side={isFilterSheetViewport ? "bottom" : "left"}
          className={
            isFilterSheetViewport
              ? "max-h-[85dvh] rounded-t-2xl p-0 overflow-y-auto"
              : "h-dvh w-[min(420px,calc(100vw-24px))] max-w-none overflow-y-auto p-0"
          }
        >
          <RacketFilterPanel
            {...(isFilterSheetViewport ? mobileFilterPanelProps : desktopFilterPanelProps)}
          />
        </SheetContent>
      </Sheet>

      <div>
        {/* 상품 목록 */}
        <div className="min-w-0">
          <div className="mb-6 space-y-3 bp-md:mb-8">
            <SummaryCard
              eyebrow="Racket Finder"
              title="라켓 목록"
              description="브랜드, 상태, 가격대와 대여 가능 여부를 조합해 원하는 라켓을 찾아보세요."
              contentClassName="space-y-4"
            >
              <div
                className="min-w-0 break-keep rounded-xl border border-border bg-muted/20 px-4 py-3 text-ui-body-sm font-semibold tabular-nums text-foreground bp-sm:text-ui-body"
                aria-live="polite"
              >
                {racketCountPrefix}{" "}
                {isInitialLikeLoading ? (
                  <Skeleton className="inline-block h-5 w-12 align-middle" />
                ) : (
                  <span className="font-semibold text-primary">{total}</span>
                )}
                {racketCountSuffix}
                {isInitialLikeLoading ? (
                  <Skeleton className="ml-2 inline-block h-5 w-10 align-middle" />
                ) : (
                  <span className="ml-2 text-ui-body-sm text-muted-foreground">
                    (표시중 {visibleProducts.length}개)
                  </span>
                )}
                {isBackgroundRefreshing ? (
                  <span className="ml-2 text-ui-label font-medium text-muted-foreground">
                    조회 중...
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 bp-sm:flex-row bp-sm:items-center bp-md:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showFilters) cancelFiltersSheet();
                    else openFiltersSheet();
                  }}
                  className="h-10 w-full shrink-0 whitespace-nowrap rounded-lg border-border px-3 hover:bg-muted bp-sm:w-auto"
                  aria-expanded={showFilters}
                  aria-label={showFilters ? "필터 닫기" : "필터 열기"}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  필터{activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </Button>
                <div className="flex w-full min-w-0 flex-1 items-center justify-end gap-3 bp-sm:ml-auto bp-sm:w-auto bp-sm:flex-initial">
                  {!isFilterSheetViewport && (
                    <div className="flex shrink-0 items-center rounded-lg border border-border bg-card p-1">
                      <Button
                        type="button"
                        variant={effectiveViewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-8 w-9 p-0"
                        aria-label="그리드 보기"
                        aria-pressed={effectiveViewMode === "grid"}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant={effectiveViewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-8 w-9 p-0"
                        aria-label="리스트 보기"
                        aria-pressed={effectiveViewMode === "list"}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="min-w-0 flex-1 bp-sm:w-[180px] bp-sm:flex-none">
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="h-10 w-full min-w-0 rounded-lg border border-border bg-card text-ui-body-sm focus:border-border bp-sm:h-9 dark:focus:border-border">
                        <SelectValue placeholder="정렬" />
                      </SelectTrigger>
                      <SelectContent className="dark:border-border dark:bg-card">
                        <SelectItem value="latest">최신순</SelectItem>
                        <SelectItem value="sales-desc">구매 많은순</SelectItem>
                        <SelectItem value="reviews-desc">후기 많은순</SelectItem>
                        <SelectItem value="price-low">가격 낮은순</SelectItem>
                        <SelectItem value="price-high">가격 높은순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SummaryCard>

            {activeFiltersCount > 0 && (
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                  {submittedQuery && (
                    <span className={activeFilterChipClass}>검색어 “{submittedQuery}”</span>
                  )}
                  {selectedBrand && (
                    <span className={activeFilterChipClass}>
                      브랜드 {racketBrandLabel(selectedBrand)}
                    </span>
                  )}
                  {selectedCondition && (
                    <span className={activeFilterChipClass}>상태 {selectedCondition}</span>
                  )}
                  {priceChanged && (
                    <span className={activeFilterChipClass}>
                      가격 {priceMin !== null ? `${priceMin.toLocaleString()}원` : "0원"}~
                      {priceMax !== null ? `${priceMax.toLocaleString()}원` : "제한 없음"}
                    </span>
                  )}
                  {exposureLabel && <span className={activeFilterChipClass}>{exposureLabel}</span>}
                  {rentOnly && <span className={activeFilterChipClass}>대여 가능</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAll}
                    className="h-7 shrink-0 whitespace-nowrap px-2 text-ui-label"
                  >
                    전체 초기화
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 콘텐츠 */}
          {showInlineLoadingSkeleton ? (
            <div
              className={cn(
                "grid gap-4 bp-md:gap-6",
                effectiveViewMode === "grid"
                  ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-2 bp-2xl:grid-cols-3 bp-3xl:grid-cols-4"
                  : "grid-cols-1",
              )}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : error ? (
            <AsyncState
              kind="error"
              variant="page-center"
              resourceName="라켓 목록"
              onAction={() => mutate()}
            />
          ) : !isInitialLikeLoading && products.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="검색 결과가 없습니다"
              description="다른 검색어나 필터를 시도해보세요"
              className="rounded-2xl border-border bg-card shadow-sm"
              action={
                <Button
                  onClick={handleResetAll}
                  variant="outline"
                  className="border-border bg-transparent hover:bg-muted"
                >
                  필터 초기화
                </Button>
              }
            />
          ) : (
            <div
              aria-busy={isBackgroundRefreshing}
              className={cn(
                "grid gap-4 bp-md:gap-6 transition-opacity",
                isBackgroundRefreshing && "opacity-70",
                effectiveViewMode === "grid"
                  ? "grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-2 bp-2xl:grid-cols-3 bp-3xl:grid-cols-4"
                  : "grid-cols-1",
              )}
            >
              {visibleProducts.map((racket) => (
                <RacketCard
                  key={racket.id}
                  racket={racket}
                  viewMode={effectiveViewMode}
                  brandLabel={racketBrandLabel(racket.brand)}
                  isApplyFlow={isApplyFlow}
                />
              ))}
            </div>
          )}

          {!showInlineLoadingSkeleton && !error && products.length > 0 && (
            <>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="min-w-[160px] rounded-lg border-border bg-card shadow-sm hover:bg-muted"
                    aria-label="라켓 더 불러오기"
                  >
                    {isLoadingMore ? "불러오는 중..." : "라켓 더 보기"}
                  </Button>
                </div>
              )}
              <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
              {!hasMore && (
                <p className="mt-6 text-center text-ui-body-sm text-muted-foreground">
                  모든 라켓을 불러왔습니다.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
