import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import {
  getReviewSubmissionBlockReason,
  isOrderReviewEligible,
  isOrderServiceReviewOnly,
  isRentalReviewEligible,
  isStringingReviewBlockedStatus,
} from "@/lib/reviews/review-policy";
import { buildReviewWriteHref } from "@/lib/reviews/review-target";
import type { CanonicalReviewTarget, ReviewTargetBundle } from "@/lib/reviews/review-target";
import {
  resolveApplicationReviewTargetBundlesBatch,
  resolveOrderReviewTarget,
  resolveRentalReviewTarget,
  resolveStringingApplicationReviewTarget,
} from "@/lib/reviews/review-target.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const isRentalReviewBlockedStatus = (status: unknown) =>
  [
    "created",
    "pending",
    "paid",
    "out",
    "canceled",
    "cancelled",
    "취소",
    "대여중",
    "준비중",
    "수령전",
  ].includes(
    String(status ?? "")
      .trim()
      .toLowerCase(),
  );

function pickBundleTarget(bundle?: ReviewTargetBundle | null, preferredProductId?: string | null) {
  if (!bundle) return null;
  return (
    (preferredProductId
      ? bundle.targets.find((target) => target.primaryProductId === preferredProductId)
      : null) ??
    bundle.nextTarget ??
    bundle.targets[0] ??
    null
  );
}

