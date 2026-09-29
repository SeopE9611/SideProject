import { verifyAccessToken } from "@/lib/auth.utils";
import { hasGuestRentalCookieAccess } from "@/lib/auth/guest-resource-access.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function rentalNotAvailable() {
  return NextResponse.json(
    { success: false, code: "RENTAL_NOT_AVAILABLE", error: "대여 정보를 확인할 수 없습니다." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export function getRentalAccessDecision(params: {
  rental: { userId?: unknown } | null;
  rentalId: string;
  accessClaims: { sub?: unknown; role?: unknown } | null;
  hasGuestRentalAccess: boolean;
  allowAdmin?: boolean;
}) {
  if (!params.rental) return { ok: false as const, reason: "RENTAL_NOT_AVAILABLE" as const };

  const isGuestRental = !params.rental.userId;
  const isMemberOwner =
    !isGuestRental &&
    typeof params.accessClaims?.sub === "string" &&
    params.accessClaims.sub === String(params.rental.userId);
  const isAdmin = params.allowAdmin && params.accessClaims?.role === "admin";
  const isGuestOwner = isGuestRental && params.hasGuestRentalAccess;

  return isMemberOwner || isAdmin || isGuestOwner
    ? { ok: true as const, isGuestRental }
    : { ok: false as const, reason: "RENTAL_NOT_AVAILABLE" as const };
}

export async function getRentalAccess(db: any, rentalId: string, allowAdmin = false) {
  const id = rentalId.trim();
  if (!ObjectId.isValid(id)) return { ok: false as const, response: rentalNotAvailable() };

  const _id = new ObjectId(id);
  const rental = await db.collection("rental_orders").findOne({ _id });
  if (!rental) return { ok: false as const, response: rentalNotAvailable() };

  const jar = await cookies();
  const accessClaims = verifyAccessToken(jar.get("accessToken")?.value ?? "");

  const decision = getRentalAccessDecision({
    rental,
    rentalId: id,
    accessClaims,
    hasGuestRentalAccess: hasGuestRentalCookieAccess(jar, id),
    allowAdmin,
  });
  if (!decision.ok) {
    return { ok: false as const, response: rentalNotAvailable() };
  }

  return {
    ok: true as const,
    rental,
    _id,
    accessFilter: decision.isGuestRental
      ? { _id, $or: [{ userId: { $exists: false } }, { userId: null }] }
      : { _id, userId: rental.userId },
  };
}
