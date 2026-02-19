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
import { User, Trophy, Target, MessageSquare, UserCheck, Ticket, Heart, MessageCircleQuestion, ClipboardList, CalendarCheck, ReceiptCent, Briefcase, Layers } from 'lucide-react';
import type { Order } from '@/lib/types/order';
import PassList from '@/app/mypage/tabs/PassList';
import PassListSkeleton from '@/app/mypage/tabs/PassListSkeleton';
import RentalsList from '@/app/mypage/tabs/RentalsList';
import RentalSkeleton from '@/app/mypage/tabs/RentalSkeleton';
import RentalsDetailClient from '@/app/mypage/rentals/_components/RentalsDetailClient';
import MyPointsTab from '@/app/mypage/tabs/MyPointsTab';
import { Badge } from '@/components/ui/badge';
import SiteContainer from '@/components/layout/SiteContainer';
import ActivityFeedSkeleton from '@/app/mypage/tabs/ActivityFeedSkeleton';
import ActivityFeed from '@/app/mypage/tabs/ActivityFeed';
import { FullPageSpinner } from '@/components/system/PageLoading';
import { showErrorToast } from '@/lib/toast';

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    oauthProviders?: Array<'kakao' | 'naver'>;
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
    let mounted = true;
    const controller = new AbortController();

    const parseCountResponse = async (res: Response, label: 'orders' | 'applications') => {
      if (!res.ok) {
        throw new Error(`${label} fetch failed: ${res.status}`);
      }

      const data = (await res.json().catch(() => null)) as { total?: unknown } | null;
      return typeof data?.total === 'number' ? data.total : 0;
    };

    (async () => {
      const [ordersResult, applicationsResult] = await Promise.allSettled([
        fetch('/api/users/me/orders', { signal: controller.signal }).then((res) => parseCountResponse(res, 'orders')),
        fetch('/api/applications/me', { signal: controller.signal }).then((res) => parseCountResponse(res, 'applications')),
      ]);

      if (!mounted) return;

      if (ordersResult.status === 'fulfilled') {
        setOrdersCount(ordersResult.value);
      } else if (!(ordersResult.reason instanceof DOMException && ordersResult.reason.name === 'AbortError')) {
        setOrdersCount(0);
        showErrorToast('주문 카운트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }

      if (applicationsResult.status === 'fulfilled') {
        setApplicationsCount(applicationsResult.value);
      } else if (!(applicationsResult.reason instanceof DOMException && applicationsResult.reason.name === 'AbortError')) {
        setApplicationsCount(0);
        showErrorToast('신청 카운트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <FullPageSpinner label="마이페이지 불러오는 중..." />;
  }
  
  if (!user) return null;

  const currentTab = searchParams.get('tab') ?? 'activity'; // 마이페이지 첫 진입 시 “전체”를 기본으로

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());

    // 현재 탭 변경
    newParams.set('tab', value);

    // 탭 전환 시, 다른 도메인의 상세 id는 정리
    if (value !== 'orders') {
      newParams.delete('orderId');
    }
    if (value !== 'applications') {
      newParams.delete('applicationId');
    }
    if (value !== 'rentals') {
      newParams.delete('rentalId');
    }

    router.push(`/mypage?${newParams.toString()}`, { scroll: false });
  };

  const orderId = searchParams.get('orderId');
  const selectedApplicationId = searchParams.get('applicationId');
  const selectedRentalId = searchParams.get('rentalId');

  return (
    <AuthGuard>
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-background dark:via-slate-800 dark:to-blue-900/20">
        <div
          className="absolute inset-0 opacity-5 dark:opacity-10 bp-xs:hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M0 30h60v2H0zM28 0v60h2V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bp-xs:hidden">
            <div className="absolute top-10 left-10 w-20 h-20 bg-card/10 rounded-full animate-pulse" />
            <div className="absolute top-32 right-20 w-16 h-16 bg-card/5 rounded-full" />
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-card/10 rounded-full animate-pulse" />
          </div>

          <SiteContainer variant="wide" className="relative py-6 bp-sm:py-10 bp-lg:py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-6 bp-sm:mb-8">
                <div className="bg-card/20 backdrop-blur-sm rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 shadow-lg">
                  <User className="h-6 w-6 bp-sm:h-8 bp-sm:w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl bp-sm:text-3xl bp-lg:text-5xl font-black mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent truncate">안녕하세요, {user.name}님!</h1>
                  <p className="text-sm bp-sm:text-base bp-lg:text-xl text-blue-100">도깨비 테니스의 회원이 되어주셔서 감사합니다</p>
                </div>
              </div>

              <div className="grid grid-cols-2 bp-lg:grid-cols-4 gap-3 bp-sm:gap-4 bp-lg:gap-6">
                <div className="bg-card/10 backdrop-blur-sm rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center shadow-lg">
                  <Trophy className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-blue-200" />
                  <div className="text-xl bp-sm:text-2xl font-bold mb-1">{ordersCount}</div>
                  <div className="text-xs bp-sm:text-sm text-blue-200">총 주문</div>
                </div>
                <div className="bg-card/10 backdrop-blur-sm rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center shadow-lg">
                  <Target className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-indigo-200" />
                  <div className="text-xl bp-sm:text-2xl font-bold mb-1">{applicationsCount}</div>
                  <div className="text-xs bp-sm:text-sm text-indigo-200">서비스 신청</div>
                </div>
                <div className="bg-card/10 backdrop-blur-sm rounded-xl bp-sm:rounded-2xl p-4 bp-sm:p-6 text-center shadow-lg col-span-2 bp-lg:col-span-1">
                  <UserCheck className="h-6 w-6 bp-sm:h-8 bp-sm:w-8 mx-auto mb-2 bp-sm:mb-3 text-blue-300" />
                  <div className="text-xl bp-sm:text-2xl font-bold mb-1">{user.role === 'admin' ? '관리자' : '일반 회원'}</div>
                  <div className="text-xs bp-sm:text-sm text-blue-300">회원 등급</div>
                </div>
              </div>
            </div>
          </SiteContainer>
        </div>

        <SiteContainer variant="wide" className="py-6 bp-sm:py-8 bp-lg:py-12">
          <div className="grid grid-cols-1 gap-6 bp-lg:grid-cols-4 bp-lg:gap-8">
            <div className="hidden bp-lg:block bp-lg:col-span-1">
              <div className="sticky top-8">
                <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-3 shadow-lg">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{user.name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                          {user.oauthProviders?.length ? (
                            <>
                              {user.oauthProviders.includes('kakao') && (
                                <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300 text-xs py-0 px-2 h-5">
                                  카카오
                                </Badge>
                              )}
                              {user.oauthProviders.includes('naver') && (
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs py-0 px-2 h-5">
                                  네이버
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">일반 계정</span>
                          )}
                        </div>
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
            <div className="bp-lg:col-span-3 min-w-0">
              <Tabs value={currentTab} onValueChange={handleTabChange}>
                <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm mb-6 bp-sm:mb-8">
                  <CardContent className="p-3 bp-sm:p-4 bp-lg:p-6">
                    <TabsList className="h-auto w-full p-1 bg-muted dark:bg-muted grid grid-cols-4 gap-1 bp-md:grid-cols-9">
                      <TabsTrigger
                        value="activity"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-3 rounded-lg data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <Layers className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">전체</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="orders"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <ClipboardList className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">주문 내역</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="applications"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <CalendarCheck className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">신청 내역</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="rentals"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <Briefcase className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">대여 내역</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="wishlist"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <Heart className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">위시리스트</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="reviews"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <MessageSquare className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">리뷰 관리</span>
                      </TabsTrigger>

                      <TabsTrigger value="qna" className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0">
                        <MessageCircleQuestion className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">Q&A 내역</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="passes"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <Ticket className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">패키지</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="points"
                        className="w-full flex flex-col items-center gap-1 bp-sm:gap-2 py-2.5 bp-sm:py-3 px-2 bp-sm:px-4 data-[state=active]:bg-card dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-md min-w-0"
                      >
                        <ReceiptCent className="h-4 w-4 bp-sm:h-5 bp-sm:w-5" />
                        <span className="text-[11px] bp-sm:text-xs font-medium whitespace-nowrap">적립 포인트</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                {/* 전체 활동 탭 */}
                <TabsContent value="activity" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg bg-muted dark:bg-muted">
                          <Layers className="h-5 w-5 bp-sm:h-6 bp-sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">전체 활동</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">주문·대여·교체 서비스 신청을 시간순으로 한 번에 확인합니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<ActivityFeedSkeleton />}>
                        <ActivityFeed />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 주문 내역 탭 */}
                <TabsContent value="orders" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <ClipboardList className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">주문 내역</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">최근 주문 내역을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<OrderListSkeleton />}>{orderId ? <OrderDetailClient orderId={orderId} /> : <OrderList />}</Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 신청 내역 탭 */}
                <TabsContent value="applications" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-green-100 to-teal-100 dark:from-emerald-900 dark:to-emerald-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <CalendarCheck className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">신청 내역</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">신청한 서비스의 상태를 확인할 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
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
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <Briefcase className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">대여 내역</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">라켓 대여 기록을 확인할 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      {selectedRentalId ? (
                        <Suspense fallback={<div className="p-6">불러오는 중…</div>}>
                          <RentalsDetailClient id={selectedRentalId} />
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
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <Heart className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">위시리스트</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">찜한 상품 목록을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<WishlistSkeleton />}>
                        <Wishlist />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 리뷰 관리 탭 */}
                <TabsContent value="reviews" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <MessageSquare className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">리뷰 관리</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">작성한 리뷰를 확인하고 관리하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<ReviewListSkeleton />}>
                        <ReviewList />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Q&A 내역 탭 */}
                <TabsContent value="qna" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <MessageCircleQuestion className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">Q&A 내역</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">문의 내역을 확인하고 답변을 받으실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<QnAListSkeleton />}>
                        <QnAList />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 패키지 탭 */}
                <TabsContent value="passes" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <Ticket className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">패키지</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">보유 중인 패키지를 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<PassListSkeleton />}>
                        <PassList />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 적립 포인트 탭 */}
                <TabsContent value="points" className="mt-0">
                  <Card className="border-0 shadow-xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-b p-4 bp-sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900 dark:to-yellow-900 rounded-xl bp-sm:rounded-2xl p-2.5 bp-sm:p-3 shadow-lg">
                          <ReceiptCent className="h-5 w-5 bp-sm:h-6 bp-sm:w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg bp-sm:text-xl">적립 포인트</CardTitle>
                          <CardDescription className="text-xs bp-sm:text-sm">포인트 적립 및 사용 내역을 확인하실 수 있습니다.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bp-sm:p-6">
                      <Suspense fallback={<div className="p-4">불러오는 중…</div>}>
                        <MyPointsTab />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SiteContainer>
      </div>
    </AuthGuard>
  );
}
