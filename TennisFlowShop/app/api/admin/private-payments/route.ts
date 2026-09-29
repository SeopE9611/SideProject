import { NextResponse } from "next/server";
import { type Filter } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import {
  privatePayments,
  serializePrivatePayment,
  validatePrivatePaymentInput,
  type PrivatePayment,
} from "@/lib/private-payments";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const q = String(url.searchParams.get("q") || "").trim();
  const status = String(url.searchParams.get("status") || "").trim();
  const paymentStatus = String(url.searchParams.get("paymentStatus") || "").trim();
  const archived = String(url.searchParams.get("archived") || "active").trim();
  const from = String(url.searchParams.get("from") || "").trim();
  const to = String(url.searchParams.get("to") || "").trim();
  const sort = String(url.searchParams.get("sort") || "createdAt").trim();
  const dir = String(url.searchParams.get("dir") || "desc").trim() === "asc" ? 1 : -1;
  const filter: Filter<PrivatePayment> = {};
  const searchFields: Array<
    keyof Pick<
      PrivatePayment,
      "title" | "description" | "customerName" | "customerPhone" | "customerEmail"
    >
  > = ["title", "description", "customerName", "customerPhone", "customerEmail"];
  if (q) {
    filter.$or = searchFields.map((key) => ({
      [key]: { $regex: q, $options: "i" },
    }));
  }
  if (status === "active" || status === "inactive") filter.status = status;
  if (archived === "archived") filter.archivedAt = { $ne: null };
  else if (archived !== "all") filter.archivedAt = null;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000+09:00`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999+09:00`);
  }
  if (
    paymentStatus === "결제대기" ||
    paymentStatus === "결제완료" ||
    paymentStatus === "결제취소"
  ) {
    filter.paymentStatus = paymentStatus;
  }
  const col = privatePayments(guard.db);
  const sortKey = [
    "title",
    "amount",
    "paymentStatus",
    "status",
    "expiresAt",
    "createdAt",
    "paidAt",
    "canceledAt",
  ].includes(sort)
    ? sort
    : "createdAt";
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [items, total, allCount, pendingCount, paidCount, canceledCount, monthPaid] =
    await Promise.all([
      col
        .find(filter)
        .sort({ [sortKey]: dir, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
      col.countDocuments({ archivedAt: null }),
      col.countDocuments({ archivedAt: null, paymentStatus: "결제대기" }),
      col.countDocuments({ archivedAt: null, paymentStatus: "결제완료" }),
      col.countDocuments({ archivedAt: null, paymentStatus: "결제취소" }),
      col
        .aggregate<{ total: number }>([
          { $match: { paymentStatus: "결제완료", paidAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .next(),
    ]);
  return NextResponse.json({
    ok: true,
    items: items.map(serializePrivatePayment),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      total: allCount,
      pending: pendingCount,
      paid: paidCount,
      canceled: canceledCount,
      monthPaidAmount: monthPaid?.total ?? 0,
    },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(() => ({}));
  const { input, errors } = validatePrivatePaymentInput(body);
  if (errors.length) return NextResponse.json({ ok: false, message: errors[0] }, { status: 400 });
  const now = new Date();
  const hasExpiresAt = Object.prototype.hasOwnProperty.call(body, "expiresAt");
  const expiresAt = hasExpiresAt
    ? input.expiresAt
      ? new Date(String(input.expiresAt))
      : null
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const doc = {
    title: String(input.title),
    amount: Number(input.amount),
    description: String(input.description || ""),
    customerName: String(input.customerName || ""),
    customerPhone: String(input.customerPhone || ""),
    customerEmail: String(input.customerEmail || ""),
    status: "active" as const,
    paymentStatus: "결제대기" as const,
    expiresAt,
    archivedAt: null,
    archivedBy: null,
    createdAt: now,
    updatedAt: now,
    createdBy: guard.admin._id,
    history: [{ status: "created", date: now, description: "개인결제 링크 생성" }],
  };
  const result = await privatePayments(guard.db).insertOne(doc);
  await appendAdminAudit(
    guard.db,
    {
      type: "private_payment.create",
      actorId: guard.admin._id,
      targetId: result.insertedId,
      message: "개인결제 링크 생성",
      diff: { title: doc.title, amount: doc.amount },
    },
    req,
  );
  const publicPath = `/private-payments/${result.insertedId.toString()}`;
  return NextResponse.json({
    ok: true,
    item: serializePrivatePayment({ ...doc, _id: result.insertedId }),
    publicPath,
    publicUrl: publicPath,
  });
}
