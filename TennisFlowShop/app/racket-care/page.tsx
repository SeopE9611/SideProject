import RacketCareFinalCta from "@/app/racket-care/_components/RacketCareFinalCta";
import RacketCareLandingHero from "@/app/racket-care/_components/RacketCareLandingHero";
import RacketCareMethodsSection from "@/app/racket-care/_components/RacketCareMethodsSection";
import SiteContainer from "@/components/layout/SiteContainer";
import RacketCareFlowSection from "@/components/racket-care/RacketCareFlowSection";
import RacketCareValueSection from "@/components/racket-care/RacketCareValueSection";
import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 케어",
  description:
    "마지막 스트링 교체일과 플레이 빈도를 바탕으로 예상 교체일, 상태 점수, 맞춤 추천을 확인하세요.",
};

export default async function PublicRacketCarePage() {
  const userId = await getCurrentUserId();
  const dashboardHref = "/mypage/racket-care";
  const primaryHref = userId
    ? dashboardHref
    : `/login?next=${encodeURIComponent(dashboardHref)}`;
  const primaryLabel = userId ? "내 라켓 관리하기" : "로그인하고 시작하기";

  return (
    <SiteContainer
      variant="wide"
      className="space-y-12 py-6 bp-sm:space-y-16 bp-sm:py-8 bp-lg:space-y-20"
    >
      <RacketCareLandingHero primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <RacketCareMethodsSection primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <RacketCareFlowSection />
      <RacketCareValueSection />
      <RacketCareFinalCta primaryHref={primaryHref} primaryLabel={primaryLabel} />
    </SiteContainer>
  );
}
