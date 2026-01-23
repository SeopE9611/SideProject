import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

// 토큰 검증은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// 숫자 쿼리 파싱 NaN 방지 + 범위 보정
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  return payload?.role === 'admin' ? payload : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireAdmin();
    if (!payload) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 5, min: 1, max: 50 });
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    const userIdObj = new ObjectId(id);
    const filter = { $or: [{ userId: userIdObj }, { userId: id }] };

    await db.collection('stringing_applications').createIndex({ userId: 1, createdAt: -1 }, { name: 'apps_userId_createdAt' });

    const col = db.collection('stringing_applications');
    const total = await col.countDocuments(filter);
    const raw = await col
      .find(filter, {
        projection: {
          _id: 1,
          status: 1,
          createdAt: 1,
          totalPrice: 1,
          'stringDetails.stringTypes': 1,
          racketType: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // UI에서 a.stringTypes / a.price 를 바라보니 파생 필드를 깔끔하게 제공
    const items = raw.map((d: any) => ({
      _id: d._id,
      status: d.status,
      createdAt: d.createdAt,
      price: d.totalPrice,
      racketType: d.racketType,
      stringTypes: d?.stringDetails?.stringTypes ?? [],
    }));

    return NextResponse.json({ items, total }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/applications/stringing] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
