'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { mutate as globalMutate } from 'swr';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import ActivityOrderReviewCTA from './_components/ActivityOrderReviewCTA';
import OrderShippingInfoDialog from './_components/OrderShippingInfoDialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { orderStatusColors, paymentStatusColors, applicationStatusColors } from '@/lib/badge-style';
import { ShoppingBag, Wrench, Briefcase, X, Search, Filter, Clock, CheckCircle2, AlertCircle, ArrowRight, Package, TrendingUp, Activity, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  // 서버(/api/mypage/activity)에서 내려주는 “입고/운송장 필요 여부”
  // - 라켓 구매+장착(매장 라켓 기반): needsInboundTracking=false
  // - 고객 라켓 자가발송: needsInboundTracking=true
  inboundRequired?: boolean;
  needsInboundTracking?: boolean;
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
  pending: 'bg-muted text-muted-foreground border border-border',
  paid: 'bg-primary/15 text-accent border border-border',
  out: 'bg-secondary text-foreground border border-border',
  returned: 'bg-primary/15 text-accent border border-border',
  canceled: 'bg-destructive/15 text-destructive border border-border',

  대기중: 'bg-muted text-muted-foreground border border-border',
  대여중: 'bg-secondary text-foreground border border-border',
  반납완료: 'bg-primary/15 text-accent border border-border',
  취소: 'bg-destructive/15 text-destructive border border-border',
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
    return orderStatusColors[s] ?? 'bg-muted text-muted-foreground border border-border';
  }

  if (kind === 'application') {
    const s = g.application?.status ?? '';
    return (applicationStatusColors as any)[s] ?? applicationStatusColors.default;
  }

  const s = g.rental?.status ?? '';
  return rentalStatusColors[s] ?? 'bg-muted text-muted-foreground border border-border';
}

