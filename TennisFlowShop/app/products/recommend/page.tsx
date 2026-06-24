import StringRecommendClient from "@/app/products/recommend/_components/StringRecommendClient";
import SiteContainer from "@/components/layout/SiteContainer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스트링 추천 도우미 | 도깨비테니스",
  description: "간단한 질문에 답하고 나에게 맞는 테니스 스트링 선택 방향을 확인해보세요.",
};

export default function StringRecommendPage() {
  return (
    <main className="bg-background">
      <SiteContainer variant="wide" className="py-8 sm:py-10 lg:py-12">
        <StringRecommendClient />
      </SiteContainer>
    </main>
  );
}
