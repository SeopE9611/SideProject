import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { canTransitIdempotent } from "@/app/features/rentals/utils/status";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

export const dynamic = "force-dynamic";

class RentalReturnError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly message: string = code,
  ) {
    super(message);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id: rentalId } = await params;
  if (!ObjectId.isValid(rentalId)) return NextResponse.json({ message: "BAD_ID" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const _id = new ObjectId(rentalId);
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const rentals = db.collection("rental_orders");
      const rental: any = await rentals.findOne({ _id }, { session });
      if (!rental) throw new RentalReturnError("NOT_FOUND", 404, "Not Found");

      const currentStatus = rental.status ?? "pending";
      if (currentStatus === "returned") {
        return { transitioned: false as const, returnedAt: null };
      }
      if (!canTransitIdempotent(currentStatus, "returned") || currentStatus !== "out") {
        throw new RentalReturnError("INVALID_STATE", 409, "반납 불가 상태");
      }

      const returnedAt = new Date();
      const updated = await rentals.updateOne(
        { _id, status: "out" },
        { $set: { status: "returned", returnedAt, updatedAt: returnedAt } },
        { session },
      );
      if (updated.matchedCount === 0) {
        throw new RentalReturnError("RENTAL_RETURN_STATE_CONFLICT", 409);
      }

      await db.collection("rental_history").insertOne(
        {
          rentalId: _id,
          action: "returned",
          from: "out",
          to: "returned",
          actor: { role: "admin", id: String(guard.admin._id) },
          at: returnedAt,
        },
        { session },
      );

      const racketIdStr = String(rental.racketId ?? "");
      if (ObjectId.isValid(racketIdStr)) {
        const rid = new ObjectId(racketIdStr);
        const rack: any = await db
          .collection("used_rackets")
          .findOne({ _id: rid }, { projection: { quantity: 1 }, session });
        if (rack) {
          const remainingActiveCount = await rentals.countDocuments(
            {
              _id: { $ne: _id },
              racketId: rid,
              status: { $in: ["paid", "out"] },
            },
            { session },
          );
          const qty = Number(rack.quantity ?? 1);
          const racketUpdate =
            !Number.isFinite(qty) || qty <= 1
              ? {
                  $set: {
                    status: remainingActiveCount === 0 ? "available" : "rented",
                    updatedAt: returnedAt,
                  },
                }
              : { $set: { updatedAt: returnedAt } };
          const racketUpdated = await db
            .collection("used_rackets")
            .updateOne({ _id: rid }, racketUpdate, { session });
          if (racketUpdated.matchedCount === 0) {
            throw new RentalReturnError("RENTAL_RACKET_NOT_FOUND", 409);
          }
        }
      }

      return { transitioned: true as const, returnedAt };
    });

    if (!result) throw new RentalReturnError("RENTAL_RETURN_FAILED", 409);
    if (!result.transitioned) return NextResponse.json({ ok: true });

    await appendAdminAudit(
      db,
      {
        type: "admin.rentals.status.returned",
        actorId: guard.admin._id,
        targetId: _id,
        message: "대여 상태를 out → returned 로 전환",
        diff: { from: "out", to: "returned" },
      },
      req,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RentalReturnError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
