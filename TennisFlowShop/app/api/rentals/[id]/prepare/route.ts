import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getRentalAccess, rentalNotAvailable } from "@/app/api/rentals/_lib/rental-access";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * 서버 최종 유효성 검사(prepare)
 * - status 변경 없이 "결제/배송/환급" 정보만 저장하는 엔드포인트라,
 *   잘못된 타입/형식(객체/배열/초장문 등)이 그대로 DB에 들어가면 이후 UI/계산/상태 전이에 문제가 생길 대비.
 * - 목적:
 *   1) verifyAccessToken throw → 500 방지
 *   2) body 형식 방어 + 문자열 정규화(trim/digits)
 *   3) JSON 파싱 실패 시 업데이트 자체를 막아 기존 데이터가 null로 덮이는 사고 방지
 */

const POSTAL_RE = /^\d{5}$/;
const PAYMENT_BANKS = new Set(["kakao"] as const);

const toTrimmedString = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, "");

const PaymentSchema = z
  .object({
    method: z.literal("bank_transfer"),
    bank: z.preprocess(toTrimmedString, z.string().optional()).optional(),
    depositor: z.preprocess(toTrimmedString, z.string().max(50).optional()).optional(),
  })
  .passthrough();

const ShippingSchema = z
  .object({
    name: z.preprocess(toTrimmedString, z.string().min(1).max(50)),
    phone: z.preprocess(toDigits, z.string().min(8).max(13)),
    postalCode: z.preprocess(toDigits, z.string().regex(POSTAL_RE)),
    address: z.preprocess(toTrimmedString, z.string().min(1).max(200)),
    addressDetail: z.preprocess(toTrimmedString, z.string().max(200).optional()).optional(),
    deliveryRequest: z.preprocess(toTrimmedString, z.string().max(200).optional()).optional(),
  })
  .passthrough();

const PrepareBodySchema = z
  .object({
    payment: PaymentSchema.nullable().optional(),
    shipping: ShippingSchema.nullable().optional(),
    refundAccount: RefundAccountSchema.nullable().optional(),
  })
  .passthrough();

/**
 * [무통장 접수 전용] status 변경 없이 결제/배송 정보만 저장.
 * body: {
 *   payment?: { method: 'bank_transfer'; bank?: string; depositor?: string },
 *   shipping?: { name, phone, postalCode, address, addressDetail?, deliveryRequest? },
 *   refundAccount?: { bank: string, account: string, holder: string }
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = (await clientPromise).db();
    const access = await getRentalAccess(db, id);
    if (!access.ok) return access.response;
    // JSON 파싱 실패 시 업데이트를 막아서 "기존 값이 null로 덮이는 사고" 방지
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: "INVALID_JSON" }, { status: 400 });
    }

    const parsed = PrepareBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "BAD_BODY" }, { status: 400 });
    }

    const body = parsed.data;

    // 은행 값 최종 방어(입금 bank)
    const bank = body?.payment?.bank ? String(body.payment.bank).trim() : "";
    if (bank && !PAYMENT_BANKS.has(bank as any)) {
      return NextResponse.json({ ok: false, message: "INVALID_BANK" }, { status: 400 });
    }

    const update = await db.collection("rental_orders").updateOne(access.accessFilter, {
      $set: {
        payment: body?.payment ?? null, // 은행/입금자명 보관
        shipping: body?.shipping ?? null, // 배송지 보관
        refundAccount: body?.refundAccount ?? null,
        updatedAt: new Date(),
      },
    });
    if (!update.matchedCount) return rentalNotAvailable();

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("POST /api/rentals/[id]/prepare error:", err);
    return NextResponse.json({ ok: false, message: "SERVER_ERROR" }, { status: 500 });
  }
}
