import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getPackagePricingInfo } from "@/app/features/packages/api/db";
import { buildTossOrderName, createTossOrderId } from "@/lib/payments/toss/server";
import { ensureTossPaymentSessionIndexes, tossPaymentSessions } from "@/lib/payments/toss/session";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const userId = payload?.sub ?? null;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const packageId = String(body?.packageId ?? "").trim();
    const serviceInfo = body?.serviceInfo ?? {};

    const name = String(serviceInfo?.name ?? "").trim();
    const email = String(serviceInfo?.email ?? "").trim();
    const phone = onlyDigits(serviceInfo?.phone ?? "");
    const serviceRequest = String(serviceInfo?.serviceRequest ?? "").trim();

    if (!packageId || !name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "필수 요청 데이터가 누락되었습니다." },
        { status: 400 },
      );
    }
    if (name.length < 2 || !EMAIL_RE.test(email) || !/^010\d{8}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "입력 정보 형식을 확인해주세요." },
        { status: 400 },
      );
    }

    const { configById } = await getPackagePricingInfo();
    const config = configById[packageId];
    if (!config || !config.isActive || Number(config.price) <= 0) {
      return NextResponse.json(
        { success: false, error: "구매 가능한 패키지가 아닙니다." },
        { status: 400 },
      );
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

    const tossOrderId = createTossOrderId();
    const now = new Date();

    await tossPaymentSessions(db).insertOne({
      tossOrderId,
      amount: Number(config.price),
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
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 30),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      orderId: tossOrderId,
      amount: Number(config.price),
      orderName: buildTossOrderName([{ name: config.name, quantity: 1 }]),
      customerName: name,
      customerEmail: email,
      customerMobilePhone: phone,
      successUrl: `${appUrl}/services/packages/toss/success`,
      failUrl: `${appUrl}/services/packages/toss/fail`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "패키지 토스 결제 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
