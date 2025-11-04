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
import { User, Trophy, Target, Star, MessageSquare, HelpCircle, Award, TrendingUp, UserCheck, Ticket, Heart, MessageCircleQuestion, ClipboardList, CalendarCheck, ReceiptCent, RectangleGoggles, Briefcase } from 'lucide-react';
import type { Order } from '@/lib/types/order';
import PassList from '@/app/mypage/tabs/PassList';
import PassListSkeleton from '@/app/mypage/tabs/PassListSkeleton';
import RentalsList from '@/app/mypage/tabs/RentalsList';
import RentalSkeleton from '@/app/mypage/tabs/RentalSkeleton';
import RentalsDetailClient from '@/app/mypage/rentals/_components/RentalsDetailClient';

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
  const selectedId = searchParams.get('id');
  return (
    <AuthGuard>
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/20">
        <div
          className="absolute inset-0 opacity-5 dark:opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M0 30h60v2H0zM28 0v60h2V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* 히어로 섹션 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-bounce" />
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse" />
          </div>

          <div className="relative container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg"></div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">안녕하세요, {user.name}님!</h1>
                  <p className="text-xl text-blue-100">도깨비 테니스의 회원이 되어주셔서 감사합니다</p>
                </div>
              </div>

              {/* 사용자 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <Trophy className="h-8 w-8 mx-auto mb-3 text-blue-200" />
                  <div className="text-2xl font-bold mb-1">{ordersCount}</div>
                  <div className="text-sm text-blue-200">총 주문</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <Target className="h-8 w-8 mx-auto mb-3 text-indigo-200" />
                  <div className="text-2xl font-bold mb-1">{applicationsCount}</div>
                  <div className="text-sm text-indigo-200">서비스 신청</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                  <UserCheck className="h-8 w-8 mx-auto mb-3 text-blue-300" />
                  <div className="text-2xl font-bold mb-1"> {user.role === 'admin' ? '관리자' : '일반 회원'}</div>
                  <div className="text-sm text-blue-300">회원 등급</div>
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
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-3 shadow-lg">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                    <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-slate-100 dark:bg-slate-700">
                      <TabsTrigger value="orders" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <ClipboardList className="h-5 w-5" />
                        <span className="text-xs font-medium">주문 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="applications" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <CalendarCheck className="h-5 w-5" />
                        <span className="text-xs font-medium">신청 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="rentals" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Briefcase className="h-5 w-5" />
                        <span className="text-xs font-medium">대여 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="wishlist" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Heart className="h-5 w-5" />
                        <span className="text-xs font-medium">위시리스트</span>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-xs font-medium">리뷰 관리</span>
                      </TabsTrigger>
                      <TabsTrigger value="qna" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <MessageCircleQuestion className="h-5 w-5" />
                        <span className="text-xs font-medium">Q&A 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="passes" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md">
                        <Ticket className="h-5 w-5" />
                        <span className="text-xs font-medium">패키지</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                {/* 주문 내역 탭 */}
                <TabsContent value="orders" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-3 shadow-lg">
                          <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-2xl p-3 shadow-lg">
                          <CalendarCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
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

                {/* 대여 내역 탭 */}
                <TabsContent value="rentals" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-2xl p-3 shadow-lg">
                          <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">대여 내역</CardTitle>
                          <CardDescription>라켓 대여 기록을 확인할 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {selectedId ? (
                        <Suspense fallback={<div className="p-6">불러오는 중…</div>}>
                          <RentalsDetailClient id={selectedId} />
                        </Suspense>
                      ) : (
                        <Suspense fallback={<RentalSkeleton />}>
                          <RentalsList />
                        </Suspense>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 위시리스트 탭 */}
                <TabsContent value="wishlist" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-2xl p-3 shadow-lg">
                          <Heart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 rounded-2xl p-3 shadow-lg">
                          <MessageSquare className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
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

                {/* 패키지 탭 */}
                <TabsContent value="passes" className="mt-0">
                  <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-2xl p-3 shadow-lg">
                          <Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">패키지</CardTitle>
                          <CardDescription>패키지를 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <Suspense fallback={<PassListSkeleton />}>
                        <PassList />
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
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">프리미엄 서비스</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">전문가가 제공하는 최고 품질의 서비스</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">지속적인 성장</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">고객과 함께 성장하는 도깨비 테니스</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
                  <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
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
