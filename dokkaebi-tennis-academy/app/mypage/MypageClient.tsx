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
import { User, ShoppingBag, Calendar, Heart, Star, MessageCircleQuestion, Trophy, Award, TrendingUp, UserStar, UserStarIcon } from 'lucide-react';
import { Order } from '@/lib/types/order';

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

  // 임시 리뷰 데이터
  const reviews = [
    {
      id: 1,
      productName: '루키론 프로 스트링',
      rating: 5,
      date: '2023-04-20',
      content: '정말 좋은 스트링입니다. 내구성이 뛰어나고 타구감도 좋습니다.',
    },
    {
      id: 2,
      productName: '바볼랏 RPM 블라스트',
      rating: 4,
      date: '2023-03-15',
      content: '스핀이 잘 걸리고 컨트롤이 좋습니다. 다만 내구성이 조금 아쉽습니다.',
    },
  ];

  // 임시 Q&A 데이터
  const qnas = [
    {
      id: 1,
      title: '스트링 장착 서비스 문의',
      date: '2023-05-05',
      status: '답변 완료',
      category: '서비스',
    },
    {
      id: 2,
      title: '주문 취소 가능한가요?',
      date: '2023-04-28',
      status: '답변 대기',
      category: '주문/결제',
    },
  ];

  // 임시 위시리스트 데이터
  const wishlist = [
    {
      id: 3,
      name: '윌슨 NXT 파워',
      price: 28000,
    },
    {
      id: 5,
      name: '헤드 링키 스트링',
      price: 22000,
    },
  ];

  return (
    <AuthGuard>
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* 히어로 섹션 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-bounce" />
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-pulse" />
          </div>

          <div className="relative container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-6 mb-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                  <User className="h-12 w-12" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">안녕하세요, {user.name}님!</h1>
                  <p className="text-xl text-blue-100">도깨비 테니스 아카데미에 오신 것을 환영합니다</p>
                </div>
              </div>

              {/* 사용자 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-3 text-blue-200" />
                  <div className="text-2xl font-bold mb-1">{ordersCount}</div>
                  <div className="text-sm text-blue-200">총 주문</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-purple-200" />
                  <div className="text-2xl font-bold mb-1">{applicationsCount}</div>
                  <div className="text-sm text-purple-200">서비스 신청</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <UserStarIcon className="h-8 w-8 mx-auto mb-3 text-green-200" />
                  <div className="text-2xl font-bold mb-1"> {user.role === 'admin' ? '관리자' : '일반 회원'}</div>
                  <div className="text-sm text-green-200">회원 등급</div>
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
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full p-3">
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
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mb-8">
                  <CardContent className="p-6">
                    <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-gray-100 dark:bg-gray-800">
                      <TabsTrigger value="orders" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                        <ShoppingBag className="h-5 w-5" />
                        <span className="text-xs font-medium">주문 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="applications" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                        <Calendar className="h-5 w-5" />
                        <span className="text-xs font-medium">신청 내역</span>
                      </TabsTrigger>
                      <TabsTrigger value="wishlist" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                        <Heart className="h-5 w-5" />
                        <span className="text-xs font-medium">위시리스트</span>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                        <Star className="h-5 w-5" />
                        <span className="text-xs font-medium">리뷰 관리</span>
                      </TabsTrigger>
                      <TabsTrigger value="qna" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                        <MessageCircleQuestion className="h-5 w-5" />
                        <span className="text-xs font-medium">Q&A 내역</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                {/* 주문 내역 탭 */}
                <TabsContent value="orders" className="mt-0">
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full p-3">
                          <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full p-3">
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
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 rounded-full p-3">
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
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-full p-3">
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
                        <ReviewList reviews={reviews} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Q&A 내역 탭 */}
                <TabsContent value="qna" className="mt-0">
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-b">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full p-3">
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
                        <QnAList qnas={qnas} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* 하단 신뢰 지표 */}
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">프리미엄 서비스</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">15년 경력의 전문가가 제공하는 최고 품질의 서비스</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">지속적인 성장</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">고객과 함께 성장하는 도깨비 테니스 아카데미</p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">고객 만족도 98%</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">15,000+ 고객이 선택한 신뢰할 수 있는 서비스</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
