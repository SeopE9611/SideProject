import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { signOrderAccessToken } from "@/lib/auth.utils";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderMode(): GuestOrderMode {
  const raw = (
    process.env.GUEST_ORDER_MODE ??
    process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
    "legacy"
  ).trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

// POST /api/rentals/:id/guest-token
// - 게스트 대여에 한해, 해당 대여로 접근 가능한 HttpOnly 쿠키를 심어준다.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (getGuestOrderMode() !== "on") {
      return NextResponse.json({ message: "not found" }, { status: 404 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "invalid rental id" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const rental = await db
      .collection("rental_orders")
      .findOne({ _id: new ObjectId(id) }, { projection: { _id: 1, userId: 1 } });
    if (!rental) {
      return NextResponse.json({ message: "rental not found" }, { status: 404 });
    }

    const isGuestRental = !rental.userId;
    if (!isGuestRental) {
      return NextResponse.json(
        { message: "not a guest rental" },
        { status: 400 },
      );
    }

    const token = signOrderAccessToken({ rentalId: String(rental._id) });

    const res = NextResponse.json({ success: true });
    res.cookies.set("orderAccessToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("[guest-rental-token] error", e);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
