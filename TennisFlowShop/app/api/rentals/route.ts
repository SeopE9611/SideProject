import {
  createRentalOrderCore,
  type RentalCreatePayload,
} from "@/app/features/rentals/api/create-rental-order-core";
import { verifyAccessToken } from "@/lib/auth.utils";
import { setGuestRentalAccessCookie } from "@/lib/auth/guest-resource-access.server";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const POSTAL_RE = /^\d{5}$/;
const AllowedDaysSchema = z.union([z.literal(7), z.literal(15), z.literal(30)]);

const toTrimmedString = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, "");

const RentalsCreateBodySchema = z
  .object({
    racketId: z
      .string()
      .trim()
      .min(1)
      .refine((s) => ObjectId.isValid(s), { message: "BAD_RACKET_ID" }),
    days: z.coerce.number().pipe(AllowedDaysSchema),
    pointsToUse: z.coerce.number().optional(),
    servicePickupMethod: z.enum(["SELF_SEND", "SHOP_VISIT", "delivery", "pickup"]).optional(),
    payment: z
      .object({
        method: z.literal("bank_transfer"),
        bank: z.string().trim().min(1),
        depositor: z.string().trim().min(2),
      })
      .passthrough(),
    shipping: z
      .object({
        name: z.string().trim().min(2),
        phone: z.preprocess(toDigits, z.string().min(10).max(11)),
        postalCode: z.preprocess(toDigits, z.string()).optional(),
        address: z.string().trim().optional(),
        addressDetail: z.string().trim().optional(),
        deliveryRequest: z.string().trim().optional(),
        shippingMethod: z.enum(["pickup", "delivery"]).optional(),
      })
      .passthrough(),
    refundAccount: RefundAccountSchema,
    stringing: z
      .object({
        requested: z.coerce.boolean().optional(),
        stringId: z.string().trim().optional(),
      })
      .passthrough()
      .optional(),
    stringingApplicationInput: z.any().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const pickup = data.servicePickupMethod;
    const shippingMethod = data.shipping?.shippingMethod;
    const isPickup = pickup === "SHOP_VISIT" || pickup === "pickup" || shippingMethod === "pickup";

    if (isPickup) return;

    const postalDigits = toDigits(data.shipping?.postalCode ?? "");
    const address = toTrimmedString(data.shipping?.address);

    if (!POSTAL_RE.test(postalDigits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "INVALID_POSTAL",
        path: ["shipping", "postalCode"],
      });
    }
    if (!address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "REQUIRED_ADDRESS",
        path: ["shipping", "address"],
      });
    }
  });

export async function POST(req: Request) {
  const idemKeyRaw = req.headers.get("Idempotency-Key");
  const idemKey = idemKeyRaw && idemKeyRaw.trim() ? idemKeyRaw.trim() : undefined;

  const raw = await req.text();
  if (!raw) {
    return NextResponse.json({ ok: false, message: "EMPTY_BODY" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = RentalsCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    if (issues.some((i) => i.message === "BAD_RACKET_ID")) {
      return NextResponse.json({ ok: false, message: "BAD_RACKET_ID" }, { status: 400 });
    }
    if (issues.some((i) => i.path?.[0] === "days")) {
      return NextResponse.json({ message: "허용되지 않는 대여 기간" }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: "요청 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const normalizedBody = parsed.data;
  const selectedGauge =
    typeof (body as any)?.selectedGauge === "string" && (body as any).selectedGauge.trim()
      ? (body as any).selectedGauge.trim()
      : typeof (body as any)?.stringing?.selectedGauge === "string" &&
          (body as any).stringing.selectedGauge.trim()
        ? (body as any).stringing.selectedGauge.trim()
        : undefined;
  const selectedColor =
    typeof (body as any)?.selectedColor === "string" && (body as any).selectedColor.trim()
      ? (body as any).selectedColor.trim()
      : typeof (body as any)?.stringing?.selectedColor === "string" &&
          (body as any).stringing.selectedColor.trim()
        ? (body as any).stringing.selectedColor.trim()
        : undefined;
  const selectedColorLabel =
    typeof (body as any)?.stringing?.selectedColorLabel === "string" &&
    (body as any).stringing.selectedColorLabel.trim()
      ? (body as any).stringing.selectedColorLabel.trim()
      : undefined;
  const selectedColorHex =
    typeof (body as any)?.stringing?.selectedColorHex === "string" &&
    (body as any).stringing.selectedColorHex.trim()
      ? (body as any).stringing.selectedColorHex.trim()
      : undefined;
  const selectedColorImage =
    typeof (body as any)?.stringing?.selectedColorImage === "string" &&
    (body as any).stringing.selectedColorImage.trim()
      ? (body as any).stringing.selectedColorImage.trim()
      : undefined;

  const payloadWithGauge: RentalCreatePayload = {
    ...(normalizedBody as RentalCreatePayload),
    stringing: {
      ...((normalizedBody as RentalCreatePayload).stringing ?? {}),
      ...(selectedGauge ? { selectedGauge } : {}),
      ...(selectedColor ? { selectedColor } : {}),
      ...(selectedColorLabel ? { selectedColorLabel } : {}),
      ...(selectedColorHex ? { selectedColorHex } : {}),
      ...(selectedColorImage ? { selectedColorImage } : {}),
    },
  };

  try {
    const client = await clientPromise;
    const db = client.db();

    const jar = await cookies();
    const at = jar.get("accessToken")?.value;
    let payload: any = null;
    try {
      payload = at ? verifyAccessToken(at) : null;
    } catch {
      payload = null;
    }
    const sub =
      typeof payload?.sub === "string" && ObjectId.isValid(payload.sub) ? payload.sub : null;
    const userObjectId = sub ? new ObjectId(sub) : null;

    const guestOrderMode = (
      process.env.GUEST_ORDER_MODE ??
      process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ??
      "legacy"
    ).trim();
    const allowGuestCheckout = guestOrderMode === "on";
    if (!allowGuestCheckout && !userObjectId) {
      return NextResponse.json(
        { ok: false, message: "LOGIN_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await createRentalOrderCore({
      db,
      client,
      userObjectId,
      payload: payloadWithGauge,
      idemKey,
      initialStatus: "pending",
    });

    const response = NextResponse.json({
      ok: true,
      id: result.id,
      stringingApplicationId: result.stringingApplicationId,
      stringingSubmitted: result.stringingSubmitted,
    });

    if (allowGuestCheckout && !userObjectId && ObjectId.isValid(result.id)) {
      const rental = await db
        .collection("rental_orders")
        .findOne({ _id: new ObjectId(result.id) }, { projection: { _id: 1, userId: 1 } });
      if (rental && !rental.userId) {
        setGuestRentalAccessCookie(response, result.id);
      }
    }

    return response;
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
    console.error("[POST /api/rentals] failed", {
      message: msg,
      code: e?.code,
      codeName: e?.codeName,
      errorLabels: e?.errorLabels,
      stack: e?.stack,
    });
    if (!Number.isInteger(e?.status)) {
      return NextResponse.json(
        {
          ok: false,
          message: msg,
          code: e?.code,
          codeName: e?.codeName,
          errorLabels: e?.errorLabels,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: msg,
        code: e?.code,
        codeName: e?.codeName,
        errorLabels: e?.errorLabels,
      },
      { status: Number(e.status) },
    );
  }
}
