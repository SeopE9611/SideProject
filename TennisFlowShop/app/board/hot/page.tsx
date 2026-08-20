import { Flame } from "lucide-react";
import { redirect } from "next/navigation";

import { CommunityComingSoonPage } from "@/app/board/_components/CommunityComingSoonPage";
import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-policy";

export const metadata = {
  title: "인기글 모아보기 (준비중)",
  description:
    "조회수/댓글/공감 수 기준 인기 게시글을 모아서 보여주는 페이지입니다. 현재 준비 중입니다.",
  alternates: { canonical: "/board/hot" },
};

export default function HotBoardPage() {
  if (!COMMUNITY_BOARDS_ENABLED) {
    redirect("/board?closed=community");
  }

  return (
    <CommunityComingSoonPage
      title="인기글 모아보기"
      description="조회수와 댓글, 공감 반응을 기준으로 커뮤니티에서 주목받는 게시글을 빠르게 둘러볼 수 있도록 준비하고 있습니다."
      noticeTitle="커뮤니티 인기글 기능을 준비 중입니다"
      features={[
        "조회수 상위 게시글",
        "댓글과 답글이 활발한 게시글",
        "공감과 좋아요가 높은 게시글",
      ]}
      alternative="기능이 열리기 전까지 리뷰 게시판에서 다른 사용자들이 남긴 다양한 후기를 먼저 확인하실 수 있습니다."
      icon={Flame}
    />
  );
}
