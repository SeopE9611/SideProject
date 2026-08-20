import { Grid2X2 } from "lucide-react";
import { redirect } from "next/navigation";

import { CommunityComingSoonPage } from "@/app/board/_components/CommunityComingSoonPage";
import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-policy";

export const metadata = {
  title: "브랜드별 게시판 (준비중)",
  description: "라켓/스트링 브랜드별 사용 후기를 나누는 게시판입니다. 현재 준비 중입니다.",
  alternates: { canonical: "/board/brands" },
};

export default function BrandBoardPage() {
  if (!COMMUNITY_BOARDS_ENABLED) {
    redirect("/board?closed=community");
  }

  return (
    <CommunityComingSoonPage
      title="브랜드별 게시판"
      description="브랜드별 라켓과 스트링 사용 후기를 한곳에서 살펴보고, 나에게 맞는 조합을 나눌 수 있도록 준비하고 있습니다."
      noticeTitle="브랜드별 사용 후기 기능을 준비 중입니다"
      features={[
        "라켓·스트링 게시글의 브랜드별 분류",
        "브랜드와 모델별 실제 사용 후기 공유",
        "추천 세팅과 궁합 좋은 조합 논의",
      ]}
      alternative="현재는 상품 상세 페이지와 리뷰 게시판에서 브랜드별 라켓·스트링 후기를 먼저 확인하실 수 있습니다."
      icon={Grid2X2}
    />
  );
}
