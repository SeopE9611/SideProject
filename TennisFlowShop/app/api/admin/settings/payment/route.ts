import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { getDb } from '@/lib/mongodb';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';
import { PaymentSettings, SETTINGS_COLLECTION, defaultPaymentSettings, paymentSettingsSchema } from '@/lib/admin-settings';

const DOC_ID = 'adminPaymentSettings';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const merged = { ...defaultPaymentSettings, ...(doc?.value ?? {}) };
  const parsed = paymentSettingsSchema.safeParse(merged);
  const data = parsed.success ? parsed.data : defaultPaymentSettings;

  return NextResponse.json(
    {
      data: { ...data, paypalSecret: '', stripeSecretKey: '' },
      meta: {
        hasPaypalSecret: Boolean(data.paypalSecret),
        hasStripeSecretKey: Boolean(data.stripeSecretKey),
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const payload = (await req.json().catch(() => null)) as Partial<PaymentSettings> | null;
  const parsed = paymentSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: '입력값이 올바르지 않습니다.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const prev = await db.collection<any>(SETTINGS_COLLECTION).findOne({ _id: DOC_ID });
  const prevValue = (prev?.value ?? {}) as Partial<PaymentSettings>;

  const toSave: PaymentSettings = {
    ...parsed.data,
    paypalSecret: parsed.data.paypalSecret?.trim() ? parsed.data.paypalSecret : prevValue.paypalSecret ?? '',
    stripeSecretKey: parsed.data.stripeSecretKey?.trim() ? parsed.data.stripeSecretKey : prevValue.stripeSecretKey ?? '',
  };

  await db.collection<any>(SETTINGS_COLLECTION).updateOne(
    { _id: DOC_ID },
    { $set: { value: toSave, updatedAt: new Date() }, $setOnInsert: { _id: DOC_ID } },
    { upsert: true },
  );

  await appendAdminAudit(
    db,
    {
      type: 'admin.settings.payment.patch',
      actorId: guard.admin._id,
      targetId: DOC_ID,
      message: '결제 설정 수정',
      diff: {
        changedKeys: Object.keys(parsed.data),
        hasPaypalSecret: Boolean(toSave.paypalSecret),
        hasStripeSecretKey: Boolean(toSave.stripeSecretKey),
      },
    },
    req,
  );

  return NextResponse.json(
    {
      data: { ...toSave, paypalSecret: '', stripeSecretKey: '' },
      meta: {
        hasPaypalSecret: Boolean(toSave.paypalSecret),
        hasStripeSecretKey: Boolean(toSave.stripeSecretKey),
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const dynamic = 'force-dynamic';
