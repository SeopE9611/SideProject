import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { appendAudit } from '@/lib/audit';
import { adminValidationError, zodIssuesToDetails } from '@/lib/admin/adminApiError';

const userIdParamsSchema = z.object({
  id: z.string().trim().min(1).refine(ObjectId.isValid, { message: '유효한 사용자 ID(ObjectId)가 아닙니다.' }),
});

const userPatchSchema = z
  .object({
    name: z.string().trim().min(1, '이름은 비워둘 수 없습니다.').max(50, '이름은 50자 이내여야 합니다.').optional(),
    email: z.string().trim().email('유효한 이메일 주소를 입력해주세요.').max(254, '이메일이 너무 깁니다.').optional(),
    phone: z.string().trim().max(30, '전화번호는 30자 이내여야 합니다.').optional(),
    address: z.string().trim().max(200, '주소는 200자 이내여야 합니다.').optional(),
    addressDetail: z.string().trim().max(100, '상세주소는 100자 이내여야 합니다.').optional(),
    postalCode: z.string().trim().max(12, '우편번호는 12자 이내여야 합니다.').optional(),
    role: z.enum(['user', 'admin']).optional(),
    isSuspended: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  })
  .strict();

const userProjection = { projection: { hashedPassword: 0 } };

function parseUserIdParams(params: { id: string }) {
  const parsed = userIdParamsSchema.safeParse(params);
  if (!parsed.success) {
    return {
      ok: false as const,
      res: adminValidationError('요청 경로 파라미터가 올바르지 않습니다.', parsed.error.flatten().fieldErrors, zodIssuesToDetails(parsed.error.issues)),
    };
  }

  return { ok: true as const, id: parsed.data.id, _id: new ObjectId(parsed.data.id) };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const doc = await db.collection('users').findOne({ _id: parsedParams._id }, userProjection);

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
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const body = await req.json().catch(() => null);
  const parsedBody = userPatchSchema.safeParse(body);
  if (!parsedBody.success) {
    return adminValidationError('요청 본문이 올바르지 않습니다.', parsedBody.error.flatten().fieldErrors, zodIssuesToDetails(parsedBody.error.issues));
  }

  const allowed = ['name', 'email', 'phone', 'address', 'addressDetail', 'postalCode', 'role', 'isSuspended', 'isDeleted'] as const;
  const payload = parsedBody.data;

  const $set: Record<string, any> = {};
  for (const k of allowed) {
    if (k in payload) $set[k] = payload[k];
  }
  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { _id } = parsedParams;

  const current = await db.collection('users').findOne({ _id }, { projection: { _id: 1, role: 1 } });
  if (!current) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const currentRole = (current as any).role === 'admin' ? 'admin' : 'user';
  const nextRole = payload.role;
  if (nextRole && nextRole !== currentRole && currentRole === 'admin' && nextRole !== 'admin') {
    if (String(admin._id) === String(_id)) {
      return NextResponse.json({ message: 'SELF_DEMOTION_FORBIDDEN', error: '자기 자신의 관리자 권한은 강등할 수 없습니다.' }, { status: 409 });
    }

    const remainingAdminCount = await db.collection('users').countDocuments({
      role: 'admin',
      isDeleted: { $ne: true },
      _id: { $ne: _id },
    });

    if (remainingAdminCount === 0) {
      return NextResponse.json({ message: 'LAST_ADMIN_PROTECTED', error: '마지막 관리자 계정은 강등할 수 없습니다.' }, { status: 409 });
    }
  }

  const r = await db.collection('users').updateOne({ _id }, { $set, $currentDate: { updatedAt: true } });

  if (!r.matchedCount) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const v = await db.collection('users').findOne({ _id }, userProjection);

  if (!v) return NextResponse.json({ message: 'not found' }, { status: 404 });

  // PATCH 성공: 감사 로그 추가 (핸들러 내부)
  const detail = allowed.reduce((acc: any, k) => {
    if (k in payload) acc[k] = payload[k];
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
  const parsedParams = parseUserIdParams(await ctx.params);
  if (!parsedParams.ok) return parsedParams.res;

  const { _id } = parsedParams;

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
