'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useInfiniteProducts } from '@/app/products/hooks/useInfiniteProducts';
import { usePdpBundleStore } from '@/app/store/pdpBundleStore';
import { useCartStore } from '@/app/store/cartStore';
import { CheckCircle2, Minus, Plus, ShoppingCart } from 'lucide-react';
import SiteContainer from '@/components/layout/SiteContainer';
import { Input } from '@/components/ui/input';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type RacketMini = {
  id: string;
  name: string;
  price: number;
  image?: string;
  status?: string;
  maxQty?: number;
};

export default function RacketSelectStringClient({ racket }: { racket: RacketMini }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // cart에서 들어왔는지
  const from = searchParams.get('from');
  const isFromCart = from === 'cart';

  // cart 편집 모드일 때: 기존 선택 값
  const initialQtyParam = Number(searchParams.get('qty') ?? 1);
  const initialStringId = searchParams.get('stringId'); // cart에 있던 “번들 스트링” id
  const returnTo = searchParams.get('returnTo') ?? '/cart';

  // buy-now 모드에서만 사용하는 store
  const setItems = usePdpBundleStore((s) => s.setItems);
  const clearBundle = usePdpBundleStore((s) => s.clear);

  // cart 편집/장바구니 담기에서 사용하는 store
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  /**
   * "번들 수량" = 라켓 구매 수량 = 스트링 구매 수량
   * - 이 값만큼 라켓/스트링이 동일 수량으로 체크아웃(또는 카트)에 담김.
   * - STEP2 라인도 이 수량 기준으로 자동 생성.
   * - 수량 변경은 이 화면에서만 하도록 UX를 묶는 것이 전제.
   */
  const [workCount, setWorkCount] = useState<number>(1);

  const clampWorkCount = (v: number, stringStock?: number) => {
    if (!Number.isFinite(v)) return 1;

    const racketMax = Number.isFinite(racket.maxQty) && (racket.maxQty as number) > 0 ? (racket.maxQty as number) : 1;
    const stockMax = Number.isFinite(stringStock) && (stringStock as number) > 0 ? (stringStock as number) : Infinity;
    const max = Math.min(racketMax, stockMax);

    return Math.max(1, Math.min(max, Math.trunc(v)));
  };

  // 초기 workCount 세팅: cart에서 넘어온 qty를 그대로 반영
  useEffect(() => {
    setWorkCount(clampWorkCount(initialQtyParam));
  }, [initialQtyParam, racket.maxQty]);

  // buy-now 모드에서만 bundle store clear (cart 편집 모드에서는 굳이 건드리지 않음)
  useEffect(() => {
    if (!isFromCart) clearBundle();
  }, [clearBundle, isFromCart]);

  const { products, isLoadingInitial, isFetchingMore, hasMore, loadMore } = useInfiniteProducts({
    limit: 6,
    purpose: 'stringing', // 교체 서비스에 사용되는 "스트링"만
  });

  // cart 편집 모드에서: “현재 선택된 스트링” 표시용
  const selectedStringIdForHighlight = useMemo(() => (isFromCart ? initialStringId : null), [isFromCart, initialStringId]);

  /**
   * cartStore에 "라켓 + 스트링" 번들을 동일 수량으로 반영
   * - 라켓 라인은 없으면 add, 있으면 updateQuantity
   * - 스트링 라인은 (cart 편집 모드인 경우) 기존 stringId가 있으면 교체 처리
   */
  const upsertCartBundle = (selectedString: any, qty: number) => {
    const newStringId = String(selectedString?._id);
    const newStringImage = selectedString?.images?.[0] ?? selectedString?.imageUrl;

    // 1) 라켓 라인: 없으면 add, 있으면 수량 update
    const hasRacket = cartItems.some((it) => it.id === racket.id && (it.kind ?? 'product') === 'racket');
    if (!hasRacket) {
      addItem({
        id: racket.id,
        name: racket.name,
        price: racket.price,
        quantity: qty,
        image: racket.image,
        kind: 'racket',
        stock: racket.maxQty, // maxQty를 재고 상한으로 활용 (없으면 undefined)
      });
    } else {
      updateQuantity(racket.id, qty);
    }

    // 2) 스트링 라인: cart 편집 모드(from=cart)에서만 “기존 스트링 교체”를 명시적으로 처리
    // - 같은 스트링이면 updateQuantity
    // - 다른 스트링이면 기존 제거 후 새로 add(또는 기존에 있으면 update)
    if (initialStringId && initialStringId !== newStringId) {
      removeItem(initialStringId);
    }

    const hasNewString = cartItems.some((it) => it.id === newStringId && (it.kind ?? 'product') === 'product');

    if (hasNewString) {
      updateQuantity(newStringId, qty);
    } else {
      const stringManageStock = Boolean(selectedString?.inventory?.manageStock);
      const stringStock = stringManageStock && typeof selectedString?.inventory?.stock === 'number' ? selectedString.inventory.stock : undefined;
      addItem({
        id: newStringId,
        name: selectedString?.name ?? '스트링',
        price: Number(selectedString?.price ?? 0),
        quantity: qty,
        image: newStringImage,
        kind: 'product',
        stock: stringStock,
      });
    }
  };

  /**
   * 기존 정책:
   * - from=cart면: cartStore를 직접 수정하고 returnTo로 복귀
   * - from!=cart면: pdpBundleStore로 buy-now checkout 이동
   */
  const handleSelectString = (p: any) => {
    const manageStock = Boolean(p?.inventory?.manageStock);
    const stock = typeof p?.inventory?.stock === 'number' ? p.inventory.stock : undefined;

    // 관리 재고가 0이면(품절) 번들 진행 자체를 막음
    if (manageStock && typeof stock === 'number' && stock <= 0) {
      showErrorToast?.('선택한 스트링의 재고가 부족합니다.');
      return;
    }

    // 번들 수량(workCount)보다 재고가 적으면, checkout으로 보내지 않고 여기서 차단
    if (manageStock && typeof stock === 'number' && stock < workCount) {
      showErrorToast?.(`선택한 스트링 재고가 부족합니다. (요청 ${workCount}개 / 현재 ${stock}개)`);
      return;
    }

    const qty = clampWorkCount(workCount, manageStock ? stock : undefined);

    // 1) cart 편집 모드: cartStore를 직접 수정하고 returnTo로 복귀
    if (isFromCart) {
      try {
        upsertCartBundle(p, qty);
        showSuccessToast?.('장바구니 번들(라켓+스트링) 수량/스트링을 수정했어요.');
        router.push(returnTo);
      } catch (e) {
        showErrorToast?.('장바구니 수정 중 오류가 발생했어요. 다시 시도해주세요.');
      }
      return;
    }

    // 2) buy-now 모드: pdpBundleStore로 checkout 이동
    const stringImage = p?.images?.[0] ?? p?.imageUrl;

    setItems([
      // stock을 같이 들고가면, 이후 화면에서도 “클램프/사전 경고”에 활용 가능
      { id: racket.id, name: racket.name, price: racket.price, quantity: qty, image: racket.image, kind: 'racket', stock: racket.maxQty },
      { id: String(p._id), name: p.name, price: p.price, quantity: qty, image: stringImage, kind: 'product', stock: manageStock ? stock : undefined },
    ]);

    router.push(`/checkout?mode=buynow&withService=1`);
  };

  /**
   *  buy-now 모드에서 “장바구니 담기”
   * - 라켓 + 선택 스트링을 동일 수량으로 cartStore에 반영하고 /cart로 이동
   * - (중요) from=cart가 아니므로 “기존 스트링 교체(initialStringId)”는 개입하지 않음
   *   → 이미 카트에 여러 스트링이 있는 복잡 케이스는 다음 옵션1(우회 방지)에서 더 강하게 잠글 예정
   */
  const handleAddToCart = (p: any) => {
    const manageStock = Boolean(p?.inventory?.manageStock);
    const stock = typeof p?.inventory?.stock === 'number' ? p.inventory.stock : undefined;

    if (manageStock && typeof stock === 'number' && stock <= 0) {
      showErrorToast?.('선택한 스트링의 재고가 부족합니다.');
      return;
    }

    if (manageStock && typeof stock === 'number' && stock < workCount) {
      showErrorToast?.(`선택한 스트링 재고가 부족합니다. (요청 ${workCount}개 / 현재 ${stock}개)`);
      return;
    }

    const qty = clampWorkCount(workCount, manageStock ? stock : undefined);
    try {
      upsertCartBundle(p, qty);
      showSuccessToast?.('장바구니에 번들(라켓+스트링)을 담았어요.');
      router.push('/cart');
    } catch {
      showErrorToast?.('장바구니 담기 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

  if (isLoadingInitial) {
    return (
      <SiteContainer variant="wide" className="py-16">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-slate-900" />
            <p className="text-sm text-muted-foreground">스트링을 불러오는 중...</p>
          </div>
        </div>
      </SiteContainer>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white">
      <SiteContainer variant="wide" className="py-8 bp-md:py-12 space-y-8 bp-md:space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-2xl bp-md:text-4xl font-bold tracking-tight text-foreground">스트링 선택</h1>

          {isFromCart ? (
            <p className="text-sm bp-md:text-base text-muted-foreground leading-relaxed">
              <span className="font-semibold">장바구니 번들 수정 모드</span>입니다. 수량과 스트링을 변경한 뒤 장바구니로 돌아갑니다.
            </p>
          ) : (
            <p className="text-sm bp-md:text-base text-muted-foreground leading-relaxed">라켓과 함께 구매하실 스트링을 선택해주세요. 선택한 스트링은 라켓과 함께 한 번에 결제됩니다.</p>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-background to-card rounded-full blur-3xl opacity-50 -z-0" />
            <div className="relative z-10 p-4 bp-md:p-6 flex gap-4 bp-md:gap-6 items-center">
              <div className="flex-shrink-0">
                {racket.image ? (
                  <img src={racket.image || '/placeholder.svg'} alt={racket.name} className="w-20 h-20 bp-md:w-24 bp-md:h-24 object-cover rounded-xl shadow-md ring-2 ring-ring" />
                ) : (
                  <div className="w-20 h-20 bp-md:w-24 bp-md:h-24 rounded-xl bg-gradient-to-br from-background to-card flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-success mb-1">선택된 라켓</p>
                    <h3 className="text-xl font-bold text-foreground mb-1">{racket.name}</h3>
                    <p className="text-lg font-semibold text-foreground">{racket.price.toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 번들 수량 */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 bp-md:p-6 shadow-sm">
            <div className="flex flex-col bp-md:flex-row bp-md:items-center bp-md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">번들 수량 (라켓 + 스트링)</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  이 수량만큼 <span className="font-medium">라켓/스트링/교체비</span>가 함께 계산되고, STEP2의 <span className="font-medium">라켓별 세부 장착 정보</span>도 자동 생성됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start bp-md:self-auto">
                <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setWorkCount((prev) => clampWorkCount(prev - 1))} aria-label="번들 수량 감소">
                  <Minus className="h-4 w-4" />
                </Button>

                <Input type="number" inputMode="numeric" min={1} max={30} value={workCount} onChange={(e) => setWorkCount(clampWorkCount(Number(e.target.value)))} className="h-10 w-20 text-center" />

                <Button type="button" variant="outline" className="h-10 w-10 p-0" onClick={() => setWorkCount((prev) => clampWorkCount(prev + 1))} aria-label="번들 수량 증가">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 스트링 목록 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center">사용 가능한 스트링</h2>
          <div className="grid grid-cols-1 bp-sm:grid-cols-2 bp-lg:grid-cols-3 gap-4 bp-md:gap-6 items-start">
            {products.map((p: any) => {
              const stringId = String(p._id);
              const stringImage = p?.images?.[0] ?? p?.imageUrl;
              const manageStock = Boolean(p?.inventory?.manageStock);
              const stock = typeof p?.inventory?.stock === 'number' ? p.inventory.stock : undefined;
              const lowStock = typeof p?.inventory?.lowStock === 'number' ? p.inventory.lowStock : 5;
              const isSoldOut = manageStock && typeof stock === 'number' && stock <= 0;
              const isShort = manageStock && typeof stock === 'number' && stock < workCount;

              const isCurrent = Boolean(selectedStringIdForHighlight) && selectedStringIdForHighlight === stringId && isFromCart;

              return (
                <div
                  key={stringId}
                  className={[
                    'group relative overflow-hidden border rounded-2xl bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
                    isCurrent ? 'border-border ring-2 ring-ring' : 'border-border hover:border-border',
                  ].join(' ')}
                >
                  <div className="p-5 flex flex-col h-full">
                    <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted aspect-square flex items-center justify-center">
                      {stringImage ? (
                        <img src={stringImage || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      ) : (
                        <div className="text-muted-foreground">
                          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{p.name}</h3>
                        {isCurrent && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">현재 선택</span>}
                      </div>
                      <p className="text-lg font-bold text-foreground">{Number(p.price ?? 0).toLocaleString()}원</p>
                      {/* 재고 힌트 */}
                      {manageStock && typeof stock === 'number' && stock > 0 && stock <= lowStock && <p className="text-xs text-warning">현재 남은 수량 {stock}개</p>}
                      {isShort && (
                        <p className="text-xs text-destructive">
                          재고 {stock}개로 번들 수량({workCount}개)을 충족할 수 없어요
                        </p>
                      )}
                      {isSoldOut && <p className="text-xs text-destructive">품절</p>}
                    </div>

                    {/* 버튼 영역 */}
                    {isFromCart ? (
                      <Button variant="cardAction" className="mt-4 w-full font-medium rounded-xl py-5 transition-all duration-300" onClick={() => handleSelectString(p)}>
                        <span className="flex items-center justify-center gap-2">
                          이 스트링으로 변경
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </Button>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <Button
                          variant="cardAction"
                          className="w-full font-medium rounded-xl py-5 transition-all duration-300"
                          disabled={isSoldOut || isShort}
                          onClick={() => handleSelectString(p)}
                        >
                          <span className="flex items-center justify-center gap-2">
                            바로 결제
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </Button>

                        <Button variant="outline" className="w-full rounded-xl py-5 font-medium" disabled={isSoldOut || isShort} onClick={() => handleAddToCart(p)}>
                          장바구니 담기
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button onClick={loadMore} disabled={isFetchingMore} className="px-8 py-6 rounded-xl font-medium bg-card border-2 border-border text-foreground hover:border-border hover:bg-muted disabled:opacity-50 transition-all duration-300">
              {isFetchingMore ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-slate-600" />
                  불러오는 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  더 보기
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              )}
            </Button>
          </div>
        )}
      </SiteContainer>
    </div>
  );
}
