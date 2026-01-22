'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Copy, Eye, Search } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { shortenId } from '@/lib/shorten';
import { showSuccessToast } from '@/lib/toast';
import { badgeBase, badgeSizeSm, orderStatusColors, paymentStatusColors, applicationStatusColors } from '@/lib/badge-style';

type Kind = 'order' | 'stringing_application' | 'rental';

type OpItem = {
  id: string;
  kind: Kind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string;
  statusLabel: string;
  paymentLabel?: string;
  amount: number;
  href: string;
  related?: { kind: Kind; id: string; href: string } | null;
  isIntegrated: boolean;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const rentalStatusColors: Record<string, string> = {
  대기중: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20',
  결제완료: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20',
  대여중: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20',
  반납완료: 'bg-green-500/10 text-green-600 dark:bg-green-500/20',
  취소됨: 'bg-red-500/10 text-red-600 dark:bg-red-500/20',
};

function kindLabel(kind: Kind) {
  if (kind === 'order') return '주문';
  if (kind === 'stringing_application') return '신청서';
  return '대여';
}

function kindColor(kind: Kind) {
  if (kind === 'order') return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20';
  if (kind === 'stringing_application') return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20';
  return 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20';
}

function formatKST(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  // 가독성: yy. mm. dd. hh:mm
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}. ${mm}. ${dd}. ${hh}:${mi}`;
}

function statusColor(kind: Kind, label: string) {
  if (kind === 'order') return orderStatusColors[label] ?? 'bg-gray-500/10 text-gray-600';
  if (kind === 'stringing_application') return (applicationStatusColors as any)[label] ?? applicationStatusColors.default;
  return rentalStatusColors[label] ?? 'bg-gray-500/10 text-gray-600';
}

// 그룹(묶음) 만들기 유틸
// - 연결된 건을 "한 묶음"으로 묶어서 운영자가 한눈에 인지하게 하는 목적
// - 그룹 키는 "앵커(주문/대여)" 기준으로 통일
// =========================
type OpGroup = {
  key: string;
  anchor: OpItem; // 대표(앵커) row: order > rental > application 우선
  createdAt: string | null; // 그룹 최신 시간(정렬/표시용)
  items: OpItem[]; // anchor 포함
  kinds: Kind[]; // 그룹에 포함된 종류(주문/신청서/대여)
};

const KIND_PRIORITY: Record<Kind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
};

function groupKeyOf(it: OpItem): string {
  // 주문/대여는 자기 자신이 앵커
  if (it.kind === 'order') return `order:${it.id}`;
  if (it.kind === 'rental') return `rental:${it.id}`;

  // 신청서는 연결된 "주문/대여"를 앵커로
  const rel = it.related;
  if (rel?.kind === 'order') return `order:${rel.id}`;
  if (rel?.kind === 'rental') return `rental:${rel.id}`;
  // 단독 신청서
  return `app:${it.id}`;
}

function pickAnchor(groupItems: OpItem[]): OpItem {
  // 대표(앵커)는 운영자가 "정산/관리 기준"으로 가장 자연스럽게 보는 문서 우선
  // - 주문이 있으면 주문
  // - 없으면 대여
  // - 그래도 없으면 신청서(단독 신청)
  return groupItems.find((x) => x.kind === 'order') ?? groupItems.find((x) => x.kind === 'rental') ?? groupItems[0]!;
}

function buildGroups(list: OpItem[]): OpGroup[] {
  // list는 API에서 최신순으로 내려오는 전제.
  // → "처음 등장한 그룹" 순서를 유지하면 그룹 정렬이 자연스럽게 최신순이 됨.
  const map = new Map<string, OpItem[]>();
  const orderKeys: string[] = [];

  for (const it of list) {
    const key = groupKeyOf(it);
    if (!map.has(key)) {
      map.set(key, []);
      orderKeys.push(key);
    }
    map.get(key)!.push(it);
  }

  return orderKeys.map((key) => {
    const items = map.get(key)!;
    items.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);

    const anchor = pickAnchor(items);
    const ts = Math.max(...items.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const createdAt = ts ? new Date(ts).toISOString() : null;

    const kinds = Array.from(new Set(items.map((x) => x.kind))).sort((a, b) => KIND_PRIORITY[a] - KIND_PRIORITY[b]);

    return { key, anchor, createdAt, items, kinds };
  });
}

/**
 * 그룹 금액 표시 원칙(매출/정산 사고 방지)
 * - 그룹(연결됨)에서는 "대표 1개 금액"만 보여주면 누락/중복 해석 위험이 큼
 * - 그래서 그룹 row에서 "종류별 금액을 각각 1번만" 노출한다.
 * - 합계(주문+신청서…)는 시스템 정책이 확정되기 전까지 계산/표시하지 않는다.
 */
function pickOnePerKind(items: OpItem[]) {
  const byKind = new Map<Kind, OpItem>();
  for (const it of items) {
    const cur = byKind.get(it.kind);
    if (!cur) {
      byKind.set(it.kind, it);
      continue;
    }
    // 같은 kind가 여러 개면, createdAt 최신 것을 대표로(안전한 기본값)
    const t1 = cur.createdAt ? new Date(cur.createdAt).getTime() : 0;
    const t2 = it.createdAt ? new Date(it.createdAt).getTime() : 0;
    if (t2 >= t1) byKind.set(it.kind, it);
  }
  return (['order', 'rental', 'stringing_application'] as Kind[]).map((k) => byKind.get(k)).filter(Boolean) as OpItem[];
}

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pageSize = 50;

  // 1) 최초 1회: URL → 상태 주입(새로고침 대응)
  useEffect(() => {
    const k = (sp.get('kind') as any) ?? 'all';
    const query = sp.get('q') ?? '';
    const p = Number(sp.get('page') ?? 1);
    if (k === 'all' || k === 'order' || k === 'stringing_application' || k === 'rental') setKind(k);
    if (query) setQ(query);
    if (!Number.isNaN(p) && p > 0) setPage(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
  }, [q, kind, page]);

  // 2) 상태 → URL 동기화(디바운스)
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      const setParam = (key: string, value?: string | number | null) => {
        if (value === undefined || value === null || value === '' || value === 'all') url.searchParams.delete(key);
        else url.searchParams.set(key, String(value));
      };
      setParam('q', q);
      setParam('kind', kind);
      setParam('page', page === 1 ? undefined : page);
      router.replace(pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    }, 200);
    return () => clearTimeout(t);
  }, [q, kind, page, pathname, router]);

  // 3) API 키 구성
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  if (kind !== 'all') qs.set('kind', kind);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const key = `/api/admin/operations?${qs.toString()}`;

  const { data, isLoading } = useSWR<{ items: OpItem[]; total: number }>(key, fetcher);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 리스트를 "그룹(묶음)" 단위로 변환
  const groups = useMemo(() => buildGroups(items), [items]);

  function reset() {
    setQ('');
    setKind('all');
    setPage(1);
    router.replace(pathname);
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    showSuccessToast('복사 완료');
  }

  const th = 'text-xs text-muted-foreground';
  const td = 'align-top';

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>운영함 (통합)</CardTitle>
          <CardDescription>주문 · 신청서 · 대여를 한 화면에서 확인하고, 상세로 빠르게 이동합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1); // 검색 바뀌면 1페이지로
                }}
                placeholder="ID, 고객명, 이메일, 요약(상품명/모델명) 검색..."
              />
            </div>

            <Select
              value={kind}
              onValueChange={(v: any) => {
                setKind(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="종류(전체)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">종류(전체)</SelectItem>
                <SelectItem value="order">주문</SelectItem>
                <SelectItem value="stringing_application">신청서</SelectItem>
                <SelectItem value="rental">대여</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={reset} className="md:w-auto">
              필터 초기화
            </Button>
          </div>

          {/* 범례(운영자 인지 부하 감소) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">범례</span>
            <Badge className={cn(badgeBase, badgeSizeSm, kindColor('order'))}>주문</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, kindColor('stringing_application'))}>신청서</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, kindColor('rental'))}>대여</Badge>
            <span className="mx-1">·</span>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-emerald-500/10 text-emerald-600')}>통합(연결됨)</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-slate-500/10 text-slate-600')}>단독</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>업무 목록</CardTitle>
            <CardDescription>총 {total.toLocaleString('ko-KR')}건</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={th}>유형</TableHead>
                  <TableHead className={th}>ID</TableHead>
                  <TableHead className={th}>고객</TableHead>
                  <TableHead className={th}>날짜</TableHead>
                  <TableHead className={th}>상태</TableHead>
                  <TableHead className={th}>결제</TableHead>
                  <TableHead className={th}>금액</TableHead>
                  <TableHead className={th}>연결</TableHead>
                  <TableHead className={th}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => {
                  const isGroup = g.items.length > 1;
                  const isOpen = !!openGroups[g.key];

                  // anchor 제외한 하위 아이템들(펼쳤을 때 표시)
                  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);

                  return (
                    <Fragment key={g.key}>
                      {/* 그룹 대표(앵커) Row */}
                      <TableRow className={cn(isGroup && 'bg-muted/30')}>
                        <TableCell className={td}>
                          <div className="flex flex-col gap-1">
                            {/* 그룹에 포함된 종류들(주문/신청서/대여) */}
                            <div className="flex flex-wrap gap-1">
                              {g.kinds.map((k) => (
                                <Badge key={k} className={cn(badgeBase, badgeSizeSm, kindColor(k))}>
                                  {kindLabel(k)}
                                </Badge>
                              ))}
                            </div>

                            {/* 통합/단독 + (그룹 건수) */}
                            <div className="flex flex-wrap gap-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, isGroup ? 'bg-emerald-500/10 text-emerald-600' : g.anchor.isIntegrated ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600')}>
                                {isGroup ? '통합' : g.anchor.isIntegrated ? '통합' : '단독'}
                              </Badge>
                              {isGroup && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-slate-500/10 text-slate-700')}>{g.items.length}건</Badge>}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className={td}>
                          <div className="flex items-start gap-2">
                            {/* 펼치기 토글: 그룹일 때만 */}
                            {isGroup ? (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleGroup(g.key)} aria-label={isOpen ? '그룹 접기' : '그룹 펼치기'}>
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                            <div className="space-y-1 min-w-0">
                              <div className="font-medium">{shortenId(g.anchor.id)}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {g.anchor.title}
                                {isGroup ? ` 외 ${g.items.length - 1}건` : ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className={td}>
                          <div className="space-y-1">
                            <div className="font-medium">{g.anchor.customer?.name || '-'}</div>
                            <div className="text-xs text-muted-foreground">{g.anchor.customer?.email || '-'}</div>
                          </div>
                        </TableCell>

                        <TableCell className={td}>{formatKST(g.createdAt)}</TableCell>

                        <TableCell className={td}>
                          <Badge className={cn(badgeBase, badgeSizeSm, statusColor(g.anchor.kind, g.anchor.statusLabel))}>{g.anchor.statusLabel}</Badge>
                        </TableCell>

                        <TableCell className={td}>
                          {g.anchor.paymentLabel ? (
                            <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[g.anchor.paymentLabel] ?? 'bg-slate-500/10 text-slate-600')}>{g.anchor.paymentLabel}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className={cn(td, 'font-semibold')}>
                          {isGroup ? (
                            <div className="space-y-1">
                              {pickOnePerKind(g.items).map((it) => (
                                <div key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-muted-foreground">{kindLabel(it.kind)}</span>
                                  <span>{won(it.amount)}</span>
                                </div>
                              ))}
                              <div className="text-[11px] text-muted-foreground">* 연결된 건은 합산하지 않고 종류별로 1회만 표시합니다.</div>
                            </div>
                          ) : (
                            <div>{won(g.anchor.amount)}</div>
                          )}
                        </TableCell>

                        <TableCell className={td}>
                          {g.anchor.related ? (
                            <Link href={g.anchor.related.href} className="text-xs text-blue-600 hover:underline">
                              연결 이동
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className={cn(td, 'text-right')}>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => copy(g.anchor.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={g.anchor.href}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* 그룹 하위 Row(펼쳤을 때) */}
                      {isGroup &&
                        isOpen &&
                        children.map((it) => (
                          <TableRow key={`${g.key}:${it.kind}:${it.id}`} className="bg-muted/10">
                            <TableCell className={td}>
                              <Badge className={cn(badgeBase, badgeSizeSm, kindColor(it.kind))}>{kindLabel(it.kind)}</Badge>
                            </TableCell>

                            <TableCell className={td}>
                              <div className="space-y-1 pl-10">
                                <div className="font-medium">{shortenId(it.id)}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{it.title}</div>
                              </div>
                            </TableCell>

                            <TableCell className={td}>
                              <div className="space-y-1">
                                <div className="font-medium">{it.customer?.name || '-'}</div>
                                <div className="text-xs text-muted-foreground">{it.customer?.email || '-'}</div>
                              </div>
                            </TableCell>

                            <TableCell className={td}>{formatKST(it.createdAt)}</TableCell>

                            <TableCell className={td}>
                              <Badge className={cn(badgeBase, badgeSizeSm, statusColor(it.kind, it.statusLabel))}>{it.statusLabel}</Badge>
                            </TableCell>

                            <TableCell className={td}>
                              {it.paymentLabel ? (
                                <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[it.paymentLabel] ?? 'bg-slate-500/10 text-slate-600')}>{it.paymentLabel}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            <TableCell className={cn(td, 'font-semibold')}>
                              {/* 그룹에서는 상단(대표 row)에서 종류별 금액을 1회만 보여주므로
                                  하위 row에서는 금액을 반복 노출하지 않습니다(중복 해석 방지). */}
                              <span className="text-xs text-muted-foreground">그룹 상단에 표시</span>
                            </TableCell>

                            <TableCell className={td}>
                              {it.related ? (
                                <Link href={it.related.href} className="text-xs text-blue-600 hover:underline">
                                  연결 이동
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            <TableCell className={cn(td, 'text-right')}>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => copy(it.id)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button asChild size="sm" variant="outline">
                                  <Link href={it.href}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}

                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* 페이지네이션(최소) */}
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              이전
            </Button>
            <div className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              다음
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
