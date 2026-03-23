// 서버 컴포넌트/서버 액션에서 현재 로그인한 사용자 정보를 가져오는 헬퍼
// - 실패 시 반드시 null 반환 (상위에서 redirect('/login') 등 처리 용이)
// - 토큰은 sub(ObjectId) 기준으로 조회
// - DB 연결은 getDb()만 사용하여 단일화

import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ACCESS_TOKEN_SECRET } from "@/lib/constants";

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | string;
  oauthProviders?: Array<"kakao" | "naver">;
};

/**
 * 상단 공통 영역(헤더/알림 뱃지)처럼 "로그인 사용자 식별자"만 필요한 경로를 위한 경량 헬퍼입니다.
 *
 * 핵심 의도:
 * - 단순 userId 확인 단계에서 users.findOne()까지 수행하면, 호출 빈도가 높은 공통 UI에서
 *   불필요한 DB 왕복이 누적됩니다.
 * - unread-count 같은 숫자 집계 API는 user 문서 전체가 아니라 userId만 있으면 충분하므로,
 *   이 헬퍼로 토큰 검증 + sub 추출까지만 수행합니다.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const jar = await cookies();
  const at = jar.get("accessToken")?.value;
  if (!at) return null;

  try {
    const decoded = jwt.verify(at, ACCESS_TOKEN_SECRET) as JwtPayload;
    const sub = decoded?.sub as string | undefined;
    return sub ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  // 상세 프로필(name/email/role/연동 배지)이 필요한 경로만 getCurrentUser를 사용합니다.
  // userId만 필요하면 getCurrentUserId를 사용해 DB 조회를 생략하는 것이 성능상 유리합니다.
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        // 민감 정보는 반드시 제외
        projection: { hashedPassword: 0 },
      },
    );
    if (!user) return null;

    // 소셜 로그인 제공자(표시용): oauth id를 노출하지 않고 "연동 여부"만 내려줌
    const oauth = (user as any)?.oauth ?? {};
    const oauthProviders = [
      oauth?.kakao?.id ? "kakao" : null,
      oauth?.naver?.id ? "naver" : null,
    ].filter(Boolean) as Array<"kakao" | "naver">;

    return {
      id: user._id.toString(),
      name: user.name ?? null,
      email: user.email ?? null,
      role: (user.role as SafeUser["role"]) ?? "user",
      oauthProviders,
    };
  } catch {
    // 만료/변조/DB 오류 등 어떤 예외든 상위에서 처리하기 쉽도록 null만 반환
    return null;
  }
}
