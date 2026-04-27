import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { getDb } from "@/lib/mongodb";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import {
  PaymentSettings,
  SETTINGS_COLLECTION,
  defaultPaymentSettings,
  paymentSettingsSchema,
} from "@/lib/admin-settings";

const DOC_ID = "adminPaymentSettings";

type NicepayMode = "sandbox" | "production" | "unknown";

function inferNicepayMode(apiBaseRaw: string): NicepayMode {
  const apiBase = apiBaseRaw.trim().toLowerCase();
  if (!apiBase) return "unknown";
  if (
    apiBase.includes("sandbox") ||
    apiBase.includes("test") ||
    apiBase.includes("staging") ||
    apiBase.includes("dev")
  ) {
    return "sandbox";
  }
  if (apiBase.includes("api.nicepay.co.kr")) return "production";
  return "unknown";
}

function getNicepayMeta() {
  const approveApiBase = String(process.env.NICEPAY_APPROVE_API_BASE ?? "").trim();
  const hasClientId = Boolean(
    String(
      process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "",
    ).trim(),
  );
  const hasSecretKey = Boolean(String(process.env.NICEPAY_SECRET_KEY ?? "").trim());
  const enabledRaw = String(
    process.env.NEXT_PUBLIC_ENABLE_NICE_PAYMENTS ??
      process.env.ENABLE_NICE_PAYMENTS ??
      "",
  )
    .trim()
    .toLowerCase();
  const enabled = ["1", "true", "yes", "on"].includes(enabledRaw);

  return {
    provider: "NICEPay" as const,
    enabled,
    mode: inferNicepayMode(approveApiBase),
    approveApiBase: approveApiBase || null,
    hasClientId,
    hasSecretKey,
  };
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const doc = await db
    .collection<any>(SETTINGS_COLLECTION)
    .findOne({ _id: DOC_ID });
  const merged = { ...defaultPaymentSettings, ...(doc?.value ?? {}) };
  const parsed = paymentSettingsSchema.safeParse(merged);
  const data = parsed.success ? parsed.data : defaultPaymentSettings;

  return NextResponse.json(
    {
      data: { ...data, paypalSecret: "", stripeSecretKey: "" },
      meta: {
        hasPaypalSecret: Boolean(data.paypalSecret),
        hasStripeSecretKey: Boolean(data.stripeSecretKey),
        nicepay: getNicepayMeta(),
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const payload = (await req
    .json()
    .catch(() => null)) as Partial<PaymentSettings> | null;
  const parsed = paymentSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "입력값이 올바르지 않습니다.",
        errors: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const db = await getDb();
  const prev = await db
    .collection<any>(SETTINGS_COLLECTION)
    .findOne({ _id: DOC_ID });
  const prevValue = (prev?.value ?? {}) as Partial<PaymentSettings>;

  const toSave: PaymentSettings = {
    ...parsed.data,
    paypalSecret: parsed.data.paypalSecret?.trim()
      ? parsed.data.paypalSecret
      : (prevValue.paypalSecret ?? ""),
    stripeSecretKey: parsed.data.stripeSecretKey?.trim()
      ? parsed.data.stripeSecretKey
      : (prevValue.stripeSecretKey ?? ""),
  };

  await db
    .collection<any>(SETTINGS_COLLECTION)
    .updateOne(
      { _id: DOC_ID },
      {
        $set: { value: toSave, updatedAt: new Date() },
        $setOnInsert: { _id: DOC_ID },
      },
      { upsert: true },
    );

  await appendAdminAudit(
    db,
    {
      type: "admin.settings.payment.patch",
      actorId: guard.admin._id,
      targetId: DOC_ID,
      message: "결제 설정 수정",
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
      data: { ...toSave, paypalSecret: "", stripeSecretKey: "" },
      meta: {
        hasPaypalSecret: Boolean(toSave.paypalSecret),
        hasStripeSecretKey: Boolean(toSave.stripeSecretKey),
        nicepay: getNicepayMeta(),
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export const dynamic = "force-dynamic";
