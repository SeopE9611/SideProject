'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { MoreHorizontal, Search, Star, Trash2, Eye, EyeOff, Calendar, MessageSquare, TrendingUp, Award, Loader2, ThumbsUp } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import ReviewPhotoDialog from '@/app/reviews/_components/ReviewPhotoDialog';
import type { AdminReviewListItemDto, AdminReviewsListResponseDto } from '@/types/admin/reviews';

type Row = AdminReviewListItemDto;
type Page = AdminReviewsListResponseDto;

function mapApiToViewModel(page: Page | null): Page | null {
  if (!page) return null;
  return {
    total: page.total,
    items: page.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString(),
      photos: Array.isArray(item.photos) ? item.photos : [],
      helpfulCount: Number(item.helpfulCount ?? 0),
    })),
  };
}

const LIMIT = 10;
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

// 검색 디바운스
function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminReviewListClient() {
  // ---- 검색/필터 ----
  const [qRaw, setQRaw] = useState('');
  const qDebounced = useDebounced(qRaw, 350);
  const [status, setStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [type, setType] = useState<'all' | 'product' | 'service'>('all');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    setSize(1);
  }, [qDebounced, status, type]);

  // ---- KPI ----
  const { data: metrics } = useSWR<{ total: number; avg: number; five: number; byType: { product: number; service: number } }>('/api/admin/reviews/metrics', fetcher);

  // ---- 리스트 ----
  const getKey = useCallback(
    (idx: number, prev: Page | null) => {
      if (prev && prev.items.length < LIMIT) return null;
      const page = idx + 1;
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (qDebounced.trim()) p.set('q', qDebounced.trim());
      if (status !== 'all') p.set('status', status);
      if (type !== 'all') p.set('type', type);
      if (showDeleted) p.set('withDeleted', '1');
      return `/api/admin/reviews?${p.toString()}`;
    },
    [qDebounced, status, type, showDeleted]
  );

  const { data: rawData, error, isValidating, size, setSize, mutate } = useSWRInfinite<Page>(getKey, fetcher, { revalidateFirstPage: true, revalidateOnFocus: false });
  const data = useMemo(() => (rawData ? rawData.map((page) => mapApiToViewModel(page) as Page) : undefined), [rawData]);
  const rows = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const hasMore = useMemo(() => (data?.length ? data[data.length - 1].items.length === LIMIT : false), [data]);

  // ---- 상세 모달 ----
  const [detail, setDetail] = useState<Row | null>(null);

  // 상세 조회(단건) + 사진 뷰어 상태
  const [fullDetail, setFullDetail] = useState<Row | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // fullDetail가 오기 전에도 detail.photos가 있으면 그걸 먼저 사용
  const photos: string[] = useMemo(() => fullDetail?.photos ?? detail?.photos ?? [], [fullDetail, detail]);
  // "보여줄 사진이 전혀 없을 때"만 스켈레톤 표시
  const loadingPhotos = !!detail && !fullDetail && photos.length === 0;

  useEffect(() => {
    if (!detail?._id) {
      setFullDetail(null);
      setDetailLoading(false);
      return;
    }
    let aborted = false;
    (async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/admin/reviews/${detail._id}`, { credentials: 'include' });
        if (!res.ok) return;
        const j = await res.json();
        if (!aborted) setFullDetail(j as Row);
      } finally {
        if (!aborted) setDetailLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [detail]);

  // ---- 정렬 ----
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'rating' | 'helpful'>('latest');
  const sortedRows = useMemo(() => {
    const arr = rows.slice();
    switch (sortBy) {
      case 'rating':
        arr.sort((a, b) => b.rating - a.rating);
        break;
      case 'helpful':
        arr.sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0));
        break;
      case 'oldest':
        arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      default:
        arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return arr;
  }, [rows, sortBy]);

  // ---- 선택/삭제 ----
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelectAll = (checked: boolean) => setSelected(checked ? rows.map((r) => r._id) : []);
  const toggleSelectOne = (id: string, checked: boolean) => setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  // rows 변경 시 화면에 없는 선택 해제
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => rows.some((r) => r._id === id)));
  }, [rows]);

  const doDelete = async (id: string) => {
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.filter((r) => r._id !== id) })) : pages), false);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
      showSuccessToast('삭제되었습니다.');
    } catch (error: unknown) {
      await mutate(() => snapshot, false);
      showErrorToast(error instanceof Error ? error.message : '삭제 중 오류');
    }
  };

  const doBulkDelete = async () => {
    if (!selected.length) return;
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.filter((r) => !selected.includes(r._id)) })) : pages), false);
    try {
      await Promise.allSettled(selected.map((id) => fetch(`/api/admin/reviews/${id}`, { method: 'DELETE', credentials: 'include' })));
      setSelected([]);
      showSuccessToast('선택 항목을 삭제했습니다.');
    } catch {
      await mutate(() => snapshot, false);
      showErrorToast('일부 항목 삭제에 실패했습니다.');
    }
  };

  // 선택 공개/비공개 (일괄) — 낙관적 업데이트 + 실패 시 롤백
  const doBulkUpdateStatus = async (next: 'visible' | 'hidden') => {
    if (!selected.length) return;

    // 낙관적 업데이트: 현재 페이지들에서 선택된 항목들의 status만 먼저 바꿔 그림
    const snapshot = data;
    await mutate(
      (pages?: Page[]) =>
        pages
          ? pages.map((p) => ({
              ...p,
              items: p.items.map((r) => (selected.includes(r._id) ? { ...r, status: next } : r)),
            }))
          : pages,
      false
    );

    // 실제 서버 PATCH — 5개씩 동시 처리(서버 부하 방지)
    const CHUNK = 5;
    try {
      for (let i = 0; i < selected.length; i += CHUNK) {
        const part = selected.slice(i, i + CHUNK);
        await Promise.all(
          part.map(async (id) => {
            const res = await fetch(`/api/admin/reviews/${id}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: next }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
          })
        );
      }
      setSelected([]);
      showSuccessToast(next === 'hidden' ? '선택 항목을 비공개로 변경했습니다.' : '선택 항목을 공개로 변경했습니다.');
    } catch (e) {
      // 3) 실패 시 롤백
      await mutate(() => snapshot, false);
      showErrorToast('일부 항목 상태 변경에 실패했습니다.');
    }
  };

  // ---- 공개/비공개 토글(낙관적) ----
  const toggleVisible = async (it: Row) => {
    const next = it.status === 'visible' ? 'hidden' : 'visible';
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.map((r) => (r._id === it._id ? { ...r, status: next } : r)) })) : pages), false);
    try {
      const res = await fetch(`/api/admin/reviews/${it._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      showSuccessToast(next === 'hidden' ? '리뷰를 비공개로 변경했습니다.' : '리뷰를 공개로 변경했습니다.');
    } catch {
      await mutate(() => snapshot, false);
      showErrorToast('상태 변경 실패');
    }
  };

  // --- 카드 밀도 토글 ----
  const [compact, setCompact] = useState(false);

  // 더보기/ 접기----
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ---- 렌더 유틸 ----
  const renderStars = (n: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < n ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground dark:text-muted-foreground'}`} />
      ))}
    </div>
  );
  function safeSplitDate(input?: string | number | Date) {
    try {
      if (input == null) return { date: '-', time: '-' };
      const d = new Date(input);
      if (Number.isNaN(d.getTime())) return { date: '-', time: '-' };
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
    } catch {
      return { date: '-', time: '-' };
    }
  }
  const typeBadgeClass = (t: Row['type']) => (t === 'product' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-primary text-primary hover:bg-primary');
  const typeLabel = (t: Row['type']) => (t === 'product' ? '상품 리뷰' : '서비스 리뷰');

  const GRID = 'lg:grid-cols-[44px_minmax(90px,1fr)_minmax(240px,2.4fr)_minmax(96px,0.9fr)_minmax(110px,1fr)_minmax(84px,0.8fr)_minmax(72px,0.8fr)_56px]';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="mb-2">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground dark:text-white">리뷰 관리</h1>
            <p className="mt-2 text-base text-muted-foreground dark:text-muted-foreground">고객 리뷰를 관리하고 서비스 품질을 향상시키세요</p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 bg-card dark:bg-card shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">전체 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.total ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-primary dark:bg-primary">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card dark:bg-card shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">평균 평점</p>
                <p className="text-2xl font-bold">{(metrics?.avg ?? 0).toFixed(1)}</p>
              </div>
              <div className="rounded-md p-2 bg-yellow-50 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card dark:bg-card shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">5점 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.five ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-primary dark:bg-primary">
                <Award className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card dark:bg-card shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">서비스 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.byType?.service ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-purple-50 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card dark:bg-card shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">상품 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.byType?.product ?? 0}</p>
              </div>
              <div className="rounded-md p-2 bg-indigo-50 dark:bg-indigo-900/30">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색/필터 + 전체선택 */}
      <div
        className="sticky top-0 z-10 -mt-2 mb-2
  bg-card dark:bg-card backdrop-blur
  supports-[backdrop-filter]:bg-card dark:supports-[backdrop-filter]:bg-card
  border border-border dark:border-border
  rounded-md px-3 py-2  flex flex-wrap items-center justify-between gap-3"
      >
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="리뷰 검색…"
            className="pl-10 h-9 text-sm border-border dark:border-border focus:border-border focus:ring-emerald-500"
            value={qRaw}
            onChange={(e) => setQRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSize(1)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border dark:border-border px-2 py-1.5">
            <Checkbox checked={rows.length > 0 && selected.length === rows.length} onCheckedChange={(val) => toggleSelectAll(!!val)} aria-label="전체 선택" className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">전체 선택</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border dark:border-border px-2 py-1.5">
            <Checkbox id="show-deleted" checked={showDeleted} onCheckedChange={(v) => setShowDeleted(!!v)} className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            <label htmlFor="show-deleted" className="text-xs text-muted-foreground dark:text-muted-foreground">
              삭제 포함 보기
            </label>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCompact((v) => !v)}>
            {compact ? '코지' : '컴팩트'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                정렬
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setSortBy('latest')}>최신순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('rating')}>평점 높은순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('helpful')}>도움돼요 많은순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>오래된순</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 리스트 카드 */}
      <div className="rounded-lg ring-1 ring-ring dark:ring-ring bg-card dark:bg-card shadow-sm">
        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
          {/* 헤더 라벨 */}
          <div
            className={`sticky top-0 z-[1] hidden lg:grid ${GRID}
  items-center gap-x-3 bg-card dark:bg-card
  border-b border-border dark:border-border
  px-3 py-3 text-[13px] text-muted-foreground dark:text-muted-foreground`}
          >
            <div className="opacity-70">선택</div>
            <div>작성자</div>
            <div className="whitespace-nowrap">리뷰 내용</div>
            <div>평점 / 도움돼요</div>
            <div>작성일</div>
            <div>타입</div>
            <div className="text-center">공개 / 비공개</div>
            <div className="text-right">관리</div>
          </div>

          {error ? (
            <div className="p-8 text-center text-destructive">목록을 불러오지 못했습니다.</div>
          ) : !data && isValidating ? (
            <div className="p-8 text-center text-muted-foreground">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">리뷰가 없습니다.</div>
          ) : (
            sortedRows.map((r) => {
              const isSel = selected.includes(r._id);
              const dim = r.status === 'hidden' ? 'opacity-60' : '';
              const { date, time } = safeSplitDate(r.createdAt);

              return (
                <div
                  key={r._id}
                  onClick={() => setDetail(r)}
                  className={[
                    'grid grid-cols-1 lg:grid',
                    GRID,
                    'items-center gap-y-2 gap-x-3 px-3',
                    compact ? 'py-2' : 'py-3',
                    'transition-colors cursor-pointer',
                    'even:bg-background hover:bg-primary',
                    'dark:even:bg-card dark:hover:bg-primary',
                    isSel ? 'shadow-[inset_2px_0_0_0_theme(colors.emerald.500)] bg-primary dark:bg-primary' : '',
                  ].join(' ')}
                >
                  {/* 체크박스 */}
                  <div className={`self-start md:self-center ${dim}`}>
                    <Checkbox
                      data-cy="row-checkbox"
                      checked={isSel}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(v) => toggleSelectOne(r._id, !!v)}
                      aria-label={`${r.userEmail || '-'} 리뷰 선택`}
                      className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  {/* 작성자 */}
                  <div className={`min-w-0 ${dim}`}>
                    <div className="text-foreground dark:text-white font-medium truncate">{r.userName || r.userEmail || '-'}</div>
                    {r.userEmail && r.userName && <div className="text-[12px] text-muted-foreground dark:text-muted-foreground break-all">{r.userEmail}</div>}
                    {r.isDeleted && (
                      <div className="mt-0.5">
                        <Badge variant="secondary" className="h-5">
                          삭제됨
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* 리뷰 내용 */}
                  <div className={`min-w-0 ${dim}`}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={['text-sm leading-5', expanded[r._id] ? 'whitespace-pre-wrap' : 'line-clamp-2', 'break-words', '[overflow-wrap:anywhere]'].join(' ')}>{r.content}</p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md bg-card dark:bg-card text-foreground border dark:border-border shadow-md rounded-md p-3">
                          <p className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{r.content}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {r.content && r.content.length > 80 && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((s) => ({ ...s, [r._id]: !s[r._id] }));
                        }}
                        aria-expanded={!!expanded[r._id]}
                      >
                        {expanded[r._id] ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>

                  {/* 평점 / 도움돼요 */}
                  <div className={`min-w-0 ${dim}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {renderStars(r.rating)}
                      <span className="text-[13px] text-foreground">{r.rating}/5</span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] leading-none
  bg-card dark:bg-card
  text-foreground
  border-border dark:border-border"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {r.helpfulCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* 작성일 */}
                  <div className={`min-w-0 ${dim}`}>
                    <div className="text-foreground dark:text-white text-[13px]">{date}</div>
                    <div className="text-[12px] text-muted-foreground dark:text-muted-foreground">{time}</div>
                  </div>

                  {/* 타입 */}
                  <div className={`min-w-0 ${dim} flex items-center gap-3 whitespace-nowrap`}>
                    <Badge variant="outline" className={typeBadgeClass(r.type) + ' ring-1 ring-inset ring-ring dark:ring-ring shrink-0'}>
                      {typeLabel(r.type)}
                    </Badge>
                  </div>

                  {/* 공개 / 비공개*/}
                  <div className={`min-w-0 ${dim} flex items-center justify-center gap-2 whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                    <span className="hidden xl:inline text-[12px] text-muted-foreground dark:text-muted-foreground">{r.status === 'visible' ? '공개' : '비공개'}</span>
                    {r.isDeleted && <Badge variant="secondary">삭제됨</Badge>}
                    <div className="h-6 flex items-center">
                      <Switch checked={r.status === 'visible'} onCheckedChange={() => toggleVisible(r)} />
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="justify-self-end pl-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background dark:hover:bg-card">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onPointerDown={(e) => e.stopPropagation()} onSelect={() => setDetail(r)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>상세 보기</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onPointerDown={(e) => e.stopPropagation()} onSelect={() => toggleVisible(r)} className="cursor-pointer">
                          {r.status === 'visible' ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              <span>비공개</span>
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>공개</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onPointerDown={(e) => e.stopPropagation()} className="text-destructive focus:text-destructive cursor-pointer" onSelect={() => doDelete(r._id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>삭제</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 선택 액션 바 */}
        <div className={`transition-all duration-200 ${selected.length ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
          <div
            className="w-full border-t border-border dark:border-border
  bg-primary dark:bg-primary backdrop-blur-sm px-4 py-2 flex items-center justify-between rounded-b-lg"
          >
            <span className="inline-flex items-center gap-2 text-primary dark:text-primary">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z" />
              </svg>
              <span
                className="inline-flex items-center rounded-full bg-card dark:bg-card
      ring-1 ring-emerald-200 dark:ring-emerald-800
      text-primary dark:text-primary font-semibold text-xs px-2 py-0.5"
              >
                {selected.length}개 선택됨
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected([])}
                className="h-8 px-3 border-border text-primary hover:bg-primary
             dark:border-border dark:text-primary dark:hover:bg-primary"
              >
                해제
              </Button>

              <Button data-cy="bulk-visible" variant="secondary" size="sm" onClick={() => doBulkUpdateStatus('visible')} className="h-8 px-3" aria-label="선택 공개로 변경" title="선택한 리뷰를 공개로 변경">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
                </svg>
                선택 공개
              </Button>
              <Button data-cy="bulk-hidden" variant="outline" size="sm" onClick={() => doBulkUpdateStatus('hidden')} className="h-8 px-3" aria-label="선택 비공개로 변경" title="선택한 리뷰를 비공개로 변경">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M2 12s3-7 10-7a9.9 9.9 0 018.06 4.09l1.41-1.41 1.41 1.41-19 19-1.41-1.41L4.1 19.94A12.14 12.14 0 012 12zm10 5a5 5 0 005-5 4.93 4.93 0 00-.79-2.69l-6.9 6.9A4.93 4.93 0 0012 17z" />
                </svg>
                선택 비공개
              </Button>
              <Button variant="destructive" size="sm" onClick={doBulkDelete} className="h-8 px-3">
                선택 삭제
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent
          className="sm:max-w-2xl border-0 ring-0 outline-none shadow-2xl
             bg-card dark:bg-card"
        >
          <DialogHeader>
            <DialogTitle>리뷰 상세</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={typeBadgeClass(detail.type) + ' ring-1 ring-inset ring-ring'}>
                  {typeLabel(detail.type)}
                </Badge>
                <Badge variant={detail.status === 'visible' ? 'default' : 'secondary'}>{detail.status === 'visible' ? '공개' : '비공개'}</Badge>
                {(() => {
                  const dt = safeSplitDate(detail.createdAt);
                  return (
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dt.date} {dt.time}
                    </span>
                  );
                })()}
                <span className="text-sm text-muted-foreground dark:text-muted-foreground inline-flex items-center gap-1 ml-2">
                  <ThumbsUp className="h-4 w-4" />
                  도움돼요 {detail?.helpfulCount ?? 0}
                </span>
              </div>

              {/* 사진 섹션: 헤더와 분리해 항상 같은 위치/폭을 확보 */}
              <div className="mt-2">
                {/* 로딩 스켈레톤: 상세를 불러오는 동안 자리 고정 */}
                {loadingPhotos && (
                  <div aria-hidden className="flex flex-wrap gap-2 min-h-[72px]">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-16 h-16 rounded-md bg-muted dark:bg-card animate-pulse" />
                    ))}
                  </div>
                )}
                {/* 실제 이미지: fullDetail.photos 우선, 없으면 detail.photos */}
                {photos.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium mb-2">사진</h4>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((src: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setViewerIndex(i);
                            setViewerOpen(true);
                          }}
                          className="relative w-16 h-16 rounded-md overflow-hidden border dark:border-border focus:outline-none focus:ring-2 focus:ring-ring"
                          aria-label={`리뷰 사진 ${i + 1} 크게 보기`}
                        >
                          <Image src={src} alt={`review-photo-${i}`} fill className="object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">작성자</div>
                  <div className="font-medium">{detail.userName || detail.userEmail || '-'}</div>
                  {detail.userName && <div className="text-xs text-muted-foreground break-all">{detail.userEmail}</div>}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">리뷰 대상</div>
                  <div className="font-medium">{detail.subject || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">평점</div>
                  <div className="flex items-center gap-2">
                    {renderStars(detail.rating)}
                    <span className="text-sm text-foreground">{detail.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md dark:bg-card p-4 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed text-foreground">{detail.content || ''}</div>
            </div>
          )}
          <DialogFooter className="justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!detail) return;
                  await toggleVisible(detail);
                  setDetail((d) => (d ? { ...d, status: d.status === 'visible' ? 'hidden' : 'visible' } : d));
                }}
              >
                {detail?.status === 'visible' ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" /> 비공개
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" /> 공개
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!detail) return;
                  await doDelete(detail._id);
                  setDetail(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> 삭제
              </Button>
            </div>
            <Button onClick={() => setDetail(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReviewPhotoDialog open={viewerOpen} onOpenChange={setViewerOpen} photos={fullDetail?.photos ?? detail?.photos ?? []} initialIndex={viewerIndex} />
      {/* 더 보기 */}
      <div className="flex justify-center">
        {rows.length > 0 &&
          (hasMore ? (
            <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 불러오는 중…
                </>
              ) : (
                '더 보기'
              )}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">마지막 페이지입니다</span>
          ))}
      </div>
    </div>
  );
}
