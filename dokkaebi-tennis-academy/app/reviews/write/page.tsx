'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import { Label } from '@/components/ui/label';
import PhotosUploader from '@/components/reviews/PhotosUploader';
import NextImage from 'next/image';

/* ---- 별점 ---- */
function Stars({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={`flex gap-1 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n}점`} className={`text-2xl transition-transform will-change-transform ${value >= n ? 'text-yellow-400' : 'text-muted-foreground'} hover:scale-[1.06]`} onClick={() => onChange?.(n)}>
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

// service 모드에서 사용할 신청서 목록/선택
type AppLite = { _id: string; label: string };

export default function ReviewWritePage() {
  const sp = useSearchParams();
  const router = useRouter();

  // URL 파라미터
  const productIdParam = sp.get('productId');
  const orderIdParam = sp.get('orderId'); // URL에서 orderId 읽기
  const service = sp.get('service'); // 'stringing'

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
  }, [productIdParam, orderIdParam, resolvedProductId, resolvedOrderId]);

  // 일반 eligibility 검사
  useEffect(() => {
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
  }, [mode, resolvedProductId, resolvedOrderId, orderIdParam]);

  // 서비스 모드: 내 신청서 목록 + 추천값 세팅
  useEffect(() => {
    if (mode !== 'service') return;
    let aborted = false;
    (async () => {
      const r = await fetch('/api/applications/stringing/list', { credentials: 'include', cache: 'no-store' });
      const list = (await r.json()) as any[];
      if (aborted) return;
      const formatted: AppLite[] = (list || []).map((a) => ({
        _id: a._id,
        label: a.desiredDateTime ? new Date(a.desiredDateTime).toLocaleString() : new Date(a.createdAt).toLocaleString(),
      }));
      setApps(formatted);
      try {
        const elig = await fetch('/api/reviews/eligibility?service=stringing', { credentials: 'include', cache: 'no-store' });
        const ej = await elig.json();
        if (ej.suggestedApplicationId) setSelectedAppId(ej.suggestedApplicationId);
        else if (formatted.length) setSelectedAppId(formatted[0]._id);
      } catch {}
    })();
    return () => {
      aborted = true;
    };
  }, [mode]);

  // 서비스 모드: 신청서 선택 시 그 대상으로 재검사
  useEffect(() => {
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
      setState(d.eligible ? 'ok' : d.reason ?? 'error');
    })();
    return () => {
      aborted = true;
    };
  }, [mode, selectedAppId]);

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
  }, [resolvedOrderId, resolvedProductId]);

  // orderItems/현재 상품 변경 때 currentMeta 보정 (주문 스냅샷 우선)
  useEffect(() => {
    if (!resolvedProductId || !orderItems?.length) return;
    const found = orderItems.find((it) => it.productId === resolvedProductId);
    if (found) setCurrentMeta({ name: found.name, image: found.image });
  }, [orderItems, resolvedProductId]);

  //상품 전환
  function switchProduct(pid: string) {
    if (!pid || pid === resolvedProductId) return;
    setResolvedProductId(pid);
    setState('loading');
    const qp = new URLSearchParams();
    qp.set('productId', pid);
    if (resolvedOrderId) qp.set('orderId', resolvedOrderId);
    router.replace(`/reviews/write?${qp.toString()}`);
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

  //뒤로가기: replace로 히스토리 정리
  const goBackSmart = () => {
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    const PRODUCT_DETAIL_PATH = (id: string) => `/products/${id}`;
    if (ref && /\/products\//.test(ref)) {
      router.replace(ref);
      return;
    }
    if (mode === 'product' && resolvedProductId) {
      router.replace(PRODUCT_DETAIL_PATH(resolvedProductId));
      return;
    }
    if (mode === 'service') {
      router.replace('/services');
      return;
    }
    router.replace('/reviews');
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
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      {/* 헤더 카드 : 현재 상품만 보여주기 */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white p-6 sm:p-8 mt-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-white/90">{subtitle}</p>

            {/* 현재 상품 메타 */}
            {mode === 'product' && currentMeta && (
              <div className="mt-5 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-black/10 bg-white/20 shrink-0">
                  {currentMeta.image ? <NextImage src={currentMeta.image} alt={currentMeta.name} fill sizes="64px" className="object-cover" /> : <div className="h-full w-full grid place-items-center text-white/70">IMG</div>}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{currentMeta.name}</div>
                  {orderItems && (
                    <div className="text-sm/6 text-white/85">
                      {orderItems.filter((x) => x.reviewed).length} / {orderItems.length} 완료
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 상태 뱃지 */}
          {badge && <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium shadow-sm whitespace-nowrap">{badge}</span>}
        </div>
      </div>

      {/* 이 주문의 다른 상품 (카드 그리드) */}
      {mode === 'product' && orderItems && orderItems.length > 1 && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">이 주문의 다른 상품</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orderItems.map((it) => {
              const isCurrent = it.productId === resolvedProductId;
              const statusText = it.reviewed ? '완료' : isCurrent ? '작성중' : '미작성';
              const statusClass = it.reviewed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : isCurrent ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-neutral-50 text-neutral-600 ring-neutral-200';

              return (
                <div key={it.productId} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${statusClass}`}>
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white/70 shrink-0">
                    {it.image ? <NextImage src={it.image} alt={it.name} fill sizes="48px" className="object-cover" /> : <div className="h-full w-full grid place-items-center text-neutral-400">IMG</div>}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="text-xs opacity-80">{statusText}</div>
                  </div>

                  <Button size="sm" variant={isCurrent ? 'secondary' : 'outline'} onClick={() => !isCurrent && switchProduct(it.productId)} disabled={isCurrent} className="shrink-0">
                    {isCurrent ? '현재' : '작성하기'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 작성 카드 */}
      <div className="relative mt-6 rounded-2xl bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5">
        <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs rounded-full px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 ring-1 ring-black/5">{mode === 'product' ? '상품 리뷰' : mode === 'service' ? '서비스 리뷰' : '오류'}</span>
          </div>

          {/* 입력 블럭 잠금 오버레이 */}
          <div className="relative">
            {state !== 'ok' && (
              <div className="absolute inset-0 z-10 rounded-xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="text-sm text-neutral-600 dark:text-neutral-300">{state === 'loading' ? '검증 중…' : '작성할 수 없는 상태입니다.'}</div>
              </div>
            )}

            {/* 서비스 모드: 대상 신청서 선택 */}
            {mode === 'service' && (
              <div className="grid gap-1 mb-4">
                <Label className="text-sm font-medium">대상 신청서</Label>
                <select className="h-10 rounded-xl border px-3 shadow-sm bg-background" value={selectedAppId ?? ''} onChange={(e) => setSelectedAppId(e.target.value || null)} disabled={!apps.length}>
                  {apps.length === 0 && <option value="">내 신청서가 없습니다</option>}
                  {apps.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">별점</label>
                <Stars value={rating} onChange={setRating} disabled={state !== 'ok'} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">후기</label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="제품/장착 만족도, 타구감, 서비스 경험 등을 자유롭게 남겨주세요 (5자 이상)" className="min-h-[160px] resize-y" disabled={state !== 'ok'} />
                <div className="mt-3">
                  <Label>사진 (선택, 최대 5장)</Label>
                  <PhotosUploader value={photos} onChange={setPhotos} max={5} />
                </div>
              </div>
            </div>
          </div>

          {/* 안내문 */}
          {state !== 'ok' && mode !== 'invalid' && (
            <div className="pt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {state === 'notPurchased' && (
                <div>
                  구매/이용 이력이 확인되어야 작성할 수 있어요.
                  <button type="button" onClick={() => (mode === 'product' && resolvedProductId ? router.replace(`/products/${resolvedProductId}`) : router.replace('/services'))} className="underline underline-offset-4 hover:opacity-80">
                    관련 페이지로 이동
                  </button>
                </div>
              )}
              {state === 'already' && <div>이미 작성하신 대상이에요. 변경/삭제는 마이페이지 &gt; 나의 리뷰에서 관리해 주세요.</div>}
            </div>
          )}

          {/* 액션 바 */}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={goBackSmart} className="rounded-xl shadow-sm">
              취소
            </Button>

            <Button type="submit" disabled={locked} aria-disabled={locked} className="rounded-xl shadow-sm">
              후기 등록하기
            </Button>

            {/* 다음/목록 버튼 - 스크롤 없이 자연 이동 */}
            <Button type="button" variant="secondary" onClick={() => (nextUnreviewed ? switchProduct(nextUnreviewed.productId) : router.replace('/mypage?tab=orders'))} className="rounded-xl shadow-sm">
              {nextUnreviewed ? '다음 상품' : '주문 목록으로'}
            </Button>
          </div>

          {/* invalid 진입 시 CTA */}
          {mode === 'invalid' && (
            <div className="pt-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="mt-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-200">도움이 필요하신가요? </span>
                <button type="button" onClick={() => router.replace('/services')} className="underline underline-offset-4 hover:opacity-80">
                  스트링 서비스 소개
                </button>
                <span> · </span>
                <button type="button" onClick={() => router.replace('/reviews')} className="underline underline-offset-4 hover:opacity-80">
                  리뷰 모아보기
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
