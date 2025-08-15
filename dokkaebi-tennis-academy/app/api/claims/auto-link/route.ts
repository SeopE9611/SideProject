import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ ok: false }, { status: 401 });

    const client = await clientPromise;
    const db = client.db();

    // 현재 로그인 유저 이메일 조회
    const userId = new ObjectId(payload.sub);
    const user = await db.collection('users').findOne({ _id: userId }, { projection: { email: 1 } });

    const { matched, modified } = await autoLinkStringingByEmail(db as any, userId, user?.email);
    return NextResponse.json({ ok: true, matched, linked: modified });
  } catch (e) {
    console.error('[POST /api/claims/auto-link] error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
