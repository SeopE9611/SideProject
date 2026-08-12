import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { authenticateAppsSession } from "@/lib/apps-in-toss/server/session";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_OPTIONS = { methods: ["GET", "OPTIONS"], headers: ["Content-Type", "Accept", "Authorization"] } as const;

function response(origin: string | null, body: unknown, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return applyAppsInTossCors(result, origin, CORS_OPTIONS);
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);
  return createAppsInTossPreflightResponse(origin, CORS_OPTIONS);
}

function iso(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);
  try {
    const db = await getDb();
    const authenticated = await authenticateAppsSession(db, request.headers.get("authorization"));
    const orders = await db.collection("orders").find({
      userId: authenticated.user._id,
      isStringServiceApplied: true,
      "paymentInfo.provider": "apps_in_toss_toss_pay",
    }).sort({ createdAt: -1 }).limit(100).toArray();
    const orderIds = orders.map((order) => order._id);
    const applications = orderIds.length
      ? await db.collection("stringing_applications").find({ userId: authenticated.user._id, orderId: { $in: orderIds } }).toArray()
      : [];
    const byOrder = new Map(applications.map((application) => [String(application.orderId), application]));
    const activities = orders.flatMap((order) => {
      const application = byOrder.get(String(order._id));
      if (!application) return [];
      const item = Array.isArray(order.items) ? order.items[0] : null;
      const line = Array.isArray(application.stringDetails?.lines) ? application.stringDetails.lines[0] : null;
      return [{
        id: String(application._id), orderId: String(order._id), createdAt: iso(application.createdAt),
        productName: typeof item?.name === "string" ? item.name : "스트링 교체서비스",
        color: typeof application.meta?.selectedColor === "string" ? application.meta.selectedColor : "",
        gauge: typeof application.meta?.selectedGauge === "string" ? application.meta.selectedGauge : "",
        collectionMethod: application.collectionMethod === "visit" ? "visit" : "self_ship",
        preferredDate: typeof application.stringDetails?.preferredDate === "string" ? application.stringDetails.preferredDate : null,
        preferredTime: typeof application.stringDetails?.preferredTime === "string" ? application.stringDetails.preferredTime : null,
        status: typeof application.status === "string" ? application.status : "접수 완료",
        paymentStatus: typeof order.paymentStatus === "string" ? order.paymentStatus : "결제완료",
        amount: typeof order.totalPrice === "number" ? order.totalPrice : 0,
        racketType: typeof line?.racketType === "string" ? line.racketType : null,
      }];
    });
    return response(origin, { success: true, activities }, 200);
  } catch {
    return response(origin, { success: false, message: "인증이 필요합니다." }, 401);
  }
}
