'use client';

import { AlertTriangle, BarChartBig, ChevronDown, ChevronRight, Copy, Eye, Link2, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  opsKindBadgeTone,
  opsKindLabel,
  opsStatusBadgeTone,
  type OpsBadgeTone,
} from '@/lib/admin-ops-taxonomy';
import { adminFetcher, getAdminErrorMessage } from '@/lib/admin/adminFetcher';
import { buildQueryString } from '@/lib/admin/urlQuerySync';
import { badgeBase, badgeSizeSm, paymentStatusColors } from '@/lib/badge-style';
import { shortenId } from '@/lib/shorten';
import { cn } from '@/lib/utils';
import { copyToClipboard } from './actions/operationsActions';
import { flowBadgeClass, prevMonthYyyymmKST, type Kind } from './filters/operationsFilters';
import { initOperationsStateFromQuery, useSyncOperationsQuery } from './hooks/useOperationsQueryState';
import { formatKST, yyyymmKST, type OpItem } from './table/operationsTableUtils';

const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

const PAGE_COPY = {
  title: '운영 통합 센터',
  description: '주문·대여·신청을 한 화면에서 확인하는 관리자 운영 허브입니다.',
  dailyTodoTitle: '오늘 해야 할 일',
  dailyTodoLabels: {
    urgent: '긴급',
    caution: '주의',
    pending: '미처리',
  },
  actionsTitle: '이 페이지에서 가능한 액션',
  actions: [
    {
      title: '결제 불일치 확인',
      description: '그룹 단위 결제 상태가 혼재되었는지 빠르게 점검합니다.',
    },
    {
      title: '연결 오류 점검',
      description: '연결 누락/불일치 경고 건을 우선 정리합니다.',
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
    description: '페이지 목적을 확인하고, 주요 필터 프리셋으로 업무 대상을 좁힌 뒤, 주의 건을 먼저 처리하세요.',
    steps: ['1) 오늘 해야 할 일 확인', '2) 업무 목적형 프리셋 선택', '3) 주의/미처리 건 순서로 처리'],
    dismissLabel: '닫기',
    collapsedSummary: '운영 통합 센터 온보딩을 다시 확인할 수 있습니다.',
    reopenLabel: '온보딩 다시 보기',
  },
};

type PresetKey = 'paymentMismatch' | 'integratedReview' | 'singleApplication';

const PRESET_CONFIG: Record<PresetKey, {
  label: string;
  priorityReason: string;
  nextAction: string;
  params: Partial<{ q: string; kind: 'all' | Kind; flow: 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'; integrated: 'all' | '1' | '0'; warn: boolean }>;
  isActive: (state: { integrated: 'all' | '1' | '0'; flow: 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'; kind: 'all' | Kind; onlyWarn: boolean }) => boolean;
}> = {
  paymentMismatch: {
    label: '결제불일치 확인',
    priorityReason: '주의 건(결제/상태 혼재 가능성)을 우선 검수하는 모드입니다.',
    nextAction: '주의 배지 건부터 펼쳐 결제 라벨/상태 혼재 여부를 확인하고 필요한 상세 화면으로 이동하세요.',
    params: { warn: true, integrated: 'all', flow: 'all', kind: 'all' },
    isActive: ({ onlyWarn }) => onlyWarn,
  },
  integratedReview: {
    label: '통합건 검수',
    priorityReason: '주문/대여와 신청서가 연결된 통합 건의 연결 무결성을 점검하는 모드입니다.',
    nextAction: '그룹 펼치기로 연결 문서 상태를 검수하고, 경고/정상 배지를 기준으로 처리 우선순위를 정하세요.',
    params: { integrated: '1', flow: 'all', kind: 'all', warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) => integrated === '1' && flow === 'all' && kind === 'all' && !onlyWarn,
  },
  singleApplication: {
    label: '단독 신청서 처리',
    priorityReason: '연결되지 않은 교체서비스 신청서만 빠르게 소진하기 위한 모드입니다.',
    nextAction: '상태/결제 라벨을 확인해 미처리 신청서를 먼저 처리하고, 필요 시 연결 문서 생성 흐름으로 이어가세요.',
    params: { integrated: '0', flow: '3', kind: 'stringing_application', warn: false },
    isActive: ({ integrated, flow, kind, onlyWarn }) => integrated === '0' && flow === '3' && kind === 'stringing_application' && !onlyWarn,
  },
};

const ONBOARDING_SEEN_KEY = 'admin-operations-onboarding-seen-v1';
const SAVED_VIEWS_KEY = 'admin-operations-saved-views-v1';
const MAX_SAVED_VIEWS = 5;

type SavedOperationView = {
  id: string;
  href: string;
  label: string;
  createdAt: number;
};

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

export default function OperationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [flow, setFlow] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [integrated, setIntegrated] = useState<'all' | '1' | '0'>('all'); // 1=통합만, 0=단독만
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [warnFilter, setWarnFilter] = useState<'all' | 'warn' | 'safe'>('all');
  const [warnSort, setWarnSort] = useState<'default' | 'warn_first' | 'safe_first'>('default');
  const [showAdvancedLegend, setShowAdvancedLegend] = useState(false);
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingSummary, setShowOnboardingSummary] = useState(false);
  const [showActionsGuide, setShowActionsGuide] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedOperationView[]>([]);
  const [savedViewLabel, setSavedViewLabel] = useState('');
  const [savedViewCopiedId, setSavedViewCopiedId] = useState<string | null>(null);
  const [isFilterScrolled, setIsFilterScrolled] = useState(false);
  const [displayDensity, setDisplayDensity] = useState<'default' | 'compact'>('default');
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (seen === '1') {
      setShowOnboarding(false);
      setShowOnboardingSummary(true);
      return;
    }

    setShowOnboarding(true);
    setShowOnboardingSummary(false);
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      setIsFilterScrolled(window.scrollY > 140);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // 필터/페이지가 바뀌면 펼침 상태를 초기화(예상치 못한 "열림 유지" 방지)
  useEffect(() => {
    setOpenGroups({});
  }, [q, kind, flow, integrated, page, onlyWarn, warnFilter, warnSort]);

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
  const groupsToRender = useMemo(() => {
    const withWarn = groups.map((group) => ({
      ...group,
      warn: isWarnGroup(group),
    }));

    const filtered =
      warnFilter === 'all' ? withWarn : withWarn.filter((group) => (warnFilter === 'warn' ? group.warn : !group.warn));

    if (warnSort === 'default') return filtered;

    return [...filtered].sort((a, b) => {
      if (a.warn === b.warn) return 0;
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
        const hasPaymentIssue = groupItems.some((it) => it.paymentLabel === '미결제' || it.paymentLabel === '결제취소');

        if (hasWarn) acc.urgent += 1;
        if (hasPaymentIssue) acc.caution += 1;
        if (hasPending) acc.pending += 1;
        return acc;
      },
      { urgent: 0, caution: 0, pending: 0 }
    );
  }, [groupsToRender]);

  // 펼칠 수 있는 그룹(통합 묶음)만 추림
  const expandableGroupKeys = useMemo(() => groupsToRender.filter((g) => g.items.length > 1).map((g) => g.key), [groupsToRender]);
  const hasExpandableGroups = expandableGroupKeys.length > 0;
  const isAllExpanded = hasExpandableGroups && expandableGroupKeys.every((k) => !!openGroups[k]);
  const shareViewHref = useMemo(() => {
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, sp]);
  const shareViewFullHref = useMemo(() => {
    if (typeof window === 'undefined') return shareViewHref;
    return `${window.location.origin}${shareViewHref}`;
  }, [shareViewHref]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedOperationView[];
      if (!Array.isArray(parsed)) return;

      const sanitized = parsed
        .filter((item) => item && typeof item.href === 'string' && typeof item.label === 'string' && typeof item.id === 'string')
        .slice(0, MAX_SAVED_VIEWS);

      setSavedViews(sanitized);
    } catch {
      window.localStorage.removeItem(SAVED_VIEWS_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  function applyViewFromHref(href: string) {
    const search = href.includes('?') ? href.split('?')[1] ?? '' : '';
    const params = new URLSearchParams(search);

    setQ('');
    setKind('all');
    setFlow('all');
    setIntegrated('all');
    setOnlyWarn(false);
    setPage(1);

    initOperationsStateFromQuery(params as unknown as ReadonlyURLSearchParams, {
      setQ,
      setKind,
      setFlow,
      setIntegrated,
      setOnlyWarn,
      setPage,
    });
  }

  function saveCurrentView() {
    const trimmedLabel = savedViewLabel.trim();
    const label = trimmedLabel || `최근 뷰 ${new Date().toLocaleDateString('ko-KR')}`;
    const now = Date.now();

    setSavedViews((prev) => {
      const withoutCurrent = prev.filter((item) => item.href !== shareViewHref);
      return [{ id: `${now}`, href: shareViewHref, label, createdAt: now }, ...withoutCurrent].slice(0, MAX_SAVED_VIEWS);
    });
    setSavedViewLabel('');
  }

  async function copySavedViewLink(href: string, id: string) {
    const fullHref = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;
    await copyToClipboard(fullHref);
    setSavedViewCopiedId(id);
    setTimeout(() => setSavedViewCopiedId(null), 1200);
  }

  function deleteSavedView(id: string) {
    setSavedViews((prev) => prev.filter((item) => item.id !== id));
  }

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

  function clearPresetMode() {
    applyPreset({ kind: 'all', flow: 'all', integrated: 'all', warn: false });
  }

  function dismissOnboarding() {
    setShowOnboarding(false);
    setShowOnboardingSummary(true);
  }

  function reopenOnboarding() {
    setShowOnboarding(true);
    setShowOnboardingSummary(false);
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
    router.replace(pathname);
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
    <div className="container py-5">
      {commonErrorMessage && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:bg-destructive/15">{commonErrorMessage}</div>}
      {/* 페이지 헤더 */}
      <div className="mx-auto mb-4 max-w-7xl space-y-3">
        <section className="sticky top-3 z-10 rounded-xl border border-border/80 bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{PAGE_COPY.dailyTodoTitle}</p>
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-info/10 text-info dark:bg-info/20')}>상단 고정</Badge>
          </div>
          <div className="grid gap-2 grid-cols-1 bp-sm:grid-cols-3">
            <Card className="rounded-lg border border-warning/30 bg-warning/5 shadow-none">
              <CardHeader className="space-y-1 pb-2">
                <CardDescription className="text-xs text-muted-foreground">{PAGE_COPY.dailyTodoLabels.urgent}</CardDescription>
                <CardTitle className="text-2xl text-warning">{todayTodoCount.urgent}건</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-lg border border-info/30 bg-info/5 shadow-none">
              <CardHeader className="space-y-1 pb-2">
                <CardDescription className="text-xs text-muted-foreground">{PAGE_COPY.dailyTodoLabels.caution}</CardDescription>
                <CardTitle className="text-2xl text-info">{todayTodoCount.caution}건</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-lg border border-muted bg-muted/40 shadow-none">
              <CardHeader className="space-y-1 pb-2">
                <CardDescription className="text-xs text-muted-foreground">{PAGE_COPY.dailyTodoLabels.pending}</CardDescription>
                <CardTitle className="text-2xl text-foreground">{todayTodoCount.pending}건</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">{PAGE_COPY.title}</h1>
          <p className="text-sm text-muted-foreground">{PAGE_COPY.description}</p>

          {showOnboarding && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
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

          {showOnboardingSummary && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">{PAGE_COPY.onboarding.collapsedSummary}</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={reopenOnboarding}>
                {PAGE_COPY.onboarding.reopenLabel}
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className="mx-auto mb-4 max-w-7xl">
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
      <div
        className={cn(
          'sticky top-3 z-30 mb-4 transition-all duration-200',
          isFilterScrolled && 'drop-shadow-xl'
        )}
      >
        <Card
          className={cn(
            'rounded-xl border-border px-6 py-4 shadow-md transition-all duration-200',
            onlyWarn
              ? 'bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30'
              : 'bg-card',
            isFilterScrolled && 'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90'
          )}
        >
          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>필터 및 검색</CardTitle>
              <CardDescription className="text-xs mt-1">ID, 고객, 이메일로 검색하거나 다양한 조건으로 필터링하세요.</CardDescription>
              {activeFilterCount > 0 && (
                <Badge className={cn(badgeBase, badgeSizeSm, 'mt-2 bg-primary/10 text-primary dark:bg-primary/20')}>
                  적용된 필터 {activeFilterCount}개
                </Badge>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={reset} className="shrink-0 bg-transparent">
              필터 초기화
            </Button>
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
          <div
            className={cn(
              'grid w-full gap-2 border-t border-border pt-3 grid-cols-1 bp-sm:grid-cols-2 bp-md:grid-cols-3 bp-lg:grid-cols-6',
              onlyWarn && 'rounded-lg bg-warning/5 px-2 py-2 border-warning/20'
            )}
          >
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

            <Select
              value={warnFilter}
              onValueChange={(v: any) => {
                setWarnFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="주의 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">주의(전체)</SelectItem>
                <SelectItem value="warn">주의만</SelectItem>
                <SelectItem value="safe">정상만</SelectItem>
              </SelectContent>
            </Select>

            <Select value={warnSort} onValueChange={(v: any) => setWarnSort(v)}>
              <SelectTrigger>
                <SelectValue placeholder="주의 정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">주의 정렬(기본)</SelectItem>
                <SelectItem value="warn_first">주의 우선</SelectItem>
                <SelectItem value="safe_first">정상 우선</SelectItem>
              </SelectContent>
            </Select>

            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href={settlementsHref}>
                <BarChartBig className="h-4 w-4 mr-1.5" />
                정산 관리
              </Link>
            </Button>

          </div>

          {/* 프리셋 버튼(원클릭) */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant={presetActive.paymentMismatch ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.paymentMismatch}
              onClick={() => applyPreset(PRESET_CONFIG.paymentMismatch.params)}
              className={cn(
                'relative overflow-hidden',
                !presetActive.paymentMismatch && 'bg-transparent',
                presetActive.paymentMismatch && 'after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary-foreground',
              )}
            >
              {PRESET_CONFIG.paymentMismatch.label}
            </Button>

            <Button
              variant={presetActive.integratedReview ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.integratedReview}
              onClick={() => applyPreset(PRESET_CONFIG.integratedReview.params)}
              className={cn(
                'relative overflow-hidden',
                !presetActive.integratedReview && 'bg-transparent',
                presetActive.integratedReview && 'after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary-foreground',
              )}
            >
              {PRESET_CONFIG.integratedReview.label}
            </Button>

            <Button
              variant={presetActive.singleApplication ? 'default' : 'outline'}
              size="sm"
              aria-pressed={presetActive.singleApplication}
              onClick={() => applyPreset(PRESET_CONFIG.singleApplication.params)}
              className={cn(
                'relative overflow-hidden',
                !presetActive.singleApplication && 'bg-transparent',
                presetActive.singleApplication && 'after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-primary-foreground',
              )}
            >
              {PRESET_CONFIG.singleApplication.label}
            </Button>

            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearPresetMode}>
              전체 보기
            </Button>
          </div>

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

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Badge className={cn(badgeBase, badgeSizeSm, 'bg-info/10 text-info dark:bg-info/20')}>저장된 뷰 링크</Badge>
            <p className="text-xs text-muted-foreground">현재 필터 상태가 URL 쿼리에 반영됩니다. 링크를 복사해 팀에 공유하세요.</p>
            <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={copyShareViewLink}>
              <Link2 className="mr-1.5 h-4 w-4" />
              {shareLinkCopied ? '링크 복사됨' : '현재 뷰 링크 복사'}
            </Button>

            <div className="flex w-full flex-col gap-2 rounded-md border border-border/70 bg-muted/20 p-2 bp-md:flex-row bp-md:items-center">
              <Input
                value={savedViewLabel}
                onChange={(e) => setSavedViewLabel(e.target.value)}
                placeholder="라벨 입력 (예: 결제불일치 점검)"
                className="h-8 text-xs bp-md:max-w-[280px]"
              />
              <Button type="button" size="sm" variant="secondary" className="h-8" onClick={saveCurrentView}>
                현재 뷰 저장
              </Button>
              <p className="text-[11px] text-muted-foreground">최대 {MAX_SAVED_VIEWS}개까지 저장됩니다.</p>
            </div>

            {savedViews.length > 0 && (
              <div className="w-full space-y-1.5">
                {savedViews.map((view) => (
                  <div key={view.id} className="flex flex-col gap-1 rounded-md border border-border/70 px-2 py-1.5 bp-md:flex-row bp-md:items-center bp-md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{view.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{view.href}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="sm" variant="outline" className="h-7 bg-transparent px-2 text-xs" onClick={() => applyViewFromHref(view.href)}>
                        적용
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 bg-transparent px-2 text-xs"
                        onClick={() => copySavedViewLink(view.href, view.id)}
                      >
                        {savedViewCopiedId === view.id ? '복사됨' : '복사'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => deleteSavedView(view.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 범례(운영자 인지 부하 감소) */}
          <div className="space-y-2 border-t border-border pt-3 mt-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">범례</span>
              <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone('order')))}>문서유형</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary dark:bg-primary/20')}>통합여부</Badge>
              <Badge className={cn(badgeBase, badgeSizeSm, 'bg-warning/10 text-warning dark:bg-warning/15 border-warning/30')}><AlertTriangle className="h-3 w-3" aria-hidden="true" />경고</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                aria-expanded={showAdvancedLegend}
                onClick={() => setShowAdvancedLegend((prev) => !prev)}
              >
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
      <Card className="rounded-xl border-border bg-card shadow-md px-4 py-5">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 bp-md:flex-row bp-md:items-center bp-md:justify-between">
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">업무 목록</CardTitle>
                  {activePresetKey && (
                    <Badge className={cn(badgeBase, badgeSizeSm, 'bg-primary/10 text-primary dark:bg-primary/20')}>
                      {PRESET_CONFIG[activePresetKey].label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">총 {total.toLocaleString('ko-KR')}건</p>
                <span className="text-xs text-muted-foreground">표시 밀도</span>
                <div className="inline-flex items-center rounded-md border border-border p-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={displayDensity === 'default' ? 'secondary' : 'ghost'}
                    className="h-6 px-2 text-xs"
                    onClick={() => setDisplayDensity('default')}
                    aria-pressed={displayDensity === 'default'}
                  >
                    기본
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={displayDensity === 'compact' ? 'secondary' : 'ghost'}
                    className="h-6 px-2 text-xs"
                    onClick={() => setDisplayDensity('compact')}
                    aria-pressed={displayDensity === 'compact'}
                  >
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
                    <TableHead className={cn(thClasses, 'sticky right-0 z-20 bg-card text-right shadow-[-8px_0_12px_-12px_hsl(var(--border))]')}>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsToRender.map((g, idx) => {
                    const isGroup = g.items.length > 1;
                    const isOpen = !!openGroups[g.key];
                    const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
                    const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
                    const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
                    const linkedDocsForAnchor = isGroup ? children.map((x) => ({ kind: x.kind, id: x.id, href: x.href })) : g.anchor.related ? [g.anchor.related] : [];
                    const warn = g.warn;
                    const settleYyyymm = yyyymmKST(g.createdAt ?? g.anchor.createdAt);
                    const settleHref = settleYyyymm ? `/admin/settlements?yyyymm=${settleYyyymm}` : '/admin/settlements';

                    const rowDensityClass = displayDensity === 'compact' ? 'py-1.5' : 'py-2.5';
                    const rowBaseToneClass = idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.18]';
                    const warnEmphasisClass = warn
                      ? 'border-l-2 border-l-warning/60 bg-warning/[0.08]'
                      : 'border-l-2 border-l-transparent';
                    const stickyActionCellClass = 'sticky right-0 z-10 bg-inherit shadow-[-8px_0_12px_-12px_hsl(var(--border))]';

                    return (
                      <Fragment key={g.key}>
                        <TableRow className={cn('transition-colors hover:bg-muted/35', rowBaseToneClass, warnEmphasisClass)}>
                          <TableCell className={cn(tdClasses, rowDensityClass)}>
                            <div className="space-y-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, warn ? 'bg-warning/10 text-warning border-warning/30' : 'bg-muted text-muted-foreground')}>
                                {warn ? '주의' : '정상'}
                              </Badge>
                              <div className="text-[11px] text-muted-foreground">
                                {isGroup ? `${g.items.length}건 그룹` : '단일 건'}
                              </div>
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
                            <div className="space-y-1">
                              <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsStatusBadgeTone(g.anchor.kind, g.anchor.statusLabel)))}>{g.anchor.statusLabel}</Badge>
                              {g.anchor.paymentLabel ? (
                                <Badge className={cn(badgeBase, badgeSizeSm, paymentStatusColors[g.anchor.paymentLabel] ?? 'bg-card text-muted-foreground')}>{g.anchor.paymentLabel}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className={cn(tdClasses, rowDensityClass, 'font-semibold text-sm')}>
                            {isGroup ? (
                              <div className="space-y-1">
                                {pickOnePerKind(g.items).map((it) => (
                                  <div key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted-foreground">{opsKindLabel(it.kind)}</span>
                                    <span>{won(it.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div>{won(g.anchor.amount)}</div>
                            )}
                          </TableCell>

                          <TableCell className={cn(tdClasses, rowDensityClass, 'text-right', stickyActionCellClass)}>
                            <div className="flex justify-end gap-1.5">
                              <Button asChild size="sm" variant={isGroup ? 'default' : 'outline'} className="h-8 px-2" title="상세 보기">
                                <Link href={g.anchor.href} className="flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="text-xs">상세</span>
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-8 px-2 bg-transparent" title="정산 이동">
                                <Link href={settleHref} className="flex items-center gap-1">
                                  <BarChartBig className="h-3.5 w-3.5" />
                                  <span className="text-xs">정산</span>
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" onClick={() => copyToClipboard(g.anchor.id)} title="ID 복사">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isGroup && isOpen && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={5} className={cn(tdClasses, 'border-l-2 border-l-primary/40')}>
                              <div className="grid gap-4 bp-xl:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-xs font-medium text-foreground">연결 문서</p>
                                  {renderLinkedDocs(linkedDocsForAnchor)}
                                </div>
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
                          <p className="text-sm text-muted-foreground">{onlyWarn ? '경고(연결오류/혼재/결제불일치) 조건에 해당하는 결과가 없습니다.' : '결과가 없습니다.'}</p>
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
                return (
                  <Card key={`m:${g.key}`} className="border-border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={cn(badgeBase, badgeSizeSm, warn ? 'bg-warning/10 text-warning border-warning/30' : 'bg-muted text-muted-foreground')}>
                          {warn ? '주의' : '정상'}
                        </Badge>
                        <Badge className={cn(badgeBase, badgeSizeSm, opsBadgeToneClass(opsKindBadgeTone(g.anchor.kind)))}>{opsKindLabel(g.anchor.kind)}</Badge>
                      </div>
                      <div className="text-sm font-medium">{g.anchor.customer?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">상태: {g.anchor.statusLabel}</div>
                      <div className="text-sm font-semibold">금액: {won(g.anchor.amount)}</div>
                    </CardContent>
                  </Card>
                );
              })}

              {groupsToRender.length === 0 && (
                <div className="rounded-md border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground">
                  표시할 항목이 없습니다.
                </div>
              )}
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
