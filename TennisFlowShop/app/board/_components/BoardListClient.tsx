'use client';

import { ChevronDown, ChevronUp, Eye, ImageIcon, MessageSquare, PackageSearch, Paperclip, Plus, RotateCcw, Search, SlidersHorizontal, ThumbsUp, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import type { BoardTypeConfig } from '@/app/board/_components/board-config';
import { getCategoryBadgeText } from '@/app/board/_components/board-config';
import ErrorBox from '@/app/board/_components/ErrorBox';
import PinnedNoticeStrip from '@/app/board/_components/PinnedNoticeStrip';
import MessageComposeDialog from '@/app/messages/_components/MessageComposeDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { badgeSizeSm, getBoardCategoryTone } from '@/lib/badge-style';
import { boardFetcher, parseApiError } from '@/lib/fetchers/boardFetcher';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import {
  MARKET_CONDITION_GRADE_OPTIONS,
  MARKET_RACKET_GRIP_SIZE_OPTIONS,
  MARKET_RACKET_PATTERN_OPTIONS,
  MARKET_SALE_STATUS_OPTIONS,
  MARKET_STRING_COLOR_OPTIONS,
  MARKET_STRING_GAUGE_OPTIONS,
  MARKET_STRING_LENGTH_OPTIONS,
  MARKET_STRING_MATERIAL_OPTIONS,
  getMarketBrandLabel,
  getMarketSaleStatusLabel,
  getMarketStringColorLabel,
  getMarketStringLengthLabel,
  getMarketStringMaterialLabel,
} from '@/lib/market';
import { showErrorToast } from '@/lib/toast';
import type { CommunityPost } from '@/lib/types/community';
import { useRouter, useSearchParams } from 'next/navigation';

// API 응답 타입
type ListResponse = {
  ok: boolean;
  version?: string;
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
};

type NoticePinnedResponse = {
  items?: Array<{
    _id: string;
    title: string;
    createdAt: string | Date;
    isPinned?: boolean;
  }>;
};

const MARKET_FILTER_KEYS = [
  'saleStatus',
  'conditionGrade',
  'minPrice',
  'maxPrice',
  'modelKeyword',
  'gripSize',
  'pattern',
  'material',
  'gauge',
  'color',
  'length',
  'minWeight',
  'maxWeight',
  'minBalance',
  'maxBalance',
  'minHeadSize',
  'maxHeadSize',
  'minSwingWeight',
  'maxSwingWeight',
  'minStiffnessRa',
  'maxStiffnessRa',
] as const;

type MarketFilterKey = (typeof MARKET_FILTER_KEYS)[number];
type MarketFilterDraft = Record<MarketFilterKey, string>;

const EMPTY_MARKET_FILTER_DRAFT: MarketFilterDraft = MARKET_FILTER_KEYS.reduce((acc, key) => ({ ...acc, [key]: '' }), {} as MarketFilterDraft);

const PRICE_FILTER_KEYS = new Set<MarketFilterKey>(['minPrice', 'maxPrice']);

const stripNonDigits = (value: string) => value.replace(/[^\d]/g, '');

const formatPriceInput = (value: string) => {
  const digitsOnly = stripNonDigits(value);
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('ko-KR');
};

const normalizePriceQueryValue = (value: string) => stripNonDigits(value);

const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// 판매상태 배지 variant 매핑
function saleStatusBadgeVariant(status?: string | null): 'success' | 'warning' | 'neutral' {
  if (status === 'selling') return 'success';
  if (status === 'reserved') return 'warning';
  return 'neutral';
}

// 등급 배지 variant 매핑
function conditionGradeBadgeVariant(grade?: string | null): 'brand' | 'info' | 'neutral' | 'warning' {
  if (grade === 'S') return 'brand';
  if (grade === 'A') return 'info';
  if (grade === 'B') return 'neutral';
  return 'warning';
}

// 공통 폼 컨트롤 스타일
const selectClass = 'h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const inputClass = 'h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

// 범위형 필터 그룹 컴포넌트
function RangeFilterGroup({
  label,
  unit,
  minValue,
  maxValue,
  minPlaceholder = '최소',
  maxPlaceholder = '최대',
  onMinChange,
  onMaxChange,
  formatValue,
}: {
  label: string;
  unit?: string;
  minValue: string;
  maxValue: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  formatValue?: (v: string) => string;
}) {
  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMinChange(formatValue ? formatValue(e.target.value) : e.target.value);
  };
  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMaxChange(formatValue ? formatValue(e.target.value) : e.target.value);
  };
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {label}
        {unit && <span className="font-normal text-muted-foreground/70">({unit})</span>}
      </label>
      <div className="flex items-center gap-1">
        <input
          placeholder={minPlaceholder}
          className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
          value={minValue}
          onChange={handleMin}
        />
        <span className="shrink-0 text-xs text-muted-foreground">~</span>
        <input
          placeholder={maxPlaceholder}
          className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs tabular-nums text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
          value={maxValue}
          onChange={handleMax}
        />
      </div>
    </div>
  );
}

