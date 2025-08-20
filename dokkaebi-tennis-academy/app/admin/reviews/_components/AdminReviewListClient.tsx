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

type Row = {
  _id: string;
  type: 'product' | 'service';
  subject: string;
  rating: number;
  status: 'visible' | 'hidden';
  content: string;
  createdAt: string;
  userEmail?: string;
  userName?: string;
  helpfulCount?: number;
};
type Page = { items: Row[]; total: number };

const LIMIT = 10;
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('불러오기 실패');
    return r.json();
  });

export default function AdminReviewListClient() {
  // ---- 검색/필터 ----
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [type, setType] = useState<'all' | 'product' | 'service'>('all');

  // ---- KPI ----
  const { data: metrics } = useSWR<{ total: number; avg: number; five: number; byType: { product: number; service: number } }>('/api/admin/reviews/metrics', fetcher);

  // ---- 리스트 ----
  const getKey = useCallback(
    (idx: number, prev: Page | null) => {
      if (prev && prev.items.length < LIMIT) return null;
      const page = idx + 1;
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (q.trim()) p.set('q', q.trim());
      if (status !== 'all') p.set('status', status);
      if (type !== 'all') p.set('type', type);
      return `/api/admin/reviews?${p.toString()}`;
    },
    [q, status, type]
  );

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite<Page>(getKey, fetcher, { revalidateFirstPage: true });
  const rows = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const hasMore = useMemo(() => (data?.length ? data[data.length - 1].items.length === LIMIT : false), [data]);

  // ---- 상세 모달 ----
  const [detail, setDetail] = useState<Row | null>(null);

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

  // rows 바뀔 때 화면에 없는 선택 해제(레이아웃 안정)
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => rows.some((r) => r._id === id)));
  }, [rows]);

  const doDelete = async (id: string) => {
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.filter((r) => r._id !== id) })) : pages), false);
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
      showSuccessToast('삭제되었습니다.');
    } catch (e: any) {
      await mutate(() => snapshot, false);
      showErrorToast(e?.message || '삭제 중 오류');
    }
  };

  const doBulkDelete = async () => {
    if (!selected.length) return;
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.filter((r) => !selected.includes(r._id)) })) : pages), false);
    try {
      await Promise.allSettled(selected.map((id) => fetch(`/api/reviews/${id}`, { method: 'DELETE', credentials: 'include' })));
      setSelected([]);
      showSuccessToast('선택 항목을 삭제했습니다.');
    } catch {
      await mutate(() => snapshot, false);
      showErrorToast('일부 항목 삭제에 실패했습니다.');
    }
  };

  // ---- 공개/비공개 토글(낙관적) ----
  const toggleVisible = async (it: Row) => {
    const next = it.status === 'visible' ? 'hidden' : 'visible';
    const snapshot = data;
    await mutate((pages?: Page[]) => (pages ? pages.map((p) => ({ ...p, items: p.items.map((r) => (r._id === it._id ? { ...r, status: next } : r)) })) : pages), false);
    try {
      const res = await fetch(`/api/reviews/${it._id}`, {
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
        <Star key={i} className={`h-4 w-4 ${i < n ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
      ))}
    </div>
  );
  const splitDate = (iso: string) => {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const time = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(d);
    return { date, time };
  };
  const typeBadgeClass = (t: Row['type']) => (t === 'product' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200');
  const typeLabel = (t: Row['type']) => (t === 'product' ? '상품 리뷰' : '서비스 리뷰');

  // 공통 grid 트랙 (md 이상에서 7열 고정, 모바일은 1열 카드)
  const GRID = 'md:grid-cols-[48px_220px_minmax(0,1fr)_170px_160px_120px_56px]';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="mb-2">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">리뷰 관리</h1>
            <p className="mt-2 text-base text-gray-600">고객 리뷰를 관리하고 서비스 품질을 향상시키세요</p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-0 bg-white/80 shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">전체 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.total ?? 0}</p>
              </div>
              <div className="bg-blue-50 rounded-md p-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">평균 평점</p>
                <p className="text-2xl font-bold">{(metrics?.avg ?? 0).toFixed(1)}</p>
              </div>
              <div className="bg-yellow-50 rounded-md p-2">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">5점 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.five ?? 0}</p>
              </div>
              <div className="bg-emerald-50 rounded-md p-2">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">서비스 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.byType?.service ?? 0}</p>
              </div>
              <div className="bg-purple-50 rounded-md p-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow hover:shadow-md transition">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">상품 리뷰</p>
                <p className="text-2xl font-bold">{metrics?.byType?.product ?? 0}</p>
              </div>
              <div className="bg-indigo-50 rounded-md p-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색/필터 + 전체선택 */}
      <div
        className="sticky top-0 z-10 -mt-2 mb-2 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60
                 border border-slate-200 rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="리뷰 검색…"
            className="pl-10 h-9 text-sm border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSize(1)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <Checkbox checked={rows.length > 0 && selected.length === rows.length} onCheckedChange={(val) => toggleSelectAll(!!val)} aria-label="전체 선택" className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
            <span className="text-xs text-slate-600">전체 선택</span>
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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setSortBy('latest')}>최신순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('rating')}>평점 높은순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('helpful')}>도움돼요 많은순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>오래된순</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 리스트 카드(스크롤 컨테이너 포함) */}
      <div className="rounded-lg ring-1 ring-gray-200 bg-white/95 shadow-sm">
        {/* 헤더 라벨 (그리드 트랙 동일) */}
        <div className={`sticky top-0 z-[1] hidden md:grid ${GRID} items-center gap-x-4 bg-white border-b border-slate-200 px-4 py-3 text-[13px] text-slate-600`}>
          <div className="opacity-70">선택</div>
          <div>작성자</div>
          <div>리뷰 내용</div>
          <div>평점 / 도움돼요</div>
          <div>작성일</div>
          <div>타입</div>
          <div className="text-right">관리</div>
        </div>

        {/* 아이템 스크롤 영역 */}
        <div className="max-h-[70vh] overflow-y-auto">
          {error ? (
            <div className="p-8 text-center text-red-500">목록을 불러오지 못했습니다.</div>
          ) : !data && isValidating ? (
            <div className="p-8 text-center text-muted-foreground">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">리뷰가 없습니다.</div>
          ) : (
            sortedRows.map((r) => {
              const isSel = selected.includes(r._id);
              const dim = r.status === 'hidden' ? 'opacity-60' : '';
              const { date, time } = splitDate(r.createdAt);

              return (
                <div
                  key={r._id}
                  onClick={() => setDetail(r)}
                  className={[
                    'grid grid-cols-1',
                    GRID,
                    `items-center gap-y-2 gap-x-4 px-4 ${compact ? 'py-2' : 'py-3'} transition-colors`,
                    'even:bg-gray-50/40 hover:bg-emerald-50/30 cursor-pointer',
                    isSel ? 'shadow-[inset_2px_0_0_0_theme(colors.emerald.500)] bg-emerald-50/40' : '',
                  ].join(' ')}
                >
                  {/* 체크박스 */}
                  <div className={`self-start md:self-center ${dim}`}>
                    <Checkbox
                      checked={isSel}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(v) => toggleSelectOne(r._id, !!v)}
                      aria-label={`${r.userEmail || '-'} 리뷰 선택`}
                      className="h-4 w-4 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  {/* 작성자 */}
                  <div className={`min-w-0 ${dim}`}>
                    <div className="text-gray-900 font-medium truncate">{r.userName || r.userEmail || '-'}</div>
                    {r.userEmail && r.userName && <div className="text-[12px] text-slate-400 break-all">{r.userEmail}</div>}
                  </div>

                  {/* 리뷰 내용 */}
                  <div className={`min-w-0 ${dim}`}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-[13px] leading-[1.35] break-words ${expanded[r._id] ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{r.content}</p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md bg-white text-gray-900 border shadow-md rounded-md p-3">
                          <p className="whitespace-pre-wrap leading-relaxed">{r.content}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* 길 때만 토글 노출 */}
                    {r.content && r.content.length > 80 && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-emerald-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation(); // 행 클릭으로 전파 막기
                          setExpanded((s) => ({ ...s, [r._id]: !s[r._id] }));
                        }}
                        aria-expanded={!!expanded[r._id]}
                      >
                        {expanded[r._id] ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>

                  {/* 평점 / 도움돼요 */}
                  <div className={`${dim}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {renderStars(r.rating)}
                      <span className="text-[13px] text-gray-700">{r.rating}/5</span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] leading-none bg-white text-slate-700 border-slate-200">
                        <ThumbsUp className="h-3 w-3" />
                        {r.helpfulCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* 작성일 */}
                  <div className={`${dim}`}>
                    <div className="text-gray-900 text-[13px]">{date}</div>
                    <div className="text-[12px] text-gray-500">{time}</div>
                  </div>

                  {/* 타입 */}
                  <div className={`${dim} flex items-center gap-3`}>
                    <Badge variant="outline" className={typeBadgeClass(r.type) + ' ring-1 ring-inset ring-slate-200/80'}>
                      {typeLabel(r.type)}
                    </Badge>
                    <div className="flex items-center gap-1 text-[12px] text-slate-500">
                      <span>{r.status === 'visible' ? '공개' : '비공개'}</span>
                      <Switch checked={r.status === 'visible'} onCheckedChange={() => toggleVisible(r)} />
                    </div>
                  </div>

                  {/* 액션 */}
                  <div className="justify-self-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">메뉴 열기</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setDetail(r)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>상세 보기</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleVisible(r)} className="cursor-pointer">
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
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => doDelete(r._id)}>
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

        {/* 선택 액션 바 (카드 하단, 레이아웃 영향 최소) */}
        <div className={`transition-all duration-200 ${selected.length ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
          <div className="w-full border-t border-emerald-200/70 bg-emerald-50/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between rounded-b-lg">
            <span className="inline-flex items-center gap-2 text-emerald-900">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4z" />
              </svg>
              <span className="inline-flex items-center rounded-full bg-white/70 ring-1 ring-emerald-200 text-emerald-800 text-xs font-medium px-2 py-0.5">{selected.length}개 선택됨</span>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="h-8 px-3 text-emerald-900 hover:bg-white/70">
                해제
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>리뷰 상세</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={typeBadgeClass(detail.type) + ' ring-1 ring-inset ring-slate-200/80'}>
                  {typeLabel(detail.type)}
                </Badge>
                <Badge variant={detail.status === 'visible' ? 'default' : 'secondary'}>{detail.status === 'visible' ? '공개' : '비공개'}</Badge>
                {(() => {
                  const dt = splitDate(detail.createdAt);
                  return (
                    <span className="text-sm text-gray-500 inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dt.date} {dt.time}
                    </span>
                  );
                })()}
                <span className="text-sm text-gray-600 inline-flex items-center gap-1 ml-2">
                  <ThumbsUp className="h-4 w-4" />
                  도움돼요 {detail?.helpfulCount ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">작성자</div>
                  <div className="font-medium">{detail.userName || detail.userEmail || '-'}</div>
                  {detail.userName && <div className="text-xs text-gray-500 break-all">{detail.userEmail}</div>}
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">리뷰 대상</div>
                  <div className="font-medium">{detail.subject || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">평점</div>
                  <div className="flex items-center gap-2">
                    {renderStars(detail.rating)}
                    <span className="text-sm text-gray-700">{detail.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-gray-50 p-4 whitespace-pre-wrap leading-relaxed text-gray-800">{detail.content || ''}</div>
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
