import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

// 토큰 검증은 throw 가능 → 안전하게 null 처리 (500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  return payload?.role === 'admin' ? payload : null;
}

async function ensureIndex(db: any, col: string, keys: Record<string, 1 | -1>) {
  try {
    // 이름 옵션 지정하지 않음 + code 85(IndexOptionsConflict) 무시
    await db.collection(col).createIndex(keys);
  } catch (e: any) {
    if (e?.code !== 85) throw e;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await requireAdmin();
    if (!payload) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

    const db = await getDb();
    const userIdObj = new ObjectId(id);

    await ensureIndex(db, 'orders', { userId: 1, createdAt: -1 });
    await ensureIndex(db, 'stringing_applications', { userId: 1, createdAt: -1 });
    await ensureIndex(db, 'reviews', { userId: 1, createdAt: -1 });

    const orders = await db.collection('orders').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    const applications = await db.collection('stringing_applications').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    const reviews = await db.collection('reviews').countDocuments({ $or: [{ userId: userIdObj }, { userId: id }] });

    return NextResponse.json({ orders, applications, reviews }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/users/:id/kpi] error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
