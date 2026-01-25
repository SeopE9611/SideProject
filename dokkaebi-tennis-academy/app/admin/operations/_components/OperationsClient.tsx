'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChartBig, ChevronDown, ChevronRight, Copy, Eye, Search } from 'lucide-react';

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
import { badgeBase, badgeSizeSm, paymentStatusColors } from '@/lib/badge-style';
import { opsKindBadgeClass, opsKindLabel, opsStatusBadgeClass, type OpsKind } from '@/lib/admin-ops-taxonomy';

type Kind = OpsKind;

type Flow = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type SettlementAnchor = 'order' | 'rental' | 'application';

type OpItem = {
  id: string;
  kind: Kind;
  createdAt: string | null;
  customer: { name: string; email: string };
  title: string;
  statusLabel: string;
  paymentLabel?: string;
  amount: number;
  flow: Flow;
  flowLabel: string;
  settlementAnchor: SettlementAnchor;
  settlementLabel: string;
  href: string;
  related?: { kind: Kind; id: string; href: string } | null;
  isIntegrated: boolean;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

function flowBadgeClass(flow?: Flow) {
  // 운영자 인지 부하를 줄이기 위해 "카테고리" 단위로만 색상을 분리
  // (세부 Flow별 색상은 추후 원하면 확장)
  if (!flow) return 'bg-slate-500/10 text-slate-700';
  if (flow === 3) return 'bg-slate-500/10 text-slate-700'; // 교체 신청(단독)
  if (flow === 6 || flow === 7) return 'bg-violet-500/10 text-violet-700'; // 대여 계열
  if (flow === 4 || flow === 5) return 'bg-orange-500/10 text-orange-700'; // 라켓 구매 계열
  return 'bg-sky-500/10 text-sky-700'; // 1/2: 스트링 구매 계열
}

function settlementBadgeClass() {
  return 'bg-slate-500/10 text-slate-600';
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

// 그룹 createdAt(ISO) → KST 기준 yyyymm(예: 202601)
function yyyymmKST(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);

  const map = parts.reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  if (!map.year || !map.month) return null;
  return `${map.year}${map.month}`;
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

// 그룹(통합) 대표 행에서 "연결 문서 상태/결제"를 펼치지 않고도 보이게 하기 위한 요약 유틸
function summarizeByKind(items: OpItem[], getLabel: (it: OpItem) => string | undefined | null) {
  const map = new Map<Kind, Set<string>>();
  for (const it of items) {
    const v = getLabel(it);
    if (!v) continue;
    if (!map.has(it.kind)) map.set(it.kind, new Set());
    map.get(it.kind)!.add(String(v));
  }

  return (['order', 'rental', 'stringing_application'] as Kind[])
    .map((k) => {
      const labels = Array.from(map.get(k) ?? []);
      if (labels.length === 0) return null;
      // 여러 값이 섞이면 "A 외 n" 형태로 축약해서 과도한 줄바꿈 방지
      return {
        kind: k,
        mixed: labels.length > 1,
        text: labels.length === 1 ? labels[0] : `${labels[0]} 외 ${labels.length - 1}`,
      };
    })
    .filter(Boolean) as Array<{ kind: Kind; mixed: boolean; text: string }>;
}

// 경고(혼재/결제불일치) 그룹 여부 판단: 표시 전용(운영자 필터 토글용)
function isWarnGroup(g: { anchor: OpItem; items: OpItem[] }) {
  if (!g.items || g.items.length <= 1) return false;
  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
  if (children.length === 0) return false;

  const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
  const childPaymentSummary = summarizeByKind(children, (it) => it.paymentLabel);
  const hasMixed = childStatusSummary.some((s) => s.mixed) || childPaymentSummary.some((p) => p.mixed);

  const anchorPay = g.anchor.paymentLabel ?? '-';
  const childPays = children.map((x) => x.paymentLabel).filter(Boolean) as string[];
  const payMismatch = anchorPay !== '-' && childPays.some((p) => p && p !== '-' && p !== anchorPay);

  return payMismatch || hasMixed;
}

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [flow, setFlow] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const defaultPageSize = 50;
  // 경고만 보기에서는 "놓침"을 줄이기 위해 조회 범위를 넓힘(표시/운영 안전 목적)
  // - API/스키마 변경 없음 (그냥 pageSize 파라미터만 키움)
  const effectivePageSize = onlyWarn ? 200 : defaultPageSize;

  // 1) 최초 1회: URL → 상태 주입(새로고침 대응)
  useEffect(() => {
    const k = (sp.get('kind') as any) ?? 'all';
    const f = (sp.get('flow') as any) ?? 'all';
    const query = sp.get('q') ?? '';
    const warn = sp.get('warn');
    const p = Number(sp.get('page') ?? 1);
    if (k === 'all' || k === 'order' || k === 'stringing_application' || k === 'rental') setKind(k);
    if (f === 'all' || f === '1' || f === '2' || f === '3' || f === '4' || f === '5' || f === '6' || f === '7') setFlow(f);
    if (query) setQ(query);
    if (warn === '1') setOnlyWarn(true);
    if (!Number.isNaN(p) && p > 0) setPage(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
  }, [q, kind, flow, page, onlyWarn]);

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
      setParam('flow', flow);
      setParam('page', page === 1 ? undefined : page);
      setParam('warn', onlyWarn ? '1' : undefined);
      router.replace(pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    }, 200);
    return () => clearTimeout(t);
  }, [q, kind, flow, page, onlyWarn, pathname, router]);

  // 3) API 키 구성
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  if (kind !== 'all') qs.set('kind', kind);
  if (flow !== 'all') qs.set('flow', flow);
  qs.set('page', String(page));
  qs.set('pageSize', String(effectivePageSize));
  if (onlyWarn) qs.set('warn', '1');
  const key = `/api/admin/operations?${qs.toString()}`;

  const { data, isLoading } = useSWR<{ items: OpItem[]; total: number }>(key, fetcher);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  // 리스트를 "그룹(묶음)" 단위로 변환
  const groups = useMemo(() => buildGroups(items), [items]);
  // warn=1 필터는 서버(/api/admin/operations)에서 처리한다.
  // 클라이언트에서 표본 기반으로 다시 필터링하면 경고 누락/오판 가능성이 있어 제거.
  const groupsToRender = groups;

  // 펼칠 수 있는 그룹(통합 묶음)만 추림
  const expandableGroupKeys = useMemo(() => groupsToRender.filter((g) => g.items.length > 1).map((g) => g.key), [groupsToRender]);
  const hasExpandableGroups = expandableGroupKeys.length > 0;
  const isAllExpanded = hasExpandableGroups && expandableGroupKeys.every((k) => !!openGroups[k]);

  function toggleAllGroups() {
    if (!hasExpandableGroups) return;
    const nextOpen = !isAllExpanded;
    const next: Record<string, boolean> = {};
    for (const k of expandableGroupKeys) next[k] = nextOpen;
    setOpenGroups(next);
  }

  function reset() {
    setQ('');
    setKind('all');
    setFlow('all');
    setOnlyWarn(false);
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

  function renderLinkedDocs(docs: Array<{ kind: Kind; id: string; href: string }>) {
    if (!docs || docs.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    const shown = docs.slice(0, 2);
    const rest = docs.length - shown.length;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {shown.map((d) => (
          <div key={`${d.kind}:${d.id}`} className="flex items-center gap-1">
            <Link href={d.href} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted/60" aria-label="연결 문서로 이동">
              <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass(d.kind))}>{opsKindLabel(d.kind)}</Badge>
              <span className="font-mono">{shortenId(d.id)}</span>
            </Link>

            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => copy(d.id)} aria-label="연결 문서 ID 복사">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {rest > 0 && <span className="text-xs text-muted-foreground">외 {rest}건</span>}
      </div>
    );
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

            <Select
              value={flow}
              onValueChange={(v: any) => {
                setFlow(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="시나리오(전체)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">시나리오(전체)</SelectItem>
                <SelectItem value="1">스트링 구매(단독)</SelectItem>
                <SelectItem value="2">스트링 구매+교체(통합)</SelectItem>
                <SelectItem value="3">교체 신청(단독)</SelectItem>
                <SelectItem value="4">라켓 구매(단독)</SelectItem>
                <SelectItem value="5">라켓 구매+교체(통합)</SelectItem>
                <SelectItem value="6">라켓 대여(단독)</SelectItem>
                <SelectItem value="7">대여+교체(통합)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              title={onlyWarn ? '경고(혼재/결제불일치) 그룹만 조회 중입니다.' : '경고(혼재/결제불일치) 그룹만 모아봅니다.'}
              className={cn(onlyWarn && 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50')}
              onClick={() => {
                setOnlyWarn((v) => !v);
                setPage(1);
              }}
            >
              경고만 보기
            </Button>

            <Button variant="outline" onClick={reset} className="md:w-auto">
              필터 초기화
            </Button>
          </div>

          {/* 범례(운영자 인지 부하 감소) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">범례</span>
            <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass('order'))}>주문</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass('stringing_application'))}>신청서</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass('rental'))}>대여</Badge>
            <span className="mx-1">·</span>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-emerald-500/10 text-emerald-600')}>통합(연결됨)</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-slate-500/10 text-slate-600')}>단독</Badge>
            <span className="mx-1">·</span>
            <span className="font-medium text-foreground">시나리오</span>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(1))}>스트링 구매</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(4))}>라켓 구매</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(6))}>대여</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(3))}>교체 신청(단독)</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>업무 목록</CardTitle>
            <CardDescription>총 {total.toLocaleString('ko-KR')}건</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </div>
            <Button type="button" size="sm" variant="outline" disabled={!hasExpandableGroups} title={!hasExpandableGroups ? '펼칠 통합 묶음이 없습니다.' : '통합 묶음(연결된 문서)을 한 번에 펼치거나 접습니다.'} onClick={toggleAllGroups}>
              {isAllExpanded ? '전체 접기' : '전체 펼치기'}
            </Button>
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
                {groupsToRender.map((g) => {
                  const isGroup = g.items.length > 1;
                  const isOpen = !!openGroups[g.key];

                  // anchor 제외한 하위 아이템들(펼쳤을 때 표시)
                  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);

                  // 그룹(통합) 대표 행에 노출할 "연결 문서 상태/결제 요약"
                  const childStatusSummary = isGroup ? summarizeByKind(children, (it) => it.statusLabel) : [];
                  const childPaymentSummary = isGroup ? summarizeByKind(children, (it) => it.paymentLabel) : [];

                  // ===== 경고 배지(1개) 판단 =====
                  // 1) 같은 kind 안에서 상태/결제 라벨이 여러 개 섞여 있으면(혼재)
                  const hasMixed = childStatusSummary.some((s) => s.mixed) || childPaymentSummary.some((p) => p.mixed);

                  // 2) 기준(앵커) 결제 라벨과 연결 문서 결제 라벨이 다르면(결제불일치)
                  // - 앵커 결제가 "결제완료" 같은 확정 상태인데 연결이 "결제대기"면 운영 리스크가 큼
                  // - 앵커가 '-'(없음)인 경우는 비교 기준이 없으므로 불일치로 보지 않음
                  const anchorPay = g.anchor.paymentLabel ?? '-';
                  const childPays = children.map((x) => x.paymentLabel).filter(Boolean) as string[];
                  const payMismatch = isGroup && anchorPay !== '-' && childPays.some((p) => p && p !== '-' && p !== anchorPay);

                  // 경고 그룹(혼재/결제불일치)에서만 자식 행에 "왜 연결인지" 라벨 노출
                  const showLinkReason = onlyWarn || payMismatch || hasMixed;

                  // 경고 "근거"를 한 줄로 바로 보이게(운영자 인지부하 감소)
                  // - 테이블 폭을 망치지 않도록 데스크톱에서만 노출(xl 이상)
                  const uniq = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter(Boolean).map(String)));

                  const childPayUniq = uniq(childPays).filter((p) => p !== '-');
                  const childStatusUniq = uniq(children.map((x) => x.statusLabel));

                  const payHint = (() => {
                    if (!payMismatch) return null;
                    if (childPayUniq.length === 0) return `결제: ${anchorPay} ≠ (연결 없음)`;
                    const head = childPayUniq.slice(0, 2).join(', ');
                    const tail = childPayUniq.length > 2 ? ` 외 ${childPayUniq.length - 2}` : '';
                    return `결제: ${anchorPay} ≠ ${head}${tail}`;
                  })();

                  const mixedHint = (() => {
                    if (!hasMixed) return null;
                    if (childStatusUniq.length === 0) return `상태: 혼재`;
                    const head = childStatusUniq[0];
                    const tail = childStatusUniq.length > 1 ? ` 외 ${childStatusUniq.length - 1}` : '';
                    return `상태: ${head}${tail}`;
                  })();

                  // 표시 우선순위: 결제불일치 > 혼재
                  const warnInline = payHint ?? mixedHint;

                  const warnBadges: Array<{ label: '결제불일치' | '혼재'; title: string }> = [];
                  if (payMismatch) {
                    warnBadges.push({
                      label: '결제불일치',
                      title: `기준 결제: ${anchorPay} / 연결 결제: ${childPays.filter((p) => p && p !== '-').join(', ')}`,
                    });
                  }
                  if (hasMixed) {
                    warnBadges.push({
                      label: '혼재',
                      title: '연결 문서 내 상태/결제가 여러 값으로 섞여 있습니다.',
                    });
                  }
                  // 그룹(통합)인 경우, 앵커를 제외한 “연결 문서” 요약(포함: 신청서 2건 · 대여 1건 …)
                  const childKindCounts = isGroup
                    ? children.reduce(
                        (acc, x) => {
                          acc[x.kind] = (acc[x.kind] ?? 0) + 1;
                          return acc;
                        },
                        {} as Record<Kind, number>,
                      )
                    : null;

                  const includesSummary = isGroup
                    ? (['order', 'rental', 'stringing_application'] as Kind[])
                        .filter((k) => (childKindCounts?.[k] ?? 0) > 0)
                        .map((k) => `${opsKindLabel(k)} ${childKindCounts![k]}건`)
                        .join(' · ')
                    : '';

                  // 연결 컬럼에 보여줄 문서들
                  // - 그룹(통합)인 경우: 앵커 외 나머지 문서(신청서/대여 등)를 “바로” 노출
                  // - 단독인 경우: API에서 내려준 related(있으면 1개)만 노출
                  const linkedDocsForAnchor = isGroup ? children.map((x) => ({ kind: x.kind, id: x.id, href: x.href })) : g.anchor.related ? [g.anchor.related] : [];

                  // 정산 화면 이동(운영 편의): 추천 yyyymm만 title로 안내 (정산 화면 쿼리 미지원이어도 즉시 유용)
                  const settleYyyymm = yyyymmKST(g.createdAt ?? g.anchor.createdAt);
                  const settleTitle = settleYyyymm ? `정산 페이지로 이동 (추천 월: ${settleYyyymm})` : '정산 페이지로 이동';
                  const settleHref = settleYyyymm ? `/admin/settlements?yyyymm=${settleYyyymm}` : '/admin/settlements';

                  return (
                    <Fragment key={g.key}>
                      {/* 그룹 대표(앵커) Row */}
                      <TableRow className={cn(isGroup && 'bg-muted/30')}>
                        <TableCell className={td}>
                          <div className="flex flex-col gap-1">
                            {/* 그룹에 포함된 종류들(주문/신청서/대여) */}
                            <div className="flex flex-wrap gap-1">
                              {g.kinds.map((k) => (
                                <Badge key={k} className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass(k))}>
                                  {opsKindLabel(k)}
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
                            {/* 7개 시나리오(Flow) */}
                            <div className="flex flex-wrap gap-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(g.anchor.flow))} title={`Flow ${g.anchor.flow}`}>
                                {g.anchor.flowLabel}
                              </Badge>
                            </div>

                            {/* 정산 기준(앵커) 라벨: 금액 해석 혼동 방지 */}
                            <div className="flex flex-wrap gap-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, settlementBadgeClass())}>{g.anchor.settlementLabel}</Badge>
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
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium">{shortenId(g.anchor.id)}</div>
                                {isGroup && (
                                  <>
                                    <Badge className={cn(badgeBase, badgeSizeSm, 'bg-indigo-500/10 text-indigo-700')}>기준</Badge>
                                    <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass(g.anchor.kind))}>{opsKindLabel(g.anchor.kind)}</Badge>
                                    {warnBadges.map((b) => (
                                      <Badge key={b.label} title={b.title} className={cn(badgeBase, badgeSizeSm, 'bg-amber-500/10 text-amber-700')}>
                                        {b.label}
                                      </Badge>
                                    ))}
                                    {warnInline && (
                                      <span className="ml-2 hidden xl:inline text-xs text-muted-foreground" title={warnInline}>
                                        {warnInline}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground line-clamp-1">{isGroup ? `기준: ${g.anchor.title}` : g.anchor.title}</div>

                              {isGroup && <div className="text-[11px] text-muted-foreground line-clamp-1">포함: {includesSummary || '-'}</div>}
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
                          <div className="space-y-1">
                            <Badge className={cn(badgeBase, badgeSizeSm, opsStatusBadgeClass(g.anchor.kind, g.anchor.statusLabel))}>{g.anchor.statusLabel}</Badge>

                            {isGroup && childStatusSummary.length > 0 && (
                              <div className="space-y-1">
                                {childStatusSummary.map((s) => (
                                  <div key={`st:${s.kind}`} className="text-[11px] text-muted-foreground">
                                    {opsKindLabel(s.kind)}: {s.text}
                                    {s.mixed ? ' (혼재)' : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className={td}>
                          <div className="space-y-1">
                            {g.anchor.paymentLabel ? (
                              <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[g.anchor.paymentLabel] ?? 'bg-slate-500/10 text-slate-600')}>{g.anchor.paymentLabel}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}

                            {isGroup && childPaymentSummary.length > 0 && (
                              <div className="space-y-1">
                                {childPaymentSummary.map((p) => (
                                  <div key={`pay:${p.kind}`} className="text-[11px] text-muted-foreground">
                                    {opsKindLabel(p.kind)}: {p.text}
                                    {p.mixed ? ' (혼재)' : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className={cn(td, 'font-semibold')}>
                          {isGroup ? (
                            <div className="space-y-1">
                              {pickOnePerKind(g.items).map((it) => (
                                <div key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-muted-foreground">{opsKindLabel(it.kind)}</span>
                                  <span>{won(it.amount)}</span>
                                </div>
                              ))}
                              <div className="text-[11px] text-muted-foreground">* 연결된 건은 합산하지 않고 종류별로 1회만 표시합니다.</div>
                            </div>
                          ) : (
                            <div>{won(g.anchor.amount)}</div>
                          )}
                        </TableCell>

                        <TableCell className={td}>{renderLinkedDocs(linkedDocsForAnchor)}</TableCell>

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
                            <Button asChild size="sm" variant="outline" title={settleTitle}>
                              <Link href={settleHref} className="flex items-center gap-1">
                                <BarChartBig className="h-4 w-4" />
                                <span className="hidden md:inline">정산</span>
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
                              <div className="flex flex-col gap-1">
                                <Badge className={cn(badgeBase, badgeSizeSm, opsKindBadgeClass(it.kind))}>{opsKindLabel(it.kind)}</Badge>
                                <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(it.flow))} title={`Flow ${it.flow}`}>
                                  {it.flowLabel}
                                </Badge>
                              </div>
                              <Badge className={cn(badgeBase, badgeSizeSm, settlementBadgeClass())}>{it.settlementLabel}</Badge>
                            </TableCell>

                            <TableCell className={td}>
                              <div className="space-y-1 pl-10">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={cn(badgeBase, badgeSizeSm, 'bg-slate-500/10 text-slate-700')}>연결</Badge>
                                  <div className="font-medium">{shortenId(it.id)}</div>
                                </div>
                                {showLinkReason && (
                                  <div className="text-[11px] text-muted-foreground">
                                    연결됨: {opsKindLabel(g.anchor.kind)}(#{shortenId(g.anchor.id)})
                                  </div>
                                )}
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
                              <Badge className={cn(badgeBase, badgeSizeSm, opsStatusBadgeClass(it.kind, it.statusLabel))}>{it.statusLabel}</Badge>
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
                              <span className="text-xs text-muted-foreground" title="금액은 그룹(기준) 행에서 종류별로 1회만 표시합니다.">
                                -
                              </span>
                            </TableCell>

                            <TableCell className={td}>{renderLinkedDocs(it.related ? [it.related] : [])}</TableCell>

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

                {groupsToRender.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      {onlyWarn ? '경고(혼재/결제불일치) 조건에 해당하는 결과가 없습니다.' : '결과가 없습니다.'}
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
