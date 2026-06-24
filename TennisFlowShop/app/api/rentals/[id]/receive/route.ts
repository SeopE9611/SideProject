import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { writeRentalHistory } from "@/app/features/rentals/utils/history";
import { getLinkedRentalStringingStatus } from "@/lib/admin/rental-stringing-flow.server";
import { hasRentalStringingService, isRentalStringingComplete } from "@/lib/rental-stringing-flow";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = String(payload?.sub ?? "");
  const { id } = await params;
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const db = (await clientPromise).db();
  const _id = new ObjectId(id);
  const rental: any = await db.collection("rental_orders").findOne({
    _id,
    userId: new ObjectId(userId),
  });
  if (!rental) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  const notReady = () =>
    NextResponse.json(
      {
        ok: false,
        code: "RENTAL_NOT_READY_TO_RECEIVE",
        message: "아직 수령 확인을 진행할 수 없습니다.",
      },
      { status: 409 },
    );

  if (
    String(rental.status ?? "").toLowerCase() !== "paid" ||
    !String(rental?.shipping?.outbound?.trackingNumber ?? "").trim()
  ) {
    return notReady();
  }

  const stringingStatus = await getLinkedRentalStringingStatus(db, rental, id);
  if (
    (hasRentalStringingService(rental) || stringingStatus !== null) &&
    !isRentalStringingComplete(stringingStatus)
  ) {
    return notReady();
  }

  const outAt = new Date().toISOString();
  const rawDays = Number(rental?.days ?? 7);
  const days = rawDays === 7 || rawDays === 15 || rawDays === 30 ? rawDays : 7;
  const due = new Date(outAt);
  due.setDate(due.getDate() + days);
  const dueAt = due.toISOString();

  const updated = await db
    .collection("rental_orders")
    .updateOne(
      { _id, userId: new ObjectId(userId), status: "paid" },
      { $set: { status: "out", outAt, dueAt, updatedAt: new Date() } },
    );
  if (updated.matchedCount === 0) return notReady();

  if (rental.racketId) {
    const racketId = String(rental.racketId);
    if (ObjectId.isValid(racketId)) {
      const rid = new ObjectId(racketId);
      const racket = await db
        .collection("used_rackets")
        .findOne({ _id: rid }, { projection: { quantity: 1, status: 1 } });
      const quantity = Number(racket?.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity <= 1) {
        await db
          .collection("used_rackets")
          .updateOne(
            { _id: rid, status: { $in: ["available", "rented"] } },
            { $set: { status: "rented", updatedAt: new Date() } },
          );
      }
    }
  }

  await writeRentalHistory(db, _id, {
    action: "out",
    from: "paid",
    to: "out",
    actor: { role: "user", id: userId },
    snapshot: { reason: "customer-receive-confirmation" },
  });

  return NextResponse.json({ ok: true, id, status: "out", outAt, dueAt });
}
