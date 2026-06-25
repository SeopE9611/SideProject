import { NextResponse } from "next/server";

export const COMMUNITY_BOARDS_ENABLED = process.env.NEXT_PUBLIC_COMMUNITY_BOARDS_ENABLED === "true";

export const CLOSED_COMMUNITY_TYPES = ["free", "brand", "market", "gear"] as const;

export type ClosedCommunityType = (typeof CLOSED_COMMUNITY_TYPES)[number];

export function isClosedCommunityType(value: unknown): value is ClosedCommunityType {
  return (
    !COMMUNITY_BOARDS_ENABLED &&
    typeof value === "string" &&
    (CLOSED_COMMUNITY_TYPES as readonly string[]).includes(value)
  );
}

export function communityBoardClosedResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: "COMMUNITY_BOARD_CLOSED",
      message: "현재 커뮤니티 게시판은 운영 정책 변경으로 일시 중단되었습니다.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
