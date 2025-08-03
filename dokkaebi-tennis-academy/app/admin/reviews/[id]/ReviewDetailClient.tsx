'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Trash2, User, Calendar, Tag, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

// 샘플 리뷰 데이터 (실제에는 API로 교체)
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

interface Props {
  reviewId: string;
}

export default function ReviewDetailClient({ reviewId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // 리뷰 ID로 데이터 조회 (실제에는 fetch / SWR 등으로 교체)
  const review = sampleReviews.find((r) => r.id === reviewId);

  if (!review) {
    return (
      <div className="p-6">
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-6">
          <div className="text-center">
            <MessageSquare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">리뷰를 찾을 수 없습니다</h1>
            <p className="text-gray-600">요청하신 리뷰가 존재하지 않거나 삭제되었습니다.</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
            <Link href="/admin/reviews">
              <ArrowLeft className="mr-2 h-4 w-4" />
              리뷰 목록으로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // 평점을 별로 표시
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`h-6 w-6 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
        ))}
        <span className="ml-2 text-lg font-semibold text-gray-900">{rating}/5</span>
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

  // 리뷰 타입에 따른 배지
  const getReviewTypeBadge = (type: Review['type']) => {
    switch (type) {
      case 'lesson':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">레슨 리뷰</Badge>;
      case 'stringing':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">스트링 서비스 리뷰</Badge>;
      case 'product':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">상품 리뷰</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">기타 리뷰</Badge>;
    }
  };

  // 삭제 처리
  const handleDelete = () => {
    if (confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
      setIsDeleting(true);
      // 실제 구현에서는 API 호출
      setTimeout(() => {
        router.push('/admin/reviews');
      }, 1000);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* 제목 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">리뷰 상세 보기</h1>
            <p className="mt-2 text-lg text-gray-600">고객 리뷰의 상세 정보를 확인하고 관리하세요</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" asChild className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
          <Link href="/admin/reviews">
            <ArrowLeft className="mr-2 h-4 w-4" />
            리뷰 목록으로 돌아가기
          </Link>
        </Button>
      </div>

      {/* 카드 */}
      <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm max-w-4xl mx-auto">
        <CardHeader className="pb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900">리뷰 정보</CardTitle>
              {getReviewTypeBadge(review.type)}
            </div>
            <CardDescription className="text-gray-600">해당 리뷰에 대한 상세 정보를 확인할 수 있습니다.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* 평점 */}
          <div className="text-center py-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">고객 평점</h3>
            {renderRating(review.rating)}
          </div>

          {/* 기본 정보 */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">작성자 정보</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">이름</p>
                  <p className="font-medium text-gray-900">{review.authorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">이메일</p>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-700">{review.authorEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 rounded-lg p-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">리뷰 정보</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">작성일</p>
                  <p className="font-medium text-gray-900">{formatDate(review.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">리뷰 타입</p>
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {review.type === 'lesson' && '레슨 리뷰'}
                      {review.type === 'stringing' && '스트링 서비스 리뷰'}
                      {review.type === 'product' && '상품 리뷰'}
                    </span>
                  </div>
                  {review.type === 'product' && review.productName && <p className="text-sm text-gray-500 mt-1">상품명: {review.productName}</p>}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* 내용 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">리뷰 내용</h3>
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-l-4 border-emerald-500">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line text-lg">"{review.content}"</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
