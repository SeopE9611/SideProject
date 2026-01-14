'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { orderStatusColors, paymentStatusColors, applicationStatusColors } from '@/lib/badge-style';
import { ShoppingBag, Wrench, Briefcase, X, Search, Filter, Clock, CheckCircle2, AlertCircle, ArrowRight, Package, TrendingUp, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';

type ActivityKind = 'order' | 'rental' | 'application';

type ActivityOrderSummary = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  firstItemName: string;
  itemsCount: number;
  withStringService: boolean;
  stringingApplicationId: string | null;
};

type ActivityRentalSummary = {
  id: string;
  createdAt: string;
  status: string;
  brand?: string;
  model?: string;
  days?: number;
  totalAmount?: number;
  deposit?: number;
  fee?: number;
  withStringService: boolean;
  stringingApplicationId: string | null;
};

type ActivityApplicationSummary = {
  id: string;
  createdAt: string;
  status: string;
  racketType: string;
  orderId: string | null;
  rentalId: string | null;
  hasTracking: boolean;
  userConfirmedAt: string | null;
};

type ActivityGroup = {
  key: string;
  kind: ActivityKind;
  sortAt: string; // 서버에서 정렬 기준 시간
  order?: ActivityOrderSummary;
  rental?: ActivityRentalSummary;
  application?: ActivityApplicationSummary; // (연결 신청서 or 단독 신청서 자체)
};

type ActivityResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ActivityGroup[];
};

const LIMIT = 5;

const fetcher = async (url: string): Promise<ActivityResponse> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

const formatDayHeader = (dayKey: string) => dayKey.replace(/-/g, '.');

// 대여 상태는 프로젝트마다 다를 수 있어서 “넓게” 커버(한글/영문 혼합 대응)
const rentalStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  paid: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  out: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  returned: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  canceled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',

  대기중: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  대여중: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  반납완료: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  취소: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

function kindLabel(kind: ActivityKind) {
  if (kind === 'order') return '주문';
  if (kind === 'application') return '신청';
  return '대여';
}

function kindIcon(kind: ActivityKind) {
  if (kind === 'order') return <ShoppingBag className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />;
  if (kind === 'application') return <Wrench className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />;
  return <Briefcase className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />;
}

function statusBadgeClass(g: ActivityGroup) {
  const kind = g.kind;

  if (kind === 'order') {
    const s = g.order?.status ?? '';
    return orderStatusColors[s] ?? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';
  }

  if (kind === 'application') {
    const s = g.application?.status ?? '';
    return (applicationStatusColors as any)[s] ?? applicationStatusColors.default;
  }

  const s = g.rental?.status ?? '';
  return rentalStatusColors[s] ?? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';
}

function paymentBadgeClass(g: ActivityGroup) {
  if (g.kind !== 'order') return null;
  const p = g.order?.paymentStatus ?? '';
  if (!p) return null;
  return paymentStatusColors[p] ?? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';
}

function groupTitle(g: ActivityGroup) {
  if (g.kind === 'order') {
    const name = g.order?.firstItemName ?? '-';
    const cnt = Number(g.order?.itemsCount ?? 0);
    return cnt > 1 ? `${name} 외 ${cnt - 1}건` : name;
  }

  if (g.kind === 'rental') {
    const t = `${g.rental?.brand ?? ''} ${g.rental?.model ?? ''}`.trim();
    return t || '라켓 대여';
  }

  // application
  return `스트링 교체 신청 (${g.application?.racketType ?? '-'})`;
}

function groupDate(g: ActivityGroup) {
  // 서버 sortAt을 우선(가장 자연스러운 타임라인)
  return g.sortAt || g.order?.createdAt || g.rental?.createdAt || g.application?.createdAt || new Date(0).toISOString();
}

function groupAmount(g: ActivityGroup) {
  if (g.kind === 'order') return typeof g.order?.totalPrice === 'number' ? g.order?.totalPrice : null;
  if (g.kind === 'rental') return typeof g.rental?.totalAmount === 'number' ? g.rental?.totalAmount : null;
  return null;
}

