import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

async function requireAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  return payload && payload.role === 'admin' ? payload : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const db = await getDb();
  const doc = await db.collection('users').findOne({ _id: new ObjectId(id) }, { projection: { hashedPassword: 0 } });

  if (!doc) return NextResponse.json({ message: 'not found' }, { status: 404 });

  return NextResponse.json({
    ...doc,
    id: doc._id.toString(),
    isSuspended: !!(doc as any).isSuspended,
    isDeleted: !!(doc as any).isDeleted,
    _id: undefined,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const allowed = ['name', 'email', 'phone', 'address', 'addressDetail', 'postalCode', 'role', 'isSuspended', 'isDeleted'] as const;

  const $set: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) $set[k] = (body as any)[k];
  }
  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const db = await getDb();
  const _id = new ObjectId(id);

  const r = await db.collection('users').updateOne({ _id }, { $set, $currentDate: { updatedAt: true } });

  if (!r.matchedCount) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const v = await db.collection('users').findOne({ _id }, { projection: { hashedPassword: 0 } });

  if (!v) return NextResponse.json({ message: 'not found' }, { status: 404 });

  // PATCH 성공: 감사 로그 추가 (핸들러 내부)
  const detail = allowed.reduce((acc: any, k) => {
    if (k in body) acc[k] = body[k];
    return acc;
  }, {});
  await appendAudit(db, id, '프로필 수정', detail, String(admin.sub));

  return NextResponse.json({
    ...v,
    id: v._id.toString(),
    _id: undefined,
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);

  // update pipeline
  const r = await db.collection('users').updateOne({ _id }, [
    {
      $set: {
        isDeleted: true,
        // 이미 값이 있으면 보존, 없으면 지금 시각으로 최초 1회만 세팅
        deletedAt: { $ifNull: ['$deletedAt', '$$NOW'] },
        updatedAt: '$$NOW',
      },
    },
  ]);
  if (!r.matchedCount) return NextResponse.json({ message: 'not found' }, { status: 404 });

  // DELETE 성공: 감사 로그 추가 (핸들러 내부)
  await appendAudit(db, id, '탈퇴(삭제)', { isDeleted: true }, String(admin.sub));

  return NextResponse.json({ ok: true });
}

/** (성공 직후 공통) 감사 로그 유틸 */
async function appendAudit(db: any, targetId: string, action: string, detail: any, actor: string) {
  const userId = new ObjectId(targetId);
  await db.collection('user_audit_logs').createIndex({ userId: 1, at: -1 }, { name: 'audit_userId_at' });
  await db.collection('user_audit_logs').insertOne({
    userId,
    action,
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}),
    at: new Date(),
    by: new ObjectId(actor),
  });
}
