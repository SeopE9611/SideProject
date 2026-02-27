'use client';

import { AlertTriangle, BarChartBig, BellRing, ChevronDown, ChevronRight, ClipboardCheck, Copy, Eye, Link2, Search, Siren } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

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
import { inferNextActionForOperationGroup } from '@/lib/admin/next-action-guidance';
import { badgeBase, badgeSizeSm, badgeToneClass, paymentStatusColors } from '@/lib/badge-style';
import { shortenId } from '@/lib/shorten';
import { cn } from '@/lib/utils';
import { copyToClipboard } from './actions/operationsActions';
import { flowBadgeClass, prevMonthYyyymmKST, type Kind } from './filters/operationsFilters';
import { buildOperationsViewQueryString, initOperationsStateFromQuery, useSyncOperationsQuery } from './hooks/useOperationsQueryState';
import { formatKST, yyyymmKST, type OpItem, type ReviewLevel } from './table/operationsTableUtils';

const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

function amountMeaningText(item: OpItem) {
  const bits: string[] = [];
  if (item.amountNote) bits.push(item.amountNote);
  if (typeof item.amountReference === 'number' && item.amountReference > 0) {
    bits.push(`${item.amountReferenceLabel ?? '기준금액'} ${won(item.amountReference)}`);
  }
  return bits.join(' · ');
}

const PAGE_COPY = {
  title: '운영 통합 센터',
  description: '주의(실제 오류)와 검수필요(운영 확인 신호)를 구분해 주문·대여·신청을 한 화면에서 점검하는 관리자 운영 허브입니다.',
  dailyTodoTitle: '오늘 해야 할 일',
  dailyTodoLabels: {
    urgent: '긴급',
    caution: '주의',
    pending: '미처리',
  },
  actionsTitle: '이 페이지에서 가능한 액션',
  actions: [
    {
      title: '주의(오류) 우선 처리',
      description: '데이터 연결/무결성 오류 신호를 먼저 점검해 운영 리스크를 줄입니다.',
    },
    {
      title: '검수필요 확인',
      description: '오류는 아니지만 운영 확인이 필요한 건의 검수 사유를 빠르게 확인합니다.',
    },
    {
      title: '상세 이동',
      description: '주문·신청서·대여 상세 화면으로 즉시 이동합니다.',
    },
    {
      title: '정산 관리 이동',
      description: '지난달 기준 정산 화면으로 빠르게 이동해 마감합니다.',
    },
  ],
  onboarding: {
    title: '처음 방문하셨나요? 운영 통합 센터 3단계',
    description: '페이지 목적을 확인하고, 주요 필터 프리셋으로 업무 대상을 좁힌 뒤, 주의 → 검수필요 → 미처리 순으로 점검하세요.',
    steps: ['1) 오늘 해야 할 일 확인', '2) 업무 목적형 프리셋 선택', '3) 주의 → 검수필요 → 미처리 순 점검'],
    dismissLabel: '다시 보지 않기',
    collapsedSummary: '온보딩이 숨겨져 있습니다. 필요 시 다시 열어 주요 사용 흐름을 확인하세요.',
    reopenLabel: '온보딩 다시 보기',
  },
};

const ROW_ACTION_LABELS = {
  detail: '상세 보기',
  settlement: '정산 페이지 이동',
  copyId: '문서 ID 복사',
} as const;

type PresetKey = 'paymentMismatch' | 'integratedReview' | 'singleApplication';

