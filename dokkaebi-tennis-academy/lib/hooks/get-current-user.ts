// lib/hooks/get-current-user.ts
// 서버 컴포넌트/서버 액션에서 현재 로그인한 사용자 정보를 가져오는 헬퍼
// - 실패 시 반드시 null 반환 (상위에서 redirect('/login') 등 처리 용이)
// - 토큰은 sub(ObjectId) 기준으로 조회
// - DB 연결은 getDb()만 사용하여 단일화

import { cookies } from 'next/headers';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ACCESS_TOKEN_SECRET } from '@/lib/constants';

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin' | string;
};

export async function getCurrentUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return null;

  try {
    // 토큰 해석 (sub: user._id)
    const decoded = jwt.verify(at, ACCESS_TOKEN_SECRET) as JwtPayload;
    const sub = decoded?.sub as string | undefined;
    if (!sub) return null; // 구 토큰 등에서 sub가 없으면 로그인 불가로 판단

    const db = await getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(sub) },
      {
        // 민감 정보는 반드시 제외
        projection: { hashedPassword: 0 },
      }
    );
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name ?? null,
      email: user.email ?? null,
      role: (user.role as SafeUser['role']) ?? 'user',
    };
  } catch {
    // 만료/변조/DB 오류 등 어떤 예외든 상위에서 처리하기 쉽도록 null만 반환
    return null;
  }
}
