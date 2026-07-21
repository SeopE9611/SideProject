import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import {
  signGuestOrderLookupAccessToken,
  verifyGuestOrderLookupAccessToken,
} from "@/lib/auth.utils";
import { buildGuestOrderLookupDto, latestApplicationIds } from "../_lib/guest-order-response";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "on";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const schema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다.").max(50, "이름은 50자 이내로 입력해주세요."),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((value) => EMAIL_RE.test(value), "유효한 이메일 주소를 입력해주세요."),
  phone: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = digits(value);
      return normalized || undefined;
    })
    .refine(
      (value) => !value || value.length === 10 || value.length === 11,
      "전화번호는 숫자 10~11자리만 입력해주세요.",
    ),
});
const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 30,
};

function clear(response: NextResponse) {
  response.cookies.set("guestOrderLookupToken", "", { ...cookie, maxAge: 0 });
}

async function dto(db: any, orders: any[]) {
  const ids = orders.map((order) => order._id).filter(Boolean);
  const apps = ids.length
    ? await db
        .collection("stringing_applications")
        .find(
          { orderId: { $in: ids }, status: { $nin: ["draft", "취소"] } },
          { projection: { _id: 1, orderId: 1, updatedAt: 1, createdAt: 1 } },
        )
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray()
    : [];
  const latest = latestApplicationIds(apps);
  return orders.map((order) =>
    buildGuestOrderLookupDto(order, latest.get(String(order._id)) ?? null),
  );
}

export async function POST(req: Request) {
  if (getGuestOrderMode() === "off") {
    return NextResponse.json(
      { success: false, error: "비회원 주문 조회가 현재 중단되었습니다." },
      { status: 404 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const response = NextResponse.json(
      { success: false, error: "요청 값이 올바르지 않습니다." },
      { status: 400 },
    );
    clear(response);
    return response;
  }

  try {
    const { name, email, phone } = parsed.data;
    const db = (await clientPromise).db();
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const base: any = {
      guestInfo: { $exists: true, $ne: null },
      "guestInfo.name": name,
      createdAt: { $gte: since },
      ...(phone ? { "guestInfo.phone": phone } : {}),
    };
    let orders = await db
      .collection("orders")
      .find({ ...base, "guestInfo.email": email })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    if (!orders.length) {
      orders = await db
        .collection("orders")
        .find({
          ...base,
          "guestInfo.email": new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
    }

    const result = await dto(db, orders);
    const response = NextResponse.json({ success: true, orders: result });
    if (result.length) {
      response.cookies.set(
        "guestOrderLookupToken",
        signGuestOrderLookupAccessToken({
          scope: "guest_order_lookup",
          orderIds: result.map((order) => order.id).filter(ObjectId.isValid),
        }),
        cookie,
      );
    } else {
      clear(response);
    }
    return response;
  } catch (error) {
    console.error("[GUEST_ORDER_LOOKUP_ERROR]", error);
    const response = NextResponse.json(
      { success: false, error: "주문 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
    clear(response);
    return response;
  }
}

export async function GET() {
  if (getGuestOrderMode() === "off") {
    return NextResponse.json(
      { success: false, error: "비회원 주문 조회가 현재 중단되었습니다." },
      { status: 404 },
    );
  }

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const claims = verifyGuestOrderLookupAccessToken(store.get("guestOrderLookupToken")?.value ?? "");
  if (!claims) {
    return NextResponse.json(
      {
        success: false,
        code: "GUEST_LOOKUP_SESSION_REQUIRED",
        error: "조회 정보가 만료되었습니다. 주문을 다시 조회해주세요.",
      },
      { status: 401 },
    );
  }

  const ids = claims.orderIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const db = (await clientPromise).db();
  const orders = ids.length
    ? await db
        .collection("orders")
        .find({ _id: { $in: ids }, $or: [{ userId: { $exists: false } }, { userId: null }] })
        .sort({ createdAt: -1 })
        .toArray()
    : [];
  return NextResponse.json({ success: true, orders: await dto(db, orders) });
}
