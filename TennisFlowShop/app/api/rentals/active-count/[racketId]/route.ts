import { getRacketActiveCountPayload } from "@/lib/racket-detail.server";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// 진행 중(active) 대여 개수 조회: paid | out
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ racketId: string }> },
) {
  const { racketId } = await params;

  // route는 상태코드(400) 규칙을 유지하고,
  // 실제 수량/가용 재고 계산은 helper를 공유해 page와 중복 계산을 피한다.
  const payload = await getRacketActiveCountPayload(racketId);

  if (!ObjectId.isValid(racketId)) {
    return NextResponse.json(payload, { status: 400 });
  }

  return NextResponse.json(payload);
}
