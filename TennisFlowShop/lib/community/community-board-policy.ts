import { NextResponse } from "next/server";

import {
  COMMUNITY_BOARDS_ENABLED,
  CLOSED_COMMUNITY_TYPES,
  isClosedCommunityType,
} from "@/lib/community/community-board-flags";

export { COMMUNITY_BOARDS_ENABLED, CLOSED_COMMUNITY_TYPES, isClosedCommunityType };

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
