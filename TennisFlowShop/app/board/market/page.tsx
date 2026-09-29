import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-policy";
import { redirect } from "next/navigation";
import { MARKET_BOARD_CONFIG } from "@/app/board/_components/board-config";
import FreeBoardClient from "@/app/board/market/_components/FreeBoardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중고 거래 게시판",
  description: "테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.",
  alternates: { canonical: "/board/market" },
  openGraph: {
    title: "중고 거래 게시판",
    description: "테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.",
    url: "/board/market",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "중고 거래 게시판",
    description: "테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.",
  },
};

export default function FreeBoardPage() {
  if (!COMMUNITY_BOARDS_ENABLED) {
    redirect("/board?closed=community");
  }

  return <FreeBoardClient config={MARKET_BOARD_CONFIG} />;
}
