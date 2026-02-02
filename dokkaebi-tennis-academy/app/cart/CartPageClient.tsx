'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Star, Package, Truck, Shield, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/app/store/cartStore';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { useEffect, useMemo, useState } from 'react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import WishlistSidebar from '@/app/cart/_components/WishlistSidebar';
import SiteContainer from '@/components/layout/SiteContainer';

// 통화 포맷 유틸 (일관성)
const formatKRW = (n: number) => n.toLocaleString('ko-KR');

// 장바구니 아이템에 저장된 재고(가용 수량) 값을 안전하게 해석
const getMaxStock = (stock?: number) => (typeof stock === 'number' && Number.isFinite(stock) ? stock : Number.POSITIVE_INFINITY);

export default function CartPageClient() {
  const { logout } = useAuthStore(); // 사용 여부와 관계없이 훅 순서 안정
  const { items: cartItems, removeItem, updateQuantity, clearCart } = useCartStore();

  // 인증
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // "장착비 대상 스트링" 판별을 위해 /api/products/[id]/mini 를 조회해 mountingFee를 캐시
  const [mountingFeeByProductId, setMountingFeeByProductId] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    getMyInfo({ quiet: true })
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  const FREE_SHIP_THRESHOLD = 30000;
  const shippingFee = subtotal >= FREE_SHIP_THRESHOLD ? 0 : 3000;
  const total = subtotal + shippingFee;

  const cartItemsKey = useMemo(() => cartItems.map((it) => `${it.kind ?? 'product'}:${it.id}:${it.quantity ?? 0}`).join('|'), [cartItems]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const productIds = Array.from(new Set(cartItems.filter((it) => (it.kind ?? 'product') === 'product').map((it) => String(it.id))));

      if (productIds.length === 0) {
        if (!cancelled) setMountingFeeByProductId({});
        return;
      }

      const pairs = await Promise.all(
        productIds.map(async (id) => {
          try {
            const res = await fetch(`/api/products/${id}/mini`, { cache: 'no-store' });
            if (!res.ok) return [id, 0] as const;
            const json = await res.json();
            const mf = Number(json?.mountingFee ?? 0);
            return [id, Number.isFinite(mf) && mf > 0 ? mf : 0] as const;
          } catch {
            return [id, 0] as const;
          }
        }),
      );

      if (!cancelled) setMountingFeeByProductId(Object.fromEntries(pairs));
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [cartItemsKey]);

  // 교체/장착 서비스 신청(체크아웃 withService=1)에서는
  // 라켓(또는 중고라켓) 수량과 "장착 가능한 스트링" 수량이 반드시 일치해야함.
  // (서버에서도 검증하지만, 장바구니에서 먼저 막아주면 사용자가 덜 헷갈림.)
  const totalRacketQty = useMemo(() => cartItems.filter((it) => it.kind === 'racket').reduce((acc, it) => acc + Number(it.quantity ?? 0), 0), [cartItems]);

  const totalMountableStringQty = useMemo(
    () => cartItems.filter((it) => (it.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(it.id)] ?? 0) > 0).reduce((acc, it) => acc + Number(it.quantity ?? 0), 0),
    [cartItems, mountingFeeByProductId],
  );

  // "종류(라인) 개수" 체크: 서버 INVALID_COMPOSITION 규칙과 동일한 기준
  const racketLineCount = useMemo(() => cartItems.filter((it) => (it.kind ?? 'product') === 'racket').length, [cartItems]);

  const mountableStringLineCount = useMemo(() => cartItems.filter((it) => (it.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(it.id)] ?? 0) > 0).length, [cartItems, mountingFeeByProductId]);

  // 장착 대상 스트링이 2종 이상이면, 어떤 라인을 정리해야 하는지 표시하기 위한 id 목록
  const mountableStringIds = useMemo(() => {
    return cartItems.filter((it) => (it.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(it.id)] ?? 0) > 0).map((it) => String(it.id));
  }, [cartItems, mountingFeeByProductId]);

  const blockServiceCheckoutByComposition = totalRacketQty > 0 && (racketLineCount !== 1 || mountableStringLineCount !== 1);

  const blockServiceCheckoutByQty = totalRacketQty > 0 && totalRacketQty !== totalMountableStringQty;

  const blockServiceCheckout = blockServiceCheckoutByComposition || blockServiceCheckoutByQty;

  // CTA/토스트 문구를 한 곳에서 관리 (서버 INVALID_COMPOSITION 기준과 동일)
  const serviceBlockToastMessage = blockServiceCheckoutByComposition
    ? `구성 오류: 라켓 1종 + 장착 스트링 1종만 가능해요. (현재 라켓 ${racketLineCount}종 / 장착 스트링 ${mountableStringLineCount}종)`
    : `수량 오류: 라켓 ${totalRacketQty}개 / 장착 스트링 ${totalMountableStringQty}개 → 수량을 맞춰주세요.`;

  // 번들(라켓 + 장착 가능 스트링)인 경우: 장바구니에서는 "수량 스테퍼"를 잠그고
  // 스트링 선택 화면에서만 수량/스트링을 함께 바꾸도록 UX를 고정한다.
  const bundleRacketItem = useMemo(() => cartItems.find((it) => (it.kind ?? 'product') === 'racket'), [cartItems]);

  const bundleStringItem = useMemo(() => cartItems.find((it) => (it.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(it.id)] ?? 0) > 0), [cartItems, mountingFeeByProductId]);

  const bundleQty = useMemo(() => {
    const rq = Number(bundleRacketItem?.quantity ?? 0);
    const sq = Number(bundleStringItem?.quantity ?? 0);
    const max = Math.max(rq, sq);
    return Number.isFinite(max) && max > 0 ? max : 1;
  }, [bundleRacketItem?.quantity, bundleStringItem?.quantity]);

  const bundleEditHref = useMemo(() => {
    // 라켓/스트링 종류가 여러 개면(select-string 링크를 어떤 라켓 기준으로 만들지 불명확)
    // 서버에서도 INVALID_COMPOSITION으로 막고 있으므로, 장바구니에서도 번들 편집 링크를 비활성화한다.
    if (blockServiceCheckoutByComposition) return null;
    if (!bundleRacketItem || !bundleStringItem) return null;

    const params = new URLSearchParams({
      from: 'cart',
      qty: String(bundleQty),
      stringId: String(bundleStringItem.id),
      returnTo: '/cart',
    });

    return `/rackets/${bundleRacketItem.id}/select-string?${params.toString()}`;
  }, [bundleRacketItem, bundleStringItem, bundleQty, blockServiceCheckoutByComposition]);

  const isBundleLocked = Boolean(bundleEditHref);

  // 번들(라켓 + 장착 스트링) 구성품 id를 "원자적(묶음) 삭제" 단위로 묶는다.
  // - 번들이 완성된 상태(isBundleLocked=true)에서만 2개 id가 채워짐
  const bundleLockedIds = useMemo(() => {
    if (!isBundleLocked || !bundleRacketItem || !bundleStringItem) return [] as string[];
    return [bundleRacketItem.id, bundleStringItem.id];
  }, [isBundleLocked, bundleRacketItem?.id, bundleStringItem?.id]);

  // 선택/일괄
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    if (selectedIds.length === cartItems.length) setSelectedIds([]);
    else setSelectedIds(cartItems.map((i) => i.id));
  };
  const removeSelected = () => {
    if (selectedIds.length === 0) return;

    // 선택 삭제 우회 방지:
    // 번들 구성품(라켓/장착 스트링) 중 하나라도 선택되면,
    // 불일치가 생기지 않도록 번들 2개를 "같이" 삭제한다.
    const idsToRemove = new Set(selectedIds);

    if (bundleLockedIds.length === 2 && (idsToRemove.has(bundleLockedIds[0]) || idsToRemove.has(bundleLockedIds[1]))) {
      bundleLockedIds.forEach((id) => idsToRemove.add(id));
    }

    const finalIds = Array.from(idsToRemove);
    const bundleHint = bundleLockedIds.length === 2 && (idsToRemove.has(bundleLockedIds[0]) || idsToRemove.has(bundleLockedIds[1])) ? '\n(번들 상품은 구성품이 함께 삭제됩니다.)' : '';

    if (!confirm(`선택한 ${finalIds.length}개 상품을 장바구니에서 삭제할까요?${bundleHint}`)) return;

    finalIds.forEach((id) => removeItem(id));
    setSelectedIds([]);
    showSuccessToast?.('선택한 상품을 삭제했어요.');
  };

  // "장착 대상 스트링"이 2종 이상 섞였을 때,
  // 사용자가 남길 스트링 1종을 직접 선택해서 나머지를 빠르게 정리하는 유틸(선제 차단 UX 강화)
  const keepOnlyThisMountableString = (keepId: string) => {
    const mountableIds = cartItems.filter((it) => (it.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(it.id)] ?? 0) > 0).map((it) => it.id);

    if (mountableIds.length <= 1) return;

    const idsToRemove = mountableIds.filter((id) => id !== keepId);
    if (idsToRemove.length === 0) return;

    if (!confirm(`장착 대상 스트링은 1종만 가능합니다.\n\n이 스트링만 남기고 나머지 ${idsToRemove.length}개 스트링을 삭제할까요?`)) return;

    // 나머지 장착 스트링 삭제
    idsToRemove.forEach((id) => removeItem(id));

    // 선택 상태에서도 제거(선택삭제/전체선택 UX 꼬임 방지)
    setSelectedIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));

    showSuccessToast?.('장착 대상 스트링을 1종으로 정리했어요.');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/20">
      {/* 헤더 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
            <defs>
              <pattern id="court-lines" x="0" y="0" width="400" height="200" patternUnits="userSpaceOnUse">
                <rect width="400" height="200" fill="none" stroke="white" strokeWidth="2" />
                <line x1="200" y1="0" x2="200" y2="200" stroke="white" strokeWidth="2" />
                <rect x="50" y="50" width="300" height="100" fill="none" stroke="white" strokeWidth="1" />
                <line x1="50" y1="100" x2="350" y2="100" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#court-lines)" />
          </svg>
        </div>
        <SiteContainer variant="wide" className="relative py-10 bp-sm:py-12 bp-md:py-14">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm shadow-lg">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h1 className="mb-2 text-2xl bp-sm:text-3xl bp-md:text-4xl font-black">장바구니</h1>
              <p className="text-blue-100">선택하신 상품들을 확인하고 주문을 진행해보세요</p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                <span>총 {cartItems.length}개 상품</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>30,000원 이상 무료배송</span>
              </div>
            </div>
          )}
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="pt-6 bp-sm:pt-8 pb-40 bp-sm:pb-32 bp-md:py-8">
        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-3">
            {/* 목록 */}
            <div className="bp-lg:col-span-2 space-y-5">
              <Card className="backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 border-0 shadow-2xl">
                <CardHeader className="rounded-t-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <span className="rounded-2xl bg-gradient-to-r from-blue-100 to-indigo-100 p-2 shadow-lg dark:from-blue-900 dark:to-indigo-900">
                          <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </span>
                        선택한 상품 ({cartItems.length}개)
                      </CardTitle>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">상품명을 눌러 상세로 이동할 수 있어요.</p>
                    </div>

                    {/* 전체선택 / 선택n개 / 선택삭제 */}
                    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                      <Button variant="ghost" size="sm" onClick={toggleAll} className="hover:bg-white/60 dark:hover:bg-slate-800/60">
                        {selectedIds.length === cartItems.length ? '전체 해제' : '전체 선택'}
                      </Button>
                      <div className="hidden bp-sm:block h-4 w-px bg-black/10 dark:bg-white/10" />
                      <span className="text-slate-500 dark:text-slate-400">선택 {selectedIds.length}개</span>
                      <Button variant="ghost" size="sm" onClick={removeSelected} className="text-red-600 hover:bg-red-50/70 dark:hover:bg-red-900/20">
                        선택 삭제
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3 bp-sm:p-4 bp-md:p-6 space-y-3 bp-sm:space-y-4">
                  {cartItems.map((item) => {
                    // 버튼 비활성 판단
                    const isRacket = (item.kind ?? 'product') === 'racket';
                    // 라켓은 /rackets/[id], 일반 상품은 /products/[id]
                    const itemHref = isRacket ? `/rackets/${item.id}` : `/products/${item.id}`;
                    const stock = item.stock ?? Number.POSITIVE_INFINITY;
                    const canDec = item.quantity > 1;
                    const maxStock = getMaxStock(item.stock);
                    const canInc = item.quantity < maxStock;

                    const isBundleRacket = isBundleLocked && !!bundleRacketItem && item.id === bundleRacketItem.id && (item.kind ?? 'product') === 'racket';

                    const isBundleString = isBundleLocked && !!bundleStringItem && item.id === bundleStringItem.id && (item.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(item.id)] ?? 0) > 0;

                    const lockStepper = isBundleRacket || isBundleString;

                    //- "구성 정리 필요" 상태에서 어떤 라인을 정리해야 하는지(장착 대상 스트링)를 시각적으로 강조
                    // - 장착 대상 스트링: mountingFee > 0 인 스트링 상품
                    const isMountableString = (item.kind ?? 'product') === 'product' && (mountingFeeByProductId[String(item.id)] ?? 0) > 0;

                    // - 구성 정리 필요 상태: 라켓이 있고 + (라켓 1종 / 장착 스트링 1종 규칙 위반) + 특히 장착 스트링이 2종 이상인 경우
                    const needsCompositionCleanup = blockServiceCheckoutByComposition && totalRacketQty > 0 && mountableStringLineCount > 1;

                    // - 정리 대상 하이라이트: 구성 정리 상태에서 "장착 대상 스트링" 라인들을 강조 표시
                    const highlightCleanupTarget = needsCompositionCleanup && isMountableString;

                    return (
                      <div key={item.id} className={`rounded-xl bg-white p-3 bp-sm:p-4 shadow-sm transition hover:shadow-md dark:bg-slate-800 ${highlightCleanupTarget ? 'ring-2 ring-orange-300 bg-orange-50/40 dark:bg-orange-950/20' : ''}`}>
                        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center">
                          {/* 상단(모바일): 체크+썸네일+이름 */}
                          <div className="flex items-center gap-3 min-w-0">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="h-4 w-4 accent-blue-600" aria-label={`${item.name} 선택`} />
                            <Link href={itemHref} className="shrink-0">
                              <Image src={item.image || '/placeholder.svg?height=72&width=72'} alt={item.name} width={72} height={72} loading="lazy" className="aspect-square rounded-lg object-cover" />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link href={itemHref} className="block line-clamp-2 bp-sm:line-clamp-1 font-medium text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400">
                                {item.name}
                              </Link>
                              <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                개당 <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">{formatKRW(item.price)}원</span>
                              </div>
                              {highlightCleanupTarget && (
                                <>
                                  <span className="mt-1 inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-700/50">
                                    장착 대상 스트링(정리 필요)
                                  </span>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-orange-700/90 dark:text-orange-200/90">
                                    <span>
                                      👉 장착 대상 스트링은 <b>1종만</b> 남겨주세요. (나머지는 삭제)
                                    </span>

                                    <button
                                      type="button"
                                      className="font-semibold underline underline-offset-2 text-orange-700 hover:text-orange-800 dark:text-orange-200 dark:hover:text-orange-100"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        keepOnlyThisMountableString(item.id);
                                      }}
                                    >
                                      이 스트링만 남기기
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 하단(모바일) */}
                          <div className="flex flex-wrap items-center gap-3 bp-sm:flex-nowrap bp-sm:justify-end bp-sm:flex-1">
                            {/* 수량 스테퍼 (번들이면 잠금 + 링크로만 변경) */}
                            {lockStepper ? (
                              <div className="order-1 flex flex-col items-center">
                                {/* 숫자만 표시(± 없음) */}
                                <div className="flex h-8 items-center rounded-full bg-slate-100 px-3 dark:bg-slate-700">
                                  <span className="tabular-nums w-8 select-none text-center font-medium">{item.quantity}</span>
                                </div>

                                {/* 번들 변경 링크: 라켓/스트링 양쪽에 보여줘도 UX가 덜 헷갈림 */}
                                {bundleEditHref && (
                                  <Link href={bundleEditHref} className="mt-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400">
                                    번들 수량/스트링 변경
                                  </Link>
                                )}

                                {Number.isFinite(maxStock) && <span className={`mt-1 text-[11px] ${item.quantity >= maxStock ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>현재 가용 수량: {maxStock}개</span>}
                              </div>
                            ) : (
                              /* 수량 스테퍼 (pill, 비활성 표시) */
                              <div className="order-1 flex flex-col items-center">
                                <div className="flex items-center rounded-full bg-slate-100 px-1 dark:bg-slate-700">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 disabled:opacity-40"
                                    aria-label={`${item.name} 수량 감소`}
                                    disabled={lockStepper ? true : !canDec}
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    title={lockStepper ? '번들 품목은 스트링 선택 화면에서만 수량을 변경할 수 있어요.' : undefined}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>

                                  <span className={`tabular-nums w-8 select-none text-center font-medium ${lockStepper ? 'opacity-60' : ''}`}>{item.quantity}</span>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 disabled:opacity-40"
                                    aria-label={`${item.name} 수량 증가`}
                                    disabled={lockStepper ? true : !canInc}
                                    title={lockStepper ? '번들 품목은 스트링 선택 화면에서만 수량을 변경할 수 있어요.' : undefined}
                                    onClick={() => {
                                      if (!canInc) {
                                        showErrorToast(
                                          <>
                                            <p>
                                              <strong>{item.name}</strong>의 최대 주문 수량은 {maxStock}개입니다.
                                            </p>
                                            <p>더 이상 수량을 늘릴 수 없습니다.</p>
                                          </>,
                                        );
                                        return;
                                      }
                                      updateQuantity(item.id, item.quantity + 1);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>

                                {lockStepper && bundleEditHref ? (
                                  <Link href={bundleEditHref} className="mt-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400">
                                    번들 수량/스트링 변경
                                  </Link>
                                ) : (
                                  Number.isFinite(maxStock) && <span className={`mt-1 text-[11px] ${item.quantity >= maxStock ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>현재 가용 수량: {maxStock}개</span>
                                )}
                              </div>
                            )}

                            <div className="order-2 ml-auto bp-sm:ml-0 text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">합계</div>
                              <div className="tabular-nums text-lg font-semibold text-slate-900 dark:text-slate-100">{formatKRW(item.price * item.quantity)}원</div>
                            </div>

                            {/* 삭제 버튼 (컨펌) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={lockStepper ? `번들(라켓+스트링) 삭제` : `${item.name} 삭제`}
                              title={lockStepper ? '번들 구성품은 개별 삭제가 아니라 묶음(라켓+스트링)으로 함께 삭제됩니다.' : undefined}
                              onClick={() => {
                                // 번들(라켓/장착 스트링) 라인에서 삭제를 누르면
                                // "불일치"가 생기지 않도록 번들 2개를 같이 삭제한다.
                                if (lockStepper && bundleLockedIds.length === 2) {
                                  if (confirm('번들(라켓 + 장착 스트링)을 통째로 장바구니에서 삭제할까요?')) {
                                    bundleLockedIds.forEach((id) => removeItem(id));
                                    setSelectedIds((prev) => prev.filter((id) => !bundleLockedIds.includes(id)));
                                  }
                                  return;
                                }

                                // 일반 상품은 기존처럼 개별 삭제
                                if (confirm(`"${item.name}"을(를) 장바구니에서 삭제할까요?`)) {
                                  removeItem(item.id);
                                }
                              }}
                              className="order-3 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>

                <CardFooter className="rounded-b-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex w-full flex-col justify-between gap-4 bp-sm:flex-row">
                    <Button variant="outline" className="group border-0 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20" asChild>
                      <Link href="/products" className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 -rotate-180 transition-transform group-hover:-translate-x-1" />
                        쇼핑 계속하기
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      className="bg-gradient-to-r from-red-500 to-pink-500 shadow-lg hover:from-red-600 hover:to-pink-600"
                      onClick={() => {
                        if (confirm('장바구니의 모든 상품을 비울까요?')) clearCart();
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      장바구니 비우기
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              <WishlistSidebar variant="inline" />
            </div>

            {/* 요약 */}
            <div className="bp-lg:col-span-1">
              <div className="bp-lg:sticky bp-lg:top-[calc(var(--header-h)+16px)]">
                <Card className="backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 border-0 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 bp-sm:p-6 text-white">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="rounded-2xl bg-white/20 p-2 shadow-lg">
                        <Package className="h-5 w-5" />
                      </div>
                      주문 요약
                    </CardTitle>
                  </div>
                  <CardContent className="space-y-5 bp-sm:space-y-6 p-4 bp-sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">상품 금액</span>
                        <span className="tabular-nums text-lg font-semibold">{formatKRW(subtotal)}원</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">배송비</span>
                        <span className={shippingFee === 0 ? 'font-semibold text-blue-600 dark:text-blue-400' : 'font-semibold'}>{shippingFee > 0 ? `${formatKRW(shippingFee)}원` : '무료'}</span>
                      </div>
                      <Separator className="opacity-40" />
                      <div className="flex items-center justify-between text-xl font-bold">
                        <span>총 결제 금액</span>
                        <span className="tabular-nums text-blue-600 dark:text-blue-400">{formatKRW(total)}원</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                        <Star className="h-4 w-4" />
                        <span className="font-semibold">배송 혜택</span>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        30,000원 이상 구매 시 무료배송
                        {subtotal < 30000 && <span className="block mt-1 font-semibold">{(30000 - subtotal).toLocaleString()}원 더 구매하면 무료배송!</span>}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-3 p-4 bp-sm:p-6 pt-0">
                    {blockServiceCheckout ? (
                      <>
                        {blockServiceCheckoutByQty && (
                          <div className="w-full rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200">
                            라켓 수량(<span className="font-semibold">{totalRacketQty}개</span>)과 장착 스트링 수량(
                            <span className="font-semibold">{totalMountableStringQty}개</span>)이 다릅니다.
                            <br />
                            👉 수량을 맞춘 뒤 주문해 주세요.
                          </div>
                        )}
                        {bundleEditHref ? (
                          <Button
                            asChild
                            className="h-14 w-full transform bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-semibold shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl flex items-center justify-center gap-3"
                          >
                            <Link href={bundleEditHref}>
                              <ShoppingBag className="h-5 w-5" />
                              번들 수량/스트링 변경
                              <ArrowRight className="h-5 w-5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            className="h-14 w-full transform bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-semibold shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl flex items-center justify-center gap-3"
                            size="lg"
                            onClick={() => showErrorToast(serviceBlockToastMessage)}
                          >
                            <ShoppingBag className="h-5 w-5" />
                            {blockServiceCheckoutByComposition ? '구성 정리 후 주문하기' : '수량 맞춘 뒤 주문하기'}
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        className="h-14 w-full transform bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-semibold shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl"
                        size="lg"
                        asChild
                      >
                        {/* <Link href="/checkout?withService=1" className="flex items-center gap-3"> */}
                        <Link href={user ? '/checkout?withService=1' : `/login?redirectTo=${encodeURIComponent('/checkout?withService=1')}`} className="flex items-center gap-3">
                          <ShoppingBag className="h-5 w-5" />
                          {/* {user ? '주문하기' : '비회원은 주문하기'} */}
                          {user ? '주문하기' : '로그인 후 주문하기'}
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Card className="backdrop-blur-sm bg-white/95 dark:bg-slate-800/95 border-0 shadow-2xl text-center overflow-hidden">
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-12 dark:from-blue-900/30 dark:to-indigo-900/30">
                <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-xl">
                  <PackageOpen className="h-12 w-12 text-white" />
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-800 dark:text-slate-200">장바구니가 비어있습니다</h2>
                <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">마음에 드는 테니스 용품을 장바구니에 담아보세요!</p>
                <Button
                  className="transform bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-semibold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl"
                  size="lg"
                  asChild
                >
                  <Link href="/products" className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5" />
                    쇼핑하러 가기
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </Card>
            <div className="mx-auto mt-8 max-w-2xl">
              <WishlistSidebar variant="inline" />
            </div>
          </div>
        )}
      </SiteContainer>

      {/* 모바일 하단 결제 바 */}
      {cartItems.length > 0 && (
        <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-40 bp-md:hidden">
          <div className="rounded-t-2xl bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] backdrop-blur-md dark:bg-slate-800/95">
            <SiteContainer variant="full" className="max-w-screen-sm py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">총 결제 금액</span>
                <span className="tabular-nums text-lg font-bold text-blue-600 dark:text-blue-400">{formatKRW(total)}원</span>
              </div>
              {blockServiceCheckout ? (
                <div className="space-y-2">
                  {blockServiceCheckoutByQty && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200">
                      라켓 수량(<span className="font-semibold">{totalRacketQty}개</span>)과 장착 스트링 수량(
                      <span className="font-semibold">{totalMountableStringQty}개</span>)이 다릅니다. 수량을 맞춘 뒤 주문해 주세요.
                    </div>
                  )}
                  {bundleEditHref ? (
                    <Button asChild className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold hover:from-blue-700 hover:to-indigo-700">
                      <Link href={bundleEditHref}>번들 수량/스트링 변경</Link>
                    </Button>
                  ) : (
                    <Button className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold hover:from-blue-700 hover:to-indigo-700" onClick={() => showErrorToast(serviceBlockToastMessage)}>
                      {blockServiceCheckoutByComposition ? '구성 정리 후 주문하기' : '수량 맞춘 뒤 주문하기'}
                    </Button>
                  )}
                </div>
              ) : (
                <Button asChild className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold hover:from-blue-700 hover:to-indigo-700">
                  {/* <Link href="/checkout?withService=1">주문하기</Link> */}
                  <Link href={user ? '/checkout?withService=1' : `/login?redirectTo=${encodeURIComponent('/checkout?withService=1')}`}>{user ? '주문하기' : '로그인 후 주문하기'}</Link>
                </Button>
              )}
            </SiteContainer>
          </div>
        </div>
      )}
    </div>
  );
}
