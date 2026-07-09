import Link from "next/link";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
import ReviewsClient from "./_components/ReviewsClient";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "리뷰",
  description: "실제 구매와 서비스 이용 경험을 바탕으로 작성된 후기를 확인할 수 있습니다.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        eyebrow="리뷰"
        title="고객 리뷰"
        description="실제 구매·서비스 이용 경험을 바탕으로 작성된 후기입니다."
      />
      <SiteContainer className="space-y-6 py-6 md:py-8">
        <SummaryCard
          title="작성 가능한 후기가 있나요?"
          description="구매확정·수령확인·반납완료 내역에서 후기를 남길 수 있어요."
          action={
            <Button asChild className="w-full sm:w-auto">
              <Link href="/mypage?tab=orders&scope=todo">작성 가능한 후기 확인하기</Link>
            </Button>
          }
        />

        <ReviewsClient />
      </SiteContainer>
    </div>
  );
}
