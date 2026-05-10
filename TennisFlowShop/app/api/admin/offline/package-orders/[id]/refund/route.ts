import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { isOfflinePackageOrder } from "@/app/api/admin/offline/_lib/packageOrderOffline";
import type { PackageOrder } from "@/lib/types/package-order";
import type { ServicePass, ServicePassConsumption } from "@/lib/types/pass";

const refundSchema = z.object({
  reason: z.string().trim().min(1, "reason required").max(500),
  refundAmount: z.number().finite().min(0).optional(),
  refundedAt: z.string().datetime().optional(),
});

class OfflinePackageRefundError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function toObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function toAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isRefundedPackageOrder(order: Record<string, any>) {
  const status = String(order.status ?? "").trim();
  const paymentStatus = String(order.paymentStatus ?? "").trim();
  return (
    status === "환불" ||
    status === "취소" ||
    paymentStatus === "환불" ||
    paymentStatus === "결제취소" ||
    order.meta?.offlineRefund === true
  );
}

function hasAnyRedemption(pass: ServicePass) {
  return Array.isArray(pass.redemptions) && pass.redemptions.length > 0;
}

function isPassUsed(pass: ServicePass) {
  return Number(pass.usedCount ?? 0) !== 0 || hasAnyRedemption(pass);
}

function serializePass(pass: ServicePass) {
  return {
    id: String(pass._id),
    status: pass.status,
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const packageOrderId = toObjectId((await ctx.params).id);
  if (!packageOrderId) return NextResponse.json({ message: "invalid package order id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });

  const reason = parsed.data.reason;
  const refundedAt = parsed.data.refundedAt ? new Date(parsed.data.refundedAt) : new Date();
  if (Number.isNaN(refundedAt.getTime())) return NextResponse.json({ message: "invalid refundedAt" }, { status: 400 });

  const packageOrders = guard.db.collection<PackageOrder & { meta?: Record<string, any>; refundAmount?: number; refundReason?: string; refundedAt?: Date }>("packageOrders");
  const passes = guard.db.collection<ServicePass>("service_passes");
  const consumptions = guard.db.collection<ServicePassConsumption>("service_pass_consumptions");
  const session = guard.db.client.startSession();

  let updatedOrder: any = null;
  let updatedPasses: ServicePass[] = [];
  let offlineCustomerId: string | null = null;
  let linkedUserId: string | null = null;
  let refundAmount = 0;
  let servicePassIds: string[] = [];

  try {
    await session.withTransaction(async () => {
      const order = await packageOrders.findOne({ _id: packageOrderId }, { session });
      if (!order) throw new OfflinePackageRefundError(404, "package order not found");
      if (!isOfflinePackageOrder(order)) throw new OfflinePackageRefundError(400, "offline package order required");
      if (isRefundedPackageOrder(order as any)) throw new OfflinePackageRefundError(409, "package order already refunded");

      refundAmount = toAmount(order.totalPrice ?? order.packageInfo?.price);
      const requestedRefundAmount = parsed.data.refundAmount;
      if (requestedRefundAmount !== undefined && requestedRefundAmount !== refundAmount) {
        throw new OfflinePackageRefundError(400, "refund amount must equal paid amount");
      }

      const passDocs = await passes.find({ orderId: packageOrderId }, { session }).toArray();
      if (passDocs.length === 0) throw new OfflinePackageRefundError(404, "service pass not found");
      if (passDocs.some(isPassUsed)) throw new OfflinePackageRefundError(409, "package already used");

      const passIds = passDocs.map((pass) => pass._id);
      servicePassIds = passIds.map((id) => String(id));
      const activeConsumptionCount = await consumptions.countDocuments(
        {
          passId: { $in: passIds },
          $or: [{ reverted: { $exists: false } }, { reverted: false }],
        } as any,
        { session },
      );
      if (activeConsumptionCount > 0) throw new OfflinePackageRefundError(409, "package already used");

      offlineCustomerId = typeof order.meta?.offlineCustomerId === "string" ? order.meta.offlineCustomerId : null;
      linkedUserId = order.userId ? String(order.userId) : null;
      const adminId = String(guard.admin._id);
      const now = new Date();

      await packageOrders.updateOne(
        { _id: packageOrderId },
        {
          $set: {
            status: "환불",
            paymentStatus: "환불",
            refundedAt,
            refundAmount,
            refundReason: reason,
            updatedAt: now,
            "paymentInfo.status": "refunded",
            "meta.offlineRefund": true,
            "meta.offlineRefundedAt": refundedAt.toISOString(),
            "meta.offlineRefundReason": reason,
            "meta.offlineRefundAmount": refundAmount,
            "meta.refundedBy": adminId,
          },
          $push: {
            history: {
              status: "환불",
              date: now,
              description: `오프라인 패키지 판매 환불 처리 / 환불금액: ${refundAmount} / 사유: ${reason} / 관리자: ${guard.admin.email ?? adminId}`,
            },
          },
        },
        { session },
      );

      await passes.updateMany(
        { _id: { $in: passIds } },
        {
          $set: {
            status: "cancelled",
            updatedAt: now,
            "meta.offlineRefundedAt": refundedAt.toISOString(),
            "meta.offlineRefundReason": reason,
          } as any,
        },
        { session },
      );

      updatedOrder = await packageOrders.findOne({ _id: packageOrderId }, { session });
      updatedPasses = await passes.find({ _id: { $in: passIds } }, { session }).toArray();
    });
  } catch (error) {
    if (error instanceof OfflinePackageRefundError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("[offline package refund] failed", error);
    return NextResponse.json({ message: "refund failed" }, { status: 500 });
  } finally {
    await session.endSession();
  }

  await appendAdminAudit(
    guard.db,
    {
      type: "offline_package_refund",
      actorId: guard.admin._id,
      targetId: packageOrderId,
      message: "오프라인 패키지 판매 환불 처리",
      diff: {
        packageOrderId: String(packageOrderId),
        offlineCustomerId,
        linkedUserId,
        refundAmount,
        reason,
        servicePassIds,
        refundedAt: refundedAt.toISOString(),
      },
    },
    req,
  );

  return NextResponse.json({
    item: {
      packageOrderId: String(packageOrderId),
      refundAmount,
      refundedAt: refundedAt.toISOString(),
      status: updatedOrder?.status ?? "환불",
      paymentStatus: updatedOrder?.paymentStatus ?? "환불",
    },
    passes: updatedPasses.map(serializePass),
  });
}
