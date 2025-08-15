import ReviewsClient from './_components/ReviewsClient';

export const metadata = {
  title: '리뷰 모아보기 | 도깨비 테니스',
  description: '상품/서비스 리뷰를 한 곳에서 확인하세요.',
  alternates: { canonical: '/reviews' },
};

export default function ReviewsPage() {
  return (
    <div className="container py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">리뷰 모아보기</h1>
      </div>
      <ReviewsClient />
    </div>
  );
}
