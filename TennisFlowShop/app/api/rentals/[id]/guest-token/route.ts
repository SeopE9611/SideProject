import {
  hasGuestRentalCookieAccess,
  setGuestRentalAccessCookie,
} from "@/lib/auth/guest-resource-access.server";
import { rentalNotAvailable } from "@/app/api/rentals/_lib/rental-access";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isGuestRentalModeEnabled() {
  return (
    (
      process.env.GUEST_ORDER_MODE ??
      process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
      "legacy"
    ).trim() === "on"
  );
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.trim();
  if (!isGuestRentalModeEnabled() || !ObjectId.isValid(id)) return rentalNotAvailable();

  if (!hasGuestRentalCookieAccess(await cookies(), id)) return rentalNotAvailable();

  const rental = await (await getDb())
    .collection("rental_orders")
    .findOne({ _id: new ObjectId(id) }, { projection: { _id: 1, userId: 1 } });
  if (!rental || rental.userId) return rentalNotAvailable();

  const response = NextResponse.json({ success: true });
  setGuestRentalAccessCookie(response, id);
  return response;
}
