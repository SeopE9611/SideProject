import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { getDb } from '@/lib/mongodb';
import { EmailSettings, SETTINGS_COLLECTION, defaultEmailSettings, emailSettingsSchema } from '@/lib/admin-settings';

const DOC_ID = 'adminEmailSettings';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const merged = { ...defaultEmailSettings, ...(doc?.value ?? {}) };
  const parsed = emailSettingsSchema.safeParse(merged);
  const data = parsed.success ? parsed.data : defaultEmailSettings;

  return NextResponse.json(
    {
      data: { ...data, smtpPassword: '' },
      meta: { hasSmtpPassword: Boolean(data.smtpPassword) },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const payload = (await req.json().catch(() => null)) as Partial<EmailSettings> | null;
  const parsed = emailSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: '입력값이 올바르지 않습니다.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const prev = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const prevValue = (prev?.value ?? {}) as Partial<EmailSettings>;

  const toSave: EmailSettings = {
    ...parsed.data,
    smtpPassword: parsed.data.smtpPassword?.trim() ? parsed.data.smtpPassword : prevValue.smtpPassword ?? '',
  };

  await db.collection<any>(SETTINGS_COLLECTION).updateOne(
    { _id: DOC_ID },
    { $set: { value: toSave, updatedAt: new Date() }, $setOnInsert: { _id: DOC_ID } },
    { upsert: true },
  );

  return NextResponse.json(
    {
      data: { ...toSave, smtpPassword: '' },
      meta: { hasSmtpPassword: Boolean(toSave.smtpPassword) },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const dynamic = 'force-dynamic';
