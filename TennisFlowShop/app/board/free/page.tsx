import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-policy";
import { redirect } from "next/navigation";
import { FREE_BOARD_CONFIG } from "@/app/board/_components/board-config";
import FreeBoardClient from "@/app/board/free/_components/FreeBoardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자유 게시판",
  description: "테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.",
  alternates: { canonical: "/board/free" },
  openGraph: {
    title: "자유 게시판",
    description: "테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.",
    url: "/board/free",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "자유 게시판",
    description: "테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.",
  },
};

export default function FreeBoardPage() {
  if (!COMMUNITY_BOARDS_ENABLED) {
    redirect("/board?closed=community");
  }

  return <FreeBoardClient config={FREE_BOARD_CONFIG} />;
}
