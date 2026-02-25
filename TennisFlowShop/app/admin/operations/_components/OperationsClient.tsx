'use client';

import { BarChartBig, ChevronDown, ChevronRight, Copy, Eye, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { AdminBadgeRow, BadgeItem } from '@/components/admin/AdminBadgeRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { opsKindBadgeTone, opsKindLabel, opsStatusBadgeTone, type OpsBadgeTone } from '@/lib/admin-ops-taxonomy';
import { adminFetcher, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { buildQueryString } from '@/lib/admin/urlQuerySync';
import { badgeBase, badgeSizeSm, paymentStatusColors } from '@/lib/badge-style';
import { shortenId } from '@/lib/shorten';
import { cn } from '@/lib/utils';
import { copyToClipboard } from './actions/operationsActions';
import { flowBadgeClass, prevMonthYyyymmKST, settlementBadgeClass, type Flow, type Kind } from './filters/operationsFilters';
import { initOperationsStateFromQuery, useSyncOperationsQuery } from './hooks/useOperationsQueryState';
import { formatKST, yyyymmKST, type OpItem } from './table/operationsTableUtils';

const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

// 운영함 상단에서 "정산 관리"로 바로 이동할 때 사용할 기본 YYYYMM(지난달, KST 기준)
// 그룹 createdAt(ISO) → KST 기준 yyyymm(예: 202601)
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

const thClasses = 'px-4 py-2 text-left align-middle font-semibold text-foreground text-[11px] whitespace-nowrap';
const tdClasses = 'px-4 py-2.5 align-top';
const th = thClasses;
const td = tdClasses;

const OPS_BADGE_CLASS: Record<OpsBadgeTone, string> = {
  success: 'bg-primary/10 text-primary dark:bg-primary/20',
  warning: 'bg-warning/10 text-warning dark:bg-warning/15',
  destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info dark:bg-info/20',
};

function opsBadgeToneClass(tone: OpsBadgeTone) {
  return OPS_BADGE_CLASS[tone] ?? OPS_BADGE_CLASS.muted;
}

/**
 * 운영함(통합) 테이블에서 Flow 라벨이 너무 길어 뱃지가 “가로로 늘어나며” 난잡해지는 문제 해결용.
 * - 표에는 짧은 라벨만 보여주고
 * - 전체 문구(flowLabel)는 title로 유지해서 hover로 확인하게 합니다.
 */
function flowShortLabel(flow?: Flow) {
  switch (flow) {
    case 1:
      return '스트링';
    case 2:
      return '스트링+교체';
    case 3:
      return '교체(단독)';
    case 4:
      return '라켓';
    case 5:
      return '라켓+교체';
    case 6:
      return '대여';
    case 7:
      return '대여+교체';
    default:
      return '미분류';
  }
}

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [flow, setFlow] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [integrated, setIntegrated] = useState<'all' | '1' | '0'>('all'); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const defaultPageSize = 50;
  // 경고만 보기에서는 "놓침"을 줄이기 위해 조회 범위를 넓힘(표시/운영 안전 목적)
  // - API/스키마 변경 없음 (그냥 pageSize 파라미터만 키움)
  const effectivePageSize = onlyWarn ? 200 : defaultPageSize;

  // 상단 CTA: 정산 관리로 빠르게 이동할 수 있도록 지난달(YYYYMM)을 기본 세팅
  const settlementYyyymm = useMemo(() => prevMonthYyyymmKST(), []);
  const settlementsHref = useMemo(() => `/admin/settlements?yyyymm=${settlementYyyymm}`, [settlementYyyymm]);

  // 1) 최초 1회: URL → 상태 주입(새로고침 대응)
  useEffect(() => {
    initOperationsStateFromQuery(sp, { setQ, setKind, setFlow, setIntegrated, setOnlyWarn, setPage });
  }, [sp]);

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
  }, [q, kind, flow, integrated, page, onlyWarn]);

  // 2) 상태 → URL 동기화(디바운스)
  useSyncOperationsQuery({ q, kind, flow, integrated, onlyWarn, page }, pathname, router.replace);

  // 3) API 키 구성
  const queryString = buildQueryString({
    q: q.trim() || undefined,
    kind,
    flow,
    integrated,
    page,
    pageSize: effectivePageSize,
    warn: onlyWarn ? '1' : undefined,
  });
  const key = `/api/admin/operations?${queryString}`;

  const { data, isLoading, error } = useSWR<{ items: OpItem[]; total: number }>(key, adminFetcher);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
  const commonErrorMessage = error ? getAdminErrorMessage(error) : null;

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

  function applyPreset(next: Partial<{ q: string; kind: typeof kind; flow: typeof flow; integrated: typeof integrated; warn: boolean }>) {
    if (next.q !== undefined) setQ(next.q);
    if (next.kind !== undefined) setKind(next.kind);
    if (next.flow !== undefined) setFlow(next.flow);
    if (next.integrated !== undefined) setIntegrated(next.integrated);
    if (next.warn !== undefined) setOnlyWarn(next.warn);
    setPage(1);
  }

  function reset() {
    setQ('');
    setKind('all');
    setFlow('all');
    setIntegrated('all');
    setOnlyWarn(false);
    setPage(1);
    router.replace(pathname);
  }

  // 프리셋 버튼 "활성" 판정(현재 필터 상태가 프리셋과 일치하는지)
  const presetActive = {
    integratedOnly: integrated === '1' && flow === 'all',
    singleOnly: integrated === '0' && flow === 'all',
    rentalBundle: integrated === '1' && flow === '7',
    stringBundle: integrated === '1' && flow === '2',
    appSingle: integrated === '0' && flow === '3' && kind === 'stringing_application',
    racketBundle: integrated === '1' && flow === '5',
  };

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
              <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone(d.kind)))}>{opsKindLabel(d.kind)}</Badge>
              <span className="font-mono">{shortenId(d.id)}</span>
            </Link>

            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 bg-transparent" onClick={() => copyToClipboard(d.id)} aria-label="연결 문서 ID 복사">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {rest > 0 && <span className="text-xs text-muted-foreground">외 {rest}건</span>}
      </div>
    );
  }

  return (
    <div className="container py-6">
      {commonErrorMessage && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:bg-destructive/15">{commonErrorMessage}</div>}
      {/* 페이지 헤더 */}
      <div className="mx-auto max-w-7xl mb-5">
        <h1 className="text-4xl font-semibold tracking-tight">운영함 (통합)</h1>
        <p className="mt-1 text-xs text-muted-foreground">주문 · 신청서 · 대여를 한 화면에서 확인하고, 상세로 빠르게 이동합니다.</p>
      </div>

      {/* 필터 및 검색 카드 */}
      <Card className="mb-5 rounded-xl border-border bg-card shadow-md px-6 py-5">
        <CardHeader className="pb-3">
          <CardTitle>필터 및 검색</CardTitle>
          <CardDescription className="text-xs">ID, 고객, 이메일로 검색하거나 다양한 조건으로 필터링하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 input */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                className="pl-8 text-xs h-9 w-full"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="ID, 고객명, 이메일, 요약(상품명/모델명) 검색..."
              />
            </div>
          </div>

          {/* 필터 컴포넌트들 */}
          <div className="grid w-full gap-2 border-t border-border pt-3 grid-cols-1 bp-sm:grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-6">
            <Select
              value={kind}
              onValueChange={(v: any) => {
                setKind(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="시나리오(전체)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">시나리오(전체)</SelectItem>
                <SelectItem value="1">스트링 단품 구매</SelectItem>
                <SelectItem value="2">스트링 구매 + 교체서비스 신청(통합)</SelectItem>
                <SelectItem value="3">교체서비스 단일 신청</SelectItem>
                <SelectItem value="4">라켓 단품 구매</SelectItem>
                <SelectItem value="5">라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)</SelectItem>
                <SelectItem value="6">라켓 단품 대여</SelectItem>
                <SelectItem value="7">라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={integrated}
              onValueChange={(v: any) => {
                setIntegrated(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="연결(전체)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">연결(전체)</SelectItem>
                <SelectItem value="1">통합(연결됨)</SelectItem>
                <SelectItem value="0">단독</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              title={onlyWarn ? '경고 항목만 조회 중' : '경고 항목만 모아보기'}
              className={cn('w-full bg-transparent', onlyWarn && 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/15 dark:bg-warning/15 dark:hover:bg-warning/20 dark:border-warning/40')}
              onClick={() => {
                setOnlyWarn((v) => !v);
                setPage(1);
              }}
            >
              경고만 보기
            </Button>

            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={settlementsHref}>
                <BarChartBig className="h-4 w-4 mr-1.5" />
                정산 관리
              </Link>
            </Button>

            <Button variant="outline" size="sm" onClick={reset} className="w-full bg-transparent">
              필터 초기화
            </Button>
          </div>

          {/* 프리셋 버튼(원클릭) */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant={presetActive.integratedOnly ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.integratedOnly}
              onClick={() => applyPreset({ integrated: '1', flow: 'all', kind: 'all', warn: false })}
              className={!presetActive.integratedOnly ? 'bg-transparent' : ''}
            >
              통합만
            </Button>

            <Button
              variant={presetActive.singleOnly ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.singleOnly}
              onClick={() => applyPreset({ integrated: '0', flow: 'all', kind: 'all', warn: false })}
              className={!presetActive.singleOnly ? 'bg-transparent' : ''}
            >
              단독만
            </Button>

            <Button
              variant={presetActive.rentalBundle ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.rentalBundle}
              onClick={() => applyPreset({ integrated: '1', flow: '7', kind: 'all', warn: false })}
              className={!presetActive.rentalBundle ? 'bg-transparent' : ''}
            >
              대여+교체(통합)
            </Button>

            <Button
              variant={presetActive.stringBundle ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.stringBundle}
              onClick={() => applyPreset({ integrated: '1', flow: '2', kind: 'all', warn: false })}
              className={!presetActive.stringBundle ? 'bg-transparent' : ''}
            >
              스트링+교체(통합)
            </Button>

            <Button
              variant={presetActive.appSingle ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.appSingle}
              onClick={() => applyPreset({ integrated: '0', flow: '3', kind: 'stringing_application', warn: false })}
              className={!presetActive.appSingle ? 'bg-transparent' : ''}
            >
              교체신청(단독)
            </Button>

            <Button
              variant={presetActive.racketBundle ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.racketBundle}
              onClick={() => applyPreset({ integrated: '1', flow: '5', kind: 'all', warn: false })}
              className={!presetActive.racketBundle ? 'bg-transparent' : ''}
            >
              라켓+교체(통합)
            </Button>
          </div>

          {/* 범례(운영자 인지 부하 감소) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground border-t border-border pt-3 mt-1">
            <span className="font-medium text-foreground">범례</span>
            <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone('order')))}>주문</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone('stringing_application')))}>신청서</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone('rental')))}>대여</Badge>
            <span className="text-muted-foreground">|</span>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary dark:bg-primary/20')}>통합(연결됨)</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-card text-muted-foreground')}>단독</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-destructive/10 text-destructive dark:bg-destructive/15')}>연결오류</Badge>

            <span className="text-muted-foreground">|</span>
            <span className="font-medium text-foreground">시나리오</span>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(1))}>스트링 구매</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(4))}>라켓 구매</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(6))}>대여</Badge>
            <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(3))}>교체 신청(단독)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 업무 목록 카드 */}
      <Card className="rounded-xl border-border bg-card shadow-md px-4 py-5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {data ? (
              <>
                <CardTitle className="text-base font-medium">업무 목록</CardTitle>
                <p className="text-xs text-muted-foreground">총 {total.toLocaleString('ko-KR')}건</p>
              </>
            ) : (
              <>
                <Skeleton className="h-5 w-24 rounded bg-muted dark:bg-card" />
                <Skeleton className="h-4 w-36 rounded bg-card" />
              </>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="text-xs text-muted-foreground">
              {page} / {totalPages} 페이지
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-transparent"
              disabled={!hasExpandableGroups}
              title={!hasExpandableGroups ? '펼칠 통합 묶음이 없습니다.' : '통합 묶음(연결된 문서)을 한 번에 펼치거나 접습니다.'}
              onClick={toggleAllGroups}
            >
              {isAllExpanded ? '전체 접기' : '전체 펼치기'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full rounded bg-muted dark:bg-card" />
              <Skeleton className="h-12 w-full rounded bg-muted dark:bg-card" />
              <Skeleton className="h-12 w-full rounded bg-muted dark:bg-card" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className={thClasses}>유형</TableHead>
                    <TableHead className={cn(thClasses, 'text-muted-foreground')}>ID</TableHead>
                    <TableHead className={thClasses}>고객</TableHead>
                    <TableHead className={cn(thClasses, 'text-muted-foreground')}>날짜</TableHead>
                    <TableHead className={thClasses}>상태</TableHead>
                    <TableHead className={thClasses}>결제</TableHead>
                    <TableHead className={thClasses}>금액</TableHead>
                    <TableHead className={cn(thClasses, 'text-muted-foreground')}>연결</TableHead>
                    <TableHead className={cn(thClasses, 'text-right')}>작업</TableHead>
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

                    // 경고 "근거"를 한 줄로 바로 보이게(운영자 인지부하 감소)
                    // - 테이블 폭을 망치지 않도록 데스크톱에서만 노출(xl 이상)
                    const uniq = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter(Boolean).map(String)));

                    // 서버가 내려준 warnReasons(연결 누락/불일치 등)를 그룹/단독 모두에서 수집
                    const linkWarnReasons = uniq(
                      (isGroup ? g.items : [g.anchor]).reduce((acc, x) => {
                        if (Array.isArray(x.warnReasons) && x.warnReasons.length > 0) acc.push(...x.warnReasons);
                        return acc;
                      }, [] as string[]),
                    );
                    const hasLinkWarn = linkWarnReasons.length > 0;
                    const linkWarnTitle = linkWarnReasons.slice(0, 3).join('\n') + (linkWarnReasons.length > 3 ? `\n외 ${linkWarnReasons.length - 3}개` : '');

                    // draft(초안) 등 '오류는 아니지만 아직 작성/제출이 끝나지 않은' 상태를 수집
                    const linkPendingReasons = uniq(
                      (isGroup ? g.items : [g.anchor]).reduce((acc, x) => {
                        if (Array.isArray(x.pendingReasons) && x.pendingReasons.length > 0) acc.push(...x.pendingReasons);
                        return acc;
                      }, [] as string[]),
                    );
                    const hasLinkPending = linkPendingReasons.length > 0;
                    const linkPendingTitle = linkPendingReasons.slice(0, 3).join('\n') + (linkPendingReasons.length > 3 ? `\n외 ${linkPendingReasons.length - 3}개` : '');

                    // 경고(혼재/결제불일치/연결오류) 항목에서는 자식 행에 "왜 연결인지" 라벨을 노출해 놓침을 줄입니다.
                    const showLinkReason = onlyWarn || payMismatch || hasMixed || hasLinkWarn;

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
                        <TableRow className={cn('hover:bg-muted/50 transition-colors', isGroup && 'bg-card')}>
                          <TableCell className={tdClasses}>
                            {(() => {
                              /**
                               * 운영함(통합) “유형” 컬럼 개선(표시만)
                               * - 기존: 뱃지를 여러 줄로 쌓아 행 높이가 커지고, Flow 라벨이 길어 뱃지가 가로로 늘어남
                               * - 개선: 핵심 뱃지만 노출 + 나머지는 +N으로 접기(AdminBadgeRow),
                               *         Flow는 짧은 라벨만 표기하고 전체 문구는 title로 유지
                               */
                              const items: BadgeItem[] = [];

                              // 통합/단독
                              const integratedLabel = isGroup ? '통합' : g.anchor.isIntegrated ? '통합' : '단독';
                              items.push({
                                label: integratedLabel,
                                className: integratedLabel === '통합' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'bg-card text-muted-foreground',
                                title: isGroup ? '연결된 문서가 함께 묶인 그룹' : '단일 문서',
                              });

                              // 통합 그룹이면 건수도 함께(의미 큼)
                              if (isGroup) {
                                items.push({
                                  label: `${g.items.length}건`,
                                  className: 'bg-card text-foreground',
                                  title: '이 그룹에 포함된 문서 수',
                                });
                              }

                              // 그룹 포함 종류(주문/신청서/대여)
                              g.kinds.forEach((k) =>
                                items.push({
                                  label: opsKindLabel(k),
                                  className: opsBadgeToneClass(opsKindBadgeTone(k)),
                                  title: `포함 문서: ${opsKindLabel(k)}`,
                                }),
                              );

                              // Flow: 표시는 짧게, 전체는 title로
                              items.push({
                                label: flowShortLabel(g.anchor.flow),
                                className: flowBadgeClass(g.anchor.flow),
                                title: `Flow ${g.anchor.flow} · ${g.anchor.flowLabel}`,
                              });

                              // 정산 기준
                              items.push({
                                label: g.anchor.settlementLabel,
                                className: settlementBadgeClass(),
                                title: '금액/정산 해석 기준',
                              });

                              return <AdminBadgeRow items={items} maxVisible={4} />;
                            })()}
                          </TableCell>

                          <TableCell className={tdClasses}>
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
                                  {(() => {
                                    // 운영함에서 난잡해지는 구간(그룹 기준/경고 뱃지들)을 “접기”로 정리
                                    const items: BadgeItem[] = [];

                                    if (hasLinkWarn) {
                                      items.push({
                                        label: '연결오류',
                                        className: 'bg-destructive/10 text-destructive dark:bg-destructive/15',
                                        title: linkWarnTitle,
                                      });
                                    } else if (hasLinkPending) {
                                      items.push({
                                        label: '작성대기',
                                        className: 'bg-muted text-foreground',
                                        title: linkPendingTitle,
                                      });
                                    }

                                    if (isGroup) {
                                      items.push({ label: '기준', className: 'bg-muted text-foreground', title: '그룹의 기준 문서' });
                                      items.push({ label: opsKindLabel(g.anchor.kind), className: opsBadgeToneClass(opsKindBadgeTone(g.anchor.kind)), title: '기준 문서 종류' });
                                      warnBadges.forEach((b) => items.push({ label: b.label, className: 'bg-warning/10 text-warning dark:bg-warning/15 border-warning/30', title: b.title }));
                                    }

                                    return items.length > 0 ? <AdminBadgeRow maxVisible={3} items={items} /> : null;
                                  })()}

                                  {isGroup && warnInline && (
                                    <span className="ml-2 hidden xl:inline text-xs text-muted-foreground" title={warnInline}>
                                      {warnInline}
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground line-clamp-1">{isGroup ? `기준: ${g.anchor.title}` : g.anchor.title}</div>

                                {isGroup && <div className="text-[11px] text-muted-foreground line-clamp-1">포함: {includesSummary || '-'}</div>}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={tdClasses}>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{g.anchor.customer?.name || '-'}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{g.anchor.customer?.email || '-'}</div>
                            </div>
                          </TableCell>

                          <TableCell className={cn(tdClasses, 'text-sm text-muted-foreground whitespace-nowrap')}>{formatKST(g.createdAt)}</TableCell>

                          <TableCell className={tdClasses}>
                            <div className="space-y-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsStatusBadgeTone(g.anchor.kind, g.anchor.statusLabel)))}>{g.anchor.statusLabel}</Badge>

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

                          <TableCell className={tdClasses}>
                            <div className="space-y-1">
                              {g.anchor.paymentLabel ? (
                                <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[g.anchor.paymentLabel] ?? 'bg-card text-muted-foreground')}>{g.anchor.paymentLabel}</Badge>
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

                          <TableCell className={cn(tdClasses, 'font-semibold text-sm')}>
                            {isGroup ? (
                              <div className="space-y-1">
                                {pickOnePerKind(g.items).map((it) => (
                                  <div key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted-foreground">{opsKindLabel(it.kind)}</span>
                                    <span>{won(it.amount)}</span>
                                  </div>
                                ))}
                                <div className="text-[11px] text-muted-foreground">* 종류별로 1회만 표시</div>
                              </div>
                            ) : (
                              <div>{won(g.anchor.amount)}</div>
                            )}
                          </TableCell>

                          <TableCell className={tdClasses}>{renderLinkedDocs(linkedDocsForAnchor)}</TableCell>

                          <TableCell className={cn(tdClasses, 'text-right')}>
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" onClick={() => copyToClipboard(g.anchor.id)} title="ID 복사">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" title="상세 보기">
                                <Link href={g.anchor.href}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-8 px-2 bg-transparent" title={settleTitle}>
                                <Link href={settleHref} className="flex items-center gap-1">
                                  <BarChartBig className="h-3.5 w-3.5" />
                                  <span className="hidden bp-md:inline text-xs">정산</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* 그룹 하위 Row(펼쳤을 때) */}
                        {isGroup &&
                          isOpen &&
                          children.map((it) => (
                            <TableRow key={`${g.key}:${it.kind}:${it.id}`} className="bg-card hover:bg-muted/40 transition-colors border-l-2 border-l-primary/30">
                              <TableCell className={tdClasses}>
                                <AdminBadgeRow
                                  maxVisible={4}
                                  items={[
                                    {
                                      label: opsKindLabel(it.kind),
                                      className: opsBadgeToneClass(opsKindBadgeTone(it.kind)),
                                      title: '문서 종류',
                                    },
                                    {
                                      label: flowShortLabel(it.flow),
                                      className: flowBadgeClass(it.flow),
                                      title: `Flow ${it.flow} · ${it.flowLabel}`,
                                    },
                                    {
                                      label: it.settlementLabel,
                                      className: settlementBadgeClass(),
                                      title: '금액/정산 해석 기준',
                                    },
                                  ]}
                                />
                                <Badge className={cn(badgeBase, badgeSizeSm, settlementBadgeClass())}>{it.settlementLabel}</Badge>
                              </TableCell>

                              <TableCell className={tdClasses}>
                                <div className="space-y-1 pl-6">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={cn(badgeBase, badgeSizeSm, 'bg-card text-foreground')}>연결</Badge>
                                    <div className="font-medium text-sm">{shortenId(it.id)}</div>
                                    {Array.isArray(it.warnReasons) && it.warnReasons.length > 0 && (
                                      <Badge
                                        title={it.warnReasons.slice(0, 3).join('\n') + (it.warnReasons.length > 3 ? `\n외 ${it.warnReasons.length - 3}개` : '')}
                                        className={cn(badgeBase, badgeSizeSm, 'bg-destructive/10 text-destructive dark:bg-destructive/15')}
                                      >
                                        연결오류
                                      </Badge>
                                    )}
                                  </div>
                                  {showLinkReason && (
                                    <div className="text-[11px] text-muted-foreground">
                                      연결됨: {opsKindLabel(g.anchor.kind)}(#{shortenId(g.anchor.id)})
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className={tdClasses}>
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">{it.customer?.name || '-'}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">{it.customer?.email || '-'}</div>
                                </div>
                              </TableCell>

                              <TableCell className={cn(tdClasses, 'text-sm text-muted-foreground whitespace-nowrap')}>{formatKST(it.createdAt)}</TableCell>

                              <TableCell className={tdClasses}>
                                <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsStatusBadgeTone(it.kind, it.statusLabel)))}>{it.statusLabel}</Badge>
                              </TableCell>

                              <TableCell className={tdClasses}>
                                {it.paymentLabel ? (
                                  <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[it.paymentLabel] ?? 'bg-card text-muted-foreground')}>{it.paymentLabel}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              <TableCell className={cn(tdClasses, 'font-semibold text-sm')}>
                                {/* 그룹에서는 상단(대표 row)에서 종류별 금액을 1회만 보여주므로
                                    하위 row에서는 금액을 반복 노출하지 않습니다(중복 해석 방지). */}
                                <span className="text-xs text-muted-foreground" title="금액은 그룹(기준) 행에서 종류별로 1회만 표시합니다.">
                                  -
                                </span>
                              </TableCell>

                              <TableCell className={tdClasses}>{renderLinkedDocs(it.related ? [it.related] : [])}</TableCell>

                              <TableCell className={cn(tdClasses, 'text-right')}>
                                <div className="flex justify-end gap-1.5">
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" onClick={() => copyToClipboard(it.id)} title="ID 복사">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" title="상세 보기">
                                    <Link href={it.href}>
                                      <Eye className="h-3.5 w-3.5" />
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
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={9} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">{onlyWarn ? '경고(연결오류/혼재/결제불일치) 조건에 해당하는 결과가 없습니다.' : '결과가 없습니다.'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                {page} / {totalPages} 페이지 (총 {total.toLocaleString('ko-KR')}건)
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  이전
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