/**
 *   완료/진행중 판단 (UI 필터용)
 * - 정확한 비즈니스 로직이 아니라 “사용자 체감” 기준으로 넓게 잡음
 */
function isDone(g: ActivityGroup) {
  if (g.kind === 'order') {
    const s = g.order?.status ?? '';
    return /구매확정|배송완료|취소|환불/.test(s);
  }
  if (g.kind === 'application') {
    const s = g.application?.status ?? '';
    return /교체완료|취소/.test(s);
  }
  const s = g.rental?.status ?? '';
  return /returned|canceled|반납완료|취소/.test(s);
}

/**
 *   액션 필요 판단
 * - 신청서(또는 연결 신청서)가 있고, 운송장 미등록이면 액션 필요로 표시
 */
function needsAction(g: ActivityGroup) {
  const app = g.application;
  if (!app) return false;
  return app.hasTracking === false;
}

// 카드 “정보 밀도”를 올리기 위한 메타 칩 데이터
type MetaPill = {
  text: string;
  className?: string;
};

function metaPills(g: ActivityGroup): MetaPill[] {
  const pills: MetaPill[] = [];

  // 1) 공통: 금액 (주문/대여만 존재)
  const amount = groupAmount(g);
  if (typeof amount === 'number') {
    pills.push({
      text: `${amount.toLocaleString()}원`,
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    });
  }

  // 2) 주문
  if (g.kind === 'order') {
    const cnt = Number(g.order?.itemsCount ?? 0);
    if (cnt > 0) {
      pills.push({
        text: `${cnt}개 항목`,
        className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      });
    }
  }

  // 3) 대여
  if (g.kind === 'rental') {
    const days = g.rental?.days;
    if (typeof days === 'number') {
      pills.push({
        text: `${days}일 대여`,
        className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      });
    }
  }

  // 주문/대여에 연결된 신청서가 있으면 상태/운송장을 메타칩으로 포함
  if (g.kind !== 'application' && g.application?.id) {
    const linked = g.application;

    pills.push({
      text: linked.hasTracking ? '운송장 등록' : '운송장 대기',
      className: linked.hasTracking ? 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    });
  }

  // 4) 신청
  if (g.kind === 'application') {
    const app = g.application;

    if (app) {
      pills.push({
        text: app.hasTracking ? '운송장 등록' : '운송장 대기',
        className: app.hasTracking ? 'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      });
    }
  }

  return pills;
}

// value가 연속으로 바뀔 때 마지막 값만 delay 후 반영하는 디바운스 훅
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

// metaPills 너무 많아지는 문제: “최대 3개 + +n개”로 컷
function compactPills(pills: MetaPill[], max = 3): MetaPill[] {
  if (pills.length <= max) return pills;
  const rest = pills.length - (max - 1);
  return [...pills.slice(0, max - 1), { text: `+${rest}`, className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }];
}

export default function ActivityFeed() {
  const sp = useSearchParams();

  useEffect(() => {
    // 최초 1회 URL 값을 state에 주입
    const f = sp.get('status');
    const k = sp.get('kind');
    const a = sp.get('action');
    const query = sp.get('q');

    if (f === 'all' || f === 'active' || f === 'done') setFilter(f);
    if (k === 'order' || k === 'rental' || k === 'application') setKindFilter(k);
    if (a === '1') setActionOnly(true);
    if (query) setQ(query);
  }, []);

  // 필터(전체/진행중/완료) + 액션 필요만 보기
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [actionOnly, setActionOnly] = useState(false);
  //   종류 필터(주문/대여/신청)
  const [kindFilter, setKindFilter] = useState<'all' | ActivityKind>('all');
  //   검색어(상품명/라켓명/신청유형 등)
  const [q, setQ] = useState('');

  const getKey = (pageIndex: number, prev: ActivityResponse | null) => {
    // 마지막 페이지면 중단
    if (prev && (prev.items?.length ?? 0) < LIMIT) return null;

    const page = pageIndex + 1;

    // 기존 통합 API 경로 + 파라미터(page/pageSize)로 맞춤
    return `/api/mypage/activity?page=${page}&pageSize=${LIMIT}`;
  };

  const { data, size, setSize, isValidating, error } = useSWRInfinite<ActivityResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

  const flat = useMemo(() => (data ?? []).flatMap((d) => d.items ?? []), [data]);
  const total = data?.[0]?.total ?? 0;
  const hasMore = flat.length < total;

  // 상단 요약 (※ 현재 불러온 항목 기준)
  const counts = useMemo(() => {
    const done = flat.filter(isDone).length;
    const active = flat.length - done;
    const action = flat.filter(needsAction).length;
    return { all: flat.length, active, done, action };
  }, [flat]);

  const visible = useMemo(() => {
    let list = [...flat];

    if (kindFilter !== 'all') list = list.filter((g) => g.kind === kindFilter);

    if (filter === 'active') list = list.filter((g) => !isDone(g));
    if (filter === 'done') list = list.filter(isDone);

    if (actionOnly) list = list.filter(needsAction);

    // 검색(대소문자 무시, 공백 제거한 느슨한 포함 검색)
    const keyword = q.trim().toLowerCase();
    if (keyword) {
      list = list.filter((g) => {
        const title = groupTitle(g).toLowerCase();
        const kind = kindLabel(g.kind).toLowerCase();

        // 연결 신청서가 있는 경우: 신청 상태/운송장 여부도 검색 힌트로 포함
        const linkedApp = g.kind !== 'application' ? g.application : null;
        const appStatus = (linkedApp?.status ?? g.application?.status ?? '').toLowerCase();

        const extra = (g.kind === 'order' ? `${g.order?.paymentStatus ?? ''} ${g.order?.status ?? ''}` : '') + (g.kind === 'rental' ? `${g.rental?.status ?? ''}` : '') + (g.kind === 'application' ? `${g.application?.racketType ?? ''}` : '');

        const haystack = `${title} ${kind} ${appStatus} ${extra}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }

    return list;
  }, [flat, filter, actionOnly, kindFilter, q]);

  const debouncedQ = useDebouncedValue(q, 400); // 300~500ms

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    params.set('tab', 'activity');
    params.set('status', filter);
    params.set('kind', kindFilter);
    params.set('action', actionOnly ? '1' : '0');

    const query = debouncedQ.trim();
    if (query) params.set('q', query);
    else params.delete('q');

    const next = params.toString();
    const current = window.location.search.replace(/^\?/, '');

    if (next !== current) {
      window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
    }
  }, [filter, kindFilter, actionOnly, debouncedQ]);

  // 날짜(YYYY-MM-DD) 기준으로 그룹핑해서 “헤더 + 리스트”로 렌더하기 위한 준비
  const groupedByDay = useMemo(() => {
    const map = new Map<string, ActivityGroup[]>();

    for (const g of visible) {
      const iso = groupDate(g); // 서버 sortAt 우선으로 잡혀있는 날짜
      const dayKey = iso.slice(0, 10); // YYYY-MM-DD
      const arr = map.get(dayKey) ?? [];
      arr.push(g);
      map.set(dayKey, arr);
    }

    // 같은 날짜 안에서도 최신이 위로 오도록 정렬(안전장치)
    for (const [, arr] of map) {
      arr.sort((a, b) => groupDate(b).localeCompare(groupDate(a)));
    }

    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a)); // 날짜 최신순
    return { map, keys };
  }, [visible]);

  //   핀 섹션(최근 로딩된 데이터 기준)
  // - actionTop: “운송장 미등록” 같은 액션 필요
  // - activeTop: 진행 중(단, actionTop은 중복 노출 방지)
  const actionTop = useMemo(() => flat.filter(needsAction).slice(0, 3), [flat]);

  const activeTop = useMemo(() => flat.filter((g) => !isDone(g) && !needsAction(g)).slice(0, 3), [flat]);

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 p-8 bp-sm:p-12 text-center fade-in">
        <AlertCircle className="h-12 w-12 bp-sm:h-16 bp-sm:w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
        <p className="text-base bp-sm:text-lg font-medium text-red-600 dark:text-red-400">전체 활동을 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-sm text-red-500 dark:text-red-500 mt-2">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  //   카드에서 이동 링크/CTA를 일관되게 만들기 위한 헬퍼
  const linksOf = (g: ActivityGroup) => {
    const detailHref = g.kind === 'order' ? `/mypage?tab=orders&orderId=${g.order?.id}` : g.kind === 'rental' ? `/mypage?tab=rentals&rentalId=${g.rental?.id}` : `/mypage?tab=applications&applicationId=${g.application?.id}`;

    // 주문/대여 카드에 붙는 “연결 신청서”
    const linkedApp = g.kind !== 'application' ? g.application : null;

    // 운송장 등록/수정은 “신청서 id”가 기준
    const appForShipping = g.kind === 'application' ? g.application : linkedApp;

    const shippingHref = appForShipping ? `/services/applications/${appForShipping.id}/shipping` : '#';
    const shippingLabel = appForShipping && appForShipping.hasTracking ? '운송장 수정' : '운송장 등록';

    const appDetailHref = linkedApp ? `/mypage?tab=applications&applicationId=${linkedApp.id}` : null;

    return { detailHref, appDetailHref, shippingHref, shippingLabel };
  };

  return (
    <div className="space-y-5 bp-sm:space-y-6 bp-lg:space-y-8 fade-in">
      <div className="grid grid-cols-2 bp-md:grid-cols-4 gap-3 bp-sm:gap-4">
        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 p-4 bp-sm:p-6 border border-slate-200/50 dark:border-slate-700/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-slate-200 dark:bg-slate-700 p-2">
              <Activity className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-slate-600 dark:text-slate-400">전체</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{counts.all}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-4 bp-sm:p-6 border border-blue-200/50 dark:border-blue-800/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-blue-200 dark:bg-blue-800 p-2">
              <Clock className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-blue-600 dark:text-blue-400">진행중</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{counts.active}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 p-4 bp-sm:p-6 border border-green-200/50 dark:border-green-800/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-green-200 dark:bg-green-800 p-2">
              <CheckCircle2 className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-green-600 dark:text-green-300" />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-green-600 dark:text-green-400">완료</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-green-900 dark:text-green-100">{counts.done}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/30 p-4 bp-sm:p-6 border border-amber-200/50 dark:border-amber-800/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-amber-200 dark:bg-amber-800 p-2">
              <AlertCircle className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-amber-600 dark:text-amber-400">액션 필요</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-amber-900 dark:text-amber-100">{counts.action}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col bp-sm:flex-row gap-3 bp-sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명, 상태, 종류로 검색..." className="pl-10 h-11 bp-sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50" />
            {q.trim() && (
              <Button size="sm" variant="ghost" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bp-sm:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">상태:</span>
          </div>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="rounded-lg h-9">
            전체
          </Button>
          <Button size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')} className="rounded-lg h-9">
            진행중
          </Button>
          <Button size="sm" variant={filter === 'done' ? 'default' : 'outline'} onClick={() => setFilter('done')} className="rounded-lg h-9">
            완료
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">종류:</span>
          <Button size="sm" variant={kindFilter === 'all' ? 'default' : 'outline'} onClick={() => setKindFilter('all')} className="rounded-lg h-9">
            전체
          </Button>
          <Button size="sm" variant={kindFilter === 'order' ? 'default' : 'outline'} onClick={() => setKindFilter('order')} className="rounded-lg h-9">
            주문
          </Button>
          <Button size="sm" variant={kindFilter === 'application' ? 'default' : 'outline'} onClick={() => setKindFilter('application')} className="rounded-lg h-9">
            신청
          </Button>
          <Button size="sm" variant={kindFilter === 'rental' ? 'default' : 'outline'} onClick={() => setKindFilter('rental')} className="rounded-lg h-9">
            대여
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
          <Button size="sm" variant={actionOnly ? 'default' : 'outline'} onClick={() => setActionOnly((v) => !v)} className="rounded-lg h-9">
            액션 필요만
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilter('all');
              setActionOnly(false);
              setKindFilter('all');
              setQ('');
            }}
            className="rounded-lg h-9 ml-auto"
          >
            초기화
          </Button>
        </div>
      </div>

      {(actionTop.length > 0 || activeTop.length > 0) && (
        <div className="grid grid-cols-1 gap-4 bp-lg:grid-cols-2 min-w-0">
          {actionTop.length > 0 && (
            <div className="min-w-0 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-amber-950/20 p-5 bp-sm:p-6 border border-amber-200/50 dark:border-amber-800/30 slide-up">
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between mb-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-amber-200 dark:bg-amber-800 p-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base bp-sm:text-lg font-bold text-amber-900 dark:text-amber-100 truncate">해야 할 일</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{actionTop.length}건의 액션 필요</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('all');
                    setActionOnly(true);
                  }}
                  className="w-full bp-sm:w-auto rounded-lg border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  전체 보기
                </Button>
              </div>

              <div className="space-y-3">
                {actionTop.map((g) => {
                  const title = groupTitle(g);
                  const date = groupDate(g);
                  const meta = compactPills(metaPills(g), 3);
                  const { detailHref, shippingHref, shippingLabel } = linksOf(g);

                  return (
                    <div key={`action:${g.key}`} className="rounded-xl bg-white dark:bg-slate-800/50 p-4 border border-amber-200/50 dark:border-amber-800/30 activity-card-hover">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2 mt-0.5 shrink-0">{kindIcon(g.kind)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn('text-xs rounded-md', statusBadgeClass(g))}>
                                {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(date)}</span>
                            </div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm bp-sm:text-base truncate">{title}</h4>
                          </div>
                        </div>
                      </div>

                      {meta.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {meta.map((m, i) => (
                            <span key={i} className={cn('text-xs px-2 py-1 rounded-md font-medium', m.className)}>
                              {m.text}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button asChild size="sm" className="rounded-lg flex-1">
                          <Link href={shippingHref}>
                            {shippingLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="rounded-lg bg-transparent">
                          <Link href={detailHref}>상세</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTop.length > 0 && (
            <div className="min-w-0 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 p-5 bp-sm:p-6 border border-blue-200/50 dark:border-blue-800/30 slide-up">
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between mb-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-blue-200 dark:bg-blue-800 p-2">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base bp-sm:text-lg font-bold text-blue-900 dark:text-blue-100 truncate">진행중</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{activeTop.length}건의 활동</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('active');
                    setActionOnly(false);
                  }}
                  className="w-full bp-sm:w-auto rounded-lg border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  전체 보기
                </Button>
              </div>

              <div className="space-y-3">
                {activeTop.map((g) => {
                  const title = groupTitle(g);
                  const date = groupDate(g);
                  const meta = compactPills(metaPills(g), 3);
                  const { detailHref } = linksOf(g);

                  return (
                    <div key={`active:${g.key}`} className="rounded-xl bg-white dark:bg-slate-800/50 p-4 border border-blue-200/50 dark:border-blue-800/30 activity-card-hover">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2 mt-0.5 shrink-0">{kindIcon(g.kind)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn('text-xs rounded-md', statusBadgeClass(g))}>
                              {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                            </Badge>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(date)}</span>
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm bp-sm:text-base truncate">{title}</h4>
                        </div>
                      </div>

                      {meta.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {meta.map((m, i) => (
                            <span key={i} className={cn('text-xs px-2 py-1 rounded-md font-medium', m.className)}>
                              {m.text}
                            </span>
                          ))}
                        </div>
                      )}

                      <Button asChild size="sm" variant="outline" className="rounded-lg w-full bg-transparent">
                        <Link href={detailHref}>
                          상세 보기
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/30 p-12 bp-sm:p-16 text-center">
            <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg bp-sm:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">표시할 활동이 없습니다</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">필터를 조정하거나 검색어를 변경해보세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDay.keys.map((dayKey, dayIndex) => {
              const dayItems = groupedByDay.map.get(dayKey) ?? [];

              return (
                <div key={dayKey} className="space-y-4 slide-up" style={{ animationDelay: `${dayIndex * 50}ms` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                    <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 border border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDayHeader(dayKey)}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{dayItems.length}건</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 bp-sm:gap-4 min-w-0">
                    {dayItems.map((g, itemIndex) => {
                      const title = groupTitle(g);
                      const date = groupDate(g);
                      const meta = compactPills(metaPills(g), 3);
                      const { detailHref, shippingHref, shippingLabel } = linksOf(g);
                      const hasAction = needsAction(g);

                      return (
                        <div
                          key={g.key}
                          className="min-w-0 rounded-xl bp-sm:rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 bp-sm:p-6 activity-card-hover"
                          style={{ animationDelay: `${dayIndex * 50 + itemIndex * 30}ms` }}
                        >
                          <div className="flex flex-col bp-sm:flex-row bp-sm:items-start gap-4">
                            <div
                              className={cn(
                                'hidden bp-sm:flex', // ✅ 모바일 숨김, bp-sm 이상 표시
                                'rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-3 bp-sm:p-4 shrink-0',
                                'w-fit self-start'
                              )}
                            >
                              {kindIcon(g.kind)}
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex flex-col bp-sm:flex-row bp-sm:items-start bp-sm:justify-between gap-2 bp-sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="inline-flex bp-sm:hidden rounded-lg bg-slate-100 dark:bg-slate-700 p-2 shrink-0">{kindIcon(g.kind)}</span>

                                    <Badge variant="outline" className={cn('text-xs rounded-md font-medium', statusBadgeClass(g))}>
                                      {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                                    </Badge>

                                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(date)}</span>

                                    {hasAction && (
                                      <Badge variant="outline" className="text-xs rounded-md bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                        액션 필요
                                      </Badge>
                                    )}
                                  </div>

                                  <h3 className="text-base bp-sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 truncate">{title}</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{kindLabel(g.kind)}</p>
                                </div>

                                {g.kind === 'order' && g.order?.paymentStatus && (
                                  <Badge variant="outline" className={cn('text-xs rounded-md font-medium shrink-0', paymentBadgeClass(g))}>
                                    {g.order.paymentStatus}
                                  </Badge>
                                )}
                              </div>

                              {meta.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {meta.map((m, i) => (
                                    <span key={i} className={cn('text-xs px-3 py-1.5 rounded-lg font-medium border', m.className)}>
                                      {m.text}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 pt-2">
                                <Button asChild size="sm" className="rounded-lg">
                                  <Link href={detailHref}>
                                    상세 보기
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
                                </Button>
                                {g.application?.id && (
                                  <Button asChild size="sm" variant="outline" className="rounded-lg bg-transparent">
                                    <Link href={shippingHref}>{shippingLabel}</Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={() => setSize(size + 1)} disabled={isValidating} size="lg" className="rounded-xl px-8 bp-sm:px-12">
            {isValidating ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                불러오는 중...
              </>
            ) : (
              <>
                더 보기
                <TrendingUp className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {total > 0 && flat.length > 0 && (
        <div className="text-center pt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            전체 {total}건 중 {flat.length}건 로딩됨
          </p>
        </div>
      )}
    </div>
  );
}
