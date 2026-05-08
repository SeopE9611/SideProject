import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { markPackageOrderPaid } from "@/lib/package-orders/mark-paid";
import { loadPackageSettings } from "@/app/features/packages/api/db";
import type { PackageOrder } from "@/lib/types/package-order";
import { maskPhone } from "@/lib/offline/normalizers";

const PAYMENT_METHOD_LABELS = {
  cash: "현금",
  card: "카드",
  bank_transfer: "계좌이체",
  etc: "기타",
} as const;

const sellSchema = z.object({
  packageTypeId: z.string().trim().min(1).max(100).optional(),
  packageName: z.string().trim().min(1, "invalid package name").max(100),
  sessions: z.number().int().min(1, "invalid sessions"),
  validityDays: z.number().int().min(1, "invalid validity days").optional(),
  price: z.number().finite().min(0, "invalid price"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "etc"]),
  paymentStatus: z.literal("paid"),
  paidAt: z.string().datetime().optional(),
  memo: z.string().trim().max(1000).optional(),
});

function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function issueMessage(parsed: ReturnType<typeof sellSchema.safeParse>) {
  if (parsed.success) return "invalid body";
  const fields = parsed.error.flatten().fieldErrors;
  if (fields.packageName?.length) return "invalid package name";
  if (fields.sessions?.length) return "invalid sessions";
  if (fields.price?.length) return "invalid price";
  if (fields.paymentMethod?.length) return "invalid payment method";
  if (fields.validityDays?.length) return "invalid validity days";
  if (fields.paymentStatus?.length) return "invalid payment status";
  return "invalid body";
}

function serializePass(doc: Record<string, any>) {
  const packageName = doc.meta?.planTitle ?? "교체 서비스 패키지";
  return {
    id: String(doc._id),
    packageName,
    totalCount: Number(doc.packageSize ?? 0),
    usedCount: Number(doc.usedCount ?? 0),
    remainingCount: Number(doc.remainingCount ?? 0),
    status: doc.status ?? null,
    expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : doc.expiresAt ?? null,
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const customerId = toObjectId((await ctx.params).id);
  if (!customerId) return NextResponse.json({ message: "invalid customer id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = sellSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: issueMessage(parsed) }, { status: 400 });

  const customer = await guard.db.collection("offline_customers").findOne(
    { _id: customerId },
    { projection: { name: 1, phone: 1, email: 1, linkedUserId: 1 } },
  );
  if (!customer) return NextResponse.json({ message: "customer not found" }, { status: 404 });

  const linkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
  if (!linkedUserId) return NextResponse.json({ message: "linked user required" }, { status: 400 });

  const linkedUser = await guard.db.collection("users").findOne(
    { _id: linkedUserId },
    { projection: { name: 1, email: 1, phone: 1 } },
  );
  if (!linkedUser) return NextResponse.json({ message: "user not found" }, { status: 404 });

  const input = parsed.data;
  let packageTypeId = input.packageTypeId || `offline-${input.sessions}-sessions`;
  let packageName = input.packageName;
  let sessions = input.sessions;
  let validityDays = input.validityDays ?? 365;
  let price = input.price;

  if (input.packageTypeId) {
    const { packageConfigs } = await loadPackageSettings();
    const config = packageConfigs.find((pkg) => pkg.id === input.packageTypeId);
    if (!config || !config.isActive) {
      return NextResponse.json({ message: "invalid package option" }, { status: 400 });
    }
    packageTypeId = config.id;
    packageName = input.packageName || config.name;
    sessions = input.sessions;
    validityDays = input.validityDays ?? config.validityDays;
    price = input.price;
  }

  const now = new Date();
  const paidAt = input.paidAt ? new Date(input.paidAt) : now;
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[input.paymentMethod];
  const packageOrderId = new ObjectId();
  const adminLabel = String(guard.admin.email ?? guard.admin._id.toHexString());

  const packageOrder: PackageOrder & { meta?: Record<string, any> } = {
    _id: packageOrderId,
    userId: linkedUserId,
    createdAt: now,
    updatedAt: now,
    status: "주문접수",
    paymentStatus: "결제대기",
    totalPrice: price,
    packageInfo: {
      id: packageTypeId,
      title: packageName,
      sessions,
      price,
      validityPeriod: validityDays,
    },
    serviceInfo: {
      depositor: null,
      serviceMethod: "매장 오프라인 결제",
      name: String(linkedUser.name || customer.name || ""),
      phone: String(linkedUser.phone || customer.phone || ""),
      email: String(linkedUser.email || customer.email || ""),
    },
    paymentInfo: {
      provider: "manual_bank_transfer",
      method: paymentMethodLabel,
      status: "paid",
      approvedAt: paidAt,
    },
    history: [
      {
        status: "주문접수",
        date: now,
        description: `${sessions}회 패키지 오프라인 판매 접수`,
      },
    ],
    userSnapshot: {
      name: String(linkedUser.name || customer.name || ""),
      email: String(linkedUser.email || customer.email || ""),
    },
    meta: {
      source: "offline_admin",
      channel: "offline",
      offlineCustomerId: String(customerId),
      createdBy: String(guard.admin._id),
      memo: input.memo ?? "",
      paymentMethod: input.paymentMethod,
      paymentMethodLabel,
      paidAt: paidAt.toISOString(),
      linkedUser: {
        id: String(linkedUserId),
        name: linkedUser.name ?? null,
        email: linkedUser.email ?? null,
        phoneMasked: linkedUser.phone ? maskPhone(String(linkedUser.phone)) : null,
      },
    },
  };

  try {
    await guard.db.collection("packageOrders").insertOne(packageOrder as any);
  } catch (error) {
    console.error("[offline package sell] package order insert failed", error);
    return NextResponse.json({ message: "package order creation failed" }, { status: 500 });
  }

  try {
    await markPackageOrderPaid(guard.db, {
      packageOrderId,
      actorLabel: adminLabel,
      reason: "오프라인 관리자 패키지 판매",
      paymentInfoPatch: {
        method: paymentMethodLabel,
        status: "paid",
        approvedAt: paidAt,
      },
    });
  } catch (error) {
    console.error("[offline package sell] mark paid failed", error);
    return NextResponse.json({ message: "package pass issuance failed" }, { status: 500 });
  }

  const pass = await guard.db.collection("service_passes").findOne({ orderId: packageOrderId });
  if (!pass) return NextResponse.json({ message: "package pass issuance failed" }, { status: 500 });

  await appendAudit(
    guard.db,
    {
      type: "offline_package_sell",
      actorId: guard.admin._id,
      targetId: packageOrderId,
      message: "오프라인 패키지 판매/발급",
      diff: {
        offlineCustomerId: String(customerId),
        linkedUserId: String(linkedUserId),
        packageOrderId: String(packageOrderId),
        servicePassId: String(pass._id),
        packageName,
        sessions,
        price,
        paymentMethod: input.paymentMethod,
        paidAt: paidAt.toISOString(),
      },
    },
    req,
  );

  const serializedPass = serializePass(pass as any);
  return NextResponse.json({
    item: {
      packageOrderId: String(packageOrderId),
      servicePassId: String(pass._id),
      packageName,
      sessions,
      price,
      paymentMethod: input.paymentMethod,
      paidAt: paidAt.toISOString(),
    },
    pass: serializedPass,
  }, { status: 201 });
}
