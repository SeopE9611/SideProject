import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  const payload = safeVerifyAccessToken(at);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });

  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const doc = await db.collection('rental_orders').findOne({ _id });
  if (!doc) return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });

  const current = String(doc.status ?? 'pending');
  if (current === 'paid') return NextResponse.json({ ok: true, id });

  // pending 상태에서만 전이 허용
  const u = await db.collection('rental_orders').updateOne({ _id, status: 'pending' }, { $set: { status: 'paid', paidAt: new Date(), updatedAt: new Date() } });
  if (!u.matchedCount) {
    return NextResponse.json({ ok: false, message: `INVALID_STATE(${current})` }, { status: 409 });
  }
  return NextResponse.json({ ok: true, id });
}
