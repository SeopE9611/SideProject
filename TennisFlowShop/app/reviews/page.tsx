import Link from "next/link";
import ReviewsClient from "./_components/ReviewsClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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


      <Card className="mb-6 border-border bg-muted/30">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              작성 가능한 후기가 있나요?
            </p>
            <p className="text-sm text-muted-foreground">
              구매확정된 상품이나 완료된 서비스가 있다면 마이페이지에서 후기를 남길 수 있어요.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/mypage?tab=orders&scope=todo">
              작성 가능한 후기 확인하기
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ReviewsClient />
    </div>
  );
}