// 개별 필터 선택 그룹 (라벨 + select)
function FilterSelectGroup({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; options: readonly { value: string; label: string }[] | readonly string[] }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// 개별 필터 입력 그룹 (라벨 + input)
function FilterInputGroup({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// 적용된 필터 칩 데이터 생성
function getActiveFilterChips(searchParams: URLSearchParams): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  const saleStatus = searchParams.get('saleStatus');
  if (saleStatus) chips.push({ key: 'saleStatus', label: `${getMarketSaleStatusLabel(saleStatus)}` });
  const conditionGrade = searchParams.get('conditionGrade');
  if (conditionGrade) chips.push({ key: 'conditionGrade', label: `등급 ${conditionGrade}` });
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice && maxPrice) chips.push({ key: 'price', label: `${Number(minPrice).toLocaleString()}~${Number(maxPrice).toLocaleString()}원` });
  else if (minPrice) chips.push({ key: 'minPrice', label: `${Number(minPrice).toLocaleString()}원 이상` });
  else if (maxPrice) chips.push({ key: 'maxPrice', label: `${Number(maxPrice).toLocaleString()}원 이하` });
  const modelKeyword = searchParams.get('modelKeyword');
  if (modelKeyword) chips.push({ key: 'modelKeyword', label: `"${modelKeyword}"` });
  const gripSize = searchParams.get('gripSize');
  if (gripSize) chips.push({ key: 'gripSize', label: `그립 ${gripSize}` });
  const pattern = searchParams.get('pattern');
  if (pattern) chips.push({ key: 'pattern', label: `패턴 ${pattern}` });
  const material = searchParams.get('material');
  if (material) chips.push({ key: 'material', label: getMarketStringMaterialLabel(material) });
  const gauge = searchParams.get('gauge');
  if (gauge) chips.push({ key: 'gauge', label: `게이지 ${gauge}` });
  const color = searchParams.get('color');
  if (color) chips.push({ key: 'color', label: getMarketStringColorLabel(color) });
  const length = searchParams.get('length');
  if (length) chips.push({ key: 'length', label: getMarketStringLengthLabel(length) });
  const minWeight = searchParams.get('minWeight');
  const maxWeight = searchParams.get('maxWeight');
  if (minWeight || maxWeight) chips.push({ key: 'weight', label: `무게 ${minWeight || ''}~${maxWeight || ''}g` });
  const minBalance = searchParams.get('minBalance');
  const maxBalance = searchParams.get('maxBalance');
  if (minBalance || maxBalance) chips.push({ key: 'balance', label: `밸런스 ${minBalance || ''}~${maxBalance || ''}mm` });
  const minHeadSize = searchParams.get('minHeadSize');
  const maxHeadSize = searchParams.get('maxHeadSize');
  if (minHeadSize || maxHeadSize) chips.push({ key: 'headSize', label: `헤드 ${minHeadSize || ''}~${maxHeadSize || ''}sq in` });
  return chips;
}

// 목록 스켈레톤 UI
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-0">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardListClient({ config }: { config: BoardTypeConfig }) {
  // 페이지 상태
  const [page, setPage] = useState(1);
  const [pageJump, setPageJump] = useState('');

  // 정렬 상태
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>('latest');

  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: pinnedNoticeData } = useSWR<NoticePinnedResponse>('/api/boards?type=notice&page=1&limit=5', boardFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const pinnedNotices = useMemo(
    () =>
      (pinnedNoticeData?.items ?? [])
        .filter((notice) => notice.isPinned)
        .slice(0, 3)
        .map((notice) => ({
          _id: notice._id,
          title: notice.title,
          createdAt: notice.createdAt,
        })),
    [pinnedNoticeData?.items],
  );

  // 모달 핸들러
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<{ id: string; name: string } | null>(null);

  const openCompose = (toUserId: string, toName?: string | null) => {
    if (!user) {
      showErrorToast('로그인 후 이용할 수 있습니다.');
      const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const safeName = (toName ?? '').trim() || '회원';

    setComposeTo({ id: toUserId, name: safeName });
    setComposeOpen(true);
  };

  const rawBrandParam = searchParams.get('brand');
  const brandParam = typeof rawBrandParam === 'string' ? rawBrandParam : null;

  const [brand, setBrand] = useState<string>(brandParam ?? '');

  useEffect(() => {
    setBrand(brandParam ?? '');
    setPage(1);
  }, [brandParam]);

  // 사용자의 게시물 검색
  const authorId = searchParams.get('authorId');
  const authorName = searchParams.get('authorName');

  // 검색어 & 검색 타입 (URL 기준)
  const qParam = searchParams.get('q') ?? '';
  const rawSearchType = searchParams.get('searchType');
  const searchTypeParam: 'title' | 'author' | 'title_content' = rawSearchType === 'title' || rawSearchType === 'author' || rawSearchType === 'title_content' ? rawSearchType : 'title_content'; // 기본값: 제목+내용

  // 검색 입력 상태 (폼에서 사용하는 값)
  const [searchText, setSearchText] = useState(qParam);
  const [searchType, setSearchType] = useState<'title' | 'author' | 'title_content'>(searchTypeParam);

  // 카테고리 (URL 기준)
  const rawCategoryParam = searchParams.get('category');
  const categoryParam = rawCategoryParam && config.categoryMap[rawCategoryParam] ? rawCategoryParam : null;

  // UI에서 사용할 카테고리 상태 (전체 포함)
  const [category, setCategory] = useState<string>(categoryParam ?? 'all');

  // authorId 바뀌면 페이지는 1로
  useEffect(() => {
    setPage(1);
  }, [authorId]);

  // URL의 category가 바뀌면 상태도 동기화
  useEffect(() => {
    if (categoryParam) {
      setCategory(categoryParam);
    } else {
      setCategory('all');
    }
    setPage(1);
  }, [categoryParam]);

  // URL 쿼리가 바뀌면 검색 입력값도 동기화
  useEffect(() => {
    setSearchText(qParam);
    setSearchType(searchTypeParam);
  }, [qParam, searchTypeParam]);

  const [isMarketFilterOpen, setIsMarketFilterOpen] = useState(false);
  const [marketFilterDraft, setMarketFilterDraft] = useState<MarketFilterDraft>(EMPTY_MARKET_FILTER_DRAFT);

  // market 필터는 controlled state로 동기화합니다.
  // URL -> draft 동기화를 유지해 reset/apply 직후 입력값이 즉시 일치하도록 보장합니다.
  useEffect(() => {
    if (config.boardType !== 'market') return;
    const nextDraft: MarketFilterDraft = { ...EMPTY_MARKET_FILTER_DRAFT };
    MARKET_FILTER_KEYS.forEach((key) => {
      const rawValue = searchParams.get(key) ?? '';
      nextDraft[key] = PRICE_FILTER_KEYS.has(key) ? formatPriceInput(rawValue) : rawValue;
    });
    setMarketFilterDraft(nextDraft);
  }, [config.boardType, searchParams]);

  // 카테고리 선택 시 URL 바꾸는 핸들러
  const handleCategoryChange = (next: string) => {
    setPage(1);
    setCategory(next);

    const sp = new URLSearchParams(searchParams.toString());
    if (next === 'all') sp.delete('category');
    else sp.set('category', next);

    // 라켓/스트링이 아니면 brand 제거
    if (!config.brandOptionsByCategory || !config.brandOptionsByCategory[next]) sp.delete('brand');

    router.push(`${config.routePrefix}?${sp.toString()}`);
  };

  // market 필터 적용 시 URL/page/local state를 동시에 맞춥니다.
  // page=1 고정은 필터 변화 후 첫 페이지부터 결과를 보는 UX를 위한 계약입니다.
  const pushMarketFilters = (sp: URLSearchParams, nextDraft?: MarketFilterDraft) => {
    sp.set('page', '1');
    setPage(1);
    if (nextDraft) setMarketFilterDraft(nextDraft);
    router.push(`${config.routePrefix}?${sp.toString()}`);
  };

  const applyMarketFilters = () => {
    const sp = new URLSearchParams(searchParams.toString());
    const minPrice = Number(normalizePriceQueryValue(marketFilterDraft.minPrice));
    const maxPrice = Number(normalizePriceQueryValue(marketFilterDraft.maxPrice));
    const hasMinPrice = Number.isFinite(minPrice) && minPrice > 0;
    const hasMaxPrice = Number.isFinite(maxPrice) && maxPrice > 0;

    if (hasMinPrice && hasMaxPrice && minPrice > maxPrice) {
      showErrorToast('최소가격은 최대가격보다 클 수 없습니다.');
      return;
    }

    MARKET_FILTER_KEYS.forEach((key) => {
      const rawValue = marketFilterDraft[key].trim();
      const value = PRICE_FILTER_KEYS.has(key) ? normalizePriceQueryValue(rawValue) : rawValue;
      if (value) sp.set(key, value);
      else sp.delete(key);
    });
    pushMarketFilters(sp, marketFilterDraft);
  };

  const resetMarketFilters = () => {
    const sp = new URLSearchParams(searchParams.toString());
    MARKET_FILTER_KEYS.forEach((key) => sp.delete(key));
    pushMarketFilters(sp, { ...EMPTY_MARKET_FILTER_DRAFT });
  };

  // 브랜드 ��경 핸들러
  const handleBrandChange = (nextBrand: string) => {
    setPage(1);
    setBrand(nextBrand);

    const sp = new URLSearchParams(searchParams.toString());

    if (!nextBrand) sp.delete('brand');
    else sp.set('brand', nextBrand);

    router.push(`${config.routePrefix}?${sp.toString()}`);
  };

  // 한 페이지당 개수
  const PAGE_LIMIT = 10;

  const qs = new URLSearchParams({
    kind: config.boardType,
    type: config.boardType,
    page: String(page),
    limit: String(PAGE_LIMIT),
    sort,
  });

  if (brandParam && categoryParam && config.brandOptionsByCategory?.[categoryParam]) {
    qs.set('brand', brandParam);
  }

  if (authorId) {
    qs.set('authorId', authorId);
  }

  // 카테고리 필터
  if (categoryParam) {
    qs.set('category', categoryParam);
  }

  // 검색 쿼리 반영
  if (qParam) {
    qs.set('q', qParam);
    qs.set('searchType', searchTypeParam);
  }

  // market 전용 필터는 URLSearchParams를 그대로 API 쿼리에 전달
  if (config.boardType === 'market') {
    MARKET_FILTER_KEYS.forEach((k) => {
      const v = searchParams.get(k);
      if (v) qs.set(k, v);
    });
  }
  const handleSearchSubmit = (e: any) => {
    e.preventDefault();

    // 현재 URL 쿼리 기준으로 새 파라미터 구성
    const params = new URLSearchParams(searchParams.toString());

    if (searchText.trim()) {
      params.set('q', searchText.trim());
      params.set('searchType', searchType);
    } else {
      // 빈 검색어면 검색 관련 파라미터 제거
      params.delete('q');
      params.delete('searchType');
    }

    router.push(`${config.routePrefix}?${params.toString()}`);
    setPage(1); // 검색하면 1페이지부터 다시
  };

  const handleSearchReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('searchType');

    router.push(`${config.routePrefix}?${params.toString()}`);
    setSearchText('');
    setSearchType('title_content');
    setPage(1);
  };

  const { data, error, isLoading } = useSWR<ListResponse>(`/api/boards?${qs.toString()}`, (url: string) => boardFetcher<ListResponse>(url));
  const listError = parseApiError(error, config.errorMessage);

  // 로딩/에러/성공을 분리해서 헤더 수치가 0건처럼 먼저 보이지 않게 처리
  const hasDataError = Boolean(error);
  const hasResolvedData = !isLoading && !hasDataError && Boolean(data);
  const hasResolvedTotal = hasResolvedData && typeof data?.total === 'number';

  const items = hasResolvedData ? (data?.items ?? []) : [];
  const total = hasResolvedTotal ? data!.total : null;
  const shouldShowEmptyState = hasResolvedData && items.length === 0;
  const shouldShowRows = hasResolvedData && items.length > 0;
  const activeMarketFilterCount = useMemo(() => MARKET_FILTER_KEYS.filter((key) => (searchParams.get(key) ?? '').trim() !== '').length, [searchParams]);

  // total이 확정된 경우에만 실제 페이지 수를 계산하고, 미확정 상태에서는 내부 보수값(1)만 사용
  const totalPages = hasResolvedTotal ? Math.max(1, Math.ceil((total ?? 0) / PAGE_LIMIT)) : 1;
  const pageStart = Math.max(1, Math.min(page - 1, totalPages - 2));
  const pageEnd = Math.min(totalPages, pageStart + 2);
  const visiblePages = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const movePage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  };

  const handlePageJump = (e: any) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageJump, 10);
    if (Number.isNaN(parsed)) return;
    movePage(parsed);
    setPageJump('');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <MessageComposeDialog
        open={composeOpen}
        onOpenChange={(v) => {
          setComposeOpen(v);
          if (!v) setComposeTo(null);
        }}
        toUserId={composeTo?.id ?? ''}
        toName={composeTo?.name}
      />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* 헤더 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 브레드크럼: 게시판 > 자유 게시판 */}
            <div className="mb-1 text-sm text-foreground">
              <span className="font-medium text-success">게시판</span>
              <span className="mx-1">›</span>
              <span>{config.boardTitle}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{config.boardTitle}</h1>
            <p className="mt-1 text-sm text-foreground md:text-base">{config.boardDescription}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/board">게시판 홈으로</Link>
            </Button>

            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={loading}
              onClick={() => {
                if (!user) {
                  // 비회원: 로그인 페이지로 이동
                  const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
                  router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                  return;
                }

                router.push(`${config.routePrefix}/write`);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>글쓰기</span>
            </Button>
          </div>
        </div>

        {/* 리스트 카드 */}
        <Card className="border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold md:text-base">{config.boardTitle}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{config.cardDescription}</p>
              </div>
            </div>
            {hasResolvedTotal && (total ?? 0) > 0 && (
              <Badge variant="secondary" className="hidden items-center gap-1 px-2.5 py-0.5 text-xs sm:inline-flex">
                <span className="font-semibold tabular-nums">{(total ?? 0).toLocaleString()}</span>건
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* 상단: 총 글 수 + 정렬 옵션 + 카테고리 필터 */}
            {!error && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    총 <span className="font-semibold">{hasResolvedTotal ? (total ?? 0).toLocaleString() : '-'}</span>개의 글이 있습니다.
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="hidden text-muted-foreground sm:inline">정렬:</span>
                    <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                      {[
                        { value: 'latest', label: '최신순' },
                        { value: 'views', label: '조회순' },
                        { value: 'likes', label: '추천순' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSort(opt.value as 'latest' | 'views' | 'likes');
                            setPage(1);
                          }}
                          className={[
                            'px-3 py-1.5 text-xs sm:text-[13px]',
                            'transition-colors',
                            'border-r border-border last:border-r-0',
                            sort === opt.value ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-foreground">분류:</span>
                  {[{ value: 'all', label: '전체' }, ...config.categories].map((cat) => {
                    const active = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleCategoryChange(cat.value as any)}
                        className={[
                          'rounded-full border px-3 py-1',
                          'transition-colors',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground',
                        ].join(' ')}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                {config.brandOptionsByCategory?.[category] && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-foreground">브랜드:</span>
                    {[{ value: '', label: '전체' }, ...config.brandOptionsByCategory[category]].map((o) => {
                      const active = brand === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => handleBrandChange(o.value)}
                          className={['rounded-full border px-3 py-1 transition-colors', active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'].join(
                            ' ',
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {config.boardType === 'market' && (
                  <div className="rounded-lg border border-border bg-card">
                    {/* 필터 헤더 */}
                    <button type="button" className="flex w-full items-center justify-between px-4 py-2.5 md:cursor-default" onClick={() => setIsMarketFilterOpen((prev) => !prev)}>
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">상세 필터</span>
                        {activeMarketFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">{activeMarketFilterCount}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {activeMarketFilterCount > 0 && (
                          <span
                            role="button"
                            tabIndex={0}
                            className="hidden text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline md:inline"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetMarketFilters();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                resetMarketFilters();
                              }
                            }}
                          >
                            전체 초기화
                          </span>
                        )}
                        <div className="md:hidden">{isMarketFilterOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div>
                      </div>
                    </button>

                    {/* 적용된 필터 칩 (헤더 바로 아래) */}
                    {activeMarketFilterCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 px-4 py-2">
                        {getActiveFilterChips(searchParams).map((chip) => (
                          <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
                            {chip.label}
                          </span>
                        ))}
                        <button type="button" className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground" onClick={resetMarketFilters}>
                          <X className="h-3 w-3" />
                          모두 해제
                        </button>
                      </div>
                    )}

                    {/* 필터 본문 */}
                    <div className={[isMarketFilterOpen ? 'block' : 'hidden', 'border-t border-border md:block'].join(' ')}>
                      {/* ── 기본 필터 섹션 ── */}
                      <div className="px-4 py-3">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          <span className="text-xs font-semibold text-foreground">기본 필터</span>
                          <span className="text-[11px] text-muted-foreground">판매상태, 등급, 가격</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
                          <FilterSelectGroup label="판매상태" value={marketFilterDraft.saleStatus} onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, saleStatus: v }))} placeholder="전체" options={MARKET_SALE_STATUS_OPTIONS} />
                          <FilterSelectGroup label="상품등급" value={marketFilterDraft.conditionGrade} onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, conditionGrade: v }))} placeholder="전체" options={MARKET_CONDITION_GRADE_OPTIONS} />
                          <div className="col-span-2 sm:col-span-1">
                            <RangeFilterGroup
                              label="가격"
                              unit="원"
                              minValue={marketFilterDraft.minPrice}
                              maxValue={marketFilterDraft.maxPrice}
                              onMinChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, minPrice: v }))}
                              onMaxChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, maxPrice: v }))}
                              formatValue={formatPriceInput}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── 라켓 카테고리 필터 ── */}
                      {category === 'racket' && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-info" />
                            <span className="text-xs font-semibold text-foreground">라켓 상세</span>
                            <span className="text-[11px] text-muted-foreground">모델, 스펙, 사이즈</span>
                          </div>
                          {/* 행 1: 검색/선택 필터 */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
                            <FilterInputGroup label="모델명" value={marketFilterDraft.modelKeyword} onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, modelKeyword: v }))} placeholder="모델명 키워드" />
                            <FilterSelectGroup
                              label="그립 사이즈"
                              value={marketFilterDraft.gripSize}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, gripSize: v }))}
                              placeholder="전체"
                              options={MARKET_RACKET_GRIP_SIZE_OPTIONS.map((g) => ({ value: g, label: g }))}
                            />
                            <FilterSelectGroup
                              label="스트링 패턴"
                              value={marketFilterDraft.pattern}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, pattern: v }))}
                              placeholder="전체"
                              options={MARKET_RACKET_PATTERN_OPTIONS.map((p) => ({ value: p, label: p }))}
                            />
                          </div>
                          {/* 행 2: 범위 필터 */}
                          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
                            <RangeFilterGroup
                              label="무게"
                              unit="g"
                              minValue={marketFilterDraft.minWeight}
                              maxValue={marketFilterDraft.maxWeight}
                              onMinChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, minWeight: v }))}
                              onMaxChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, maxWeight: v }))}
                            />
                            <RangeFilterGroup
                              label="밸런스"
                              unit="mm"
                              minValue={marketFilterDraft.minBalance}
                              maxValue={marketFilterDraft.maxBalance}
                              onMinChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, minBalance: v }))}
                              onMaxChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, maxBalance: v }))}
                            />
                            <RangeFilterGroup
                              label="헤드 사이즈"
                              unit="sq in"
                              minValue={marketFilterDraft.minHeadSize}
                              maxValue={marketFilterDraft.maxHeadSize}
                              onMinChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, minHeadSize: v }))}
                              onMaxChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, maxHeadSize: v }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* ── 스트링 카테고리 필터 ── */}
                      {category === 'string' && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-info" />
                            <span className="text-xs font-semibold text-foreground">스트링 상세</span>
                            <span className="text-[11px] text-muted-foreground">모델, 재질, 게이지, 색상</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
                            <FilterInputGroup label="모델명" value={marketFilterDraft.modelKeyword} onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, modelKeyword: v }))} placeholder="모델명 키워드" />
                            <FilterSelectGroup
                              label="재질"
                              value={marketFilterDraft.material}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, material: v }))}
                              placeholder="전체"
                              options={MARKET_STRING_MATERIAL_OPTIONS.map((m) => ({ value: m, label: getMarketStringMaterialLabel(m) }))}
                            />
                            <FilterSelectGroup
                              label="게이지"
                              value={marketFilterDraft.gauge}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, gauge: v }))}
                              placeholder="전체"
                              options={MARKET_STRING_GAUGE_OPTIONS.map((g) => ({ value: g, label: g }))}
                            />
                            <FilterSelectGroup
                              label="색상"
                              value={marketFilterDraft.color}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, color: v }))}
                              placeholder="전체"
                              options={MARKET_STRING_COLOR_OPTIONS.map((c) => ({ value: c, label: getMarketStringColorLabel(c) }))}
                            />
                            <FilterSelectGroup
                              label="길이"
                              value={marketFilterDraft.length}
                              onChange={(v) => setMarketFilterDraft((prev) => ({ ...prev, length: v }))}
                              placeholder="전체"
                              options={MARKET_STRING_LENGTH_OPTIONS.map((l) => ({ value: l, label: getMarketStringLengthLabel(l) }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* ── 필터 액션 바 ── */}
                      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
                        <span className="text-[11px] text-muted-foreground">{activeMarketFilterCount > 0 ? `${activeMarketFilterCount}개 조건 적용됨` : '조건을 선택하고 적용하세요'}</span>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" onClick={resetMarketFilters}>
                            <RotateCcw className="h-3 w-3" />
                            초기화
                          </Button>
                          <Button type="button" size="sm" className="h-7 gap-1 px-3 text-xs" onClick={applyMarketFilters}>
                            <Search className="h-3 w-3" />
                            필터 적용
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {authorId && (
              <div className="flex items-center gap-2 text-sm">
                <span>현재: {authorName ? `${authorName}님의 글` : '특정 작성자 글'} 보는 중</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(config.routePrefix)} // 쿼리 제거(해제)
                >
                  해제
                </Button>
              </div>
            )}

            <PinnedNoticeStrip items={pinnedNotices} />

            {/* 로딩/에러/빈 상태 처리 */}
            {isLoading && <ListSkeleton />}
            {error && !isLoading && <ErrorBox message={listError.message} status={listError.status} fallbackMessage={config.errorMessage} />}

            {shouldShowEmptyState && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
                <PackageSearch className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">{activeMarketFilterCount > 0 ? '조건에 맞는 매물이 없습니다' : '아직 등록된 글이 없습니다'}</p>
                <p className="text-xs text-muted-foreground">{activeMarketFilterCount > 0 ? '필터 조건을 변경하거나 초기화해 보세요' : config.emptyDescription}</p>
                <div className="mt-2 flex items-center gap-2">
                  {activeMarketFilterCount > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={resetMarketFilters}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      필터 초기화
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link href={`${config.routePrefix}/write`}>
                      <Plus className="mr-1 h-3.5 w-3.5" />첫 글 작성하기
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {shouldShowRows && (
              <>
                {/* 데스크탑: 테이블형 리스트 */}
                <div className="hidden text-sm md:block">
                  {/* 헤더 행 */}
                  {config.boardType === 'market' ? (
                    <div className="grid grid-cols-[44px_64px_minmax(0,1fr)_110px_72px_90px_88px_52px] items-center border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="text-center">No.</div>
                      <div className="text-center">분류</div>
                      <div>상품 정보</div>
                      <div className="text-right pr-1">가격</div>
                      <div className="text-center">상태</div>
                      <div className="text-center">판매자</div>
                      <div className="text-center">등록일</div>
                      <div className="flex items-center justify-center gap-0.5">
                        <Eye className="h-3 w-3" />
                        <span className="text-border">/</span>
                        <ThumbsUp className="h-3 w-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center border-b-2 border-foreground/10 bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      <div className="text-center">번호</div>
                      <div className="text-center">분류</div>
                      <div>제목</div>
                      <div className="text-center">글쓴이</div>
                      <div className="text-center">작성일</div>
                      <div className="text-center">댓글</div>
                      <div className="text-center">조회</div>
                      <div className="text-center">추천</div>
                    </div>
                  )}

                  {/* 데이터 행들 */}
                  <div className="divide-y divide-border/60">
                    {items.map((post) => {
                      const isMarket = config.boardType === 'market';
                      const isSold = post.marketMeta?.saleStatus === 'sold';

                      return isMarket ? (
                        <Link
                          key={post.id}
                          href={`${config.routePrefix}/${post.postNo ?? post.id}`}
                          className={['group grid grid-cols-[44px_64px_minmax(0,1fr)_110px_72px_90px_88px_52px] items-center px-3 py-2.5 text-sm transition-colors', isSold ? 'opacity-45 hover:opacity-65' : 'hover:bg-muted/40'].join(' ')}
                        >
                          {/* 번호 */}
                          <div className="text-center text-[11px] tabular-nums text-muted-foreground">{typeof post.postNo === 'number' ? post.postNo : '-'}</div>

                          {/* 분류 뱃지 */}
                          <div className="flex items-center justify-center">
                            <Badge variant={getBoardCategoryTone(config.boardType, post.category)} className="px-1.5 py-0 text-[10px] leading-4">
                              {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류'}
                            </Badge>
                          </div>

                          {/* 상품 정보: 제목 + 브랜드/모델/등급 */}
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-1">
                              <span className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">{post.title}</span>
                              {post.commentsCount ? <span className="shrink-0 text-[11px] font-medium text-primary">[{post.commentsCount}]</span> : null}
                              {post.images && post.images.length > 0 && <ImageIcon className="h-3 w-3 shrink-0 text-primary/60" aria-label="이미지 첨부 있음" />}
                              {post.attachments && post.attachments.length > 0 && <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="파일 첨부 있음" />}
                            </div>
                            {post.marketMeta && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                {post.brand && <span className="font-medium text-muted-foreground">{getMarketBrandLabel(post.brand)}</span>}
                                {(post.marketMeta.racketSpec?.modelName || post.marketMeta.stringSpec?.modelName) && (
                                  <span className="line-clamp-1 text-muted-foreground/70">{post.marketMeta.racketSpec?.modelName ?? post.marketMeta.stringSpec?.modelName}</span>
                                )}
                                {post.marketMeta.conditionGrade && (
                                  <Badge variant={conditionGradeBadgeVariant(post.marketMeta.conditionGrade)} className="px-1 py-0 text-[9px] leading-3.5">
                                    {post.marketMeta.conditionGrade}급
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 가격 - 가장 눈에 띄게 */}
                          <div className="pr-1 text-right">
                            {post.marketMeta?.price != null ? (
                              <span className="text-sm font-bold tabular-nums text-foreground">
                                {post.marketMeta.price.toLocaleString()}
                                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">원</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>

                          {/* 판매상태 */}
                          <div className="flex items-center justify-center">
                            {post.marketMeta?.saleStatus && (
                              <Badge variant={saleStatusBadgeVariant(post.marketMeta.saleStatus)} className="px-1.5 py-0 text-[10px] leading-4">
                                {getMarketSaleStatusLabel(post.marketMeta.saleStatus)}
                              </Badge>
                            )}
                          </div>

                          {/* 판매자 */}
                          <div className="truncate text-center text-[11px]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="truncate text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  {post.nickname || '회원'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!post.userId) return;
                                    router.push(`${config.routePrefix}?authorId=${post.userId}&authorName=${encodeURIComponent(post.nickname ?? '')}`);
                                  }}
                                >
                                  이 작성자의 글 보기
                                </DropdownMenuItem>
                                {post.userId && post.userId !== user?.id && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!user) {
                                        const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
                                        router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                                        return;
                                      }
                                      if (!post.userId) return;
                                      openCompose(post.userId, post.nickname);
                                    }}
                                  >
                                    쪽지 보내기
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!post.userId) return;
                                    router.push(`${config.routePrefix}/${post.postNo ?? post.id}?openProfile=1`);
                                  }}
                                >
                                  작성자 테니스 프로필
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* 등록일 */}
                          <div className="text-center text-[11px] text-muted-foreground">{fmtDateTime(post.createdAt)}</div>

                          {/* 조회/추천 */}
                          <div className="text-center text-[11px] tabular-nums text-muted-foreground">
                            {post.views ?? 0}
                            <span className="text-border/60">/</span>
                            {post.likes ?? 0}
                          </div>
                        </Link>
                      ) : (
                        <Link key={post.id} href={`${config.routePrefix}/${post.postNo ?? post.id}`} className="grid grid-cols-[60px_80px_minmax(0,1fr)_120px_140px_70px_70px_70px] items-center px-4 py-3 text-sm transition-colors hover:bg-muted/50">
                          {/* 번호 */}
                          <div className="text-center text-xs tabular-nums text-muted-foreground">{typeof post.postNo === 'number' ? post.postNo : '-'}</div>

                          {/* 분류 뱃지 */}
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Badge variant={getBoardCategoryTone(config.boardType, post.category)} className={badgeSizeSm}>
                              {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류 없음'}
                            </Badge>
                            {config.brandOptionsByCategory?.[post.category ?? ''] && post.brand ? <span className="text-[11px] text-muted-foreground">{getMarketBrandLabel(post.brand)}</span> : null}
                          </div>

                          {/* 제목 */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="line-clamp-1 text-foreground">{post.title}</span>
                              {post.commentsCount ? <span className="text-xs text-primary">[{post.commentsCount}]</span> : null}
                              {post.images && post.images.length > 0 && <ImageIcon className="h-4 w-4 shrink-0 ml-1 text-primary" aria-label="이미지 첨부 있음" />}
                              {post.attachments && post.attachments.length > 0 && <Paperclip className="h-4 w-4 shrink-0 ml-0.5 text-foreground" aria-label="파일 첨부 있음" />}
                            </div>
                          </div>

                          {/* 글쓴이 */}
                          <div className="truncate text-center text-xs">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="truncate text-foreground underline-offset-4 hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  {post.nickname || '회원'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!post.userId) return;
                                    const authorName = post.nickname ?? '';
                                    router.push(`${config.routePrefix}?authorId=${post.userId}&authorName=${encodeURIComponent(authorName)}`);
                                  }}
                                >
                                  이 작성자의 글 보기
                                </DropdownMenuItem>
                                {post.userId && post.userId !== user?.id && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!user) {
                                        const redirectTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : config.routePrefix;
                                        router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
                                        return;
                                      }
                                      const toUserId = post.userId;
                                      if (!toUserId) return;
                                      openCompose(toUserId, post.nickname);
                                    }}
                                  >
                                    쪽지 보내기
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!post.userId) return;
                                    router.push(`${config.routePrefix}/${post.postNo ?? post.id}?openProfile=1`);
                                  }}
                                >
                                  작성자 테니스 프로필
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* 작성일 */}
                          <div className="text-center text-xs text-muted-foreground">{fmtDateTime(post.createdAt)}</div>

                          {/* 댓글 수 */}
                          <div className="text-center text-xs text-muted-foreground">{post.commentsCount ?? 0}</div>

                          {/* 조회 수 */}
                          <div className="text-center text-xs text-muted-foreground">{post.views ?? 0}</div>

                          {/* 추천 수 */}
                          <div className="text-center text-xs text-muted-foreground">{post.likes ?? 0}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* 모바일: 카드형 리스트 */}
                <div className="space-y-2 md:hidden">
                  {items.map((post) => {
                    const isMarket = config.boardType === 'market';
                    const isSold = post.marketMeta?.saleStatus === 'sold';

                    return isMarket ? (
                      <Link key={post.id} href={`${config.routePrefix}/${post.postNo ?? post.id}`} className={['block rounded-lg border border-border bg-card px-3 py-3 transition-colors active:bg-muted/30', isSold ? 'opacity-45' : ''].join(' ')}>
                        {/* 상단: 가격 + 상태/등급 뱃지 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {post.marketMeta?.saleStatus && (
                              <Badge variant={saleStatusBadgeVariant(post.marketMeta.saleStatus)} className="px-1.5 py-0 text-[10px] leading-4">
                                {getMarketSaleStatusLabel(post.marketMeta.saleStatus)}
                              </Badge>
                            )}
                            <Badge variant={getBoardCategoryTone(config.boardType, post.category)} className="px-1.5 py-0 text-[10px] leading-4">
                              {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류'}
                            </Badge>
                            {post.marketMeta?.conditionGrade && (
                              <Badge variant={conditionGradeBadgeVariant(post.marketMeta.conditionGrade)} className="px-1 py-0 text-[9px] leading-3.5">
                                {post.marketMeta.conditionGrade}급
                              </Badge>
                            )}
                          </div>
                          {/* 가격 - 모바일에서도 가장 눈에 띄게 */}
                          {post.marketMeta?.price != null && (
                            <span className="text-sm font-bold tabular-nums text-foreground">
                              {post.marketMeta.price.toLocaleString()}
                              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">원</span>
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <div className="mt-1.5 flex items-start gap-1">
                          <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">{post.title}</span>
                          {post.commentsCount ? <span className="mt-px shrink-0 text-[11px] font-medium text-primary">[{post.commentsCount}]</span> : null}
                          {post.images && post.images.length > 0 && <ImageIcon className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" aria-label="이미지 첨부 있음" />}
                        </div>

                        {/* 브랜드 / 모델 */}
                        {post.marketMeta && (post.brand || post.marketMeta.racketSpec?.modelName || post.marketMeta.stringSpec?.modelName) && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {post.brand && <span className="font-medium">{getMarketBrandLabel(post.brand)}</span>}
                            {post.brand && (post.marketMeta.racketSpec?.modelName || post.marketMeta.stringSpec?.modelName) && ' '}
                            <span className="text-muted-foreground/70">{post.marketMeta.racketSpec?.modelName ?? post.marketMeta.stringSpec?.modelName ?? ''}</span>
                          </div>
                        )}

                        {/* 하단 메타 */}
                        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
                          <span>
                            {post.nickname || '회원'} &middot; {fmtDateTime(post.createdAt)}
                          </span>
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" />
                              {post.views ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ThumbsUp className="h-2.5 w-2.5" />
                              {post.likes ?? 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <Link key={post.id} href={`${config.routePrefix}/${post.postNo ?? post.id}`} className="block rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 active:bg-muted/40">
                        {/* 1줄: 번호 + 분류 뱃지 */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-[11px] tabular-nums">{typeof post.postNo === 'number' ? post.postNo : '-'}</span>
                          <Badge variant={getBoardCategoryTone(config.boardType, post.category)} className={badgeSizeSm}>
                            {config.categoryMap[post.category ?? ''] ? getCategoryBadgeText(config.categoryMap[post.category ?? '']) : '분류 없음'}
                          </Badge>
                        </div>

                        {/* 2줄: 제목 */}
                        <div className="mt-1 flex items-start gap-1">
                          <span className="line-clamp-2 text-sm font-medium text-foreground">{post.title}</span>
                          {post.images && post.images.length > 0 && <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-label="이미지 첨부 있음" />}
                          {post.attachments && post.attachments.length > 0 && <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="파일 첨부 있음" />}
                        </div>

                        {/* 3줄: 작성자/날짜 + 카운트들 */}
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>{post.nickname || '회원'}</span>
                            <span className="text-border">{'|'}</span>
                            <span>{fmtDateTime(post.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" />
                              {post.commentsCount ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {post.views ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ThumbsUp className="h-3 w-3" />
                              {post.likes ?? 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* 하단: 검색 + 페이지네이션 */}
                {hasResolvedTotal && (total ?? 0) > 0 && (
                  <div className="mt-8 space-y-4">
                    {/* 검색 폼 */}
                    <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center">
                      <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as 'title' | 'author' | 'title_content')}
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-32"
                      >
                        <option value="title_content">제목+내용</option>
                        <option value="title">제목</option>
                        <option value="author">글쓴이</option>
                      </select>
                      <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="h-9 w-full flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="검색어를 입력하세요"
                      />
                      <div className="flex shrink-0 items-center gap-2">
                        <Button type="submit" size="sm" className="gap-1 px-3">
                          <Search className="h-3.5 w-3.5" />
                          검색
                        </Button>
                        {qParam && (
                          <Button type="button" variant="outline" size="sm" className="px-3" onClick={handleSearchReset}>
                            초기화
                          </Button>
                        )}
                      </div>
                    </form>

                    <div className="flex items-center justify-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => movePage(1)} disabled={page <= 1} type="button">
                          <span className="sr-only">첫 페이지</span>«
                        </Button>
                        {/* 이전 페이지 */}
                        <Button variant="outline" size="icon" onClick={() => movePage(page - 1)} disabled={page <= 1} type="button">
                          <span className="sr-only">이전 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </Button>

                        {/* 페이지 번호들: 현재 페이지 중심 3개 노출 */}
                        {visiblePages.map((pageNumber) => (
                          <Button key={pageNumber} variant={pageNumber === page ? 'default' : 'outline'} size="sm" className="h-10 w-10" onClick={() => movePage(pageNumber)} type="button">
                            {pageNumber}
                          </Button>
                        ))}

                        {/* 다음 페이지 */}
                        <Button variant="outline" size="icon" onClick={() => movePage(page + 1)} disabled={page >= totalPages} type="button">
                          <span className="sr-only">다음 페이지</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => movePage(totalPages)} disabled={page >= totalPages} type="button">
                          <span className="sr-only">마지막 페이지</span>»
                        </Button>

                        <form onSubmit={handlePageJump} className="ml-1 flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageJump}
                            onChange={(e) => setPageJump(e.target.value)}
                            placeholder="페이지"
                            className="h-10 w-20 rounded-md border border-border bg-background px-2 text-xs focus:ring-2 focus:ring-ring focus:border-border"
                          />
                          <Button type="submit" variant="outline" size="sm" className="h-10 px-2">
                            이동
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
