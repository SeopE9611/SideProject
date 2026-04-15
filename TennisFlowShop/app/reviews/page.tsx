import { Button } from "@/components/ui/button";
import Link from "next/link";
import ReviewsClient from "./_components/ReviewsClient";

export const metadata = {
  title: "리뷰 게시판 | 도깨비테니스스트링",
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

          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight break-keep tracking-tight text-foreground">리뷰 게시판</h1>
        </div>

        <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
          <Link href="/board">게시판 홈으로</Link>
        </Button>
      </div>

      <ReviewsClient />
    </div>
  );
}
