import ReviewsClient from "./_components/ReviewsClient";

export const metadata = {
  title: "리뷰 게시판 | 도깨비테니스",
  description: "상품/서비스 리뷰를 한 곳에서 확인할 수 있는 리뷰 게시판입니다.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">게시판</span>
            <span className="mx-1">›</span>
            <span>리뷰 게시판</span>
          </div>

          <h1 className="font-bold text-lg sm:text-xl md:text-2xl leading-tight break-keep tracking-normal text-foreground">리뷰 게시판</h1>
        </div>
      </div>

      <ReviewsClient />
    </div>
  );
}
