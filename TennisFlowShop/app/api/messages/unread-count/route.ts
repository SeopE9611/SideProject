import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/hooks/get-current-user";

/**
 * - 상단 '쪽지함 N' 뱃지용
 * - 로그인 사용자 기준으로 미열람(= readAt: null) 쪽지 개수를 반환
 */
export async function GET() {
  // 이 API는 "현재 사용자 식별"만 필요합니다.
  // user 문서 전체(이름/이메일/권한 등)를 읽을 이유가 없으므로 경량 인증 헬퍼를 사용합니다.
  // 자주 호출되는 공통 경로에서 users.findOne() 1회를 줄이면 누적 지연이 줄어듭니다.
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const db = await getDb();
    const now = new Date();

    const count = await db.collection("messages").countDocuments({
      // unread-count는 대상 사용자 ID와 읽음 여부만으로 충분합니다.
      // 따라서 인증 단계에서 user 상세 조회를 생략해도 기능적으로 동일합니다.
      toUserId: new ObjectId(userId),
      readAt: null,
      toDeletedAt: null,
      // TTL 삭제 직전까지 남아있을 수 있으니, 이미 만료된 expiresAt은 제외
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    });

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("[messages/unread-count] error", e);
    return NextResponse.json(
      { ok: false, error: "DB unavailable" },
      { status: 503 },
    );
  }
}
