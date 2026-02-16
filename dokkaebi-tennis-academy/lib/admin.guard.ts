import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId, Db } from 'mongodb';

type GuardOk = { ok: true; db: Db; admin: { _id: ObjectId; email?: string; name?: string; role: string } };
type GuardFail = { ok: false; res: NextResponse };

function authError(status: 401 | 403) {
  const isUnauthorized = status === 401;
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: isUnauthorized ? 'unauthorized' : 'forbidden',
        message: isUnauthorized ? 'Unauthorized' : 'Forbidden',
      },
    },
    { status },
  );
}

/**
 * 관리자 API 인증/인가 단일 진입점.
 *
 * - 401 Unauthorized: accessToken 누락/파손/만료 또는 sub 식별자 검증 실패
 * - 403 Forbidden: 인증은 되었으나 관리자 계정이 아닌 경우
 */
export async function requireAdmin(_req: Request): Promise<GuardOk | GuardFail> {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return { ok: false, res: authError(401) };

  // 만료/파손 토큰에서 verifyAccessToken이 throw 되어도 500이 아니라 401로 정리
  let payload: any = null;
  try {
    payload = verifyAccessToken(at);
  } catch {
    payload = null;
  }

  const subStr = payload?.sub ? String(payload.sub) : '';
  // sub는 ObjectId 문자열이어야 함 (new ObjectId에서 500 방지)
  if (!subStr || !ObjectId.isValid(subStr)) {
    return { ok: false, res: authError(401) };
  }

  const db = await getDb();
  const admin = await db.collection('users').findOne({ _id: new ObjectId(subStr) }, { projection: { _id: 1, email: 1, name: 1, role: 1 } });
  if (!admin || admin.role !== 'admin') {
    return { ok: false, res: authError(403) };
  }

  return { ok: true, db, admin: admin as any };
}
