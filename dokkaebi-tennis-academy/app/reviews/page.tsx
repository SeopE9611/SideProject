import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ReviewsClient from './_components/ReviewsClient';

export const metadata = {
  title: '리뷰 게시판 | 도깨비 테니스',
  description: '상품/서비스 리뷰를 한 곳에서 확인할 수 있는 리뷰 게시판입니다.',
  alternates: { canonical: '/reviews' },
};

export default function ReviewsPage() {
  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">게시판</span>
            <span className="mx-1">›</span>
            <span>리뷰 게시판</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">리뷰 게시판</h1>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/board">게시판 홈으로</Link>
        </Button>
      </div>

      <ReviewsClient />
    </div>
  );
}
