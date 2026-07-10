import {
  isApplicationTodoActionable,
  isOrderTodoActionable,
  isRentalTodoActionable,
} from "@/lib/mypage/activity-todo";
import { isOrderConfirmedStatus } from "@/lib/status/flow-status";
import { resolveApplicationReviewTargetBundlesBatch, resolveOrderReviewTargetBundlesBatch, resolveRentalReviewTargetBundlesBatch } from "@/lib/reviews/review-target.server";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { isStringingReviewBlockedStatus } from "@/lib/reviews/review-policy";

export const dynamic = "force-dynamic";

function getTrackingNoFromShippingInfo(shippingInfo: any): string | null {
  const v =
    shippingInfo?.selfShip?.trackingNo ??
    shippingInfo?.invoice?.trackingNumber ??
    shippingInfo?.trackingNumber ??
    shippingInfo?.trackingNo ??
    null;

  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function isOrderHasRacketItem(order: any): boolean {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((it: any) => it?.kind === "racket" || it?.kind === "used_racket");
}

function getOrderReviewTargetProductIds(order: any): string[] {
  const items = Array.isArray(order?.items) ? order.items : [];
  const ids = items
    .map((it: any) => (it?.productId ? String(it.productId) : null))
    .filter((id: string | null): id is string => id !== null && ObjectId.isValid(id));
  return [...new Set<string>(ids)];
}

export async function GET() {
  const jar = await cookies();
  const at = jar.get("accessToken")?.value;
  if (!at) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const subStr = String(payload?.sub ?? "");
  if (!ObjectId.isValid(subStr)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = new ObjectId(subStr);
  const db = (await clientPromise).db();

  const academyActiveStatuses = ["submitted", "reviewing", "contacted", "confirmed"];
  const academyUserIds = [userId, userId.toHexString()];

  const [
    ordersCount,
    applicationsCount,
    academyActiveApplicationsCount,
    orders,
    rentals,
    standaloneApps,
  ] = await Promise.all([
    db.collection("orders").countDocuments({ userId }),
    db.collection("stringing_applications").countDocuments({ userId, status: { $ne: "draft" } }),
    db.collection("academy_lesson_applications").countDocuments({
      userId: { $in: academyUserIds },
      status: { $in: academyActiveStatuses },
    }),
    db
      .collection("orders")
      .find(
        { userId },
        {
          projection: {
            _id: 1,
            status: 1,
            userConfirmedAt: 1,
            items: 1,
          },
        },
      )
      .toArray(),
    db
      .collection("rental_orders")
      .find(
        { userId },
        {
          projection: {
            _id: 1,
            stringingApplicationId: 1,
            stringing: 1,
          },
        },
      )
      .toArray(),
    db
      .collection("stringing_applications")
      .find(
        {
          userId,
          status: { $ne: "draft" },
          $and: [
            { $or: [{ orderId: { $exists: false } }, { orderId: null }] },
            { $or: [{ rentalId: { $exists: false } }, { rentalId: null }] },
          ],
        },
        {
          projection: {
            _id: 1,
            status: 1,
            shippingInfo: 1,
            collectionMethod: 1,
            userConfirmedAt: 1,
          },
        },
      )
      .toArray(),
  ]);
  const activityFlowCount = orders.length + rentals.length + standaloneApps.length;

  const orderHasRacketById = new Map<string, boolean>();
  for (const order of orders as any[]) {
    orderHasRacketById.set(String(order._id), isOrderHasRacketItem(order));
  }

  const orderIdsAny = (orders as any[]).flatMap((o) => [o._id, String(o._id)]);
  const rentalIdsAny = (rentals as any[]).flatMap((r) => [r._id, String(r._id)]);

  const linkedApps = await db
    .collection("stringing_applications")
    .find(
      {
        userId,
        status: { $ne: "draft" },
        $or: [{ orderId: { $in: orderIdsAny } }, { rentalId: { $in: rentalIdsAny } }],
      },
      {
        projection: {
          _id: 1,
          status: 1,
          shippingInfo: 1,
          collectionMethod: 1,
          userConfirmedAt: 1,
          orderId: 1,
          rentalId: 1,
        },
      },
    )
    .toArray();

  const actionableLinkedAppCountByOrderId = new Map<string, number>();
  const actionableLinkedAppCountByRentalId = new Map<string, number>();

  for (const doc of linkedApps as any[]) {
    const shipping = doc.shippingInfo ?? {};
    const hasTracking = Boolean(getTrackingNoFromShippingInfo(shipping));
    const collectionMethod = normalizeCollection(
      (shipping as any)?.collectionMethod ?? (doc as any)?.collectionMethod ?? "self_ship",
    );
    const orderIdStr = doc.orderId ? String(doc.orderId) : null;
    const inboundRequired = doc.rentalId
      ? false
      : orderIdStr && orderHasRacketById.get(orderIdStr)
        ? false
        : true;
    const needsInboundTracking = inboundRequired && collectionMethod === "self_ship";

    const isActionable = isApplicationTodoActionable({
      status: doc.status,
      hasTracking,
      needsInboundTracking,
      userConfirmedAt:
        doc.userConfirmedAt instanceof Date
          ? doc.userConfirmedAt.toISOString()
          : typeof doc.userConfirmedAt === "string"
            ? doc.userConfirmedAt
            : null,
    });

    if (!isActionable) continue;

    if (doc.orderId) {
      const key = String(doc.orderId);
      actionableLinkedAppCountByOrderId.set(
        key,
        (actionableLinkedAppCountByOrderId.get(key) ?? 0) + 1,
      );
    }
    if (doc.rentalId) {
      const key = String(doc.rentalId);
      actionableLinkedAppCountByRentalId.set(
        key,
        (actionableLinkedAppCountByRentalId.get(key) ?? 0) + 1,
      );
    }
  }

  const [reviewBundlesByOrderId, reviewBundlesByRentalId, reviewBundlesByApplicationId] = await Promise.all([
    resolveOrderReviewTargetBundlesBatch(db, userId, orders as any[]),
    resolveRentalReviewTargetBundlesBatch(db, userId, rentals as any[]),
    resolveApplicationReviewTargetBundlesBatch(db, userId, standaloneApps as any[]),
  ]);

  let todoOrderCount = 0;
  for (const order of orders as any[]) {
    const orderId = String(order._id);
    const isConfirmed = Boolean(order?.userConfirmedAt) || isOrderConfirmedStatus(order?.status);
    const reviewPendingCount = isConfirmed
      ? (reviewBundlesByOrderId.get(orderId)?.counts.remaining ?? 0)
      : 0;

    const needsAction = isOrderTodoActionable({
      status: order?.status,
      userConfirmedAt:
        order?.userConfirmedAt instanceof Date
          ? order.userConfirmedAt.toISOString()
          : typeof order?.userConfirmedAt === "string"
            ? order.userConfirmedAt
            : null,
      reviewPendingCount,
      linkedApplications:
        (actionableLinkedAppCountByOrderId.get(orderId) ?? 0) > 0
          ? [
              {
                status: "교체완료",
                hasTracking: false,
                needsInboundTracking: true,
                userConfirmedAt: null,
              },
            ]
          : [],
    });

    if (needsAction) todoOrderCount += 1;
  }

  let todoRentalCount = 0;
  for (const rental of rentals as any[]) {
    const rentalId = String(rental._id);
    const withStringService =
      Boolean(rental?.stringing?.requested) || Boolean(rental?.stringingApplicationId);

    const needsAction = isRentalTodoActionable({
      linkedApplications:
        (actionableLinkedAppCountByRentalId.get(rentalId) ?? 0) > 0
          ? [
              {
                status: "교체완료",
                hasTracking: false,
                needsInboundTracking: true,
                userConfirmedAt: null,
              },
            ]
          : [],
      stringingApplicationId: rental?.stringingApplicationId
        ? String(rental.stringingApplicationId)
        : null,
      withStringService,
      reviewPendingCount: (reviewBundlesByRentalId.get(rentalId)?.counts.remaining ?? 0),
    });

    if (needsAction) todoRentalCount += 1;
  }

  let todoApplicationCount = 0;
  for (const app of standaloneApps as any[]) {
    const shipping = app.shippingInfo ?? {};
    const hasTracking = Boolean(getTrackingNoFromShippingInfo(shipping));
    const collectionMethod = normalizeCollection(
      (shipping as any)?.collectionMethod ?? app?.collectionMethod ?? "self_ship",
    );
    const needsInboundTracking = collectionMethod === "self_ship";

    const needsAction = isApplicationTodoActionable({
      status: app?.status,
      hasTracking,
      needsInboundTracking,
      userConfirmedAt:
        app?.userConfirmedAt instanceof Date
          ? app.userConfirmedAt.toISOString()
          : typeof app?.userConfirmedAt === "string"
            ? app.userConfirmedAt
            : null,
      serviceReviewPending: (reviewBundlesByApplicationId.get(String(app._id))?.counts.remaining ?? 0) > 0,
    });

    if (needsAction) todoApplicationCount += 1;
  }

  return NextResponse.json({
    ordersCount,
    applicationsCount,
    activityFlowCount,
    academyActiveApplicationsCount,
    todoCount: todoOrderCount + todoRentalCount + todoApplicationCount,
  });
}
