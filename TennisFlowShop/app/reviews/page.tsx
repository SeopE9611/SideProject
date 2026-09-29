import SiteContainer from "@/components/layout/SiteContainer";
import ReviewHubHero from "@/components/reviews/ReviewHubHero";
import ReviewsClient from "./_components/ReviewsClient";

export const metadata = {
  title: "리뷰",
  description: "실제 구매와 서비스 이용 경험을 바탕으로 작성된 후기를 확인할 수 있습니다.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <div className="min-h-full bg-background">
      <SiteContainer className="py-6 bp-md:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <ReviewHubHero />
          <ReviewsClient />
        </div>
      </SiteContainer>
    </div>
  );
}
