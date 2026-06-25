import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-policy";
import { redirect } from "next/navigation";
import { GEAR_BOARD_CONFIG } from "@/app/board/_components/board-config";
import FreeBoardClient from "@/app/board/gear/_components/FreeBoardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장비 사용기",
  description:
    "직접 사용해본 라켓과 스트링, 테니스 장비 경험을 자유롭게 공유하는 커뮤니티 게시판입니다.",
  alternates: { canonical: "/board/gear" },
  openGraph: {
    title: "장비 사용기",
    description:
      "직접 사용해본 라켓과 스트링, 테니스 장비 경험을 자유롭게 공유하는 커뮤니티 게시판입니다.",
    url: "/board/gear",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "장비 사용기",
    description:
      "직접 사용해본 라켓과 스트링, 테니스 장비 경험을 자유롭게 공유하는 커뮤니티 게시판입니다.",
  },
};

export default function FreeBoardPage() {
  if (!COMMUNITY_BOARDS_ENABLED) {
    redirect("/board?closed=community");
  }

  return <FreeBoardClient config={GEAR_BOARD_CONFIG} />;
}
