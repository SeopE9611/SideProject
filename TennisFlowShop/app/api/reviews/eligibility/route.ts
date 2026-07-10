import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { isOrderServiceReviewOnly, isStringingReviewBlockedStatus } from "@/lib/reviews/review-policy";
import { buildReviewWriteHref } from "@/lib/reviews/review-target";
import {
  resolveApplicationReviewTargetBundlesBatch,
  resolveOrderReviewTarget,
  resolveRentalReviewTarget,
  resolveStringingApplicationReviewTarget,
} from "@/lib/reviews/review-target.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const isOrderReviewConfirmed = (order: any) =>
  Boolean(order?.userConfirmedAt) || String(order?.status ?? "") === "구매확정";
const isStringingReviewConfirmed = (app: any) => Boolean(app?.userConfirmedAt);
const isRentalReviewConfirmed = (rental: any) =>
  Boolean(rental?.userConfirmedAt) ||
  Boolean(rental?.returnedAt) ||
  ["returned", "반납완료", "완료"].includes(String(rental?.status ?? "").trim());
const isRentalReviewBlockedStatus = (status: unknown) =>
  ["created", "pending", "paid", "out", "canceled", "cancelled", "취소", "대여중", "준비중", "수령전"].includes(
    String(status ?? "").trim().toLowerCase(),
  );

