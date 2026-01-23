import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

// 토큰 검증은 throw 가능 → 안전하게 null 처리
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

async function ensureIndex(db: any, col: string, keys: Record<string, 1 | -1>) {
  try {
    await db.collection(col).createIndex(keys);
  } catch (e: any) {
    if (e?.code !== 85) throw e;
  }
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

    await ensureIndex(db, 'reviews', { userId: 1, createdAt: -1 });

    const col = db.collection('reviews');
    const total = await col.countDocuments(filter);
    const items = await col
      .find(filter, { projection: { _id: 1, rating: 1, status: 1, createdAt: 1, title: 1, isPublic: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ items, total }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/reviews] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
