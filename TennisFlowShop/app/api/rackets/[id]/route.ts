import { verifyAccessToken } from "@/lib/auth.utils";
import { getRacketDetailPayload } from "@/lib/racket-detail.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyAppsInTossCors, createAppsInTossPreflightResponse } from "@/lib/apps-in-toss";

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function OPTIONS(req: NextRequest) {
  return createAppsInTossPreflightResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  try {
  const { id } = await params;

  const token = (await cookies()).get("accessToken")?.value;
  let currentUserId: ObjectId | null = null;
  const payload = safeVerifyAccessToken(token);
  if (payload?.sub && ObjectId.isValid(String(payload.sub))) {
    currentUserId = new ObjectId(String(payload.sub));
  }

  // page.tsx와 route.ts가 같은 helper를 공유해도 되는 이유:
  // - 둘 다 서버에서 실행되고, 최종 데이터 원천은 동일한 MongoDB 조회 로직이다.
  // - route는 HTTP 응답 포맷만 담당하고, 실제 데이터 구성은 helper로 일원화한다.
  const payloadDoc = await getRacketDetailPayload(id, { userId: currentUserId });

  if (!payloadDoc) {
    return applyAppsInTossCors(NextResponse.json(
      { message: "Not Found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    ), origin);
  }

  return applyAppsInTossCors(NextResponse.json(payloadDoc, {
    headers: { "Cache-Control": "no-store" },
  }), origin);
  } catch (error) {
    console.error("[GET /api/rackets/[id]] failed", error);
    return applyAppsInTossCors(
      NextResponse.json({ message: "서버 오류" }, { status: 500 }),
      origin,
    );
  }
}
