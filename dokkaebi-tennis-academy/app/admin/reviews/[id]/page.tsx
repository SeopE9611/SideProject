'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Trash2, User, Calendar, Tag, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

// 리뷰 데이터 타입 정의
interface Review {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  rating: number;
  createdAt: string;
  type: 'lesson' | 'stringing' | 'product';
  productName?: string;
}

// 샘플 리뷰 데이터
const sampleReviews: Review[] = [
  {
    id: 'rev_001',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '코치님의 지도가 매우 친절하고 전문적이었습니다. 기본기부터 차근차근 알려주셔서 실력이 많이 향상되었어요. 다음 시즌에도 꼭 등록하고 싶습니다.',
    rating: 5,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'lesson',
  },
  {
    id: 'rev_002',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '스트링 장력이 제가 원하는 대로 정확하게 맞춰주셨어요. 타구감이 확실히 좋아졌습니다.',
    rating: 4,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'stringing',
  },
  {
    id: 'rev_003',
    authorName: '김재민',
    authorEmail: 'tennis@example.com',
    content: '그룹 레슨이 너무 재미있었어요. 다른 회원들과 함께 배우면서 동기부여도 되고 좋았습니다.',
    rating: 5,
    createdAt: '2025-01-01T09:30:00Z',
    type: 'lesson',
  },
];

export default async function ReviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  // 리뷰 ID로 데이터 조회
  const review = sampleReviews.find((r) => r.id === params.id);

  // 리뷰가 없을 경우 처리
  if (!review) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold">리뷰를 찾을 수 없습니다</h1>
        <Button asChild>
          <Link href="/admin/reviews">
            <ArrowLeft className="mr-2 h-4 w-4" /> 리뷰 목록으로 돌아가기
          </Link>
        </Button>
      </div>
    );
  }

  // 평점을 별로 표시
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`h-5 w-5 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    }).format(date);
  };

  // 리뷰 타입에 따른 배지 색상
  const getReviewTypeBadge = (type: Review['type']) => {
    switch (type) {
      case 'lesson':
        return <Badge className="bg-blue-600 hover:bg-blue-700">레슨 리뷰</Badge>;
      case 'stringing':
        return <Badge className="bg-green-600 hover:bg-green-700">스트링 서비스 리뷰</Badge>;
      case 'product':
        return <Badge className="bg-purple-600 hover:bg-purple-700">상품 리뷰</Badge>;
      default:
        return <Badge>기타 리뷰</Badge>;
    }
  };

  // 리뷰 삭제 처리
  const handleDelete = () => {
    if (confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      setIsDeleting(true);

      // 실제 구현에서는 API 호출
      setTimeout(() => {
        // 삭제 후 리뷰 목록 페이지로 이동
        router.push('/admin/reviews');
      }, 1000);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8 pt-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/reviews">
            <ArrowLeft className="mr-2 h-4 w-4" /> 리뷰 목록으로 돌아가기
          </Link>
        </Button>
      </div>

      {/* 메인 카드 */}
      <Card className="bg-background text-foreground">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-2xl font-bold">리뷰 상세 보기</CardTitle>
            <CardDescription>해당 리뷰에 대한 상세 정보를 확인할 수 있습니다.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 기본 정보 */}
          <div className="rounded-md bg-muted/40 p-4 shadow-md">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 작성자 정보 */}
              <div className="flex items-start space-x-3">
                <User className="mt-0.5 h-5 w-5 text-muted" />
                <div>
                  <h3 className="font-medium text-foreground">작성자</h3>
                  <p className="text-muted-foreground">{review.authorName}</p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{review.authorEmail}</span>
                  </div>
                </div>
              </div>

              {/* 작성일 */}
              <div className="flex items-start space-x-3">
                <Calendar className="mt-0.5 h-5 w-5 text-muted" />
                <div>
                  <h3 className="font-medium text-foreground">작성일</h3>
                  <p className="text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
              </div>

              {/* 리뷰 타입 */}
              <div className="flex items-start space-x-3">
                <Tag className="mt-0.5 h-5 w-5 text-muted" />
                <div>
                  <h3 className="font-medium text-foreground">리뷰 타입</h3>
                  <div className="mt-1">{getReviewTypeBadge(review.type)}</div>
                  {review.type === 'product' && review.productName && <p className="mt-1 text-sm text-muted-foreground">상품명: {review.productName}</p>}
                </div>
              </div>

              {/* 평점 */}
              <div className="flex items-start space-x-3">
                <Star className="mt-0.5 h-5 w-5 text-muted" />
                <div>
                  <h3 className="font-medium text-foreground">평점</h3>
                  <div className="mt-1">{renderRating(review.rating)}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-muted" />

          {/* 리뷰 내용 */}
          <div>
            <h3 className="mb-2 font-medium text-foreground">리뷰 내용</h3>
            <div className="rounded-md bg-muted/40 p-4 shadow-md">
              <p className="whitespace-pre-line text-muted-foreground">{review.content}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-2 pt-2">
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-[#ef4444] text-[#ffffff] hover:bg-opacity-90 dark:bg-[#b91c1c] dark:text-foreground">
            {isDeleting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                리뷰 삭제
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
