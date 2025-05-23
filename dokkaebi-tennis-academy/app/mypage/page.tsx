import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import UserSectionSkeleton from '@/app/mypage/UserSectionSkeleton';
import UserSection from '@/app/mypage/UserSection';
import OrderList from '@/app/mypage/tabs/OrderList';
import OrderListSkeleton from '@/app/mypage/tabs/OrderListSkeleton';
import QnAList from '@/app/mypage/tabs/QnAList';
import QnAListSkeleton from '@/app/mypage/tabs/QnAListSkeleton';
import ReviewListSkeleton from '@/app/mypage/tabs/ReviewListSkeleton';
import ReviewList from '@/app/mypage/tabs/ReviewList';
import WishlistSkeleton from '@/app/mypage/tabs/WishlistSkeleton';
import Wishlist from '@/app/mypage/tabs/Wishlist';
// import ProtectedClient from './ProtectedClient';

export default async function MyPage() {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect('/login');
  }
  // 임시 주문 내역 데이터
  const orders = [
    {
      id: 'ORD-2023-0001',
      date: '2023-05-01',
      total: 55000,
      status: '배송 완료',
      items: [
        { name: '루키론 프로 스트링', quantity: 2 },
        { name: '바볼랏 RPM 블라스트', quantity: 1 },
      ],
    },
    {
      id: 'ORD-2023-0002',
      date: '2023-04-15',
      total: 28000,
      status: '입금 확인',
      items: [{ name: '윌슨 NXT 파워', quantity: 1 }],
    },
    {
      id: 'ORD-2023-0003',
      date: '2023-04-10',
      total: 32000,
      status: '입금 대기',
      items: [{ name: '테크니파이버 블랙코드', quantity: 1 }],
    },
  ];

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
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* 사용자 정보 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder.svg?height=64&width=64" alt="프로필 이미지" />
                  <AvatarFallback>사용자</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{session?.user?.name}님</CardTitle>
                  <CardDescription>일반 회원</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage">주문 내역</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/wishlist">위시리스트</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/reviews">리뷰 관리</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/qna">Q&A 내역</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/profile">회원 정보 수정</Link>
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* 마이페이지 콘텐츠 */}
        <div className="md:col-span-3">
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders">주문 내역</TabsTrigger>
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
                  <Suspense fallback={<OrderListSkeleton />}>
                    <OrderList orders={orders} />
                  </Suspense>
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
  );
}
