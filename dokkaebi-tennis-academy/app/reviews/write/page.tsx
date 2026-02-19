'use client';

import type React from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import { Label } from '@/components/ui/label';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import NextImage from 'next/image';
import PhotosReorderGrid from '@/components/reviews/PhotosReorderGrid';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import LoginGate from '@/components/system/LoginGate';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { FullPageSpinner } from '@/components/system/PageLoading';

/* ---- 별점 ---- */
function Stars({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={`flex justify-center gap-1 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}점`}
          className={`text-3xl transition-all duration-200 ${value >= n ? 'text-yellow-400 scale-110' : 'text-foreground dark:text-foreground'} hover:scale-125 hover:text-yellow-300`}
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type OrderReviewItem = {
  productId: string;
  name: string;
  image: string | null;
  reviewed: boolean;
};

type EligState = 'loading' | 'ok' | 'notPurchased' | 'already' | 'unauthorized' | 'invalid' | 'error';
type AppLite = {
  _id: string;
  label: string;
  status?: string;
  racketType?: string | null;
  stringItems?: { id: string; name: string }[];
  preferredDate?: string | null;
  preferredTime?: string | null;
  desiredDateTime?: string | null;
  createdAt?: string | null;
  requirements?: string | null;
};

// 예약일자 포멧
function formatKoDate(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

function formatKoTime(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

function formatYMD(dateStr?: string | null) {
  if (!dateStr) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr; // 예외: 그대로 표시
  const [, y, mo, d] = m;
  return `${y}. ${mo}. ${d}.`;
}

function formatHM(timeStr?: string | null) {
  if (!timeStr) return '';
  return timeStr;
}

// 신청일자 포멧
function formatKoDateTime(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

// 서비스 신청서에서 "라켓" 표시용 문자열을 안전하게 뽑아오기
// - 우선순위: stringDetails.racketType(단일) -> racketType(루트) -> stringDetails.racketLines[0].racketLabel/racketType
function getRacketSummary(a: any) {
  const direct = (a?.stringDetails?.racketType ?? a?.racketType ?? '').toString().trim();
  if (direct) return direct;

  const lines = Array.isArray(a?.stringDetails?.racketLines) ? a.stringDetails.racketLines : [];
  if (!lines.length) return '';

  const first = (lines[0]?.racketLabel ?? lines[0]?.racketType ?? '').toString().trim();
  if (first) return lines.length > 1 ? `${first} 외 ${lines.length - 1}자루` : first;

  return `라켓 ${lines.length}자루`;
}

function buildAppLabel(a: any) {
  const when = a?.stringDetails?.preferredDate ? `${formatYMD(a.stringDetails.preferredDate)} ${a.stringDetails.preferredTime ?? ''}`.trim() : a?.desiredDateTime ? formatKoDateTime(a.desiredDateTime) : '';

  const racket = getRacketSummary(a);

  const names = (a?.stringDetails?.stringItems || a?.stringItems || []).map((s: any) => s?.name).filter(Boolean) as string[];
  const strings = names.length > 2 ? `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}` : names.join(', ');

  return [when, racket, strings].filter(Boolean).join(' • ');
}

export default function ReviewWritePage() {
  const sp = useSearchParams();
  const router = useRouter();

  // 비회원 주문/신청 차단 정책(클라)
  // - NEXT_PUBLIC_GUEST_ORDER_MODE: 'off' | 'legacy' | 'on'
  // - 'on' 일 때만 비회원 허용
  const rawGuestMode = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const guestOrderMode = rawGuestMode === 'off' || rawGuestMode === 'legacy' || rawGuestMode === 'on' ? rawGuestMode : 'legacy';
  const allowGuestCheckout = guestOrderMode === 'on';

  // 로그인 여부(비회원 차단 모드에서만 의미 있음)
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const nextUrl = useMemo(() => {
    const qs = sp.toString();
    return qs ? `/reviews/write?${qs}` : '/reviews/write';
  }, [sp]);

  const blockedByLoginGate = !allowGuestCheckout && authChecked && !isAuthenticated;

  // 로그인 상태 체크 (비회원 차단 모드에서만 필요)
  // - 체크가 끝나기 전에는 아래 useEffect들이(eligibility/신청서 목록/주문 아이템 조회 등) 먼저 fetch를 치지 않도록 가드.
  useEffect(() => {
    if (allowGuestCheckout) {
      setAuthChecked(true);
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const user = await res.json().catch(() => ({}));
        if (cancelled) return;
        setIsAuthenticated(Boolean((user as any)?.email));
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowGuestCheckout]);

  // URL 파라미터
  const productIdParam = sp.get('productId');
  const orderIdParam = sp.get('orderId'); // URL에서 orderId 읽기
  const service = sp.get('service'); // 'stringing'
  const applicationIdParam = sp.get('applicationId'); // Activity에서 넘어온 대상 신청서

  // 보정된 productId / orderId (URL이 비어있어도 서버 추천으로 채움)
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(productIdParam);
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(orderIdParam);

  // 모드 결정: productId가 “보정된 값”으로 존재할 때 product 모드
  const mode: 'product' | 'service' | 'invalid' = useMemo(() => {
    if (resolvedProductId) return 'product';
    if (service === 'stringing') return 'service';
    return 'invalid';
  }, [resolvedProductId, service]);

  // 폼 상태
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력/사진/별점 중 하나라도 변경되면 이탈 경고 대상(= dirty)
  const isDirty = useMemo(() => {
    return rating !== 5 || content.trim().length > 0 || photos.length > 0;
  }, [rating, content, photos.length]);

  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const resetForm = () => {
    setRating(5);
    setContent('');
    setPhotos([]);
  };

  const confirmLeaveIfDirty = (go: () => void) => {
    // 제출 중에는 이탈 확인을 띄우지 않음(중복 confirm 방지)
    if (!isDirty || isSubmitting) {
      go();
      return;
    }
    if (typeof window === 'undefined') {
      go();
      return;
    }
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (ok) go();
  };

  // E2E에서만(쿠키 __e2e=1) 최초 진입 시 샘플 이미지 3장 시드
  useEffect(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('__e2e=1') && photos.length === 0) {
      setPhotos(['https://picsum.photos/id/10/200/200', 'https://picsum.photos/id/11/200/200', 'https://picsum.photos/id/12/200/200']);
    }
  }, [photos.length, setPhotos]);

  // 접근 상태
  const [state, setState] = useState<EligState>('loading');
  const toastLocked = useRef(false);

  // 서비스 모드에서 사용할 신청서 목록/ 선택
  const [apps, setApps] = useState<AppLite[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // 주문 아이템/현재 상품 메타
  const [orderItems, setOrderItems] = useState<OrderReviewItem[] | null>(null);
  const [currentMeta, setCurrentMeta] = useState<{ name: string; image: string | null } | null>(null);

  // orderId-only 진입 시 추천 productId 받기
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (productIdParam || !orderIdParam || resolvedProductId) return;
    let aborted = false;
    (async () => {
      try {
        setState('loading');
        const r = await fetch(`/api/reviews/eligibility?orderId=${encodeURIComponent(orderIdParam)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (aborted) return;
        if (r.status === 401) {
          setState('unauthorized');
          return;
        }
        const d = await r.json();
        if (d.eligible && d.suggestedProductId) {
          setResolvedProductId(String(d.suggestedProductId));
          if (d.suggestedOrderId && !resolvedOrderId) {
            setResolvedOrderId(String(d.suggestedOrderId));
          }
        } else {
          // 추천 실패(이미 작성 등)
          setState(d.reason ?? 'invalid');
          if (!toastLocked.current) {
            toastLocked.current = true;
            showErrorToast('잘못된 접근입니다.');
          }
        }
      } catch {
        setState('error');
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast('접근 확인 중 문제가 발생했어요.');
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, [productIdParam, orderIdParam, resolvedProductId, resolvedOrderId, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 일반 eligibility 검사
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    let aborted = false;
    async function run() {
      setState('loading');
      // invalid인데 orderId-only 보정 대기 중이라면 잠시 보류
      if (mode === 'invalid' && orderIdParam && !resolvedProductId) {
        return; // orderId-only 보정 대기
      }
      if (mode === 'invalid') {
        setState('invalid');
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast('잘못된 접근입니다.');
        }
        return;
      }
      const qs = mode === 'product' ? `productId=${encodeURIComponent(resolvedProductId!)}${resolvedOrderId ? `&orderId=${encodeURIComponent(resolvedOrderId)}` : ''}` : `service=stringing`;
      try {
        const r = await fetch(`/api/reviews/eligibility?${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (aborted) return;
        if (r.status === 401) {
          setState('unauthorized');
          return;
        }
        const data = await r.json();
        // 서버가 추천해준 주문ID가 있으면 저장
        if (data.suggestedOrderId && !resolvedOrderId) {
          setResolvedOrderId(String(data.suggestedOrderId));
        }
        setState(data.eligible ? 'ok' : (data.reason as EligState) || 'error');
      } catch {
        setState('error');
        if (!toastLocked.current) {
          toastLocked.current = true;
          showErrorToast('접근 확인 중 문제가 발생했어요.');
        }
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [mode, resolvedProductId, resolvedOrderId, orderIdParam, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 서비스 모드: 내 신청서 목록 + 추천값 세팅
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (mode !== 'service') return;
    let aborted = false;

    (async () => {
      // 전체 신청서(원본) 조회
      const r = await fetch('/api/applications/stringing/list', {
        credentials: 'include',
        cache: 'no-store',
      });
      const list = (await r.json()) as any[];
      if (aborted) return;

      // 라벨/요약을 가진 AppLite로 포맷
      const formatted: AppLite[] = (list || []).map((a) => ({
        _id: String(a._id),
        label: buildAppLabel(a),
        status: a.status,
        racketType: getRacketSummary(a) || null,
        stringItems: a?.stringDetails?.stringItems ?? [],

        preferredDate: a?.stringDetails?.preferredDate ?? null,
        preferredTime: a?.stringDetails?.preferredTime ?? null,

        desiredDateTime: a?.desiredDateTime ?? a?.stringDetails?.desiredDateTime ?? null,

        createdAt: a?.createdAt ?? null,
        requirements: a?.stringDetails?.requirements ?? null,
      }));

      setApps(formatted);

      // URL로 applicationId가 넘어오면 그걸 최우선으로 선택
      const urlPreferred = applicationIdParam && formatted.some((x) => x._id === applicationIdParam) ? applicationIdParam : null;

      // 기본 선택: urlPreferred -> suggested -> 최근 '교체완료' -> 첫 항목
      let nextId: string | null = null;

      try {
        const elig = await fetch('/api/reviews/eligibility?service=stringing', {
          credentials: 'include',
          cache: 'no-store',
        }).then((x) => x.json());

        nextId = urlPreferred ?? elig?.suggestedApplicationId ?? formatted.find((x) => x.status === '교체완료')?._id ?? formatted[0]?._id ?? null;
      } catch {
        nextId = urlPreferred ?? formatted.find((x) => x.status === '교체완료')?._id ?? formatted[0]?._id ?? null;
      }

      if (!aborted) setSelectedAppId(nextId);
    })();

    return () => {
      aborted = true;
    };
  }, [mode, applicationIdParam, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 서비스 모드: 신청서 선택 시 그 대상으로 재검사
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    if (mode !== 'service' || !selectedAppId) return;
    let aborted = false;
    (async () => {
      setState('loading');
      const r = await fetch(`/api/reviews/eligibility?service=stringing&applicationId=${selectedAppId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (aborted) return;
      if (r.status === 401) {
        setState('unauthorized');
        return;
      }
      const d = await r.json();
      setState(d.eligible ? 'ok' : (d.reason ?? 'error'));
    })();
    return () => {
      aborted = true;
    };
  }, [mode, selectedAppId, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // 선택된 AppLite 계산
  const selectedApp = useMemo(() => apps.find((a) => a._id === selectedAppId) || null, [apps, selectedAppId]);

  // 잠금: 서비스 모드에서는 신청서가 선택되어 있어야 언락
  const locked = state !== 'ok' || (mode === 'service' && !selectedAppId);

  // 헤더 텍스트
  const title = mode === 'product' ? '스트링 상품 리뷰 작성' : mode === 'service' ? '서비스 리뷰 작성' : '잘못된 접근';
  const subtitle = mode === 'product' ? '구매하신 스트링 상품에 대한 솔직한 후기를 남겨주세요.' : mode === 'service' ? '스트링 교체 서비스 이용 후기를 남겨주세요.' : '리뷰 작성 경로가 올바르지 않습니다.';

  const badge =
    state === 'loading'
      ? '검증 중…'
      : state === 'already'
        ? '이미 작성한 대상입니다'
        : state === 'notPurchased'
          ? '구매/이용 이력이 없습니다'
          : state === 'unauthorized'
            ? '로그인이 필요합니다'
            : state === 'invalid'
              ? '작성 불가'
              : state === 'error'
                ? '오류'
                : null;

  // 주문 아이템 + 현재 상품 메타 로드
  useEffect(() => {
    if (!allowGuestCheckout && !authChecked) return;
    if (blockedByLoginGate) return;
    let aborted = false;
    // 주문 아이템
    if (resolvedOrderId) {
      (async () => {
        try {
          const r = await fetch(`/api/orders/${resolvedOrderId}/review-items`, {
            credentials: 'include',
            cache: 'no-store',
          });
          const data = await r.json();
          if (aborted || !data?.ok) return;
          setOrderItems(data.items);
        } catch {}
      })();
    }
    // 현재 상품 mini 메타 (orderId 유무와 무관)
    if (resolvedProductId) {
      (async () => {
        try {
          const r = await fetch(`/api/products/${resolvedProductId}/mini`, { cache: 'no-store' });
          const d = await r.json();
          if (!aborted && d?.ok) {
            setCurrentMeta({ name: d.name, image: d.image });
          }
        } catch {}
      })();
    }
    return () => {
      aborted = true;
    };
  }, [resolvedOrderId, resolvedProductId, allowGuestCheckout, authChecked, blockedByLoginGate]);

  // orderItems/현재 상품 변경 때 currentMeta 보정 (주문 스냅샷 우선)
  useEffect(() => {
    if (!resolvedProductId || !orderItems?.length) return;
    const found = orderItems.find((it) => it.productId === resolvedProductId);
    if (found) setCurrentMeta({ name: found.name, image: found.image });
  }, [orderItems, resolvedProductId]);

  //상품 전환
  function switchProduct(pid: string) {
    if (!pid || pid === resolvedProductId) return;
    confirmLeaveIfDirty(() => {
      // 대상 상품이 바뀌면 “작성 중인 내용”은 의미가 달라지므로 초기화
      resetForm();
      setResolvedProductId(pid);
      setState('loading');
      const qp = new URLSearchParams();
      qp.set('productId', pid);
      if (resolvedOrderId) qp.set('orderId', resolvedOrderId);
      router.replace(`/reviews/write?${qp.toString()}`);
    });
  }

  // 다음 미작성 상품 계산: 현재 이후 먼저 -> 없으면 앞쪽에서
  const nextUnreviewed = useMemo(() => {
    if (!orderItems?.length || !resolvedProductId) return null;
    const idx = orderItems.findIndex((x) => x.productId === resolvedProductId);
    if (idx === -1) return orderItems.find((x) => !x.reviewed) ?? null;
    const after = orderItems.slice(idx + 1).find((x) => !x.reviewed);
    if (after) return after;
    const before = orderItems.slice(0, idx).find((x) => !x.reviewed);
    return before ?? null;
  }, [orderItems, resolvedProductId]);

  // 남은 미작성 개수
  const remainingCount = useMemo(() => orderItems?.filter((x) => !x.reviewed && x.productId !== resolvedProductId).length ?? 0, [orderItems, resolvedProductId]);

  // 제품 상세/서비스 소개로 이동 (라벨 명확화)
  const goPrimary = () => {
    if (mode === 'product' && resolvedProductId) {
      router.replace(`/products/${resolvedProductId}`);
    } else if (mode === 'service') {
      router.replace('/services');
    } else {
      router.replace('/reviews');
    }
  };

  // 제출
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (locked) return;
    const payload: any = { rating, content, photos };
    if (mode === 'product') {
      if (!resolvedProductId) return;
      payload.productId = resolvedProductId;
      if (resolvedOrderId) payload.orderId = resolvedOrderId;
    } else if (mode === 'service') {
      if (!selectedAppId) {
        showInfoToast('대상 신청서를 선택해 주세요.');
        return;
      }
      payload.service = 'stringing';
      payload.serviceApplicationId = selectedAppId;
      setIsSubmitting(true);
    }
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        showSuccessToast('후기가 등록되었습니다.');
        if (mode === 'product' && resolvedProductId) {
          router.replace(`/products/${resolvedProductId}#reviews`);
        } else {
          router.replace('/reviews?tab=service');
        }
        return;
      }
      if (r.status === 409) {
        setState('already');
        showInfoToast('이미 이 대상에 대한 리뷰를 작성하셨습니다.');
        return;
      }
      if (r.status === 404) {
        setState('notPurchased');
        showInfoToast('구매/이용 이력이 있어야 리뷰를 작성할 수 있어요.');
        return;
      }
      showErrorToast('리뷰 등록에 실패했습니다.');
    } catch {
      showErrorToast('네트워크 오류로 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 비회원 차단
  if (!allowGuestCheckout && !authChecked) {
    return <FullPageSpinner label="로그인 상태 확인 중..." />;
  }
  if (blockedByLoginGate) {
    return <LoginGate next={nextUrl} variant="default" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent dark:from-primary dark:via-primary dark:to-accent">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 800 600" className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="court-bg" patternUnits="userSpaceOnUse" width="800" height="600">
              {/* 메인 코트 */}
              <rect x="50" y="100" width="700" height="400" fill="none" stroke="currentColor" strokeWidth="2" />
              {/* 중앙선 */}
              <line x1="400" y1="100" x2="400" y2="500" stroke="currentColor" strokeWidth="2" />
              {/* 서비스 라인 */}
              <line x1="50" y1="300" x2="750" y2="300" stroke="currentColor" strokeWidth="1" />
              {/* 서비스 박스 */}
              <line x1="200" y1="100" x2="200" y2="500" stroke="currentColor" strokeWidth="1" />
              <line x1="600" y1="100" x2="600" y2="500" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#court-bg)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8 min-h-[80vh]">
          {/* 왼쪽: 정보 패널 (코트의 왼쪽 서비스 박스) */}
          <div className="space-y-6">
            {/* 헤더 정보 카드 */}
            <div className="relative rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white p-6 shadow-xl overflow-hidden">
              {/* 코트 라인 장식 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30"></div>
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 transform -translate-x-0.5"></div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span className="text-sm font-medium opacity-90">{mode === 'product' ? 'PRODUCT REVIEW' : mode === 'service' ? 'SERVICE REVIEW' : 'INVALID'}</span>
                </div>

                <h1 className="text-2xl font-bold mb-2">{title}</h1>
                <p className="text-white/90 text-sm leading-relaxed">{subtitle}</p>

                {/* 상태 뱃지 */}
                {badge && (
                  <div className="mt-4 inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-sm font-medium border border-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 mr-2"></div>
                    {badge}
                  </div>
                )}
              </div>
            </div>

            {/* 현재 상품 정보 */}
            {mode === 'product' && currentMeta && (
              <div className="rounded-xl bg-white dark:bg-muted p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-2 ring-blue-200 dark:ring-blue-800 shrink-0">
                    {currentMeta.image ? (
                      <NextImage src={currentMeta.image} alt={currentMeta.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center bg-muted dark:bg-muted text-foreground">IMG</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground dark:text-foreground truncate">{currentMeta.name}</h3>
                    {orderItems && (
                      <div className="text-sm text-foreground dark:text-foreground mt-1">
                        진행률: {orderItems.filter((x) => x.reviewed).length} / {orderItems.length} 완료
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 다른 상품들 (세로 리스트) */}
            {mode === 'product' && orderItems && orderItems.length > 1 && (
              <div className="rounded-xl bg-white dark:bg-muted p-5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <h3 className="font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-muted rounded-full"></div>이 주문의 다른 상품
                </h3>

                <div className="space-y-3">
                  {orderItems.map((it) => {
                    const isCurrent = it.productId === resolvedProductId;
                    const statusText = it.reviewed ? '완료' : isCurrent ? '작성중' : '미작성';
                    const statusClass = it.reviewed
                      ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground'
                      : isCurrent
                        ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground'
                        : 'bg-muted dark:bg-muted text-foreground dark:text-foreground';

                    return (
                      <div key={it.productId} className={`flex items-center gap-3 rounded-lg p-3 ${statusClass} transition-all duration-200 hover:shadow-sm`}>
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg shrink-0">
                          {it.image ? <NextImage src={it.image} alt={it.name} fill sizes="40px" className="object-cover" /> : <div className="h-full w-full grid place-items-center bg-white/50 text-foreground text-xs">IMG</div>}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{it.name}</div>
                          <div className="text-xs opacity-75">{statusText}</div>
                        </div>

                        {!isCurrent && (
                          <Button size="sm" variant="ghost" onClick={() => switchProduct(it.productId)} className="shrink-0 h-7 px-2 text-xs">
                            작성
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 작성 폼 (코트의 오른쪽 서비스 박스) */}
          <div className="relative">
            {/* 중앙선 장식 */}
            <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary to-accent dark:from-primary dark:via-primary dark:to-accent opacity-60"></div>

            <div className="rounded-2xl bg-white dark:bg-muted shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
              {/* 폼 헤더 */}
              <div className="bg-gradient-to-r from-primary to-accent dark:from-primary dark:to-accent px-6 py-4 border-b border-border dark:border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground dark:text-foreground">리뷰 작성</h2>
                </div>
              </div>

              <form onSubmit={onSubmit} className="p-6 space-y-8">
                {/* 입력 블럭 잠금 오버레이 */}
                <div className="relative">
                  {state !== 'ok' && (
                    <div className="absolute inset-0 z-10 rounded-xl bg-white/80 dark:bg-muted backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-border border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm text-foreground dark:text-foreground">{state === 'loading' ? '검증 중...' : '작성할 수 없는 상태입니다.'}</div>
                      </div>
                    </div>
                  )}

                  {/* 서비스 모드: 대상 신청서 선택 */}
                  {mode === 'service' && (
                    <div className="mb-8">
                      <Label className="text-sm font-semibold text-foreground dark:text-foreground mb-3 block">대상 신청서</Label>

                      <select
                        className="w-full h-12 rounded-xl border border-border dark:border-border bg-white dark:bg-muted px-4
                 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus:border-border transition-all duration-200
                 text-left whitespace-normal leading-relaxed"
                        value={selectedAppId ?? ''}
                        onChange={(e) => {
                          const nextId = e.target.value || null;
                          if (nextId === selectedAppId) return;
                          confirmLeaveIfDirty(() => {
                            // 대상 신청서가 바뀌면 “작성 중인 내용”은 의미가 달라지므로 초기화
                            resetForm();
                            setSelectedAppId(nextId);
                          });
                        }}
                        disabled={!apps.length}
                      >
                        {apps.length === 0 && <option value="">내 신청서가 없습니다</option>}
                        {apps.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.label}
                          </option>
                        ))}
                      </select>

                      {/* 선택된 신청서 요약 카드 */}
                      {selectedApp && (
                        <div className="mt-3 rounded-xl border border-border dark:border-border bg-muted dark:bg-muted p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-foreground dark:text-foreground">{selectedApp.createdAt ? `신청일 ${formatKoDateTime(selectedApp.createdAt)}` : ''}</div>
                            {selectedApp.status && <ApplicationStatusBadge status={selectedApp.status} />}
                          </div>

                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <dt className="text-foreground dark:text-foreground">예약일자</dt>
                              <dd className="text-foreground dark:text-foreground">{formatYMD(selectedApp.preferredDate) || '-'}</dd>
                            </div>
                            <div>
                              <dt className="text-foreground dark:text-foreground">예약시간</dt>
                              <dd className="text-foreground dark:text-foreground">{formatHM(selectedApp.preferredTime) || '-'}</dd>
                            </div>
                            <div>
                              <dt className="text-foreground dark:text-foreground">라켓</dt>
                              <dd className="text-foreground dark:text-foreground">{selectedApp.racketType || '-'}</dd>
                            </div>
                            <div>
                              <dt className="text-foreground dark:text-foreground">스트링</dt>
                              <dd className="text-foreground dark:text-foreground truncate">{(selectedApp.stringItems || []).map((s) => s.name).join(', ') || '-'}</dd>
                            </div>
                          </dl>

                          {/* 요청사항 블록 */}
                          {selectedApp.requirements && (
                            <div className="mt-3 rounded-lg border border-border dark:border-border bg-white/60 dark:bg-muted p-3">
                              <div className="text-xs text-foreground dark:text-foreground mb-1">요청사항</div>
                              <p className="text-sm text-foreground dark:text-foreground whitespace-pre-line break-words">{selectedApp.requirements}</p>
                            </div>
                          )}

                          <div className="mt-2 text-xs text-foreground dark:text-foreground">신청번호 {selectedApp._id}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* 별점 섹션 */}
                  <div className="text-center py-6 bg-gradient-to-r from-primary to-accent dark:from-primary dark:to-accent rounded-xl">
                    <label className="block text-sm font-semibold text-foreground dark:text-foreground mb-4">만족도를 별점으로 평가해주세요</label>
                    <Stars value={rating} onChange={setRating} disabled={state !== 'ok'} />
                    <div className="mt-2 text-sm text-foreground dark:text-foreground">{rating === 5 ? '최고예요!' : rating === 4 ? '좋아요!' : rating === 3 ? '보통이에요' : rating === 2 ? '아쉬워요' : '별로예요'}</div>
                  </div>

                  {/* 후기 작성 */}
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-foreground dark:text-foreground">상세 후기</label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="제품/장착 만족도, 타구감, 서비스 경험 등을 자유롭게 남겨주세요 (5자 이상)"
                      className="min-h-[180px] resize-y border-border dark:border-border focus:ring-2 focus:ring-blue-500 focus:border-border rounded-xl"
                      disabled={state !== 'ok'}
                    />
                    <div className="text-xs text-foreground dark:text-foreground text-right">{content.length} / 1000자</div>
                  </div>

                  {/* 사진 업로드 */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-foreground dark:text-foreground">사진 첨부 (선택, 최대 5장)</Label>
                    <div className="rounded-xl border-2 border-dashed border-border dark:border-border p-4">
                      <PhotosUploader value={photos} onChange={setPhotos} max={5} onUploadingChange={setIsUploading} />
                      <PhotosReorderGrid value={photos} onChange={setPhotos} disabled={state !== 'ok' || isUploading} />
                      {isUploading && <div className="mt-2 text-xs text-foreground">이미지 업로드 중...</div>}
                    </div>
                  </div>
                </div>

                {/* 안내문 */}
                {state !== 'ok' && mode !== 'invalid' && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      {state === 'notPurchased' && (
                        <div>
                          구매/이용 이력이 확인되어야 작성할 수 있어요.
                          <button
                            type="button"
                            onClick={() => confirmLeaveIfDirty(() => (mode === 'product' && resolvedProductId ? router.replace(`/products/${resolvedProductId}`) : router.replace('/services')))}
                            className="underline underline-offset-2 hover:opacity-80 font-medium"
                          >
                            관련 페이지로 이동
                          </button>
                        </div>
                      )}
                      {state === 'already' && <div>이미 작성하신 대상이에요. 변경/삭제는 마이페이지 &gt; 나의 리뷰에서 관리해 주세요.</div>}
                    </div>
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-border dark:border-border">
                  <Button type="button" variant="outline" onClick={() => confirmLeaveIfDirty(goPrimary)} className="rounded-xl shadow-sm order-2 sm:order-1 bg-transparent">
                    {mode === 'product' ? '제품 상세 이동' : mode === 'service' ? '서비스 소개' : '리뷰 홈'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => confirmLeaveIfDirty(() => router.replace('/mypage?tab=orders'))} className="rounded-xl shadow-sm order-3 sm:order-2">
                    주문 목록으로
                  </Button>
                  <Button
                    data-cy="submit-review"
                    type="submit"
                    disabled={locked || isUploading}
                    aria-disabled={locked || isUploading}
                    className="rounded-xl shadow-sm bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-semibold px-8 order-1 sm:order-3"
                  >
                    {isUploading ? '이미지 업로드 중...' : '후기 등록하기'}
                  </Button>
                </div>

                {/* invalid 진입 시 CTA */}
                {mode === 'invalid' && (
                  <div className="text-center py-6 text-sm text-foreground dark:text-foreground">
                    <div className="font-medium text-foreground dark:text-foreground mb-2">도움이 필요하신가요?</div>
                    <div className="space-x-4">
                      <button type="button" onClick={() => confirmLeaveIfDirty(() => router.replace('/services'))} className="underline underline-offset-2 hover:opacity-80 text-foreground dark:text-foreground">
                        스트링 서비스 소개
                      </button>
                      <span>·</span>
                      <button type="button" onClick={() => confirmLeaveIfDirty(() => router.replace('/reviews'))} className="underline underline-offset-2 hover:opacity-80 text-foreground dark:text-foreground">
                        리뷰 모아보기
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
