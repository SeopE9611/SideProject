'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';
import OrderList from '@/app/mypage/tabs/OrderList';
import OrderListSkeleton from '@/app/mypage/tabs/OrderListSkeleton';
import ApplicationsClient from '@/app/mypage/applications/_components/ApplicationsClient';
import ApplicationsSkeleton from '@/app/mypage/applications/loading';
import QnAList from '@/app/mypage/tabs/QnAList';
import QnAListSkeleton from '@/app/mypage/tabs/QnAListSkeleton';
import ReviewList from '@/app/mypage/tabs/ReviewList';
import ReviewListSkeleton from '@/app/mypage/tabs/ReviewListSkeleton';
import Wishlist from '@/app/mypage/tabs/Wishlist';
import WishlistSkeleton from '@/app/mypage/tabs/WishlistSkeleton';
import { UserSidebar } from '@/app/mypage/orders/_components/UserSidebar';
import { useState, useEffect } from 'react';
import ApplicationDetail from '@/app/mypage/applications/_components/ApplicationDetail';
import OrderDetailClient from '@/app/mypage/orders/_components/OrderDetailClient';
import AuthGuard from '@/components/auth/AuthGuard';
import { User, ShoppingBag, Calendar, Heart, Star, MessageCircleQuestion, Trophy, Award, TrendingUp, UserSearch as UserStar, Zap } from 'lucide-react';
import type { Order } from '@/lib/types/order';

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

// 주문, 신청서 카운터 상태관리

export default function MypageClient({ user }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // 주문, 신청서 카운터 상태관리
  const [ordersCount, setOrdersCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);

  useEffect(() => {
    fetch('/api/users/me/orders')
      .then((res) => res.json())
      .then((data: { items: Order[]; total: number }) => setOrdersCount(data.total));

    fetch('/api/applications/me')
      .then((res) => res.json())
      .then((data: { items: any[]; total: number }) => setApplicationsCount(data.total));
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return null;
  if (!user) return null;

  const currentTab = searchParams.get('tab') ?? 'orders';

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', value);
    router.push(`/mypage?${newParams.toString()}`, { scroll: false });
  };

  const orderId = searchParams.get('orderId');
  const selectedApplicationId = searchParams.get('id');

  return (
    <AuthGuard>
      <div className="min-h-full bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20">
        {/* 히어로 섹션 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-bounce" />
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse" />
          </div>

          <div className="relative container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">안녕하세요, {user.name}님!</h1>
                  <p className="text-xl text-emerald-100">도깨비 테니스의 회원이 되어주셔서 감사합니다</p>
                </div>
              </div>

              {/* 사용자 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-3 text-emerald-200" />
                  <div className="text-2xl font-bold mb-1">{ordersCount}</div>
                  <div className="text-sm text-emerald-200">총 주문</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-green-200" />
                  <div className="text-2xl font-bold mb-1">{applicationsCount}</div>
                  <div className="text-sm text-green-200">서비스 신청</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <UserStar className="h-8 w-8 mx-auto mb-3 text-emerald-300" />
                  <div className="text-2xl font-bold mb-1"> {user.role === 'admin' ? '관리자' : '일반 회원'}</div>
                  <div className="text-sm text-emerald-300">회원 등급</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* 사이드바 */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-2xl p-3 shadow-lg">
                        <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <CardDescription className="text-sm">{user.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <UserSidebar />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-3">
              <Tabs value={currentTab} onValueChange={handleTabChange}>
                {/* 탭 네비게이션 */}
                <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm mb-8">
                  <CardContent className="p-6">
                    <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-700">
                      <TabsTrigger value="orders" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <ShoppingBag className="h-5 w-5" />
                        <span className="text-xs font-medium">주문 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="applications" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Calendar className="h-5 w-5" />
                        <span className="text-xs font-medium">신청 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="wishlist" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Heart className="h-5 w-5" />
                        <span className="text-xs font-medium">위시리스트</span>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Star className="h-5 w-5" />
                        <span className="text-xs font-medium">리뷰 관리</span>
                      </TabsTrigger>
                      <TabsTrigger value="qna" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <MessageCircleQuestion className="h-5 w-5" />
                        <span className="text-xs font-medium">Q&A 내역</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                {/* 주문 내역 탭 */}
                <TabsContent value="orders" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-2xl p-3 shadow-lg">
                          <ShoppingBag className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">주문 내역</CardTitle>
                          <CardDescription>최근 주문 내역을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Suspense fallback={<OrderListSkeleton />}>{orderId ? <OrderDetailClient orderId={orderId} /> : <OrderList />}</Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 신청 내역 탭 */}
                <TabsContent value="applications" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-2xl p-3 shadow-lg">
                          <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">신청 내역</CardTitle>
                          <CardDescription>신청한 서비스의 상태를 확인할 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {selectedApplicationId ? (
                        <ApplicationDetail id={selectedApplicationId} />
                      ) : (
                        <Suspense fallback={<ApplicationsSkeleton />}>
                          <ApplicationsClient />
                        </Suspense>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 위시리스트 탭 */}
                <TabsContent value="wishlist" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 rounded-2xl p-3 shadow-lg">
                          <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">위시리스트</CardTitle>
                          <CardDescription>찜한 상품 목록을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Suspense fallback={<WishlistSkeleton />}>
                        <Wishlist />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 리뷰 관리 탭 */}
                <TabsContent value="reviews" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-2xl p-3 shadow-lg">
                          <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">리뷰 관리</CardTitle>
                          <CardDescription>작성한 리뷰를 확인하고 관리하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Suspense fallback={<ReviewListSkeleton />}>
                        <ReviewList />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Q&A 내역 탭 */}
                <TabsContent value="qna" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-2xl p-3 shadow-lg">
                          <MessageCircleQuestion className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Q&A 내역</CardTitle>
                          <CardDescription>문의 내역을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Suspense fallback={<QnAListSkeleton />}>
                        <QnAList />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* 하단 신뢰 지표 */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-t">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Award className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">프리미엄 서비스</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">15년 경력의 전문가가 제공하는 최고 품질의 서비스</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">지속적인 성장</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">고객과 함께 성장하는 도깨비 테니스</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Trophy className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">고객 만족도 98%</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">15,000+ 고객이 선택한 신뢰할 수 있는 서비스</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