const PRESET_CONFIG: Record<
  PresetKey,
  {
    label: string;
    helperText: string;
    priorityReason: string;
    nextAction: string;
    params: Partial<{ q: string; kind: 'all' | Kind; flow: 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'; integrated: 'all' | '1' | '0'; warn: boolean }>;
    isActive: (state: { integrated: 'all' | '1' | '0'; flow: 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'; kind: 'all' | Kind; onlyWarn: boolean }) => boolean;
  }
> = {
  paymentMismatch: {
    label: '주의(오류) 우선 점검',
    helperText: '데이터 연결/무결성 오류(주의) 건을 우선 처리하는 뷰입니다.',
    priorityReason: '주의는 실제 데이터 오류 신호이므로 CS·정산 이슈로 확산되기 전에 우선 조치가 필요합니다.',
    nextAction: '연결 누락/불일치 원인을 확인해 문서를 재연결하거나 상태를 정정하고 조치 이력을 남기세요.',
    params: { warn: true, integrated: 'all', flow: 'all', kind: 'all' },
    isActive: ({ onlyWarn }) => onlyWarn,
  },
  integratedReview: {
    label: '통합건 검수',
    helperText: '주문/대여와 신청서가 연결된 통합 건만 모아 확인합니다.',
    priorityReason: '연결 구조가 복잡해 문서 누락/상태 불일치가 가장 자주 발생합니다.',
    nextAction: '앵커 문서 기준으로 연결 문서의 상태·금액·정산 대상 월을 차례대로 검수하세요.',
    params: { integrated: '1', flow: 'all', kind: 'all', warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) => integrated === '1' && flow === 'all' && kind === 'all' && !onlyWarn,
  },
  singleApplication: {
    label: '단독 신청서 처리',
    helperText: '연결되지 않은 교체서비스 신청서만 빠르게 처리합니다.',
    priorityReason: '단독 신청서는 후속 주문/대여 연결이 없어 처리 누락 시 장기 미처리로 남기 쉽습니다.',
    nextAction: '미처리 사유를 우선 확인하고 담당자 배정 또는 상태 업데이트를 즉시 진행하세요.',
    params: { integrated: '0', flow: '3', kind: 'stringing_application', warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) => integrated === '0' && flow === '3' && kind === 'stringing_application' && !onlyWarn,
  },
};

const ONBOARDING_DISMISS_KEY = 'admin-operations-onboarding-dismissed-v1';

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

function isWarnGroup(g: { items: OpItem[] }) {
  return (g.items ?? []).some((it) => it.warn === true || (it.warnReasons?.length ?? 0) > 0);
}

function reviewLevelPriority(level: ReviewLevel) {
  if (level === 'action') return 2;
  if (level === 'info') return 1;
  return 0;
}

function computeReviewLevelGroup(g: { anchor: OpItem; items: OpItem[] }): ReviewLevel {
  let level: ReviewLevel = 'none';
  for (const it of g.items ?? []) {
    const itemLevel: ReviewLevel = it.reviewLevel ?? (it.needsReview ? 'action' : (it.reviewReasons?.length ?? 0) > 0 ? 'info' : 'none');
    if (reviewLevelPriority(itemLevel) > reviewLevelPriority(level)) level = itemLevel;
  }

  if (!g.items || g.items.length <= 1) return level;

  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
  if (children.length === 0) return level;

  const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
  const childPaymentSummary = summarizeByKind(children, (it) => it.paymentLabel);
  const hasMixed = childStatusSummary.some((st) => st.mixed) || childPaymentSummary.some((pay) => pay.mixed);

  const anchorPay = g.anchor.paymentLabel ?? '-';
  const childPays = children.map((x) => x.paymentLabel).filter(Boolean) as string[];
  const payMismatch = anchorPay !== '-' && childPays.some((pay) => pay && pay !== '-' && pay !== anchorPay);
  if (hasMixed || payMismatch) return 'action';
  return level;
}

function collectReviewReasons(g: { anchor: OpItem; items: OpItem[] }) {
  const reasons = new Set<string>();
  for (const it of g.items ?? []) {
    for (const reason of it.reviewReasons ?? []) {
      const value = reason?.trim();
      if (value) reasons.add(value);
    }
  }
  return Array.from(reasons);
}

function stringSummaryText(item?: OpItem) {
  if (!item?.stringingSummary?.requested) return null;
  const summary = item.stringingSummary;
  const bits = [summary.name ?? '스트링 선택됨', summary.price ? `요금 ${won(summary.price)}` : null, summary.mountingFee ? `교체비 ${won(summary.mountingFee)}` : null, summary.applicationStatus ? `신청 ${summary.applicationStatus}` : '신청 상태 확인']
    .filter(Boolean)
    .join(' / ');
  return bits || '스트링 선택됨';
}

const thClasses = 'px-4 py-2 text-left align-middle font-semibold text-foreground text-[11px] whitespace-nowrap';
const tdClasses = 'px-4 py-2.5 align-top';
const th = thClasses;
const td = tdClasses;

// 액션 컬럼은 본문 셀이 sticky(right)로 고정되어 있으므로,
// 헤더도 동일하게 sticky 처리해 가로 스크롤 시 컬럼 머리글이 어긋나지 않게 맞춘다.
// 단, header 배경색은 thead의 bg-muted/50과 동일 톤을 써서 "액션"만 색이 달라 보이는 현상을 방지.
const stickyActionHeadClass = 'sticky right-0 z-20 bg-muted/50 text-right shadow-[-8px_0_12px_-12px_hsl(var(--border))]';

const OPS_BADGE_CLASS: Record<OpsBadgeTone, string> = {
  success: badgeToneClass('success'),
  warning: badgeToneClass('warning'),
  destructive: badgeToneClass('destructive'),
  muted: badgeToneClass('neutral'),
  info: badgeToneClass('info'),
};

function opsBadgeToneClass(tone: OpsBadgeTone) {
  return OPS_BADGE_CLASS[tone] ?? OPS_BADGE_CLASS.muted;
}

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  /**
   * replaceNoScroll
   * - 필터 변경 시 URL(쿼리스트링)을 동기화하면서도 스크롤을 상단으로 올리지 않기 위한 래퍼 함수.
   * - Next.js App Router의 router.replace는 기본적으로 네비게이션으로 간주되어 스크롤이 튈 수 있음.
   * - { scroll: false } 옵션을 주면 "URL만 변경"하고 현재 스크롤 위치를 유지.
   *
   * useCallback을 쓰는 이유
   * - 이 함수는 컴포넌트 렌더 때마다 새로 생성되면(참조값 변경),
   *   useSyncOperationsQuery 내부의 useEffect/debounce 의존성에 걸려
   *   불필요한 재실행/타이머 리셋이 발생할 수 있음.
   * - useCallback으로 함수 참조를 안정화해서
   *   "필터 값이 바뀔 때만" 의도대로 URL 동기화가 일어나게 함.
   */
  const replaceNoScroll = useCallback(
    (url: string) => {
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [flow, setFlow] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [integrated, setIntegrated] = useState<'all' | '1' | '0'>('all'); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [warnFilter, setWarnFilter] = useState<'all' | 'warn' | 'review' | 'clean'>('all');
  const [warnSort, setWarnSort] = useState<'default' | 'warn_first' | 'safe_first'>('default');
  const [showAdvancedLegend, setShowAdvancedLegend] = useState(false);
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingSummary, setShowOnboardingSummary] = useState(false);
  const [showActionsGuide, setShowActionsGuide] = useState(false);
  const [isFilterScrolled, setIsFilterScrolled] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<'default' | 'compact'>('default');
  const [activePresetGuide, setActivePresetGuide] = useState<PresetKey | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const defaultPageSize = 50;
  // 주의(오류)만 보기에서는 "놓침"을 줄이기 위해 조회 범위를 넓힘(표시/운영 안전 목적)
  // - API/스키마 변경 없음 (그냥 pageSize 파라미터만 키움)
  const effectivePageSize = onlyWarn ? 200 : defaultPageSize;

  // 상단 CTA: 정산 관리로 빠르게 이동할 수 있도록 지난달(YYYYMM)을 기본 세팅
  const settlementYyyymm = useMemo(() => prevMonthYyyymmKST(), []);
  const settlementsHref = useMemo(() => `/admin/settlements?yyyymm=${settlementYyyymm}`, [settlementYyyymm]);

  // 1) 최초 1회: URL → 상태 주입(새로고침 대응)
  useEffect(() => {
    initOperationsStateFromQuery(sp, { setQ, setKind, setFlow, setIntegrated, setOnlyWarn, setWarnFilter, setWarnSort, setPage });
  }, [sp]);

  useEffect(() => {
    if (!onlyWarn) return;
    if (warnFilter === 'warn') return;
    setWarnFilter('warn');
    setPage(1);
  }, [onlyWarn, warnFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(ONBOARDING_DISMISS_KEY);
    setShowOnboarding(dismissed !== '1');
    setShowOnboardingSummary(dismissed === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setIsFilterScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
  }, [q, kind, flow, integrated, page, onlyWarn, warnFilter, warnSort]);

  // 2) 상태 → URL 동기화(디바운스)
  /**
   * useSyncOperationsQuery는 필터 상태가 변하면 URL에 반영(쿼리스트링 sync)하는 역할.
   * 여기서 replace를 scroll:false 버전으로 넘겨서, 필터 변경 시 화면이 위로 튀지 않게 함.
   */
  useSyncOperationsQuery({ q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page }, pathname, replaceNoScroll);

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
  const groupsToRender = useMemo(() => {
    const withSignals = groups.map((group) => {
      const reviewLevel = computeReviewLevelGroup(group);
      return {
        ...group,
        warn: isWarnGroup(group),
        reviewLevel,
        needsReview: reviewLevel === 'action',
      };
    });

    const filtered = withSignals.filter((group) => {
      if (warnFilter === 'all') return true;
      if (warnFilter === 'warn') return group.warn;
      if (warnFilter === 'review') return !group.warn && group.reviewLevel === 'action';
      return !group.warn && !group.needsReview;
    });

    if (warnSort === 'default') return filtered;

    return [...filtered].sort((a, b) => {
      if (a.warn === b.warn) {
        if (a.reviewLevel === b.reviewLevel) return 0;
        return reviewLevelPriority(a.reviewLevel) > reviewLevelPriority(b.reviewLevel) ? -1 : 1;
      }
      if (warnSort === 'warn_first') return a.warn ? -1 : 1;
      return a.warn ? 1 : -1;
    });
  }, [groups, warnFilter, warnSort]);

  const todayTodoCount = useMemo(() => {
    return groupsToRender.reduce(
      (acc, group) => {
        const groupItems = [group.anchor, ...group.items.filter((it) => it.id !== group.anchor.id)];
        const hasWarn = groupItems.some((it) => Array.isArray(it.warnReasons) && it.warnReasons.length > 0);
        const hasPending = groupItems.some((it) => Array.isArray(it.pendingReasons) && it.pendingReasons.length > 0);
        const hasPaymentRisk = groupItems.some((it) => it.paymentLabel === '결제취소' || it.paymentLabel === '결제실패' || it.paymentLabel === '확인필요');
        const hasPaymentPending = groupItems.some((it) => it.paymentLabel === '결제대기');
        const hasActionReview = groupItems.some((it) => (it.reviewLevel ?? (it.needsReview ? 'action' : (it.reviewReasons?.length ?? 0) > 0 ? 'info' : 'none')) === 'action') || group.reviewLevel === 'action';
        const groupGuide = inferNextActionForOperationGroup(group.items);
        const hasRoutineNextAction = !hasWarn && !hasActionReview && !hasPaymentRisk && Boolean(groupGuide.nextAction?.trim()) && !groupGuide.nextAction.includes('후속 조치 없음');

        if (hasWarn) acc.urgent += 1;
        if (hasPaymentRisk || hasActionReview) acc.caution += 1;
        if (hasPending || hasPaymentPending || hasRoutineNextAction) acc.pending += 1;
        return acc;
      },
      { urgent: 0, caution: 0, pending: 0 },
    );
  }, [groupsToRender]);

  // 펼칠 수 있는 그룹(통합 묶음)만 추림
  const expandableGroupKeys = useMemo(() => groupsToRender.filter((g) => g.items.length > 1).map((g) => g.key), [groupsToRender]);
  const hasExpandableGroups = expandableGroupKeys.length > 0;
  const isAllExpanded = hasExpandableGroups && expandableGroupKeys.every((k) => !!openGroups[k]);
  const shareViewHref = useMemo(() => {
    const qs = buildOperationsViewQueryString({ q, kind, flow, integrated, onlyWarn, warnFilter, warnSort, page });
    return qs ? `${pathname}?${qs}` : pathname;
  }, [flow, integrated, kind, onlyWarn, page, pathname, q, warnFilter, warnSort]);
  const shareViewFullHref = useMemo(() => {
    if (typeof window === 'undefined') return shareViewHref;
    return `${window.location.origin}${shareViewHref}`;
  }, [shareViewHref]);

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

  function dismissOnboarding() {
    setShowOnboarding(false);
    setShowOnboardingSummary(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_DISMISS_KEY, '1');
    }
  }

  function reopenOnboarding() {
    setShowOnboarding(true);
    setShowOnboardingSummary(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ONBOARDING_DISMISS_KEY);
    }
  }

  async function copyShareViewLink() {
    await copyToClipboard(shareViewFullHref);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 1200);
  }

  function reset() {
    setQ('');
    setKind('all');
    setFlow('all');
    setIntegrated('all');
    setOnlyWarn(false);
    setWarnFilter('all');
    setWarnSort('default');
    setPage(1);
    /**
     * reset도 URL을 초기화하지만,
     * "초기화 버튼 누를 때마다 화면이 위로 튀는 것"이 싫다면 scroll:false로 동일하게 처리.
     * (만약 reset 시에는 위로 올리고 싶다면 이 줄만 scroll:true로 분리하면 됨)
     */
    router.replace(pathname, { scroll: false });
  }

  function clearPresetMode() {
    setActivePresetGuide(null);
    applyPreset({ integrated: 'all', flow: 'all', kind: 'all', warn: false });
    setWarnFilter('all');
    setWarnSort('default');
  }

  // 프리셋 버튼 "활성" 판정(현재 필터 상태가 프리셋과 일치하는지)
  const presetActive = {
    paymentMismatch: PRESET_CONFIG.paymentMismatch.isActive({ integrated, flow, kind, onlyWarn }),
    integratedReview: PRESET_CONFIG.integratedReview.isActive({ integrated, flow, kind, onlyWarn }),
    singleApplication: PRESET_CONFIG.singleApplication.isActive({ integrated, flow, kind, onlyWarn }),
  };

  const activePresetKey = useMemo(() => {
    if (presetActive.paymentMismatch) return 'paymentMismatch' as const;
    if (presetActive.integratedReview) return 'integratedReview' as const;
    if (presetActive.singleApplication) return 'singleApplication' as const;
    return null;
  }, [presetActive.integratedReview, presetActive.paymentMismatch, presetActive.singleApplication]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (q.trim()) count += 1;
    if (kind !== 'all') count += 1;
    if (flow !== 'all') count += 1;
    if (integrated !== 'all') count += 1;
    if (onlyWarn) count += 1;
    if (warnFilter !== 'all') count += 1;
    if (warnSort !== 'default') count += 1;
    return count;
  }, [flow, integrated, kind, onlyWarn, q, warnFilter, warnSort]);

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

            <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 bg-transparent" onClick={() => copyToClipboard(d.id)} aria-label={ROW_ACTION_LABELS.copyId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {rest > 0 && <span className="text-xs text-muted-foreground">외 {rest}건</span>}
      </div>
    );
  }

  return (
    <div className="container py-4 lg:py-5">
      {commonErrorMessage && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:bg-destructive/15">{commonErrorMessage}</div>}
      {/* 페이지 헤더 */}
      <div className="mx-auto mb-4 max-w-[1440px]">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{PAGE_COPY.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground lg:text-sm">{PAGE_COPY.description}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">상단 요약 수치는 현재 필터 결과 기준으로 계산됩니다.</p>

        <div className="mt-3 grid gap-2 grid-cols-1 bp-sm:grid-cols-3">
          <Card className="border-warning/30 bg-warning/5 shadow-none">
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <Siren className="h-4 w-4 text-warning" />
                {PAGE_COPY.dailyTodoLabels.urgent}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">{todayTodoCount.urgent}건</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-info/40 bg-info/5 shadow-none">
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <BellRing className="h-4 w-4 text-info" />
                {PAGE_COPY.dailyTodoLabels.caution}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">{todayTodoCount.caution}건</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/30 bg-primary/5 shadow-none">
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                {PAGE_COPY.dailyTodoLabels.pending}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">{todayTodoCount.pending}건</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {showOnboarding && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{PAGE_COPY.onboarding.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{PAGE_COPY.onboarding.description}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {PAGE_COPY.onboarding.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={dismissOnboarding}>
                {PAGE_COPY.onboarding.dismissLabel}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto mb-3 max-w-[1440px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{PAGE_COPY.actionsTitle}</p>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowActionsGuide((prev) => !prev)}>
            {showActionsGuide ? '도움말 닫기' : '도움말 보기'}
          </Button>
        </div>

        {showActionsGuide && (
          <div className="grid max-w-7xl gap-3 grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-4">
            {PAGE_COPY.actions.map((action) => (
              <Card key={action.title} className="rounded-xl border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{action.title}</CardTitle>
                  <CardDescription className="text-xs">{action.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 필터 및 검색 카드 */}
      <div className={cn('top-3 z-30 mb-4 transition-all duration-200', isFilterScrolled && 'drop-shadow-xl')}>
        <Card
          className={cn(
            'rounded-xl border-border px-6 py-4 shadow-md transition-all duration-200',
            onlyWarn ? 'bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30' : 'bg-card',
            isFilterScrolled && 'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90',
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>필터 및 검색</CardTitle>
              <CardDescription className="text-xs mt-1">ID, 고객, 이메일로 검색하거나 다양한 조건으로 필터링하세요.</CardDescription>
              {activeFilterCount > 0 && <Badge className={cn(badgeBase, badgeSizeSm, 'mt-2 bg-primary/10 text-primary dark:bg-primary/20')}>적용된 필터 {activeFilterCount}개</Badge>}
            </div>

            <Button variant="outline" size="sm" onClick={reset} className="shrink-0 bg-transparent">
              필터 초기화
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 검색 + 주요 버튼 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-md">
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

              <Button
                variant={onlyWarn ? 'default' : 'outline'}
                size="sm"
                title={onlyWarn ? '주의(오류) 항목만 조회 중' : '주의(오류) 항목만 모아보기'}
                className={cn('h-9', !onlyWarn && 'bg-transparent')}
                onClick={() => {
                  setOnlyWarn((v) => {
                    const next = !v;
                    if (next) setWarnFilter('warn');
                    return next;
                  });
                  setPage(1);
                }}
              >
                주의(오류)만 보기
              </Button>

              <Button type="button" variant="outline" size="sm" className="h-9 bg-transparent" onClick={copyShareViewLink}>
                <Link2 className="mr-1.5 h-4 w-4" />
                {shareLinkCopied ? '링크 복사됨' : '현재 뷰 링크 복사'}
              </Button>

              <Button variant="outline" size="sm" onClick={reset} className="h-9 bg-transparent">
                필터 초기화
              </Button>

              <Button asChild variant="outline" size="sm" className="h-9 bg-transparent">
                <Link href={settlementsHref}>
                  <BarChartBig className="h-4 w-4 mr-1.5" />
                  정산 관리
                </Link>
              </Button>
            </div>

            {/* 필터 컴포넌트들 */}
            <div className="grid w-full grid-cols-1 gap-2 border-t border-border pt-2.5 bp-sm:grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-5">
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

              <Select
                value={warnFilter}
                onValueChange={(v: any) => {
                  if (onlyWarn && v !== 'warn') return;
                  setWarnFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="위험 신호 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="warn">주의만</SelectItem>
                  <SelectItem value="review" disabled={onlyWarn}>
                    검수필요만
                  </SelectItem>
                  <SelectItem value="clean" disabled={onlyWarn}>
                    완전정상만
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={warnSort} onValueChange={(v: any) => setWarnSort(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="위험 신호 정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">위험 신호 정렬(기본)</SelectItem>
                  <SelectItem value="warn_first">주의 우선</SelectItem>
                  <SelectItem value="safe_first">완전정상 우선</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 프리셋 버튼(원클릭) */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant={presetActive.paymentMismatch ? 'default' : 'outline'}
                size="sm"
                aria-pressed={presetActive.paymentMismatch}
                onClick={() => {
                  applyPreset(PRESET_CONFIG.paymentMismatch.params);
                  setActivePresetGuide('paymentMismatch');
                }}
                className={!presetActive.paymentMismatch ? 'bg-transparent' : ''}
              >
                {PRESET_CONFIG.paymentMismatch.label}
              </Button>

              <Button
                variant={presetActive.integratedReview ? 'default' : 'outline'}
                size="sm"
                aria-pressed={presetActive.integratedReview}
                onClick={() => {
                  applyPreset(PRESET_CONFIG.integratedReview.params);
                  setActivePresetGuide('integratedReview');
                }}
                className={!presetActive.integratedReview ? 'bg-transparent' : ''}
              >
                {PRESET_CONFIG.integratedReview.label}
              </Button>

              <Button
                variant={presetActive.singleApplication ? 'default' : 'outline'}
                size="sm"
                aria-pressed={presetActive.singleApplication}
                onClick={() => {
                  applyPreset(PRESET_CONFIG.singleApplication.params);
                  setActivePresetGuide('singleApplication');
                }}
                className={!presetActive.singleApplication ? 'bg-transparent' : ''}
              >
                {PRESET_CONFIG.singleApplication.label}
              </Button>

              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearPresetMode}>
                전체 보기
              </Button>
            </div>

            {activePresetGuide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  현재 결과 <span className="font-semibold text-foreground">{total.toLocaleString('ko-KR')}건</span>
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{PRESET_CONFIG[activePresetGuide].label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{PRESET_CONFIG[activePresetGuide].helperText}</p>
                <div className="mt-2">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setActivePresetGuide(null)}>
                    가이드 닫기
                  </Button>
                </div>
              </div>
            )}

            {activePresetKey && (
              <div className="mt-2 grid gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground bp-sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-primary">현재 결과</p>
                  <p className="text-sm font-medium text-foreground">{total.toLocaleString('ko-KR')}건</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-primary">우선 처리 이유</p>
                  <p>{PRESET_CONFIG[activePresetKey].priorityReason}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-primary">다음 액션</p>
                  <p>{PRESET_CONFIG[activePresetKey].nextAction}</p>
                </div>
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
              <Badge className={cn(badgeBase, badgeSizeSm, 'bg-info/10 text-info dark:bg-info/20')}>저장된 뷰 링크</Badge>
              <p className="text-xs text-muted-foreground">현재 필터 상태가 URL 쿼리에 반영됩니다. 링크를 복사해 팀에 공유하세요.</p>
              <code className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">{shareViewHref}</code>
            </div>

            {/* 범례(운영자 인지 부하 감소) */}
            <div className="mt-1 space-y-2 border-t border-border pt-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">범례</span>
                <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone('order')))}>문서유형</Badge>
                <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary dark:bg-primary/20')}>통합여부</Badge>
                <Badge className={cn(badgeBase, badgeSizeSm, 'bg-warning/10 text-warning dark:bg-warning/15 border-warning/30')}>
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  주의(실제 오류)
                </Badge>
                <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary border-primary/30')}>검수필요(운영 확인)</Badge>
                <span>결제 라벨 `패키지차감/주문결제포함/대여결제포함/확인필요`는 정책 파생 결과입니다.</span>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-expanded={showAdvancedLegend} onClick={() => setShowAdvancedLegend((prev) => !prev)}>
                  {showAdvancedLegend ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />}
                  고급 필터
                </Button>
              </div>

              {showAdvancedLegend && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">시나리오</span>
                  <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(1))}>스트링 구매</Badge>
                  <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(4))}>라켓 구매</Badge>
                  <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(6))}>대여</Badge>
                  <Badge className={cn(badgeBase, badgeSizeSm, flowBadgeClass(3))}>교체 신청(단독)</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 업무 목록 카드 */}
      <Card className="rounded-xl border-border bg-card px-4 py-4 shadow-md lg:px-5">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 bp-md:flex-row bp-md:items-center bp-md:justify-between">
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">업무 목록</CardTitle>
                  {activePresetKey && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary dark:bg-primary/20')}>{PRESET_CONFIG[activePresetKey].label}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">총 {total.toLocaleString('ko-KR')}건</p>
                  <span className="text-xs text-muted-foreground">표시 밀도</span>
                  <div className="inline-flex items-center rounded-md border border-border p-0.5">
                    <Button type="button" size="sm" variant={displayDensity === 'default' ? 'secondary' : 'ghost'} className="h-6 px-2 text-xs" onClick={() => setDisplayDensity('default')} aria-pressed={displayDensity === 'default'}>
                      기본
                    </Button>
                    <Button type="button" size="sm" variant={displayDensity === 'compact' ? 'secondary' : 'ghost'} className="h-6 px-2 text-xs" onClick={() => setDisplayDensity('compact')} aria-pressed={displayDensity === 'compact'}>
                      컴팩트
                    </Button>
                  </div>
                </div>
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
            <>
              <div className="hidden bp-lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className={thClasses}>우선순위/위험</TableHead>
                      <TableHead className={thClasses}>대상</TableHead>
                      <TableHead className={thClasses}>상태</TableHead>
                      <TableHead className={thClasses}>금액</TableHead>
                      {/* <TableHead className={cn(thClasses, 'sticky right-0 z-20 bg-card text-right shadow-[-8px_0_12px_-12px_hsl(var(--border))]')}>액션</TableHead> */}
                      <TableHead className={cn(thClasses, stickyActionHeadClass)}>액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupsToRender.map((g, idx) => {
                      const isGroup = g.items.length > 1;
                      const isOpen = !!openGroups[g.key];
                      const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                      const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
                      const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
                      const reviewReasons = collectReviewReasons(g);
                      const groupGuide = inferNextActionForOperationGroup(g.items);
                      const linkedDocsForAnchor = isGroup ? children.map((x) => ({ kind: x.kind, id: x.id, href: x.href })) : g.anchor.related ? [g.anchor.related] : [];
                      const warn = g.warn;
                      const settleYyyymm = yyyymmKST(g.createdAt ?? g.anchor.createdAt);
                      const settleHref = settleYyyymm ? `/admin/settlements?yyyymm=${settleYyyymm}` : '/admin/settlements';

                      const rowDensityClass = displayDensity === 'compact' ? 'py-1.5' : 'py-2.5';
                      const rowBaseToneClass = idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.18]';
                      const warnEmphasisClass = warn ? 'border-l-2 border-l-warning/60 bg-warning/[0.08]' : 'border-l-2 border-l-transparent';
                      const stickyActionCellClass = 'sticky right-0 z-10 bg-inherit shadow-[-8px_0_12px_-12px_hsl(var(--border))]';

                      return (
                        <Fragment key={g.key}>
                          <TableRow className={cn('transition-colors hover:bg-muted/35', rowBaseToneClass, warnEmphasisClass)}>
                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="flex flex-wrap items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Badge className={cn(badgeBase, badgeSizeSm, warn ? 'bg-warning/10 text-warning border-warning/30' : 'bg-muted text-muted-foreground')}>{warn ? '주의' : '정상'}</Badge>
                                  {!warn && g.reviewLevel === 'action' && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary border-primary/30')}>검수필요</Badge>}
                                  {!warn && g.reviewLevel === 'info' && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-info/10 text-info border-info/30')}>참고/파생(조치없음)</Badge>}
                                </div>
                                {!warn && g.reviewLevel === 'action' && reviewReasons.length > 0 && <div className="w-full text-[11px] text-primary/90">사유 {reviewReasons.length}건 · 펼쳐서 확인</div>}
                                {!warn && g.reviewLevel === 'info' && <div className="w-full text-[11px] text-info">정상 파생 · 조치 필요 없음</div>}
                                <div className="w-full rounded-sm border border-primary/20 bg-primary/5 px-2 py-1 text-[11px]">다음 할 일: {groupGuide.nextAction?.trim() ? groupGuide.nextAction : g.reviewLevel === 'info' ? '조치 필요 없음(정상 파생)' : '조치 필요 없음'}</div>
                                <div className="text-[11px] text-muted-foreground">{groupGuide.stage} · {isGroup ? `${g.items.length}건 그룹` : '단일 건'}</div>
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {isGroup && (
                                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toggleGroup(g.key)} title={isOpen ? '상세 접기' : '상세 펼치기'}>
                                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    </Button>
                                  )}
                                  <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone(g.anchor.kind)))}>{opsKindLabel(g.anchor.kind)}</Badge>
                                  <span className="font-medium text-sm">{shortenId(g.anchor.id)}</span>
                                </div>
                                <div className="text-sm">{g.anchor.customer?.name || '-'}</div>
                                <div className="text-xs text-muted-foreground">{formatKST(g.createdAt ?? g.anchor.createdAt)}</div>
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass)}>
                              <div className="flex flex-col items-start gap-1">
                                <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsStatusBadgeTone(g.anchor.kind, g.anchor.statusLabel)))}>{g.anchor.statusLabel}</Badge>
                                {g.anchor.paymentLabel ? (
                                  <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[g.anchor.paymentLabel] ?? 'bg-card text-muted-foreground')}>{g.anchor.paymentLabel}</Badge>
) : (
                                  <span className="text-xs text-muted-foreground">결제정보 없음(문서 미기입)</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass, 'font-semibold text-sm')}>
                              {isGroup ? (
                                <div className="space-y-1.5">
                                  {pickOnePerKind(g.items).map((it) => {
                                    const meaning = amountMeaningText(it);
                                    return (
                                      <div key={`${it.kind}:${it.id}`} className="flex items-start justify-between gap-3">
                                        <span className="text-xs text-muted-foreground">{opsKindLabel(it.kind)}</span>
                                        <div className="text-right">
                                          <div>{won(it.amount)}</div>
                                          {meaning ? <div className="text-[11px] font-normal text-muted-foreground">{meaning}</div> : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div>
                                  <div>{won(g.anchor.amount)}</div>
                                  {amountMeaningText(g.anchor) ? <div className="text-[11px] font-normal text-muted-foreground">{amountMeaningText(g.anchor)}</div> : null}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className={cn(tdClasses, rowDensityClass, 'text-right', stickyActionCellClass)}>
                              <div className="flex justify-end gap-1.5">
                                <Button asChild size="sm" variant="outline" className="h-8 px-2 bg-transparent" title={ROW_ACTION_LABELS.detail}>
                                  <Link href={g.anchor.href} className="flex items-center gap-1" aria-label={ROW_ACTION_LABELS.detail}>
                                    <Eye className="h-3.5 w-3.5" />
                                    <span className="text-xs">상세</span>
                                  </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="h-8 px-2 bg-transparent" title={ROW_ACTION_LABELS.settlement}>
                                  <Link href={settleHref} className="flex items-center gap-1" aria-label={ROW_ACTION_LABELS.settlement}>
                                    <BarChartBig className="h-3.5 w-3.5" />
                                    <span className="text-xs">정산</span>
                                  </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" onClick={() => copyToClipboard(g.anchor.id)} title={ROW_ACTION_LABELS.copyId} aria-label={ROW_ACTION_LABELS.copyId}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {isGroup && isOpen && (
                            <TableRow className="bg-muted/20">
                              <TableCell colSpan={5} className={cn(tdClasses, 'border-l-2 border-l-primary/40')}>
                                <div className="grid gap-4 bp-xl:grid-cols-3">
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">연결 문서</p>
                                    {renderLinkedDocs(linkedDocsForAnchor)}
                                  </div>
                                  {g.anchor.flow === 7 && (
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-foreground">스트링 요약</p>
                                      <p className="text-xs text-muted-foreground">{stringSummaryText(g.items.find((it) => it.kind === 'rental')) ?? '정보 없음'}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">상태 혼재 내역</p>
                                    {childStatusSummary.length > 0 ? (
                                      <div className="space-y-1">
                                        {childStatusSummary.map((s) => (
                                          <div key={`st:${g.key}:${s.kind}`} className="text-xs text-muted-foreground">
                                            {opsKindLabel(s.kind)}: {s.text}
                                            {s.mixed ? ' (혼재)' : ''}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">혼재 없음</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-foreground">현재 업무 단계 / 다음 할 일</p>
                                    <p className="text-xs text-muted-foreground">{groupGuide.stage}</p>
                                    <p className="text-xs text-foreground">{groupGuide.nextAction?.trim() ? groupGuide.nextAction : g.reviewLevel === 'info' ? '조치 필요 없음(정상 파생)' : '조치 필요 없음'}</p>
                                  </div>
                                  {g.reviewLevel === 'info' && <p className="text-xs text-info">참고 정보입니다. 조치 필요 없음.</p>}
                                  {g.reviewLevel === 'action' && reviewReasons.length > 0 && (
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-foreground">검수 사유</p>
                                      <ul className="space-y-1">
                                        {reviewReasons.map((reason) => (
                                          <li key={`review:${g.key}:${reason}`} className="text-xs text-muted-foreground list-disc list-inside">
                                            {reason}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}

                    {groupsToRender.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">{onlyWarn ? '주의(실제 오류) 조건에 해당하는 결과가 없습니다.' : '결과가 없습니다.'}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 bp-lg:hidden">
                {groupsToRender.map((g) => {
                  const warn = g.warn;
                  const reviewReasons = collectReviewReasons(g);
                  const groupGuide = inferNextActionForOperationGroup(g.items);
                  return (
                    <Card key={`m:${g.key}`} className="border-border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Badge className={cn(badgeBase, badgeSizeSm, warn ? 'bg-warning/10 text-warning border-warning/30' : 'bg-muted text-muted-foreground')}>{warn ? '주의' : '정상'}</Badge>
                            {!warn && g.reviewLevel === 'action' && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary border-primary/30')}>검수필요</Badge>}
                                  {!warn && g.reviewLevel === 'info' && <Badge className={cn(badgeBase, badgeSizeSm, 'bg-info/10 text-info border-info/30')}>참고/파생(조치없음)</Badge>}
                          </div>
                          <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone(g.anchor.kind)))}>{opsKindLabel(g.anchor.kind)}</Badge>
                        </div>
                        <div className="text-sm font-medium">{g.anchor.customer?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">상태: {g.anchor.statusLabel}</div>
                        {g.anchor.paymentLabel ? <div className="text-xs text-muted-foreground">결제: {g.anchor.paymentLabel}</div> : null}
                        {g.anchor.flow === 7 && <div className="text-xs text-muted-foreground">스트링 요약: {stringSummaryText(g.items.find((it) => it.kind === 'rental')) ?? '정보 없음'}</div>}
                        <div className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5">
                          <p className="text-[11px] font-medium text-primary">현재 업무 단계</p>
                          <p className="text-[11px] text-muted-foreground">{groupGuide.stage}</p>
                          <p className="mt-1 text-[11px] text-foreground">다음 할 일: {groupGuide.nextAction?.trim() ? groupGuide.nextAction : g.reviewLevel === 'info' ? '조치 필요 없음(정상 파생)' : '조치 필요 없음'}</p>
                        </div>
                        {!warn && g.reviewLevel === 'action' && reviewReasons.length > 0 && (
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5">
                            <p className="text-[11px] font-medium text-primary">검수 사유</p>
                            <ul className="mt-1 space-y-0.5">
                              {reviewReasons.map((reason) => (
                                <li key={`m-review:${g.key}:${reason}`} className="text-[11px] text-muted-foreground list-disc list-inside">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="text-sm font-semibold">금액: {won(g.anchor.amount)}</div>
                        {amountMeaningText(g.anchor) ? <div className="text-xs text-muted-foreground">{amountMeaningText(g.anchor)}</div> : null}
                      </CardContent>
                    </Card>
                  );
                })}

                {groupsToRender.length === 0 && <div className="rounded-md border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground">표시할 항목이 없습니다.</div>}
              </div>
            </>
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
