'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Star, Package, Truck, Shield, ShoppingCart, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/app/store/cartStore';
import { useAuthStore, type User } from '@/app/store/authStore';
import { getMyInfo } from '@/lib/auth.client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showErrorToast } from '@/lib/toast';

export default function CartPageClient() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { items: cartItems, removeItem, updateQuantity, clearCart } = useCartStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyInfo()
      .then(({ user }) => {
        setUser(user);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [logout]);

  if (loading) return <p>null</p>;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 30000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] opacity-10"></div>
        <div className="relative container py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">장바구니</h1>
              <p className="text-blue-100">선택하신 상품들을 확인하고 주문을 진행해보세요</p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>총 {cartItems.length}개 상품</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>30,000원 이상 무료배송</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container py-8">
        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* 장바구니 상품 목록 */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                    선택한 상품 ({cartItems.length}개)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* 데스크톱 헤더 */}
                  <div className="hidden md:grid grid-cols-12 text-sm font-medium p-4 bg-slate-50/50 dark:bg-slate-700/50 border-b">
                    <div className="col-span-6">상품정보</div>
                    <div className="col-span-2 text-center">가격</div>
                    <div className="col-span-2 text-center">수량</div>
                    <div className="col-span-2 text-right">합계</div>
                  </div>

                  {cartItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-300 ${
                        index % 2 === 0 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''
                      }`}
                    >
                      {/* 모바일 레이아웃 */}
                      <div className="md:hidden space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="relative group">
                            <Image
                              src={item.image || '/placeholder.svg?height=80&width=80&query=tennis+product'}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="rounded-lg border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div className="flex-1">
                            <Link href={`/products/${item.id}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                              {item.name}
                            </Link>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-lg font-bold text-blue-600">{item.price.toLocaleString()}원</span>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => removeItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">
                            <Button variant="ghost" size="sm" className="h-10 w-10 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => updateQuantity(item.id, Math.max(item.quantity - 1, 1))}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => {
                                const stock = item.stock ?? Number.POSITIVE_INFINITY;
                                if (item.quantity + 1 > stock) {
                                  showErrorToast(
                                    <>
                                      <p>
                                        <strong>{item.name}</strong>의 최대 주문 수량은 {stock}개입니다.
                                      </p>
                                      <p>더 이상 수량을 늘릴 수 없습니다.</p>
                                    </>
                                  );
                                  return;
                                }
                                updateQuantity(item.id, item.quantity + 1);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{(item.price * item.quantity).toLocaleString()}원</div>
                          </div>
                        </div>
                      </div>

                      {/* 데스크톱 레이아웃 */}
                      <div className="hidden md:grid md:grid-cols-12 items-center">
                        <div className="col-span-6 flex items-center gap-4">
                          <div className="relative group">
                            <Image
                              src={item.image || '/placeholder.svg?height=80&width=80&query=tennis+product'}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="rounded-lg border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div>
                            <Link href={`/products/${item.id}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                              {item.name}
                            </Link>
                          </div>
                        </div>

                        <div className="col-span-2 text-center">
                          <span className="text-lg font-semibold text-blue-600">{item.price.toLocaleString()}원</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-center">
                          <div className="flex items-center bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">
                            <Button variant="ghost" size="sm" className="h-10 w-10 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => updateQuantity(item.id, Math.max(item.quantity - 1, 1))}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => {
                                const stock = item.stock ?? Number.POSITIVE_INFINITY;
                                if (item.quantity + 1 > stock) {
                                  showErrorToast(
                                    <>
                                      <p>
                                        <strong>{item.name}</strong>의 최대 주문 수량은 {stock}개입니다.
                                      </p>
                                      <p>더 이상 수량을 늘릴 수 없습니다.</p>
                                    </>
                                  );
                                  return;
                                }
                                updateQuantity(item.id, item.quantity + 1);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{(item.price * item.quantity).toLocaleString()}원</span>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="bg-gradient-to-r from-slate-50/50 via-blue-50/30 to-purple-50/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/30 rounded-b-lg">
                  <div className="flex flex-col sm:flex-row justify-between w-full gap-4">
                    <Button variant="outline" className="group hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 bg-transparent" asChild>
                      <Link href="/products" className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        쇼핑 계속하기
                      </Link>
                    </Button>
                    <Button variant="destructive" className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg" onClick={clearCart}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      장바구니 비우기
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* 주문 요약 및 결제 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-0 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 p-6 text-white">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-white/20 rounded-full">
                        <Package className="h-5 w-5" />
                      </div>
                      주문 요약
                    </CardTitle>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">상품 금액</span>
                        <span className="font-semibold text-lg">{subtotal.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">배송비</span>
                        <span className={`font-semibold ${shippingFee === 0 ? 'text-green-600' : 'text-slate-800 dark:text-slate-200'}`}>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>총 결제 금액</span>
                        <span className="text-blue-600">{total.toLocaleString()}원</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                        <Star className="h-4 w-4" />
                        <span className="font-semibold">배송 혜택</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        30,000원 이상 구매 시 무료배송
                        {subtotal < 30000 && <span className="block mt-1 font-semibold">{(30000 - subtotal).toLocaleString()}원 더 구매하면 무료배송!</span>}
                      </p>
                    </div>

                    {/* 서비스 보장 아이콘 */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <Shield className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <span className="text-blue-700 dark:text-blue-400">안전결제</span>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <Truck className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <span className="text-green-700 dark:text-green-400">빠른배송</span>
                      </div>
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <Star className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                        <span className="text-purple-700 dark:text-purple-400">A/S보장</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300"
                      size="lg"
                      asChild
                    >
                      <Link href="/checkout" className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5" />
                        {user ? '주문하기' : '비회원 주문하기'}
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl text-center overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 p-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6 shadow-xl">
                  <PackageOpen className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-slate-200">장바구니가 비어있습니다</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">마음에 드는 테니스 용품을 장바구니에 담아보세요!</p>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">추천 상품</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">인기 상품</p>
                  </div>
                  <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <Truck className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">빠른 배송</p>
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 text-white font-semibold py-3 px-8 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300"
                  size="lg"
                  asChild
                >
                  <Link href="/products" className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5" />
                    쇼핑하러 가기
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
