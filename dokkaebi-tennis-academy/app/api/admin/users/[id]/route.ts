import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAudit } from '@/lib/audit';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

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
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db, admin } = guard;
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
  await appendAudit(db, { type: 'user_update', actorId: admin._id, targetId: _id, message: '프로필 수정', diff: detail }, req);

  return NextResponse.json({
    ...v,
    id: v._id.toString(),
    _id: undefined,
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db, admin } = guard;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

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
  await appendAudit(db, { type: 'user_delete', actorId: admin._id, targetId: _id, message: '탈퇴(삭제)' }, req);

  return NextResponse.json({ ok: true });
}
