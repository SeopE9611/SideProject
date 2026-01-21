'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Copy, Eye, Search } from 'lucide-react';

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

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [page, setPage] = useState(1);
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

  function reset() {
    setQ('');
    setKind('all');
    setPage(1);
    router.replace(pathname);
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
                {items.map((it) => (
                  <TableRow key={`${it.kind}-${it.id}`}>
                    <TableCell className={td}>
                      <div className="flex flex-col gap-1">
                        <Badge className={cn(badgeBase, badgeSizeSm, kindColor(it.kind))}>{kindLabel(it.kind)}</Badge>
                        <Badge className={cn(badgeBase, badgeSizeSm, it.isIntegrated ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600')}>{it.isIntegrated ? '통합' : '단독'}</Badge>
                      </div>
                    </TableCell>

                    <TableCell className={td}>
                      <div className="space-y-1">
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
                      {it.paymentLabel ? <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[it.paymentLabel] ?? 'bg-slate-500/10 text-slate-600')}>{it.paymentLabel}</Badge> : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>

                    <TableCell className={cn(td, 'font-semibold')}>{won(it.amount)}</TableCell>

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
