import { getRentalAccess } from "@/app/api/rentals/_lib/rental-access";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await clientPromise).db();
  const access = await getRentalAccess(db, id, true);
  if (!access.ok) return access.response;
  const { rental: doc } = access;
  const cancelReq = doc.cancelRequest ?? null;
  const memberUser =
    doc.userId && ObjectId.isValid(String(doc.userId))
      ? await db
          .collection("users")
          .findOne(
            { _id: new ObjectId(String(doc.userId)) },
            { projection: { name: 1, email: 1, phone: 1 } },
          )
      : null;

  return NextResponse.json(
    {
      id: doc._id.toString(),
      racketId: doc.racketId?.toString?.(),
      brand: doc.brand,
      model: doc.model,
      days: doc.days,
      status: typeof doc.status === "string" ? doc.status.toLowerCase() : doc.status,
      servicePickupMethod: doc.servicePickupMethod ?? null,
      amount: doc.amount,
      stringing: doc.stringing
        ? {
            requested: !!doc.stringing.requested,
            stringId: doc.stringing.stringId?.toString?.() ?? null,
            name: doc.stringing.name ?? "",
            price: Number(doc.stringing.price ?? 0),
            mountingFee: Number(doc.stringing.mountingFee ?? 0),
            image: doc.stringing.image ?? null,
            requestedAt: doc.stringing.requestedAt ?? null,
          }
        : null,
      createdAt: doc.createdAt,
      outAt: doc.outAt ?? null,
      dueAt: doc.dueAt ?? null,
      returnedAt: doc.returnedAt ?? null,
      depositRefundedAt: doc.depositRefundedAt ?? null,
      shipping: { outbound: doc.shipping?.outbound ?? null, return: doc.shipping?.return ?? null },
      cancelRequest: cancelReq
        ? {
            status: cancelReq.status ?? "requested",
            reasonCode: cancelReq.reasonCode ?? "",
            reasonText: cancelReq.reasonText ?? "",
            requestedAt: cancelReq.requestedAt ?? null,
            processedAt: cancelReq.processedAt ?? null,
          }
        : null,
      user: memberUser
        ? {
            name: memberUser.name ?? "",
            email: memberUser.email ?? "",
            phone: memberUser.phone ?? "",
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
