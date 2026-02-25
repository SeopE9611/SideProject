import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { getDb } from '@/lib/mongodb';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { SETTINGS_COLLECTION, defaultUserSettings, userSettingsSchema } from '@/lib/admin-settings';

const DOC_ID = 'adminUserSettings';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const parsed = userSettingsSchema.safeParse({ ...defaultUserSettings, ...(doc?.value ?? {}) });

  return NextResponse.json({ data: parsed.success ? parsed.data : defaultUserSettings }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const payload = await req.json().catch(() => null);
  const parsed = userSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: '입력값이 올바르지 않습니다.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  await db.collection<any>(SETTINGS_COLLECTION).updateOne(
    { _id: DOC_ID },
    { $set: { value: parsed.data, updatedAt: new Date() }, $setOnInsert: { _id: DOC_ID } },
    { upsert: true },
  );

  await appendAdminAudit(
    db,
    {
      type: 'admin.settings.user.patch',
      actorId: guard.admin._id,
      targetId: DOC_ID,
      message: '회원 설정 수정',
      diff: {
        changedKeys: Object.keys(parsed.data),
      },
    },
    req,
  );

  return NextResponse.json({ data: parsed.data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
