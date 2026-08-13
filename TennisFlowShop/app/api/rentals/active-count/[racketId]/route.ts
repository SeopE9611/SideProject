import { getRacketActiveCountPayload } from "@/lib/racket-detail.server";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyAppsInTossCors, createAppsInTossPreflightResponse } from "@/lib/apps-in-toss";

// 진행 중(active) 대여 개수 조회: paid | out
export function OPTIONS(req: NextRequest) {
  return createAppsInTossPreflightResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ racketId: string }> }) {
  const origin = req.headers.get("origin");
  try {
  const { racketId } = await params;

  // route는 상태코드(400) 규칙을 유지하고,
  // 실제 수량/가용 재고 계산은 helper를 공유해 page와 중복 계산을 피한다.
  const payload = await getRacketActiveCountPayload(racketId);

  if (!ObjectId.isValid(racketId)) {
    return applyAppsInTossCors(NextResponse.json(payload, { status: 400 }), origin);
  }

  return applyAppsInTossCors(NextResponse.json(payload), origin);
  } catch (error) {
    console.error("[GET /api/rentals/active-count/[racketId]] failed", error);
    return applyAppsInTossCors(
      NextResponse.json({ message: "서버 오류" }, { status: 500 }),
      origin,
    );
  }
}