function paymentBadgeClass(g: ActivityGroup) {
  if (g.kind !== 'order') return null;
  const p = g.order?.paymentStatus ?? '';
  if (!p) return null;
  return paymentStatusColors[p] ?? 'bg-muted text-muted-foreground border border-border';
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
 *  완료/진행중 판단 (UI 필터용)
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
 *  액션 필요 판단
 * - 신청서(또는 연결 신청서)가 있고, 운송장 미등록이면 액션 필요로 표시
 */
function needsAction(g: ActivityGroup) {
  const app = g.application;
  if (!app) return false;

  // "자가발송 입고가 필요한 경우"에만 운송장 액션이 필요함
  // - needsInboundTracking === false (라켓 구매+장착 등): 운송장 액션 불필요
  // - needsInboundTracking === true: 운송장 미등록이면 액션 필요
  // - (호환) 값이 없으면 기존 로직처럼 동작(=예전 응답 대비)
  const needs = app.needsInboundTracking ?? true;
  return needs && app.hasTracking === false;
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
      className: 'bg-muted text-foreground ',
    });
  }

  // 2) 주문
  if (g.kind === 'order') {
    const cnt = Number(g.order?.itemsCount ?? 0);
    if (cnt > 0) {
      pills.push({
        text: `${cnt}개 항목`,
        className: 'bg-primary text-accent dark:bg-primary ',
      });
    }
  }

  // 3) 대여
  if (g.kind === 'rental') {
    const days = g.rental?.days;
    if (typeof days === 'number') {
      pills.push({
        text: `${days}일 대여`,
        className: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
      });
    }
  }

  // 주문/대여에 연결된 신청서가 있으면 상태/운송장을 메타칩으로 포함
  if (g.kind !== 'application' && g.application?.id) {
    const linked = g.application;
    const needs = linked.needsInboundTracking ?? true;

    // 입고(자가발송) 필요할 때만 운송장 칩을 보여줌
    if (needs) {
      pills.push({
        text: linked.hasTracking ? '운송장 등록' : '운송장 대기',
        className: linked.hasTracking ? 'bg-success/10 text-success dark:bg-success/10 ' : 'bg-muted text-primary dark:bg-muted ',
      });
    }
  }

  // 4) 신청
  if (g.kind === 'application') {
    const app = g.application;

    if (app) {
      const needs = app.needsInboundTracking ?? true;
      // 단독 신청서도 “입고 필요”일 때만 운송장 칩 표시
      if (needs) {
        pills.push({
          text: app.hasTracking ? '운송장 등록' : '운송장 대기',
          className: app.hasTracking ? 'bg-success/10 text-success dark:bg-success/10 ' : 'bg-muted text-primary dark:bg-muted ',
        });
      }
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
  return [...pills.slice(0, max - 1), { text: `+${rest}`, className: 'bg-muted text-muted-foreground ' }];
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
  //  종류 필터(주문/대여/신청)
  const [kindFilter, setKindFilter] = useState<'all' | ActivityKind>('all');
  //  검색어(상품명/라켓명/신청유형 등)
  const [q, setQ] = useState('');

  const getKey = (pageIndex: number, prev: ActivityResponse | null) => {
    // 마지막 페이지면 중단
    if (prev && (prev.items?.length ?? 0) < LIMIT) return null;

    const page = pageIndex + 1;

    // 기존 통합 API 경로 + 파라미터(page/pageSize)로 맞춤
    return `/api/mypage/activity?page=${page}&pageSize=${LIMIT}`;
  };

  const {
    data,
    size,
    setSize,
    isValidating,
    error,
    mutate: mutateActivity,
  } = useSWRInfinite<ActivityResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

  const flat = useMemo(() => (data ?? []).flatMap((d) => d.items ?? []), [data]);
  const total = data?.[0]?.total ?? 0;
  const hasMore = flat.length < total;

  // 주문 단위 UX: 배송 정보 모달 / 구매확정 / 리뷰 CTA
  const canShowOrderShippingInfo = (status?: string) => status === '배송중' || status === '배송완료' || status === '구매확정';
  const canShowOrderReviewCta = (status?: string) => status === '배송완료' || status === '구매확정';

  // 교체 서비스(스트링 교체 신청서) CTA 조건
  // - 교체확정: 교체완료 상태이고, 아직 사용자가 확정(userConfirmedAt)하지 않은 경우에만 노출
  // - 리뷰작성: 교체완료 상태에서 노출 (작성 여부는 리뷰 작성 페이지에서 최종 검증)
  const canShowStringingConfirmCta = (app?: ActivityApplicationSummary | null) => !!(app && app.status === '교체완료' && !app.userConfirmedAt);

  const canShowStringingReviewCta = (app?: ActivityApplicationSummary | null) => !!(app && app.status === '교체완료');

  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmingApplicationId, setConfirmingApplicationId] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const handleConfirmPurchase = async (orderId: string) => {
    setConfirmingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      const json = await res.json().catch(() => null as any);
      if (!res.ok) throw new Error(json?.message || '구매 확정에 실패했습니다.');

      showSuccessToast('구매 확정이 완료되었습니다.');

      // Activity 탭 갱신
      await mutateActivity();
      // 주문내역 탭 캐시도 갱신(같은 세션 UX 일관성)
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/users/me/orders'));
    } catch (e: any) {
      showErrorToast(e?.message || '구매 확정 중 오류가 발생했습니다.');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleConfirmStringing = async (applicationId: string) => {
    if (!applicationId) return;

    const ok = confirm('교체 확정 처리할까요?\n확정 시 포인트가 지급되며 되돌릴 수 없습니다.');
    if (!ok) return;

    setConfirmingApplicationId(applicationId);

    try {
      const res = await fetch(`/api/applications/stringing/${applicationId}/confirm`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '교체 확정에 실패했습니다.');
      }
      showSuccessToast('교체 확정이 완료되었습니다.');

      // Activity(전체 내역) + 신청 내역 + 포인트 탭까지 함께 최신화
      await mutateActivity();
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/applications/me'), undefined, { revalidate: true });
      await globalMutate((key) => typeof key === 'string' && key.startsWith('/api/points/me'), undefined, { revalidate: true });
    } catch (e: any) {
      showErrorToast(e?.message || '교체 확정 중 오류가 발생했습니다.');
    } finally {
      setConfirmingApplicationId(null);
    }
  };

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

  //  핀 섹션(최근 로딩된 데이터 기준)
  // - actionTop: “운송장 미등록” 같은 액션 필요
  // - activeTop: 진행 중(단, actionTop은 중복 노출 방지)
  const actionTop = useMemo(() => flat.filter(needsAction).slice(0, 3), [flat]);

  const activeTop = useMemo(() => flat.filter((g) => !isDone(g) && !needsAction(g)).slice(0, 3), [flat]);

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-background to-card dark:from-background dark:to-card p-8 bp-sm:p-12 text-center fade-in">
        <AlertCircle className="h-12 w-12 bp-sm:h-16 bp-sm:w-16 text-destructive mx-auto mb-4" />
        <p className="text-base bp-sm:text-lg font-medium text-destructive ">전체 활동을 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-sm text-destructive mt-2">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  //  카드에서 이동 링크/CTA를 일관되게 만들기 위한 헬퍼
  const linksOf = (g: ActivityGroup) => {
    const detailHref = g.kind === 'order' ? `/mypage?tab=orders&orderId=${g.order?.id}` : g.kind === 'rental' ? `/mypage?tab=rentals&rentalId=${g.rental?.id}` : `/mypage?tab=applications&applicationId=${g.application?.id}`;

    // 주문/대여 카드에 붙는 “연결 신청서”
    const linkedApp = g.kind !== 'application' ? g.application : null;

    // 운송장 등록/수정은 “신청서 id”가 기준
    const appForShipping = g.kind === 'application' ? g.application : linkedApp;

    // return 쿼리를 붙여야 저장 후 다시 Activity 탭으로 복귀할 수 있음
    // ("/mypage?tab=activity" 안에 ?가 있어서 반드시 encodeURIComponent 필요)
    const shippingHref = appForShipping ? `/services/applications/${appForShipping.id}/shipping?return=${encodeURIComponent('/mypage?tab=activity')}` : '#';
    const shippingLabel = appForShipping && appForShipping.hasTracking ? '운송장 수정' : '운송장 등록';

    const appDetailHref = linkedApp ? `/mypage?tab=applications&applicationId=${linkedApp.id}` : null;

    return { detailHref, appDetailHref, shippingHref, shippingLabel };
  };

  return (
    <div className="space-y-5 bp-sm:space-y-6 bp-lg:space-y-8 fade-in">
      <div className="grid grid-cols-2 bp-md:grid-cols-4 gap-3 bp-sm:gap-4">
        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-background to-muted   p-4 bp-sm:p-6 border border-border/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-border  p-2">
              <Activity className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-muted-foreground " />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-muted-foreground ">전체</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-foreground ">{counts.all}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-background to-card   p-4 bp-sm:p-6 border border-border/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary p-2">
              <Clock className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-accent " />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-accent ">진행중</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-accent ">{counts.active}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-background to-card dark:from-background dark:to-card p-4 bp-sm:p-6 border border-border/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-success/10 dark:bg-success/10 p-2">
              <CheckCircle2 className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-success" />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-success ">완료</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-success">{counts.done}</div>
        </div>

        <div className="rounded-xl bp-sm:rounded-2xl bg-gradient-to-br from-background to-card   p-4 bp-sm:p-6 border border-border/50 activity-card-hover">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-muted p-2">
              <AlertCircle className="h-4 w-4 bp-sm:h-5 bp-sm:w-5 text-primary " />
            </div>
            <span className="text-xs bp-sm:text-sm font-medium text-primary ">액션 필요</span>
          </div>
          <div className="text-2xl bp-sm:text-3xl font-bold text-primary ">{counts.action}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col bp-sm:flex-row gap-3 bp-sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명, 상태, 종류로 검색..." className="pl-10 h-11 bp-sm:h-12 rounded-xl border-border bg-card " />
            {q.trim() && (
              <Button size="sm" variant="ghost" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted dark:hover:bg-secondary">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bp-sm:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground " />
            <span className="text-sm font-medium text-foreground ">상태:</span>
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
          <div className="h-4 w-px bg-border dark:bg-card mx-1" />
          <span className="text-sm font-medium text-foreground ">종류:</span>
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
          <div className="h-4 w-px bg-border dark:bg-card mx-1" />
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
            <div className="min-w-0 rounded-2xl bg-gradient-to-br from-destructive/10 to-muted dark:from-background dark:via-muted dark:to-card p-5 bp-sm:p-6 border border-border/50 slide-up">
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between mb-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-muted p-2">
                    <AlertCircle className="h-5 w-5 text-primary " />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base bp-sm:text-lg font-bold text-primary truncate">해야 할 일</h3>
                    <p className="text-xs text-primary truncate">{actionTop.length}건의 액션 필요</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('all');
                    setActionOnly(true);
                  }}
                  className="w-full bp-sm:w-auto rounded-lg border-border hover:bg-muted"
                >
                  전체 보기
                </Button>
              </div>

              <div className="space-y-3">
                {actionTop.map((g) => {
                  const app = g.application;
                  const appId = app?.id;
                  const menuKey = `top:${g.key}`;
                  const showMore = Boolean(appId && (canShowStringingReviewCta(app) || canShowStringingConfirmCta(app)));

                  const title = groupTitle(g);
                  const date = groupDate(g);
                  const meta = compactPills(metaPills(g), 3);
                  const { detailHref, shippingHref, shippingLabel } = linksOf(g);
                  const canShowShipping = Boolean(app?.needsInboundTracking ?? true);

                  return (
                    <div key={`action:${g.key}`} className="rounded-xl bg-card  p-4 border border-border/50 activity-card-hover">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="rounded-lg bg-muted  p-2 mt-0.5 shrink-0">{kindIcon(g.kind)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn('text-xs rounded-md', statusBadgeClass(g))}>
                                {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                              </Badge>
                              {g.kind !== 'application' && app && (
                                <Badge variant="outline" className={cn('text-xs rounded-md font-medium', (applicationStatusColors as any)[app.status] ?? applicationStatusColors.default)}>
                                  교체 {app.status}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground ">{formatDate(date)}</span>
                            </div>
                            <h4 className="font-semibold text-foreground  text-sm bp-sm:text-base truncate">{title}</h4>
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

                      <div className="flex flex-wrap gap-2">
                        {/* 1) 운송장 등록/수정 */}
                        {canShowShipping ? (
                          <Button asChild size="sm" className="rounded-lg flex-1 min-w-[160px]">
                            <Link href={shippingHref}>
                              {shippingLabel}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}

                        {/* 2) 상세 */}
                        <Button asChild size="sm" variant="outline" className="rounded-lg bg-transparent flex-1 min-w-[120px]">
                          <Link href={detailHref}>상세</Link>
                        </Button>

                        {/* 3) 더보기(리뷰/교체확정은 여기로 묶음) */}
                        {showMore && (
                          <DropdownMenu open={openMenuKey === menuKey} onOpenChange={(open) => setOpenMenuKey(open ? menuKey : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-lg bg-transparent px-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>더보기</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {appId && canShowStringingReviewCta(app) && (
                                <DropdownMenuItem asChild>
                                  + <Link href={`/reviews/write?service=stringing&applicationId=${appId}`}>리뷰 작성</Link>
                                </DropdownMenuItem>
                              )}

                              {appId && canShowStringingConfirmCta(app) && (
                                <DropdownMenuItem
                                  disabled={confirmingApplicationId === appId}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleConfirmStringing(appId);
                                  }}
                                >
                                  {confirmingApplicationId === appId ? '처리 중...' : '교체확정'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTop.length > 0 && (
            <div className="min-w-0 rounded-2xl bg-gradient-to-br from-secondary to-muted dark:from-background dark:via-muted dark:to-card p-5 bp-sm:p-6 border border-border/50 slide-up">
              <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between mb-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-primary p-2">
                    <TrendingUp className="h-5 w-5 text-accent " />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base bp-sm:text-lg font-bold text-accent truncate">진행중</h3>
                    <p className="text-xs text-accent truncate">{activeTop.length}건의 활동</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('active');
                    setActionOnly(false);
                  }}
                  className="w-full bp-sm:w-auto rounded-lg border-border hover:bg-secondary"
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
                  const app = g.application;

                  return (
                    <div key={`active:${g.key}`} className="rounded-xl bg-card  p-4 border border-border/50 activity-card-hover">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="rounded-lg bg-muted  p-2 mt-0.5 shrink-0">{kindIcon(g.kind)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn('text-xs rounded-md', statusBadgeClass(g))}>
                              {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                            </Badge>
                            {g.kind !== 'application' && app && (
                              <Badge variant="outline" className={cn('text-xs rounded-md font-medium', (applicationStatusColors as any)[app.status] ?? applicationStatusColors.default)}>
                                교체 {app.status}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ">{formatDate(date)}</span>
                          </div>
                          <h4 className="font-semibold text-foreground  text-sm bp-sm:text-base truncate">{title}</h4>
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

                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="rounded-lg flex-1 bg-transparent min-w-[160px]">
                          <Link href={detailHref}>
                            상세 보기
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>

                        {/* 배송중/배송완료/구매확정 상태에서 배송 정보 모달 제공 */}
                        {g.kind === 'order' && g.order && g.order.id && canShowOrderShippingInfo(g.order.status) ? <OrderShippingInfoDialog orderId={g.order.id} className="rounded-lg flex-1 min-w-[160px] bg-transparent" /> : null}
                      </div>
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
          <div className="rounded-2xl bg-muted  p-12 bp-sm:p-16 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg bp-sm:text-xl font-semibold text-foreground  mb-2">표시할 활동이 없습니다</h3>
            <p className="text-sm text-muted-foreground ">필터를 조정하거나 검색어를 변경해보세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDay.keys.map((dayKey, dayIndex) => {
              const dayItems = groupedByDay.map.get(dayKey) ?? [];

              return (
                <div key={dayKey} className="space-y-4 slide-up" style={{ animationDelay: `${dayIndex * 50}ms` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted  to-transparent" />
                    <div className="rounded-full bg-muted px-4 py-2 border border-border ">
                      <span className="text-sm font-semibold text-foreground ">{formatDayHeader(dayKey)}</span>
                      <span className="text-xs text-muted-foreground ml-2">{dayItems.length}건</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted  to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 bp-sm:gap-4 min-w-0">
                    {dayItems.map((g, itemIndex) => {
                      const title = groupTitle(g);
                      const date = groupDate(g);
                      const meta = compactPills(metaPills(g), 3);
                      const { detailHref, appDetailHref, shippingHref, shippingLabel } = linksOf(g);
                      const hasAction = needsAction(g);

                      const app = g.application;
                      const appId = app?.id;
                      const canShowShipping = Boolean(appId && (app?.needsInboundTracking ?? true));
                      const canShowShippingEdit = Boolean(canShowShipping && app?.hasTracking);
                      const menuKey = `row:${g.key}`;
                      const showMore = Boolean(
                        canShowShippingEdit || // 운송장 수정(이미 등록된 경우)만 보조로 내리기
                        (appDetailHref && g.kind !== 'application') ||
                        (g.kind === 'order' && g.order?.id && g.order.status === '배송완료') ||
                        (appId && canShowStringingReviewCta(app)) ||
                        (appId && canShowStringingConfirmCta(app)),
                      );

                      return (
                        <div key={g.key} className="min-w-0 rounded-xl bp-sm:rounded-2xl bg-card  border border-border p-4 bp-sm:p-6 activity-card-hover" style={{ animationDelay: `${dayIndex * 50 + itemIndex * 30}ms` }}>
                          <div className="flex flex-col bp-sm:flex-row bp-sm:items-start gap-4">
                            <div className={cn('hidden bp-sm:flex', 'rounded-xl bg-gradient-to-br from-background to-muted dark:from-background dark:to-muted p-3 bp-sm:p-4 shrink-0', 'w-fit self-start')}>{kindIcon(g.kind)}</div>

                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex flex-col bp-sm:flex-row bp-sm:items-start bp-sm:justify-between gap-2 bp-sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="inline-flex bp-sm:hidden rounded-lg bg-muted  p-2 shrink-0">{kindIcon(g.kind)}</span>

                                    <Badge variant="outline" className={cn('text-xs rounded-md font-medium', statusBadgeClass(g))}>
                                      {g.kind === 'order' ? g.order?.status : g.kind === 'rental' ? g.rental?.status : g.application?.status}
                                    </Badge>
                                    {g.kind !== 'application' && app && (
                                      <Badge variant="outline" className={cn('text-xs rounded-md font-medium', (applicationStatusColors as any)[app.status] ?? applicationStatusColors.default)}>
                                        교체 {app.status}
                                      </Badge>
                                    )}

                                    <span className="text-xs text-muted-foreground ">{formatDate(date)}</span>

                                    {hasAction && (
                                      <Badge variant="outline" className="text-xs rounded-md bg-muted text-primary border-border  ">
                                        액션 필요
                                      </Badge>
                                    )}
                                  </div>

                                  <h3 className="text-base bp-sm:text-lg font-bold text-foreground  mb-1 truncate">{title}</h3>
                                  <p className="text-sm text-muted-foreground ">{kindLabel(g.kind)}</p>
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
                                {/*배송 정보 모달: 배송중/배송완료/구매확정에서 노출 */}
                                {g.kind === 'order' && g.order && g.order.id && canShowOrderShippingInfo(g.order.status) ? <OrderShippingInfoDialog orderId={g.order.id} className="rounded-lg bg-transparent" /> : null}

                                {/* 리뷰 작성하기: 배송완료/구매확정에서 노출 */}
                                {g.kind === 'order' && g.order && g.order.id && canShowOrderReviewCta(g.order.status) ? <ActivityOrderReviewCTA orderId={g.order.id} orderStatus={g.order.status} className="rounded-lg" /> : null}

                                {/* 운송장: 액션 필요(미등록)일 때만 ‘강조’(primary)로 노출 */}
                                {canShowShipping && hasAction ? (
                                  <Button asChild size="sm" className="rounded-lg">
                                    <Link href={shippingHref}>{shippingLabel}</Link>
                                  </Button>
                                ) : null}

                                {/* 더보기: 운송장 수정(보조), 구매확정, 교체확정, 리뷰 작성, 신청서 보기 */}
                                {showMore && (
                                  <DropdownMenu open={openMenuKey === menuKey} onOpenChange={(open) => setOpenMenuKey(open ? menuKey : null)}>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="rounded-lg bg-transparent px-2">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuLabel>더보기</DropdownMenuLabel>
                                      <DropdownMenuSeparator />

                                      {/* 운송장 수정: 이미 등록된 경우 보조 액션으로 내림 */}
                                      {canShowShippingEdit ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={shippingHref}>{shippingLabel}</Link>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {/* 주문/대여 카드에서 연결 신청서로 바로 이동 */}
                                      {appDetailHref && g.kind !== 'application' ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={appDetailHref}>교체 신청서 보기</Link>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {/* 구매확정: 배송완료에서만(보조 액션으로 내림) */}
                                      {g.kind === 'order' && g.order?.id && g.order.status === '배송완료' ? (
                                        <DropdownMenuItem
                                          disabled={confirmingOrderId === g.order.id}
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            handleConfirmPurchase(g.order!.id);
                                          }}
                                        >
                                          {confirmingOrderId === g.order.id ? '처리 중...' : '구매확정'}
                                        </DropdownMenuItem>
                                      ) : null}

                                      {/* 교체 서비스 리뷰 */}
                                      {appId && canShowStringingReviewCta(app) ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/reviews/write?service=stringing&applicationId=${appId}`}>교체 리뷰 작성</Link>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {/* 교체확정 */}
                                      {appId && canShowStringingConfirmCta(app) ? (
                                        <DropdownMenuItem
                                          disabled={confirmingApplicationId === appId}
                                          onSelect={(e) => {
                                            e.preventDefault();
                                            handleConfirmStringing(appId);
                                          }}
                                        >
                                          {confirmingApplicationId === appId ? '처리 중...' : '교체확정'}
                                        </DropdownMenuItem>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                <div className="h-4 w-4 border-2 border-border/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
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
          <p className="text-sm text-muted-foreground ">
            전체 {total}건 중 {flat.length}건 로딩됨
          </p>
        </div>
      )}
    </div>
  );
}
