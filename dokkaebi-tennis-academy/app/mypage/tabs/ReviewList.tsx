'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Calendar, Edit3, Trash2, ArrowRight, Award } from 'lucide-react';

interface Review {
  id: number;
  productName: string;
  rating: number;
  date: string;
  content: string;
}

interface ReviewListProps {
  reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews.length) {
    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
            <Star className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">작성한 리뷰가 없습니다</h3>
          <p className="mb-6 text-slate-600 dark:text-slate-400">구매하신 상품에 대한 소중한 후기를 남겨주세요!</p>
          <Button asChild className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Link href="/reviews/write" className="inline-flex items-center gap-2">
              리뷰 작성하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />);
  };

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <Card key={review.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{review.productName}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{review.rating}.0</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-950 bg-transparent">
                  <Edit3 className="h-3 w-3 mr-1" />
                  수정
                </Button>
                <Button size="sm" variant="outline" className="border-slate-200 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:hover:border-red-600 dark:hover:bg-red-950 text-red-600 hover:text-red-700 bg-transparent">
                  <Trash2 className="h-3 w-3 mr-1" />
                  삭제
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{review.content}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>{review.date}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">도움이 되었나요?</span>
                <Button size="sm" variant="ghost" className="h-8 px-3 text-xs">
                  👍 도움됨
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