async function findReviewableStringingApplicationForProduct(
  db: any,
  userId: ObjectId,
  productId: string,
) {
  const productIdObj = new ObjectId(productId);
  const orders = await db
    .collection("orders")
    .find({
      userId,
      "items.productId": { $in: [productIdObj, productId] },
      $or: [{ userConfirmedAt: { $exists: true, $ne: null } }, { status: "구매확정" }],
    })
    .project({ _id: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  const orderIds = orders.flatMap((o: any) => [o._id, String(o._id)]);
  const apps = await db
    .collection("stringing_applications")
    .find({
      userId,
      userConfirmedAt: { $exists: true, $ne: null },
      $or: [
        { orderId: { $in: orderIds } },
        {
          "stringDetails.stringItems.productId": {
            $in: [productIdObj, productId],
          },
        },
        {
          "stringDetails.racketLines.stringProductId": {
            $in: [productIdObj, productId],
          },
        },
      ],
    })
    .project({ _id: 1, status: 1, stringDetails: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .toArray();

  const reviewed = await db
    .collection("reviews")
    .find({
      userId,
      service: "stringing",
      serviceApplicationId: { $in: apps.map((a: any) => a._id) },
      isDeleted: { $ne: true },
    })
    .project({ serviceApplicationId: 1 })
    .toArray();
  const reviewedSet = new Set(reviewed.map((r: any) => String(r.serviceApplicationId)));
  return (
    apps.find(
      (a: any) => !isStringingReviewBlockedStatus(a.status) && !reviewedSet.has(String(a._id)),
    ) ?? null
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const orderId = url.searchParams.get("orderId");
  const service = url.searchParams.get("service");
  const applicationId = url.searchParams.get("applicationId");
  const rentalId = url.searchParams.get("rentalId");

  // 인증
  const token = (await cookies()).get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ eligible: false, reason: "unauthorized" }, { status: 401 });
  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 401로 정리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  // sub는 ObjectId 문자열이어야 함 (new ObjectId에서 500 방지)
  const subStr = payload?.sub ? String(payload.sub) : "";
  if (!subStr || !ObjectId.isValid(subStr)) {
    return NextResponse.json({ eligible: false, reason: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const userId = new ObjectId(subStr);

  // 대여 모드: rentalId가 있으면 다른 파라미터보다 우선 검사
  if (rentalId) {
    if (!ObjectId.isValid(rentalId)) {
      return NextResponse.json(
        { eligible: false, reason: "invalid" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const rentalIdObj = new ObjectId(rentalId);
    const rental = await db.collection("rental_orders").findOne({ _id: rentalIdObj, userId });
    if (!rental) {
      return NextResponse.json(
        { eligible: false, reason: "rentalNotFound" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    const rentalTarget = await resolveRentalReviewTarget(db, userId, rentalId);
    const rentalContext = rentalTarget?.reviewContext ?? "rental";
    const rentalLabel = rentalTarget?.contextLabel ?? "대여 후기";
    if (isRentalReviewBlockedStatus(rental.status)) {
      return NextResponse.json(
        { eligible: false, reason: "invalidStatus", targetType: rentalContext, reviewContext: rentalContext, targetLabel: rentalLabel },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!isRentalReviewConfirmed(rental)) {
      return NextResponse.json(
        { eligible: false, reason: "notConfirmed", targetType: rentalContext, reviewContext: rentalContext, targetLabel: rentalLabel },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const already = await db.collection("reviews").findOne({
      userId,
      rentalId: { $in: [rentalIdObj, rentalId] },
      isDeleted: { $ne: true },
    });
    if (already) {
      return NextResponse.json(
        { eligible: false, reason: "already", targetType: rentalContext, reviewContext: rentalContext, targetLabel: rentalLabel },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { eligible: true, reason: null, targetType: rentalContext, reviewContext: rentalContext, targetLabel: rentalLabel, suggestedApplicationId: rentalTarget?.serviceApplicationId ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 상품 모드: productId (+ 선택적으로 orderId) 가 있을 때
  if (productId) {
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json(
        { eligible: false, reason: "invalid" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const productIdObj = new ObjectId(productId);

    // orderId가 같이 온 경우: 소유/포함/중복 체크
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { eligible: false, reason: "invalid" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      const orderIdObj = new ObjectId(orderId);

      const order = await db.collection("orders").findOne({ _id: orderIdObj, userId });
      if (!order)
        return NextResponse.json(
          { eligible: false, reason: "orderNotFound" },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      if (!isOrderReviewConfirmed(order)) {
        return NextResponse.json(
          { eligible: false, reason: "notConfirmed" },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      const hasProduct =
        Array.isArray(order.items) &&
        order.items.some((it: any) => String(it.productId || "") === String(productId));
      if (!hasProduct) {
        return NextResponse.json(
          { eligible: false, reason: "productNotInOrder" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      const orderTarget = await resolveOrderReviewTarget(db, userId, orderId, productId);
      if (orderTarget?.reviewContext === "product_stringing") {
        const already = await db.collection("reviews").findOne({
          userId,
          isDeleted: { $ne: true },
          $or: [
            { orderId: { $in: [orderIdObj, orderId] }, reviewContext: "product_stringing" },
            ...(orderTarget.serviceApplicationId && ObjectId.isValid(orderTarget.serviceApplicationId)
              ? [{ serviceApplicationId: { $in: [new ObjectId(orderTarget.serviceApplicationId), orderTarget.serviceApplicationId] } }]
              : []),
          ],
        });
        return NextResponse.json(
          {
            eligible: !already,
            reason: already ? "already" : null,
            reviewContext: "product_stringing",
            targetType: "product_stringing",
            targetLabel: orderTarget.contextLabel,
            suggestedOrderId: orderId,
            suggestedProductId: orderTarget.productId ?? productId,
            suggestedApplicationId: orderTarget.serviceApplicationId,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      // 해당 (user, product, order)로 이미 작성했는지
      const already = await db.collection("reviews").findOne({
        userId,
        productId: productIdObj,
        orderId: orderIdObj,
        isDeleted: { $ne: true },
      });
      if (already)
        return NextResponse.json(
          { eligible: false, reason: "already" },
          { headers: { "Cache-Control": "no-store" } },
        );

      return NextResponse.json(
        { eligible: true, reason: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // orderId가 없으면: 내 주문 중 아직 리뷰 안 쓴 주문을 추천
    const myOrders = await db
      .collection("orders")
      .find({
        userId,
        "items.productId": { $in: [productIdObj, productId] },
        $or: [{ userConfirmedAt: { $exists: true, $ne: null } }, { status: "구매확정" }],
      })
      .project({
        _id: 1,
        createdAt: 1,
        stringingApplicationId: 1,
        shippingInfo: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (!myOrders.length) {
      return NextResponse.json(
        { eligible: false, reason: "noPurchase" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // 해당 상품으로 이미 리뷰한 주문 목록
    const reviewed = await db
      .collection("reviews")
      .find({
        userId,
        productId: productIdObj,
        orderId: { $exists: true },
        isDeleted: { $ne: true },
      })
      .project({ orderId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.orderId)));

    // 아직 리뷰 안 쓴 최신 주문 pick
    const orderEligibility = await Promise.all(
      myOrders.map(async (order) => ({
        order,
        serviceOnly: await isOrderServiceReviewOnly(db, order),
      })),
    );
    const candidate = orderEligibility.find(
      ({ order, serviceOnly }) => !serviceOnly && !reviewedSet.has(String(order._id)),
    )?.order;
    if (!candidate) {
      const integratedOrder = orderEligibility.find(
        ({ order, serviceOnly }) => serviceOnly && !reviewedSet.has(String(order._id)),
      )?.order;
      if (integratedOrder) {
        const target = await resolveOrderReviewTarget(db, userId, String(integratedOrder._id), productId);
        return NextResponse.json(
          {
            eligible: true,
            reason: null,
            reviewContext: "product_stringing",
            targetType: "product_stringing",
            targetLabel: target?.contextLabel ?? "스트링·교체서비스 후기",
            suggestedOrderId: String(integratedOrder._id),
            suggestedProductId: target?.productId ?? productId,
            suggestedApplicationId: target?.serviceApplicationId ?? null,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const serviceApp = await findReviewableStringingApplicationForProduct(db, userId, productId);
      return NextResponse.json(
        {
          eligible: false,
          reason: "already",
          suggestedApplicationId: serviceApp ? String(serviceApp._id) : null,
          targetLabel: serviceApp ? "스트링·교체서비스 후기" : undefined,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { eligible: true, reason: null, reviewContext: "product", targetType: "product", targetLabel: "상품 후기", suggestedOrderId: String(candidate._id), suggestedProductId: productId },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // productId 없이 orderId만 있을 때 → 주문 내 “다음 미작성 상품” 추천
  if (orderId && !productId && !service) {
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { eligible: false, reason: "invalid" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const orderIdObj = new ObjectId(orderId);

    const order = await db.collection("orders").findOne({ _id: orderIdObj, userId });
    if (!order)
      return NextResponse.json(
        { eligible: false, reason: "orderNotFound" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    if (!isOrderReviewConfirmed(order)) {
      return NextResponse.json(
        { eligible: false, reason: "notConfirmed" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const orderTarget = await resolveOrderReviewTarget(db, userId, orderId);
    if (orderTarget?.reviewContext === "product_stringing") {
      return NextResponse.json(
        {
          eligible: true,
          reason: null,
          reviewContext: "product_stringing",
          targetType: "product_stringing",
          targetLabel: orderTarget.contextLabel,
          suggestedProductId: orderTarget.productId,
          suggestedOrderId: String(orderIdObj),
          suggestedApplicationId: orderTarget.serviceApplicationId,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const productIds: string[] = (Array.isArray(order.items) ? order.items : [])
      .map((it: any) => (it.productId ? String(it.productId) : null))
      .filter((v: any): v is string => !!v);

    if (!productIds.length) {
      return NextResponse.json(
        { eligible: false, reason: "noPurchase" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const reviewed = await db
      .collection("reviews")
      .find({
        userId,
        orderId: orderIdObj,
        productId: { $in: productIds.map((pid) => new ObjectId(pid)) },
        isDeleted: { $ne: true },
      })
      .project({ productId: 1 })
      .toArray();
    const reviewedSet = new Set(reviewed.map((r) => String(r.productId)));

    const candidatePid = productIds.find((pid) => !reviewedSet.has(pid));
    if (!candidatePid) {
      return NextResponse.json(
        { eligible: false, reason: "already" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        eligible: true,
        reason: null,
        suggestedProductId: candidatePid,
        suggestedOrderId: String(orderIdObj),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ===== 서비스(스트링) =====
  if (service === "stringing") {
    const col = db.collection("stringing_applications");

    // 특정 신청서 검사 모드
    if (applicationId) {
      if (!ObjectId.isValid(applicationId)) {
        return NextResponse.json(
          { eligible: false, reason: "invalidApplicationId" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      const appIdObj = new ObjectId(applicationId);
      const app = await col.findOne({ _id: appIdObj, userId });
      if (!app) {
        return NextResponse.json(
          { eligible: false, reason: "notFound" },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      }

      if (!isStringingReviewConfirmed(app)) {
        return NextResponse.json(
          { eligible: false, reason: "notConfirmed" },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      if (isStringingReviewBlockedStatus(app.status)) {
        return NextResponse.json(
          { eligible: false, reason: "invalidStatus" },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      const appTarget = await resolveStringingApplicationReviewTarget(db, userId, applicationId);
      if (appTarget?.reviewContext === "product_stringing" || appTarget?.reviewContext === "rental_stringing") {
        return NextResponse.json(
          {
            eligible: false,
            reason: "coveredByIntegratedReview",
            reviewContext: appTarget.reviewContext,
            targetLabel: appTarget.contextLabel,
            redirectHref: buildReviewWriteHref({
              reviewContext: appTarget.reviewContext,
              orderId: appTarget.orderId,
              rentalId: appTarget.rentalId,
              applicationId,
            }),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      // 중복 작성 방지
      const already = await db.collection("reviews").findOne({
        userId,
        service: "stringing",
        serviceApplicationId: appIdObj,
        isDeleted: { $ne: true },
      });
      if (already) {
        return NextResponse.json(
          { eligible: false, reason: "already" },
          { headers: { "Cache-Control": "no-store" } },
        );
      }

      return NextResponse.json(
        { eligible: true, reason: null, subjectType: "application", subjectId: applicationId, reviewContext: appTarget?.reviewContext ?? "standalone_stringing", targetType: "standalone_stringing", targetLabel: appTarget?.contextLabel ?? "교체서비스 후기", suggestedApplicationId: applicationId, nextTarget: appTarget?.targetBundle?.nextTarget ?? appTarget?.targetBundle?.targets?.[0] ?? null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // 추천 모드: canonical 기준의 단독 교체서비스만 추천한다.
    const myApps = await col
      .find(
        {
          userId,
          userConfirmedAt: { $exists: true, $ne: null },
          $and: [
            { $or: [{ orderId: { $exists: false } }, { orderId: null }] },
            { $or: [{ rentalId: { $exists: false } }, { rentalId: null }] },
          ],
        },
        { projection: { _id: 1, createdAt: 1, desiredDateTime: 1, status: 1, orderId: 1, rentalId: 1, userConfirmedAt: 1, stringDetails: 1 } },
      )
      .sort({ createdAt: -1 })
      .toArray();

    if (!myApps.length) {
      return NextResponse.json(
        { eligible: false, reason: "notPurchased" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const appIds = myApps.map((app) => String(app._id));
    const [referencingOrder, referencingRental, bundlesByApplicationId] = await Promise.all([
      db.collection("orders").find({ userId, stringingApplicationId: { $in: appIds.flatMap((id) => [id, new ObjectId(id)]) } }).project({ _id: 1, stringingApplicationId: 1 }).toArray(),
      db.collection("rental_orders").find({ userId, stringingApplicationId: { $in: appIds.flatMap((id) => [id, new ObjectId(id)]) } }).project({ _id: 1, stringingApplicationId: 1 }).toArray(),
      resolveApplicationReviewTargetBundlesBatch(db, userId, myApps),
    ]);
    const reverseLinkedIds = new Set([...referencingOrder, ...referencingRental].map((doc: any) => String(doc.stringingApplicationId)));
    const candidate = myApps.find((app: any) => {
      if (reverseLinkedIds.has(String(app._id)) || isStringingReviewBlockedStatus(app.status)) return false;
      const bundle = bundlesByApplicationId.get(String(app._id));
      const target = bundle?.nextTarget ?? null;
      return target?.reviewContext === "standalone_stringing" && target.eligible && !target.reviewed;
    });

    if (!candidate) {
      return NextResponse.json(
        { eligible: false, reason: "already" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const candidateBundle = bundlesByApplicationId.get(String(candidate._id));
    const nextTarget = candidateBundle?.nextTarget ?? null;

    return NextResponse.json(
      {
        eligible: true,
        reason: null,
        subjectType: "application",
        subjectId: String(candidate._id),
        reviewContext: nextTarget?.reviewContext ?? "standalone_stringing",
        targetType: nextTarget?.reviewContext ?? "standalone_stringing",
        targetLabel: nextTarget?.contextLabel ?? "교체서비스 후기",
        suggestedApplicationId: String(candidate._id),
        nextTarget,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { eligible: false, reason: "badRequest" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
