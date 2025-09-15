import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { ModifyResult, Document } from 'mongodb';

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(id) }, { projection: { hashedPassword: 0 } });

  if (!user) return NextResponse.json({ message: 'not found' }, { status: 404 });
  return NextResponse.json({
    ...user,
    id: user._id.toString(),
    isSuspended: !!(user as any).isSuspended,
    isDeleted: !!(user as any).isDeleted,
    _id: undefined,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'invalid id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // 허용 필드만 반영
  const allowed = ['name', 'email', 'phone', 'address', 'addressDetail', 'postalCode', 'role', 'isSuspended', 'isDeleted'] as const;

  const $set: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) $set[k] = (body as any)[k];
  }

  // 변경 없으면 noop
  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = await getDb();
  const _id = new ObjectId(id);

  // 1) 업데이트
  const r = await db.collection('users').updateOne({ _id }, { $set, $currentDate: { updatedAt: true } });

  if (!r.matchedCount) {
    return NextResponse.json({ message: 'not found' }, { status: 404 });
  }

  // 2) 갱신된 문서 다시 조회
  const v = await db.collection('users').findOne({ _id }, { projection: { hashedPassword: 0 } });

  if (!v) {
    return NextResponse.json({ message: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...v,
    id: v._id.toString(),
    _id: undefined,
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const db = await getDb();
    const _id = new ObjectId(id);

    const r = await db.collection('users').updateOne({ _id }, { $set: { isDeleted: true, updatedAt: new Date() } });

    if (!r.matchedCount) return NextResponse.json({ message: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/users/[id]] DELETE error', e);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
