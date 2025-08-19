'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { MoreHorizontal, Search, Star, Trash2, Eye, EyeOff, Calendar, MessageSquare, TrendingUp, Award, Loader2, ThumbsUp } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

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

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite<Page>(getKey, fetcher, {
    revalidateFirstPage: true,
  });
  const rows = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);
  const hasMore = useMemo(() => (data?.length ? data[data.length - 1].items.length === LIMIT : false), [data]);

  // ---- 상세 모달 ----
  const [detail, setDetail] = useState<Row | null>(null);
  const openDetail = (row: Row) => setDetail(row);
  const closeDetail = () => setDetail(null);

  // ---- 선택/삭제 ----
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelectAll = (checked: boolean) => setSelected(checked ? rows.map((r) => r._id) : []);
  const toggleSelectOne = (id: string, checked: boolean) => setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const doDelete = async (id: string) => {
    const snapshot = data;
    await mutate((pages?: Page[]) => {
      if (!pages) return pages;
      return pages.map((p) => ({ ...p, items: p.items.filter((r) => r._id !== id) }));
    }, false);
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
    await mutate((pages?: Page[]) => {
      if (!pages) return pages;
      return pages.map((p) => ({ ...p, items: p.items.filter((r) => !selected.includes(r._id)) }));
    }, false);
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
    await mutate((pages?: Page[]) => {
      if (!pages) return pages;
      return pages.map((p) => ({
        ...p,
        items: p.items.map((r) => (r._id === it._id ? { ...r, status: next } : r)),
      }));
    }, false);
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

  // ---- 렌더 유틸 ----
  const renderStars = (n: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < n ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700">{n}/5</span>
    </div>
  );
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  const typeBadgeClass = (t: Row['type']) => (t === 'product' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200');
  const typeLabel = (t: Row['type']) => (t === 'product' ? '상품 리뷰' : '서비스 리뷰');

  return (
    <div className="p-0 space-y-8">
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-2">
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.total ?? 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 평점</p>
                <p className="text-3xl font-bold text-gray-900">{(metrics?.avg ?? 0).toFixed(1)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">5점 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.five ?? 0}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <Award className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">서비스 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.byType?.service ?? 0}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">상품 리뷰</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.byType?.product ?? 0}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색/필터 */}
      <div className="flex items-center justify-between">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input type="search" placeholder="리뷰 검색..." className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSize(1)} />
        </div>
        <div className="flex gap-2">
          <Button variant={status === 'all' ? 'default' : 'outline'} onClick={() => (setStatus('all'), setSize(1))}>
            전체
          </Button>
          <Button variant={status === 'visible' ? 'default' : 'outline'} onClick={() => (setStatus('visible'), setSize(1))}>
            공개
          </Button>
          <Button variant={status === 'hidden' ? 'default' : 'outline'} onClick={() => (setStatus('hidden'), setSize(1))}>
            비공개
          </Button>
          <Button variant={type === 'all' ? 'default' : 'outline'} onClick={() => (setType('all'), setSize(1))}>
            전체종류
          </Button>
          <Button variant={type === 'product' ? 'default' : 'outline'} onClick={() => (setType('product'), setSize(1))}>
            상품
          </Button>
          <Button variant={type === 'service' ? 'default' : 'outline'} onClick={() => (setType('service'), setSize(1))}>
            서비스
          </Button>
        </div>
      </div>

      {/* 테이블 컨테이너 */}
      <div className="rounded-lg border border-gray-200 bg-white/80 shadow max-h-[70vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/90 hover:bg-gray-50/90 sticky top-0 z-[1] backdrop-blur">
              <TableHead className="w-12">
                <Checkbox checked={rows.length > 0 && selected.length === rows.length} onCheckedChange={(val) => toggleSelectAll(!!val)} aria-label="전체 선택" />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 w-[220px]">작성자</TableHead>
              <TableHead className="font-semibold text-gray-900 hidden md:table-cell">리뷰 내용</TableHead>
              <TableHead className="font-semibold text-gray-900 w-[200px]">평점 / 도움돼요</TableHead>
              <TableHead className="font-semibold text-gray-900 hidden md:table-cell w-[180px]">작성일</TableHead>
              <TableHead className="font-semibold text-gray-900 w-[120px]">타입</TableHead>
              <TableHead className="font-semibold text-gray-900 w-[84px] text-right pr-6">액션</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-red-500">
                  목록을 불러오지 못했습니다.
                </TableCell>
              </TableRow>
            ) : !data && isValidating ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  불러오는 중…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  리뷰가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r: Row) => {
                const dimCls = r.status === 'hidden' ? 'opacity-60' : '';
                return (
                  <TableRow key={r._id} className="transition-colors even:bg-gray-50/40 hover:bg-gray-50/70">
                    <TableCell>
                      <div className={dimCls}>
                        <Checkbox checked={selected.includes(r._id)} onCheckedChange={(v) => toggleSelectOne(r._id, !!v)} aria-label={`${r.userEmail || '-'} 리뷰 선택`} />
                      </div>
                    </TableCell>

                    {/* 작성자 + subject + 상태 */}
                    <TableCell className="font-medium">
                      <div className={dimCls}>
                        <div className="space-y-1">
                          <div className="text-gray-900">{r.userName ? `${r.userName} (${r.userEmail})` : r.userEmail || '-'}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{r.subject}</span>
                            {r.status === 'hidden' && <Badge variant="secondary">비공개</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* 본문 */}
                    <TableCell className="hidden md:table-cell align-top">
                      <div className={dimCls}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help text-gray-700 line-clamp-2">{r.content}</div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-md bg-white text-gray-900 border shadow-md rounded-md p-3
                          dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{r.content}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>

                    {/* 평점 + 도움돼요 */}
                    <TableCell>
                      <div className={dimCls}>
                        <div className="flex items-center gap-3">
                          {renderStars(r.rating)}
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs
                        bg-white text-slate-700 border-slate-200
                        dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {r.helpfulCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-gray-600">
                      <div className={dimCls}>{formatDate(r.createdAt)}</div>
                    </TableCell>

                    <TableCell>
                      <div className={dimCls}>
                        <Badge variant="outline" className={typeBadgeClass(r.type)}>
                          {typeLabel(r.type)}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openDetail(r)} className="cursor-pointer">
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 상세 모달 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>리뷰 상세</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={typeBadgeClass(detail.type)}>
                  {typeLabel(detail.type)}
                </Badge>
                <Badge variant={detail.status === 'visible' ? 'default' : 'secondary'}>{detail.status === 'visible' ? '공개' : '비공개'}</Badge>
                <span className="text-sm text-gray-500 inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(detail.createdAt)}
                </span>
                <span className="text-sm text-gray-600 inline-flex items-center gap-1 ml-2">
                  <ThumbsUp className="h-4 w-4" />
                  도움돼요 {detail?.helpfulCount ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">작성자</div>
                  <div className="font-medium">{detail.userName ? `${detail.userName} (${detail.userEmail})` : detail.userEmail || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">리뷰 대상</div>
                  <div className="font-medium">{detail.subject || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">평점</div>
                  {renderStars(detail.rating)}
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
                  closeDetail();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> 삭제
              </Button>
            </div>
            <Button onClick={closeDetail}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 플로팅 선택 액션 바 */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 right-6 z-20 rounded-full bg-white border shadow-xl px-4 py-2 flex items-center gap-3">
          <span className="text-sm text-gray-700">
            <b>{selected.length}</b>개 선택됨
          </span>
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>
            해제
          </Button>
          <Button variant="destructive" size="sm" onClick={doBulkDelete}>
            선택 삭제
          </Button>
        </div>
      )}

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
