import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { AppsInTossSessionError, authenticateAppsSession } from "@/lib/apps-in-toss/server/session";
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
    const [orders, rentals] = await Promise.all([db.collection("orders").find({
      userId: authenticated.user._id,
      isStringServiceApplied: true,
      "paymentInfo.provider": "apps_in_toss_toss_pay",
    }).sort({ createdAt: -1 }).limit(100).toArray(), db.collection("rental_orders").find({ userId: authenticated.user._id, "paymentInfo.provider": "apps_in_toss_toss_pay" }).sort({ createdAt: -1 }).limit(100).toArray()]);
    const sourceIds = [...orders.map((order) => order._id), ...rentals.map((rental) => rental._id)];
    const applications = sourceIds.length
      ? await db.collection("stringing_applications").find({ userId: authenticated.user._id, $or: [{ orderId: { $in: sourceIds } }, { rentalId: { $in: sourceIds } }] }).toArray()
      : [];
    const byOrder = new Map(applications.map((application) => [String(application.orderId), application]));
    const orderActivities = orders.flatMap((order) => {
      const application = byOrder.get(String(order._id));
      if (!application) return [];
      const items = Array.isArray(order.items) ? order.items : [];
      const racketItem = items.find((item) => item?.kind === "racket");
      const stringItem = items.find((item) => item?.kind === "product");
      const isRacketPurchase = Boolean(racketItem && stringItem);
      const item = isRacketPurchase ? racketItem : items[0];
      const line = Array.isArray(application.stringDetails?.lines) ? application.stringDetails.lines[0] : null;
      return [{
        id: String(application._id), orderId: String(order._id), createdAt: iso(application.createdAt),
        activityType: isRacketPurchase ? "racket_purchase" : "stringing_service",
        productName: typeof item?.name === "string" ? item.name : "스트링 교체서비스",
        stringName: isRacketPurchase && typeof stringItem?.name === "string" ? stringItem.name : null,
        quantity: Number.isInteger(item?.quantity) && item.quantity > 0 ? item.quantity : 1,
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
    const byRental = new Map(applications.map((application) => [String(application.rentalId), application]));
    const rentalActivities = rentals.map((rental) => {
      const application = byRental.get(String(rental._id));
      return { id: String(rental._id), rentalId: String(rental._id), createdAt: iso(rental.createdAt), activityType: "racket_rental",
        productName: [rental.brand, rental.model].filter((value) => typeof value === "string" && value).join(" ") || "라켓 대여",
        days: Number(rental.days), rentalFee: Number(rental.amount?.fee ?? 0), deposit: Number(rental.amount?.deposit ?? 0),
        stringingRequested: rental.stringing?.requested === true, stringName: typeof rental.stringing?.name === "string" ? rental.stringing.name : null,
        color: typeof rental.stringing?.selectedColor === "string" ? rental.stringing.selectedColor : "", gauge: typeof rental.stringing?.selectedGauge === "string" ? rental.stringing.selectedGauge : "",
        collectionMethod: rental.servicePickupMethod === "SHOP_VISIT" ? "visit" : "self_ship",
        preferredDate: typeof application?.stringDetails?.preferredDate === "string" ? application.stringDetails.preferredDate : null,
        preferredTime: typeof application?.stringDetails?.preferredTime === "string" ? application.stringDetails.preferredTime : null,
        status: typeof rental.status === "string" ? rental.status : "paid", paymentStatus: typeof rental.paymentStatus === "string" ? rental.paymentStatus : "결제완료", amount: Number(rental.amount?.total ?? rental.originalTotal ?? 0), racketType: null };
    });
    const activities = [...orderActivities, ...rentalActivities].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")).slice(0, 100);
    return response(origin, { success: true, activities }, 200);
  } catch (error) {
    if (error instanceof AppsInTossSessionError) {
      return response(origin, { success: false, message: "인증이 필요합니다." }, 401);
    }
    return response(origin, { success: false, message: "이용내역을 불러오지 못했습니다." }, 500);
  }
}