function eligibilityPayload(params: {
  eligible: boolean;
  reason: string | null;
  bundle?: ReviewTargetBundle | null;
  target?: CanonicalReviewTarget | null;
  subjectType?: "order" | "rental" | "application";
  subjectId?: string;
  suggestedOrderId?: string | null;
  suggestedProductId?: string | null;
  suggestedApplicationId?: string | null;
  suggestedRentalId?: string | null;
  redirectHref?: string | null;
}) {
  const target = params.target ?? pickBundleTarget(params.bundle);
  const nextTarget = params.eligible ? target : null;
  return {
    eligible: params.eligible,
    reason: params.reason,
    subjectType: params.subjectType ?? target?.subjectType,
    subjectId: params.subjectId ?? target?.subjectId,
    reviewContext: target?.reviewContext ?? null,
    targetType: target?.reviewContext ?? null,
    targetLabel: target?.contextLabel ?? null,
    suggestedOrderId: params.suggestedOrderId ?? target?.orderId ?? null,
    suggestedProductId: params.suggestedProductId ?? target?.primaryProductId ?? null,
    suggestedApplicationId: params.suggestedApplicationId ?? target?.primaryApplicationId ?? null,
    suggestedRentalId: params.suggestedRentalId ?? target?.rentalId ?? null,
    target: target ?? null,
    nextTarget,
    coveredBySubjectType: target?.coveredBySubjectType ?? null,
    coveredBySubjectId: target?.coveredBySubjectId ?? null,
    redirectHref: params.redirectHref ?? null,
  };
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
    if (isRentalReviewBlockedStatus(rental.status)) {
      return NextResponse.json(
        eligibilityPayload({
          eligible: false,
          reason: "invalidStatus",
          bundle: rentalTarget?.targetBundle,
          subjectType: "rental",
          subjectId: rentalId,
          suggestedRentalId: rentalId,
        }),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!isRentalReviewEligible(rental)) {
      return NextResponse.json(
        eligibilityPayload({
          eligible: false,
          reason: "notConfirmed",
          bundle: rentalTarget?.targetBundle,
          subjectType: "rental",
          subjectId: rentalId,
          suggestedRentalId: rentalId,
        }),
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
        eligibilityPayload({
          eligible: false,
          reason: "already",
          bundle: rentalTarget?.targetBundle,
          subjectType: "rental",
          subjectId: rentalId,
          suggestedRentalId: rentalId,
        }),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      eligibilityPayload({
        eligible: true,
        reason: null,
        bundle: rentalTarget?.targetBundle,
        subjectType: "rental",
        subjectId: rentalId,
        suggestedRentalId: rentalId,
        suggestedApplicationId: rentalTarget?.serviceApplicationId ?? null,
      }),
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
      if (!isOrderReviewEligible(order)) {
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
            ...(orderTarget.serviceApplicationId &&
            ObjectId.isValid(orderTarget.serviceApplicationId)
              ? [
                  {
                    serviceApplicationId: {
                      $in: [
                        new ObjectId(orderTarget.serviceApplicationId),
                        orderTarget.serviceApplicationId,
                      ],
                    },
                  },
                ]
              : []),
          ],
        });
        return NextResponse.json(
          eligibilityPayload({
            eligible: !already,
            reason: already ? "already" : null,
            bundle: orderTarget?.targetBundle,
            target: pickBundleTarget(orderTarget?.targetBundle, productId),
            subjectType: "order",
            subjectId: orderId,
            suggestedOrderId: orderId,
            suggestedProductId: orderTarget.productId ?? productId,
            suggestedApplicationId: orderTarget.serviceApplicationId,
          }),
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
          eligibilityPayload({
            eligible: false,
            reason: "already",
            bundle: orderTarget?.targetBundle,
            target: pickBundleTarget(orderTarget?.targetBundle, productId),
            subjectType: "order",
            subjectId: orderId,
            suggestedOrderId: orderId,
            suggestedProductId: productId,
          }),
          { headers: { "Cache-Control": "no-store" } },
        );

      return NextResponse.json(
        eligibilityPayload({
          eligible: true,
          reason: null,
          bundle: orderTarget?.targetBundle,
          target: pickBundleTarget(orderTarget?.targetBundle, productId),
          subjectType: "order",
          subjectId: orderId,
          suggestedOrderId: orderId,
          suggestedProductId: productId,
        }),
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
        const target = await resolveOrderReviewTarget(
          db,
          userId,
          String(integratedOrder._id),
          productId,
        );
        return NextResponse.json(
          eligibilityPayload({
            eligible: true,
            reason: null,
            bundle: target?.targetBundle,
            target: pickBundleTarget(target?.targetBundle, productId),
            subjectType: "order",
            subjectId: String(integratedOrder._id),
            suggestedOrderId: String(integratedOrder._id),
            suggestedProductId: target?.productId ?? productId,
            suggestedApplicationId: target?.serviceApplicationId ?? null,
          }),
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json(
        { eligible: false, reason: "already" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const candidateTarget = await resolveOrderReviewTarget(
      db,
      userId,
      String(candidate._id),
      productId,
    );
    return NextResponse.json(
      eligibilityPayload({
        eligible: true,
        reason: null,
        bundle: candidateTarget?.targetBundle,
        target: pickBundleTarget(candidateTarget?.targetBundle, productId),
        subjectType: "order",
        subjectId: String(candidate._id),
        suggestedOrderId: String(candidate._id),
        suggestedProductId: productId,
      }),
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
    if (!isOrderReviewEligible(order)) {
      return NextResponse.json(
        { eligible: false, reason: "notConfirmed" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const orderTarget = await resolveOrderReviewTarget(db, userId, orderId);
    if (orderTarget?.reviewContext === "product_stringing") {
      return NextResponse.json(
        eligibilityPayload({
          eligible: true,
          reason: null,
          bundle: orderTarget?.targetBundle,
          target: pickBundleTarget(orderTarget?.targetBundle),
          subjectType: "order",
          subjectId: orderId,
          suggestedProductId: orderTarget.productId,
          suggestedOrderId: String(orderIdObj),
          suggestedApplicationId: orderTarget.serviceApplicationId,
        }),
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
        productId: {
          $in: productIds.flatMap((pid) =>
            ObjectId.isValid(pid) ? [new ObjectId(pid), pid] : [pid],
          ),
        },
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
      eligibilityPayload({
        eligible: true,
        reason: null,
        bundle: orderTarget?.targetBundle,
        target: pickBundleTarget(orderTarget?.targetBundle, candidatePid),
        subjectType: "order",
        subjectId: orderId,
        suggestedProductId: candidatePid,
        suggestedOrderId: String(orderIdObj),
      }),
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

      const appTarget = await resolveStringingApplicationReviewTarget(db, userId, applicationId);
      const bundle = appTarget?.targetBundle ?? null;
      const target = bundle?.targets?.[0] ?? null;
      const blockReason = getReviewSubmissionBlockReason(target);
      if (blockReason) {
        return NextResponse.json(
          eligibilityPayload({
            eligible: false,
            reason: blockReason,
            bundle,
            target,
            subjectType: "application",
            subjectId: applicationId,
            suggestedApplicationId: applicationId,
            redirectHref:
              blockReason === "coveredByIntegratedReview" && target?.redirectTarget
                ? buildReviewWriteHref({
                    reviewContext: target.redirectTarget.reviewContext,
                    orderId: target.redirectTarget.orderId,
                    rentalId: target.redirectTarget.rentalId,
                    productId: target.redirectTarget.primaryProductId,
                    applicationId: target.redirectTarget.primaryApplicationId,
                  })
                : undefined,
          }),
          {
            status: blockReason === "notFound" ? 404 : 200,
            headers: { "Cache-Control": "no-store" },
          },
        );
      }

      return NextResponse.json(
        eligibilityPayload({
          eligible: true,
          reason: null,
          bundle,
          target: bundle?.nextTarget ?? target,
          subjectType: "application",
          subjectId: applicationId,
          suggestedApplicationId: applicationId,
        }),
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
        {
          projection: {
            _id: 1,
            createdAt: 1,
            desiredDateTime: 1,
            status: 1,
            orderId: 1,
            rentalId: 1,
            userConfirmedAt: 1,
            stringDetails: 1,
          },
        },
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
      db
        .collection("orders")
        .find({
          userId,
          stringingApplicationId: { $in: appIds.flatMap((id) => [id, new ObjectId(id)]) },
        })
        .project({ _id: 1, stringingApplicationId: 1 })
        .toArray(),
      db
        .collection("rental_orders")
        .find({
          userId,
          stringingApplicationId: { $in: appIds.flatMap((id) => [id, new ObjectId(id)]) },
        })
        .project({ _id: 1, stringingApplicationId: 1 })
        .toArray(),
      resolveApplicationReviewTargetBundlesBatch(db, userId, myApps),
    ]);
    const reverseLinkedIds = new Set(
      [...referencingOrder, ...referencingRental].map((doc: any) =>
        String(doc.stringingApplicationId),
      ),
    );
    const candidate = myApps.find((app: any) => {
      if (reverseLinkedIds.has(String(app._id)) || isStringingReviewBlockedStatus(app.status))
        return false;
      const bundle = bundlesByApplicationId.get(String(app._id));
      const target = bundle?.nextTarget ?? null;
      return (
        target?.reviewContext === "standalone_stringing" && target.eligible && !target.reviewed
      );
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
      eligibilityPayload({
        eligible: true,
        reason: null,
        bundle: candidateBundle,
        target: nextTarget,
        subjectType: "application",
        subjectId: String(candidate._id),
        suggestedApplicationId: String(candidate._id),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { eligible: false, reason: "badRequest" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
