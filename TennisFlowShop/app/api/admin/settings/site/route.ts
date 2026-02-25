import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { getDb } from '@/lib/mongodb';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { SETTINGS_COLLECTION, defaultSiteSettings, siteSettingsSchema } from '@/lib/admin-settings';

const DOC_ID = 'adminSiteSettings';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const parsed = siteSettingsSchema.safeParse({ ...defaultSiteSettings, ...(doc?.value ?? {}) });
  if (!parsed.success) {
    return NextResponse.json({ data: defaultSiteSettings }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ data: parsed.data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const payload = await req.json().catch(() => null);
  const parsed = siteSettingsSchema.safeParse(payload);
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
      type: 'admin.settings.site.patch',
      actorId: guard.admin._id,
      targetId: DOC_ID,
      message: '사이트 설정 수정',
      diff: {
        changedKeys: Object.keys(parsed.data),
      },
    },
    req,
  );

  return NextResponse.json({ data: parsed.data }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
