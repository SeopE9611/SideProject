import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { ObjectId } from "mongodb";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

export const dynamic = "force-dynamic";

class PaymentConfirmError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

const cancelRequestAllowsPayment = {
  $or: [
    { cancelRequest: { $exists: false } },
    { cancelRequest: null },
    { "cancelRequest.status": "rejected" },
  ],
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ ok: false, message: "BAD_ID" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const _id = new ObjectId(id);
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const rentals = db.collection("rental_orders");
      const doc: any = await rentals.findOne({ _id }, { session });
      if (!doc) throw new PaymentConfirmError("NOT_FOUND", 404);

      if (doc.payment?.method !== "bank_transfer") {
        throw new PaymentConfirmError("MANUAL_BANK_TRANSFER_REQUIRED", 409);
      }

      const current = String(doc.status ?? "pending");
      if (current === "paid") return { transitioned: false as const, paidAt: null };
      if (current !== "pending") throw new PaymentConfirmError("INVALID_STATE", 409);

      const cancelStatus = doc.cancelRequest?.status;
      if (doc.cancelRequest != null && cancelStatus !== "rejected") {
        throw new PaymentConfirmError("RENTAL_CANCEL_REQUEST_ACTIVE", 409);
      }

      const racketIdValue = String(doc.racketId ?? "");
      if (!ObjectId.isValid(racketIdValue)) {
        throw new PaymentConfirmError("RENTAL_RACKET_NOT_FOUND", 409);
      }
      const racketId = new ObjectId(racketIdValue);
      const racket: any = await db.collection("used_rackets").findOne({ _id: racketId }, { session });
      if (!racket) throw new PaymentConfirmError("RENTAL_RACKET_NOT_FOUND", 409);

      const activeCount = await rentals.countDocuments(
        {
          _id: { $ne: _id },
          racketId,
          status: { $in: ["paid", "out"] },
        },
        { session },
      );
      const rawQtyField = racket.quantity;
      const hasStockQty = typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
      const totalCapacity = hasStockQty
        ? Math.max(0, Math.trunc(rawQtyField))
        : racket.status === "available"
          ? 1
          : 0;
      if (activeCount >= totalCapacity) {
        throw new PaymentConfirmError("RENTAL_CAPACITY_EXCEEDED", 409);
      }

      const paidAt = new Date();
      const racketUpdate =
        totalCapacity <= 1
          ? { $set: { status: "rented", updatedAt: paidAt } }
          : { $set: { updatedAt: paidAt } };
      const racketResult = await db
        .collection("used_rackets")
        .updateOne({ _id: racketId }, racketUpdate, { session });
      if (racketResult.matchedCount === 0) {
        throw new PaymentConfirmError("RENTAL_RACKET_NOT_FOUND", 409);
      }

      const updated = await rentals.updateOne(
        {
          _id,
          status: "pending",
          "payment.method": "bank_transfer",
          ...cancelRequestAllowsPayment,
        },
        {
          $set: {
            status: "paid",
            paymentStatus: "결제완료",
            "paymentInfo.provider": "manual_bank_transfer",
            "paymentInfo.method": "bank_transfer",
            "paymentInfo.status": "paid",
            "paymentInfo.approvedAt": paidAt,
            paidAt,
            updatedAt: paidAt,
          },
        },
        { session },
      );
      if (updated.matchedCount === 0) {
        throw new PaymentConfirmError("PAYMENT_CONFIRM_STATE_CONFLICT", 409);
      }

      await db.collection("rental_history").insertOne(
        {
          rentalId: _id,
          action: "paid",
          from: "pending",
          to: "paid",
          actor: { role: "admin", id: String(guard.admin._id) },
          at: paidAt,
        },
        { session },
      );

      return { transitioned: true as const, paidAt };
    });

    if (!result) throw new PaymentConfirmError("PAYMENT_CONFIRM_FAILED", 409);
    if (!result.transitioned) return NextResponse.json({ ok: true, id });

    await appendAdminAudit(
      db,
      {
        type: "admin.rentals.status.paid",
        actorId: guard.admin._id,
        targetId: _id,
        message: "대여 상태를 pending → paid 로 전환",
        diff: { from: "pending", to: "paid", paidAt: result.paidAt },
      },
      req,
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof PaymentConfirmError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.code },
        { status: error.status },
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
