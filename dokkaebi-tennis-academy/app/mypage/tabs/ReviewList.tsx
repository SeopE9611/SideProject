'use client';

import { Card, CardContent } from '@/components/ui/card';

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
      <div className="text-center py-8">
        <p className="text-muted-foreground">작성한 리뷰가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">{review.date}</div>
            <div className="font-medium">{review.productName}</div>
            <div className="text-sm text-yellow-500">⭐️ {review.rating}점</div>
            <div className="text-sm">{review.content}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
