import { racketVisibilityFilterFor, type VisibilityViewer } from "../../../../lib/public-visibility";
import type { ClientSession, Db, ObjectId } from "mongodb";

export async function reservePaidRentalRacket(params: {
  db: Db;
  session: ClientSession;
  racketId: ObjectId;
  visibilityViewer?: VisibilityViewer;
}) {
  const { db, session, racketId, visibilityViewer } = params;
  const visibility = racketVisibilityFilterFor(visibilityViewer);
  const racket = await db.collection("used_rackets").findOne(
    { _id: racketId, ...visibility },
    { projection: { quantity: 1, status: 1 }, session },
  );
  if (!racket) throw new Error("라켓 없음");

  const activeCount = await db.collection("rental_orders").countDocuments(
    { racketId, status: { $in: ["paid", "out"] } },
    { session },
  );
  const availability = calculateRacketAvailability(
    { quantity: racket.quantity, status: racket.status },
    activeCount,
  );
  const { hasStockQuantity, baseQuantity } = availability;
  const rawQuantity = racket.quantity;
  if (availability.available < 1) {
    throw new Error("대여 불가 상태(재고 없음)");
  }

  const concurrencyFilter = {
    _id: racketId,
    ...visibility,
    ...(hasStockQuantity ? { quantity: rawQuantity } : { quantity: { $exists: false }, status: "available" }),
  };
  const update = hasStockQuantity && baseQuantity > 1
    ? { $inc: { rentalConcurrencyVersion: 1 }, $set: { updatedAt: new Date() } }
    : { $inc: { rentalConcurrencyVersion: 1 }, $set: { status: "rented", updatedAt: new Date() } };
  const result = await db.collection("used_rackets").updateOne(concurrencyFilter, update, { session });
  if (result.modifiedCount !== 1) throw new Error("대여 불가 상태(재고 변경)");

  return { activeCount, baseQuantity, available: baseQuantity - activeCount };
}

export function calculateRacketAvailability(
  racket: { quantity?: unknown; status?: unknown },
  activeRentalCount: number,
) {
  const hasStockQuantity = typeof racket.quantity === "number" && Number.isFinite(racket.quantity);
  const baseQuantity = hasStockQuantity
    ? Math.max(0, Math.trunc(racket.quantity as number))
    : racket.status === "available"
      ? 1
      : 0;
  return {
    hasStockQuantity,
    baseQuantity,
    available: Math.max(0, baseQuantity - activeRentalCount),
  };
}
