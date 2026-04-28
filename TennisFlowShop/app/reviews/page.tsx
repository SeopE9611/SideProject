import ReviewsClient from "./_components/ReviewsClient";

export const metadata = {
  title: "리뷰",
  description: "실제 구매와 서비스 이용 경험을 바탕으로 작성된 후기를 확인할 수 있습니다.",
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
            <span>리뷰</span>
          </div>

          <h1 className="font-bold text-lg sm:text-xl md:text-2xl leading-tight break-keep tracking-normal text-foreground">리뷰</h1>
          <p className="mt-1 text-sm text-muted-foreground">실제 구매·서비스 이용 경험을 바탕으로 작성된 후기입니다.</p>
        </div>
      </div>

      <ReviewsClient />
    </div>
  );
}
