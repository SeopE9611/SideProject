import { canAccessStringingApplicationById } from "@/app/api/applications/stringing/_helpers/access-gate";
import clientPromise from "@/lib/mongodb";
import { buildNiceOrderName, createNiceOrderId } from "@/lib/payments/nice/server";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { getBaseUrl } from "@/lib/getBaseUrl";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

function resolveClientId() {
  return String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
}

function resolveAppUrl() {
  return String(getBaseUrl()).trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    if (!isNicePaymentsEnabled()) {
      return NextResponse.json(
        { success: false, error: "현재 카드/간편결제를 사용할 수 없습니다." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.applicationId ?? "").trim();
    const access = await canAccessStringingApplicationById(applicationId, {
      allowGuestOrder: false,
      allowGuestRental: false,
    });
    if (!access.ok) return access.response;

    const clientId = resolveClientId();
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "카드/간편결제 설정이 누락되었습니다." },
        { status: 500 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const application = await db
      .collection("stringing_applications")
      .findOne({ _id: new ObjectId(applicationId) });
    if (!application) {
      return NextResponse.json(
        { success: false, error: "신청서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const amount = Math.floor(Number(application.totalPrice ?? 0));
    if (
      application.orderId ||
      application.rentalId ||
      application.packageApplied ||
      application.servicePaid ||
      application.paymentMethod !== "nicepay" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "카드/간편결제 가능한 신청 상태가 아닙니다." },
        { status: 409 },
      );
    }

    const niceOrderId = createNiceOrderId();
    const goodsName = buildNiceOrderName([{ name: "스트링 장착 서비스", quantity: 1 }]);
    const returnUrl = `${resolveAppUrl()}/api/payments/nice/stringing/return`;
    const now = new Date();

    await ensureTossPaymentSessionIndexes(db);
    await tossPaymentSessions(db).insertOne({
      provider: "nicepay",
      niceOrderId,
      amount,
      status: "ready",
      flowType: "stringing_application",
      applicationId,
      userId: application.userId ? String(application.userId) : null,
      nicePrepared: {
        clientId,
        orderId: niceOrderId,
        returnUrl,
        goodsName,
        buyerName: String(application.name ?? ""),
        buyerTel: String(application.phone ?? "").replace(/\D/g, ""),
        buyerEmail: String(application.email ?? ""),
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
    });

    return NextResponse.json({
      success: true,
      nice: {
        clientId,
        orderId: niceOrderId,
        amount,
        goodsName,
        returnUrl,
        buyerName: String(application.name ?? ""),
        buyerTel: String(application.phone ?? "").replace(/\D/g, ""),
        buyerEmail: String(application.email ?? ""),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "카드/간편결제 준비에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
