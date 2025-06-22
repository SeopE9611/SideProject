'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';
import OrderList from '@/app/mypage/tabs/OrderList';
import OrderListSkeleton from '@/app/mypage/tabs/OrderListSkeleton';
import Applications from '@/app/mypage/applications/page';
import ApplicationsSkeleton from '@/app/mypage/applications/loading';
import QnAList from '@/app/mypage/tabs/QnAList';
import QnAListSkeleton from '@/app/mypage/tabs/QnAListSkeleton';
import ReviewList from '@/app/mypage/tabs/ReviewList';
import ReviewListSkeleton from '@/app/mypage/tabs/ReviewListSkeleton';
import Wishlist from '@/app/mypage/tabs/Wishlist';
import WishlistSkeleton from '@/app/mypage/tabs/WishlistSkeleton';
import { UserSidebar } from '@/app/mypage/orders/_components/UserSidebar';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getMyInfo } from '@/lib/auth.client';
import { useAuthStore, User } from '@/lib/stores/auth-store';
import ApplicationDetail from '@/app/mypage/applications/_components/ApplicationDetail';
import OrderDetailClient from '@/app/mypage/orders/_components/OrderDetailClient';
import AuthGuard from '@/components/auth/AuthGuard';

export default function MypageClient() {
  const searchParams = useSearchParams(); // 현재 URL의 searchParams (?tab=reviews 등)를 가져옴
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 토큰 없으면 로그인 페이지로
    if (!token) {
      router.push('/login');
      return;
    }

    // 토큰 있을 때만 유저 정보 로드
    getMyInfo()
      .then(({ user }) => setUser(user))
      .catch(() => {
        logout();
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [token, router, logout]);

  if (!user) return null;

  const currentTab = searchParams.get('tab') ?? 'orders'; // 쿼리에서 tab 값을 가져오고, 없으면 'orders'로 기본값 설정

  const handleTabChange = (value: string) => {
    // 탭이 변경될 때 호출되는 함수
    const newParams = new URLSearchParams(searchParams.toString()); // 기존 searchParams 복사
    newParams.set('tab', value); // 새로운 탭 값 설정
    router.push(`/mypage?${newParams.toString()}`, { scroll: false }); // 쿼리 파라미터만 변경 (스크롤 이동 없이)
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
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 사용자 정보 */}
          <div className="md:col-span-1">
            <UserSidebar />
          </div>

          {/* 마이페이지 콘텐츠 */}
          <div className="md:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              {/* 탭 버튼 리스트 */}
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="orders">주문 내역</TabsTrigger>
                <TabsTrigger value="applications">신청 내역</TabsTrigger>
                <TabsTrigger value="wishlist">위시리스트</TabsTrigger>
                <TabsTrigger value="reviews">리뷰 관리</TabsTrigger>
                <TabsTrigger value="qna">Q&A 내역</TabsTrigger>
              </TabsList>

              {/* 주문 내역 탭 */}
              <TabsContent value="orders" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>주문 내역</CardTitle>
                    <CardDescription>최근 주문 내역을 확인하실 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<OrderListSkeleton />}>{orderId ? <OrderDetailClient orderId={orderId} /> : <OrderList />}</Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 신청 내역 탭 */}
              <TabsContent value="applications" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>신청 내역</CardTitle>
                    <CardDescription>신청한 서비스의 상태를 확인할 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedApplicationId ? (
                      <ApplicationDetail id={selectedApplicationId} />
                    ) : (
                      <Suspense fallback={<ApplicationsSkeleton />}>
                        <Applications />
                      </Suspense>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 위시리스트 탭 */}
              <TabsContent value="wishlist" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>위시리스트</CardTitle>
                    <CardDescription>찜한 상품 목록을 확인하실 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<WishlistSkeleton />}>
                      <Wishlist wishlist={wishlist} />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 리뷰 관리 탭 */}
              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>리뷰 관리</CardTitle>
                    <CardDescription>작성한 리뷰를 확인하고 관리하실 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ReviewListSkeleton />}>
                      <ReviewList reviews={reviews} />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Q&A 내역 탭 */}
              <TabsContent value="qna" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Q&A 내역</CardTitle>
                    <CardDescription>문의 내역을 확인하실 수 있습니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
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
    </AuthGuard>
  );
}
