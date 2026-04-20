import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getPackagePricingInfo } from "@/app/features/packages/api/db";
import { isNicePaymentsEnabled } from "@/lib/payments/provider-flags";
import { buildNiceOrderName, createNiceOrderId } from "@/lib/payments/nice/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");

function resolveClientId() {
  return String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
}

function resolveAppUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
}

export const runtime = "nodejs";
export const preferredRegion = ["icn1", "hnd1"];

export async function POST(req: Request) {
  try {
    if (!isNicePaymentsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYMENT_PROVIDER_DISABLED",
          message: "현재 해당 결제수단은 사용할 수 없습니다.",
        },
        { status: 503 },
      );
    }

    const clientId = resolveClientId();
    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          code: "NICE_CONFIG_MISSING",
          error: "NicePay client key 설정이 누락되었습니다.",
        },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const packageId = String(body?.packageId ?? "").trim();
    const serviceInfo = body?.serviceInfo ?? {};

    const name = String(serviceInfo?.name ?? "").trim();
    const email = String(serviceInfo?.email ?? "").trim();
    const phone = onlyDigits(serviceInfo?.phone ?? "");
    const serviceRequest = String(serviceInfo?.serviceRequest ?? "").trim();

    if (!packageId || !name || !email || !phone) {
      return NextResponse.json({ success: false, error: "필수 요청 데이터가 누락되었습니다." }, { status: 400 });
    }

    if (name.length < 2 || !EMAIL_RE.test(email) || !/^010\d{8}$/.test(phone)) {
      return NextResponse.json({ success: false, error: "입력 정보 형식을 확인해주세요." }, { status: 400 });
    }

    const { configById } = await getPackagePricingInfo();
    const config = configById[packageId];
    if (!config || !config.isActive || Number(config.price) <= 0) {
      return NextResponse.json({ success: false, error: "구매 가능한 패키지가 아닙니다." }, { status: 400 });
    }

    const blocking = await findBlockingPackageOrderByUserId(String(userId));
    if (blocking) {
      return NextResponse.json(
        {
          success: false,
          code: "PACKAGE_ALREADY_OWNED",
          error:
            blocking.kind === "pending_order"
              ? "진행 중인 패키지 주문(결제대기)이 있어 추가 구매할 수 없습니다."
              : "현재 사용 가능한 패키지가 있어 추가 구매할 수 없습니다.",
        },
        { status: 409 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    await ensureTossPaymentSessionIndexes(db);

    const niceOrderId = createNiceOrderId();
    const amount = Number(config.price);
    const goodsName = buildNiceOrderName([{ name: config.name, quantity: 1 }]);
    const returnUrl = `${resolveAppUrl()}/api/payments/nice/package/return`;

    const now = new Date();
    await tossPaymentSessions(db).insertOne({
      provider: "nicepay",
      niceOrderId,
      amount,
      status: "ready",
      flowType: "package_order",
      userId: String(userId),
      packagePayload: {
        packageId: config.id,
        serviceInfo: {
          name,
          phone,
          email,
          serviceRequest,
        },
      },
      nicePrepared: {
        clientId,
        orderId: niceOrderId,
        returnUrl,
        goodsName,
        buyerName: name,
        buyerTel: phone,
        buyerEmail: email,
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
        buyerName: name,
        buyerTel: phone,
        buyerEmail: email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "패키지 Nice 결제 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
