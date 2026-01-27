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
    if (!confirm(`선택한 ${selectedIds.length}개 상품을 장바구니에서 삭제할까요?`)) return;
    selectedIds.forEach((id) => removeItem(id));
    setSelectedIds([]);
    showSuccessToast?.('선택한 상품을 삭제했어요.');
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
                    const stock = item.stock ?? Number.POSITIVE_INFINITY;
                    const canDec = item.quantity > 1;
                    const maxStock = getMaxStock(item.stock);
                    const canInc = item.quantity < maxStock;

                    return (
                      <div key={item.id} className="rounded-xl bg-white p-3 bp-sm:p-4 shadow-sm transition hover:shadow-md dark:bg-slate-800">
                        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-center">
                          {/* 상단(모바일): 체크+썸네일+이름 */}
                          <div className="flex items-center gap-3 min-w-0">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="h-4 w-4 accent-blue-600" aria-label={`${item.name} 선택`} />
                            <Link href={`/products/${item.id}`} className="shrink-0">
                              <Image src={item.image || '/placeholder.svg?height=72&width=72'} alt={item.name} width={72} height={72} loading="lazy" className="aspect-square rounded-lg object-cover" />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link href={`/products/${item.id}`} className="block line-clamp-2 bp-sm:line-clamp-1 font-medium text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400">
                                {item.name}
                              </Link>
                              <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                개당 <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">{formatKRW(item.price)}원</span>
                              </div>
                            </div>
                          </div>

                          {/* 하단(모바일) */}
                          <div className="flex flex-wrap items-center gap-3 bp-sm:flex-nowrap bp-sm:justify-end bp-sm:flex-1">
                            {/* 수량 스테퍼 (pill, 비활성 표시) */}
                            <div className="order-1 flex flex-col items-center">
                              <div className="flex items-center rounded-full bg-slate-100 px-1 dark:bg-slate-700">
                                <Button variant="ghost" size="sm" className="h-8 w-8 disabled:opacity-40" aria-label={`${item.name} 수량 감소`} disabled={!canDec} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="tabular-nums w-8 select-none text-center font-medium">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 disabled:opacity-40"
                                  aria-label={`${item.name} 수량 증가`}
                                  disabled={!canInc}
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

                              {Number.isFinite(maxStock) && <span className={`mt-1 text-[11px] ${item.quantity >= maxStock ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>현재 가용 수량: {maxStock}개</span>}
                            </div>

                            <div className="order-2 ml-auto text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">합계</div>
                              <div className="tabular-nums text-lg font-semibold text-slate-900 dark:text-slate-100">{formatKRW(item.price * item.quantity)}원</div>
                            </div>

                            {/* 삭제 버튼 (컨펌) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${item.name} 삭제`}
                              onClick={() => {
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
                  <CardFooter className="p-4 bp-sm:p-6 pt-0">
                    <Button
                      className="h-14 w-full transform bg-gradient-to-r from-blue-600 to-indigo-600 text-lg font-semibold shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl"
                      size="lg"
                      asChild
                    >
                      {/* <Link href="/checkout?withService=1" className="flex items-center gap-3"> */}
                      <Link href={user ? '/checkout?withService=1' : `/login?redirectTo=${encodeURIComponent('/checkout?withService=1')}`} className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5" />
                        {/* {user ? '주문하기' : '비회원 주문하기'} */}
                        {user ? '주문하기' : '로그인 후 주문하기'}
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
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
        <div className="fixed inset-x-0 bottom-0 z-40 bp-md:hidden">
          <div className="rounded-t-2xl bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] backdrop-blur-md dark:bg-slate-800/95">
            <SiteContainer variant="full" className="max-w-screen-sm py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">결제 금액</span>
                <span className="tabular-nums text-lg font-bold text-blue-600 dark:text-blue-400">{formatKRW(total)}원</span>
              </div>
              <Button asChild className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold hover:from-blue-700 hover:to-indigo-700">
                {/* <Link href="/checkout?withService=1">주문하기</Link> */}
                <Link href={user ? '/checkout?withService=1' : `/login?redirectTo=${encodeURIComponent('/checkout?withService=1')}`}>{user ? '주문하기' : '로그인 후 주문하기'}</Link>
              </Button>
            </SiteContainer>
          </div>
        </div>
      )}
    </div>
  );
}
