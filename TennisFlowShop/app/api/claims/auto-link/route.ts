import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { ObjectId } from 'mongodb';

// 토큰 검증은 throw 가능 → 안전하게 null 처리 (500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) return NextResponse.json({ ok: false }, { status: 401 });
    const subStr = String(payload.sub);
    if (!ObjectId.isValid(subStr)) return NextResponse.json({ ok: false }, { status: 401 });

    const client = await clientPromise;
    const db = client.db();

    // 현재 로그인 유저 이메일 조회
    const userId = new ObjectId(subStr);
    const user = await db.collection('users').findOne({ _id: userId }, { projection: { email: 1 } });

    if (!user?.email) return NextResponse.json({ ok: true, matched: 0, linked: 0 });
    const { matched, modified } = await autoLinkStringingByEmail(db, userId, user.email);
    return NextResponse.json({ ok: true, matched, linked: modified });
  } catch (e) {
    console.error('[POST /api/claims/auto-link] error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
