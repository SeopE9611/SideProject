import { verifyAccessToken } from "@/lib/auth.utils";
import { racketBrandLabel } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { REVIEW_REWARD_POINTS } from "@/lib/points.policy";
import { grantPoints } from "@/lib/points.service";
import {
  buildPublicReviewMatch,
  buildPublicReviewSurfaceTargetMatch,
} from "@/lib/reviews/public-review-surface.server";
import { validateReviewInput } from "@/lib/reviews/review-input-policy";
import { appendMatchCondition } from "@/lib/reviews/review-query-match";
import { isAllowedReviewPhotoUrl } from "@/lib/reviews/review-photo-storage.server";
import {
  markReviewPhotoUploadSessionCommittedBestEffort,
  rollbackReviewPhotoUploadSessionClaimBestEffort,
  validateAndClaimReviewPhotoUploadSession,
} from "@/lib/reviews/review-photo-upload-session.server";
import {
  findRequestedCanonicalTarget,
  getCanonicalTargetItemId,
  getReviewSubmissionBlockReason,
  isOrderReviewEligible,
  isRentalReviewEligible,
  isStandaloneStringingReviewEligible,
} from "@/lib/reviews/review-policy";
import { refreshReviewSummaryCachesForReviewSafely } from "@/lib/reviews/review-summary-cache.server";
import { getReviewContextLabel } from "@/lib/reviews/review-target";
import {
  resolveOrderReviewTarget,
  resolveRentalReviewTarget,
  resolveStringingApplicationReviewTarget,
} from "@/lib/reviews/review-target.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    ("code" in error ? (error as { code?: unknown }).code === 11000 : false),
  );
}

function isPlainRequestBody(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function duplicateReviewResponse() {
  return NextResponse.json(
    { ok: false, reason: "already", message: "이미 이 대상의 후기를 작성했습니다." },
    { status: 409 },
  );
}

export async function POST(req: Request) {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 401 처리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  const subStr = payload?.sub ? String(payload.sub) : "";
  if (!subStr || !ObjectId.isValid(subStr)) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();

  // 깨진 JSON이면 throw → 500 방지
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "invalid_json" }, { status: 400 });
  }
  if (!isPlainRequestBody(body)) {
    return NextResponse.json(
      { ok: false, reason: "invalidBody", message: "잘못된 후기 요청입니다." },
      { status: 400 },
    );
  }
  // orderId는 쿼리나 바디 어느 쪽으로 와도 받게 처리
  const url = new URL(req.url);
  const queryOrderId = url.searchParams.get("orderId");
  const bodyOrderId = body.orderId;

  if (bodyOrderId !== undefined && bodyOrderId !== null && typeof bodyOrderId !== "string") {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalidOrderId",
        message: "주문 정보가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const normalizedBodyOrderId =
    typeof bodyOrderId === "string" && bodyOrderId.trim() ? bodyOrderId.trim() : null;

  const normalizedQueryOrderId =
    typeof queryOrderId === "string" && queryOrderId.trim() ? queryOrderId.trim() : null;

  const orderIdRaw = normalizedBodyOrderId ?? normalizedQueryOrderId;

  if (orderIdRaw && !ObjectId.isValid(orderIdRaw)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalidOrderId",
        message: "주문 정보가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const orderIdObj = orderIdRaw ? new ObjectId(orderIdRaw) : null;
  const userId = new ObjectId(subStr);

  // 유저 이름 스냅샷
  let userName: string | null = null;
  try {
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { name: 1 } });
    userName = user?.name ?? null;
  } catch {}

  const photosInput = "photos" in body ? body.photos : [];
  const inputValidation = validateReviewInput({
    rating: body.rating,
    content: body.content,
    photos: photosInput,
  });
  if (!inputValidation.ok) {
    return NextResponse.json(
      { ok: false, reason: inputValidation.reason, message: inputValidation.reason },
      { status: 400 },
    );
  }
  const { rating, content } = inputValidation.value;

  // 사진 정제 (화이트리스트)
  const cleanedList = inputValidation.value.photos
    .filter(isAllowedReviewPhotoUrl)
    .map((s: string) => s.trim());
  if (cleanedList.length !== inputValidation.value.photos.length) {
    return NextResponse.json(
      { ok: false, reason: "invalidPhotos", message: "invalidPhotos" },
      { status: 400 },
    );
  }
  const photosClean = Array.from(new Set<string>(cleanedList));
  const uploadSessionId = typeof body.uploadSessionId === "string" ? body.uploadSessionId : null;

  let sessionClaimed = false;
  let reviewPersisted = false;

  const claimPhotoSession = async () => {
    if (photosClean.length === 0) return { ok: true as const };
    const sessionValidation = await validateAndClaimReviewPhotoUploadSession({
      db,
      userId,
      uploadSessionId,
      urls: photosClean,
    });
    if (!sessionValidation.ok) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { ok: false, reason: sessionValidation.reason, message: sessionValidation.reason },
          { status: sessionValidation.reason === "uploadSessionForbidden" ? 403 : 400 },
        ),
      };
    }
    return { ok: true as const };
  };

  // 라켓 대여 리뷰
  if (body.rentalId) {
    const rentalIdStr = String(body.rentalId);
    if (!ObjectId.isValid(rentalIdStr)) {
      return NextResponse.json({ message: "invalid rentalId" }, { status: 400 });
    }
    const rentalIdObj = new ObjectId(rentalIdStr);
    const rental = await db.collection("rental_orders").findOne({ _id: rentalIdObj, userId });
    if (!rental)
      return NextResponse.json({ message: "rentalNotFound", reason: "notFound" }, { status: 404 });
    const rentalTarget = await resolveRentalReviewTarget(db, userId, rentalIdStr);
    const rentalCanonicalTarget = rentalTarget?.targetBundle?.targets?.[0] ?? null;
    const rentalBlockReason = getReviewSubmissionBlockReason(rentalCanonicalTarget);
    if (rentalBlockReason === "already") {
      return NextResponse.json({ message: "already", reason: "already" }, { status: 409 });
    }
    if (rentalBlockReason) {
      return NextResponse.json(
        { message: rentalBlockReason, reason: rentalBlockReason },
        { status: rentalBlockReason === "notFound" ? 404 : 403 },
      );
    }
    if (!isRentalReviewEligible(rental)) {
      return NextResponse.json(
        { message: "notConfirmed", reason: "notConfirmed" },
        { status: 403 },
      );
    }
    const already = await db.collection("reviews").findOne({
      userId,
      rentalId: { $in: [rentalIdObj, rentalIdStr] },
      isDeleted: { $ne: true },
    });
    if (already) return duplicateReviewResponse();

    const sessionValidation = await claimPhotoSession();
    if (!sessionValidation.ok) return sessionValidation.response;
    sessionClaimed = photosClean.length > 0;
    reviewPersisted = false;

    const now = new Date();
    try {
      const reviewDoc: any = {
        userId,
        reviewType: "rental",
        reviewContext: rentalTarget?.reviewContext ?? "rental",
        contextLabel: rentalTarget?.contextLabel ?? getReviewContextLabel("rental"),
        rentalId: rentalIdObj,
        serviceApplicationId:
          rentalTarget?.serviceApplicationId && ObjectId.isValid(rentalTarget.serviceApplicationId)
            ? new ObjectId(rentalTarget.serviceApplicationId)
            : undefined,
        relatedProductIds: rentalTarget?.relatedProductIds ?? [],
        relatedRacketIds:
          rentalTarget?.relatedRacketIds ?? (rental.racketId ? [String(rental.racketId)] : []),
        racketId:
          rental.racketId && ObjectId.isValid(String(rental.racketId))
            ? new ObjectId(String(rental.racketId))
            : undefined,
        rating,
        content,
        photos: photosClean,
        status: "visible",
        helpfulCount: 0,
        userName,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      };
      const insertResult = await db.collection("reviews").insertOne(reviewDoc);
      reviewPersisted = true;
      await refreshReviewSummaryCachesForReviewSafely(
        db,
        { ...reviewDoc, _id: insertResult.insertedId },
        "POST /api/reviews",
      );
    } catch (error) {
      if (sessionClaimed && !reviewPersisted) {
        await rollbackReviewPhotoUploadSessionClaimBestEffort(
          db,
          userId,
          uploadSessionId,
          "POST /api/reviews",
        );
      }
      if (isDuplicateKeyError(error)) return duplicateReviewResponse();
      throw error;
    }
    if (sessionClaimed) {
      await markReviewPhotoUploadSessionCommittedBestEffort(
        db,
        userId,
        uploadSessionId,
        "POST /api/reviews",
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // 상품 리뷰
  if (body.productId) {
    const productIdStr = String(body.productId);
    if (!ObjectId.isValid(productIdStr)) {
      return NextResponse.json({ message: "invalid productId" }, { status: 400 });
    }
    const productIdObj = new ObjectId(productIdStr);

    if (!orderIdObj) {
      return NextResponse.json({ message: "orderId required" }, { status: 400 });
    }

    // 구매 이력 검증: orderId가 넘어오면 해당 주문에 그 상품이 포함되어야 함
    const bought = await db.collection("orders").findOne({
      _id: orderIdObj,
      userId,
      "items.productId": { $in: [productIdStr, productIdObj] },
    });
    if (!bought) return NextResponse.json({ message: "notPurchased" }, { status: 403 });
    const orderTarget = await resolveOrderReviewTarget(
      db,
      userId,
      String(orderIdObj),
      productIdStr,
    );
    const orderCanonicalTarget = findRequestedCanonicalTarget(
      orderTarget?.targetBundle,
      productIdStr,
    );
    const canonicalItemId = getCanonicalTargetItemId(orderCanonicalTarget);
    if (
      !orderCanonicalTarget ||
      !canonicalItemId ||
      !findRequestedCanonicalTarget(orderTarget?.targetBundle, productIdStr)
    ) {
      return NextResponse.json(
        {
          ok: false,
          reason: "targetMismatch",
          message: "후기 대상이 올바르지 않습니다.",
        },
        { status: 409 },
      );
    }
    const orderBlockReason = getReviewSubmissionBlockReason(orderCanonicalTarget);
    if (orderBlockReason === "already") {
      return NextResponse.json({ message: "already", reason: "already" }, { status: 409 });
    }
    if (orderBlockReason) {
      return NextResponse.json(
        { message: orderBlockReason, reason: orderBlockReason },
        { status: orderBlockReason === "notFound" ? 404 : 403 },
      );
    }
    if (!isOrderReviewEligible(bought)) {
      return NextResponse.json(
        { message: "notConfirmed", reason: "notConfirmed" },
        { status: 403 },
      );
    }

    // 중복 작성 방지 (주문 단위): 같은 주문 + 같은 상품 + 같은 유저
    const canonicalProductIdObj = new ObjectId(canonicalItemId);
    const productCandidates = [canonicalProductIdObj, canonicalItemId];
    const dupFilter: any = {
      userId,
      isDeleted: { $ne: true },
      productId: { $in: productCandidates },
    };
    // orderId가 있을 때만 주문 단위로 막기 (과거 orderId 없이 쓴 리뷰는 새 주문을 막지 않도록)
    if (orderIdObj) {
      dupFilter.orderId = { $in: [orderIdObj, orderIdRaw] };
    }
    if (
      orderCanonicalTarget?.reviewContext === "product_stringing" &&
      orderCanonicalTarget.primaryApplicationId
    ) {
      dupFilter.$or = [
        { orderId: { $in: [orderIdObj, orderIdRaw] }, productId: { $in: productCandidates } },
        {
          serviceApplicationId: {
            $in: [
              new ObjectId(orderCanonicalTarget.primaryApplicationId),
              orderCanonicalTarget.primaryApplicationId,
            ],
          },
        },
      ];
      delete dupFilter.orderId;
      delete dupFilter.productId;
    }
    const already = await db.collection("reviews").findOne(dupFilter);
    if (already) return duplicateReviewResponse();

    const sessionValidation = await claimPhotoSession();
    if (!sessionValidation.ok) return sessionValidation.response;
    sessionClaimed = photosClean.length > 0;
    reviewPersisted = false;

    const now = new Date();
    const doc: any = {
      userId,
      productId: canonicalProductIdObj,
      racketId:
        orderCanonicalTarget.primaryRacketId &&
        ObjectId.isValid(orderCanonicalTarget.primaryRacketId)
          ? new ObjectId(orderCanonicalTarget.primaryRacketId)
          : undefined,
      reviewType: "product",
      reviewContext: orderCanonicalTarget.reviewContext,
      contextLabel: orderCanonicalTarget.contextLabel ?? getReviewContextLabel("product"),
      serviceApplicationId:
        orderCanonicalTarget.primaryApplicationId &&
        ObjectId.isValid(orderCanonicalTarget.primaryApplicationId)
          ? new ObjectId(orderCanonicalTarget.primaryApplicationId)
          : undefined,
      relatedProductIds: orderCanonicalTarget.relatedProductIds ?? [],
      relatedRacketIds: orderCanonicalTarget.relatedRacketIds ?? [],
      rating,
      content,
      photos: photosClean,
      status: "visible",
      helpfulCount: 0,
      userName,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    if (orderIdObj) doc.orderId = orderIdObj;

    let insertRes;
    try {
      insertRes = await db.collection("reviews").insertOne(doc);
      reviewPersisted = true;
    } catch (error) {
      if (sessionClaimed && !reviewPersisted) {
        await rollbackReviewPhotoUploadSessionClaimBestEffort(
          db,
          userId,
          uploadSessionId,
          "POST /api/reviews",
        );
      }
      if (isDuplicateKeyError(error)) return duplicateReviewResponse();
      throw error;
    }
    const reviewId = insertRes.insertedId;

    // 포인트 적립 (보수적 시작)
    // - 결제완료 주문만 적립
    // - orderId가 없는 레거시 작성은 적립 제외(중복/어뷰징 리스크 최소화)
    if (orderIdObj) {
      const paidOrder = await db
        .collection("orders")
        .findOne(
          { _id: orderIdObj, userId, paymentStatus: "결제완료" },
          { projection: { _id: 1 } },
        );
      if (paidOrder) {
        try {
          await grantPoints(db, {
            userId,
            amount: REVIEW_REWARD_POINTS,
            type: "review_reward_product",
            status: "confirmed",
            refKey: `review:${reviewId.toString()}`,
            ref: { reviewId, orderId: orderIdObj },
            reason: "상품 리뷰 작성 적립",
          });
        } catch (e) {
          // 포인트 적립은 "부가 동작"이므로, 리뷰 생성 자체를 실패시키지 않음
          console.error("[reviews] grantPoints failed (product)", e);
        }
      }
    }

    await refreshReviewSummaryCachesForReviewSafely(
      db,
      { ...doc, _id: reviewId },
      "POST /api/reviews",
    );
    if (sessionClaimed) {
      await markReviewPhotoUploadSessionCommittedBestEffort(
        db,
        userId,
        uploadSessionId,
        "POST /api/reviews",
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // 서비스(스트링) 리뷰
  if (body.service) {
    if (body.service !== "stringing")
      return NextResponse.json({ message: "unknown service" }, { status: 400 });

    const appIdStr = String(body.serviceApplicationId || "");
    if (!ObjectId.isValid(appIdStr)) {
      return NextResponse.json({ message: "serviceApplicationId required" }, { status: 400 });
    }
    const appIdObj = new ObjectId(appIdStr);

    // 소유권 검증
    const app = await db.collection("stringing_applications").findOne(
      { _id: appIdObj },
      {
        projection: {
          userId: 1,
          orderId: 1,
          rentalId: 1,
          userConfirmedAt: 1,
          status: 1,
          stringDetails: 1,
          stringItems: 1,
        },
      },
    );
    if (!app || String(app.userId) !== String(userId)) {
      return NextResponse.json({ message: "forbidden" }, { status: 403 });
    }
    const appTarget = await resolveStringingApplicationReviewTarget(db, userId, appIdStr);
    const appCanonicalTarget = appTarget?.targetBundle?.targets?.[0] ?? null;
    const appBlockReason = getReviewSubmissionBlockReason(appCanonicalTarget);
    if (appBlockReason === "already") {
      return NextResponse.json({ message: "already", reason: "already" }, { status: 409 });
    }
    if (appBlockReason === "coveredByIntegratedReview") {
      return NextResponse.json(
        { message: "coveredByIntegratedReview", reason: "coveredByIntegratedReview" },
        { status: 409 },
      );
    }
    if (appBlockReason) {
      return NextResponse.json(
        { message: appBlockReason, reason: appBlockReason },
        { status: appBlockReason === "notFound" ? 404 : 403 },
      );
    }
    if (!isStandaloneStringingReviewEligible(app)) {
      const fallbackReason = !app.userConfirmedAt ? "notConfirmed" : "notCompleted";
      return NextResponse.json(
        { message: fallbackReason, reason: fallbackReason },
        { status: 403 },
      );
    }

    // 신청서 단위 중복 작성 방지
    const applicationIdCandidates = [appIdObj, appIdStr];
    const already = await db.collection("reviews").findOne({
      userId,
      isDeleted: { $ne: true },
      $or: [
        { serviceApplicationId: { $in: applicationIdCandidates } },
        { applicationId: { $in: applicationIdCandidates } },
      ],
    });
    if (already) return duplicateReviewResponse();

    const sessionValidation = await claimPhotoSession();
    if (!sessionValidation.ok) return sessionValidation.response;
    sessionClaimed = photosClean.length > 0;
    reviewPersisted = false;

    const now = new Date();
    let reviewId: ObjectId;
    try {
      const reviewDoc = {
        userId,
        service: "stringing",
        reviewType: "service",
        reviewContext: "standalone_stringing",
        contextLabel: getReviewContextLabel("standalone_stringing"),
        serviceApplicationId: appIdObj,
        relatedProductIds: appTarget?.relatedProductIds ?? [],
        relatedRacketIds: appTarget?.relatedRacketIds ?? [],
        rating,
        content,
        photos: photosClean,
        status: "visible",
        helpfulCount: 0,
        userName,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      };
      const insertRes = await db.collection("reviews").insertOne(reviewDoc);
      reviewId = insertRes.insertedId;
      reviewPersisted = true;
      await refreshReviewSummaryCachesForReviewSafely(
        db,
        { ...reviewDoc, _id: reviewId },
        "POST /api/reviews",
      );
    } catch (error) {
      if (sessionClaimed && !reviewPersisted) {
        await rollbackReviewPhotoUploadSessionClaimBestEffort(
          db,
          userId,
          uploadSessionId,
          "POST /api/reviews",
        );
      }
      if (isDuplicateKeyError(error)) return duplicateReviewResponse();
      throw error;
    }

    // 포인트 적립 (보수적 시작)
    // - 결제완료 주문이 연결된 신청서만 적립
    const appOrderId = app?.orderId;
    if (appOrderId && ObjectId.isValid(String(appOrderId))) {
      const paidOrder = await db.collection("orders").findOne(
        {
          _id: new ObjectId(String(appOrderId)),
          userId,
          paymentStatus: "결제완료",
        },
        { projection: { _id: 1 } },
      );
      if (paidOrder) {
        try {
          await grantPoints(db, {
            userId,
            amount: REVIEW_REWARD_POINTS,
            type: "review_reward_service",
            status: "confirmed",
            refKey: `review:${reviewId.toString()}`,
            ref: { reviewId, orderId: new ObjectId(String(appOrderId)) },
            reason: "서비스 리뷰 작성 적립",
          });
        } catch (e) {
          console.error("[reviews] grantPoints failed (service)", e);
        }
      }
    }

    if (sessionClaimed) {
      await markReviewPhotoUploadSessionCommittedBestEffort(
        db,
        userId,
        uploadSessionId,
        "POST /api/reviews",
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ message: "bad request" }, { status: 400 });
}

// 리뷰 리스트(상품/서비스) + 필터 + 커서 페이지네이션
function toInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

export async function GET(req: Request) {
  const db = await getDb();

  // 사용자/권한 추출
  const token = (await cookies()).get("accessToken")?.value;
  let currentUserId: ObjectId | null = null;
  let isAdmin = false;
  if (token) {
    // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500 방지 (비로그인 취급)
    let payload: { sub?: unknown; role?: unknown; isAdmin?: unknown; roles?: unknown } | null =
      null;
    try {
      payload = verifyAccessToken(token);
    } catch {
      payload = null;
    }
    const subStr = payload?.sub ? String(payload.sub) : "";
    if (subStr && ObjectId.isValid(subStr)) {
      currentUserId = new ObjectId(subStr);
    }
    isAdmin =
      payload?.role === "admin" ||
      payload?.role === "ADMIN" ||
      payload?.isAdmin === true ||
      (Array.isArray(payload?.roles) && payload.roles.includes("admin"));
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") || "all") as "product" | "service" | "rental" | "all";
  const rating = url.searchParams.get("rating");
  const hasPhoto = url.searchParams.get("hasPhoto") === "1";
  const sort = (url.searchParams.get("sort") || "latest") as "latest" | "helpful" | "rating";
  const limit = toInt(url.searchParams.get("limit"), 10, 1, 50);
  const cursorB64 = url.searchParams.get("cursor");
  const withHidden = url.searchParams.get("withHidden"); // 'mask' | 'all' | null
  const withDeleted = url.searchParams.get("withDeleted"); //  ('1' | 'true')
  const productFilterId = url.searchParams.get("productId");
  const productFilterCandidates =
    productFilterId && ObjectId.isValid(productFilterId)
      ? [new ObjectId(productFilterId), productFilterId]
      : null;
  if (withHidden === "all" && !isAdmin) {
    return NextResponse.json(
      {
        ok: false,
        reason: "forbiddenHiddenReviews",
        message: "비공개 후기를 조회할 권한이 없습니다.",
      },
      { status: 403 },
    );
  }

  const needServiceJoin = type === "all" || type === "service" || Boolean(productFilterCandidates);
  const needRentalJoin = type === "all" || type === "rental";

  // match 조건 구성
  const match: any = isAdmin
    ? { isDeleted: { $ne: true } }
    : withHidden === "mask"
      ? {
          isDeleted: { $ne: true },
          deletedAt: null,
          status: { $in: ["visible", "hidden"] },
          ...(currentUserId
            ? {
                $or: [{ moderationStatus: { $ne: "hidden" } }, { userId: currentUserId }],
              }
            : { moderationStatus: { $ne: "hidden" } }),
        }
      : buildPublicReviewMatch(false);
  // 관리자 + withDeleted=1 이면 삭제 포함
  if (isAdmin && (withDeleted === "1" || withDeleted === "true")) {
    delete match.isDeleted;
  }
  if (!isAdmin && withHidden !== "mask") match.status = "visible";
  if (isAdmin && withHidden !== "mask" && withHidden !== "all") match.status = "visible";
  if (type === "product") match.productId = { $exists: true };
  if (type === "service") match.service = { $exists: true };
  if (type === "rental") {
    const rentalTypeMatch = { $or: [{ reviewType: "rental" }, { rentalId: { $exists: true } }] };
    appendMatchCondition(match, rentalTypeMatch);
  }
  if (productFilterCandidates && type === "product") {
    const productTargetMatch = await buildPublicReviewSurfaceTargetMatch(db, {
      type: "product",
      id: productFilterId!,
    });
    if (productTargetMatch) appendMatchCondition(match, productTargetMatch);
  }
  if (productFilterCandidates && type !== "product") {
    // 상품 관계 필드는 public surface helper와 공유합니다: stringDetails.stringTypes, meta.stringProductId
    const productTargetMatch = await buildPublicReviewSurfaceTargetMatch(db, {
      type: "product",
      id: productFilterId!,
    });
    if (productTargetMatch) {
      appendMatchCondition(match, productTargetMatch);
    }
  }
  if (rating) match.rating = Number(rating);
  if (hasPhoto) match.$expr = { $gt: [{ $size: { $ifNull: ["$photos", []] } }, 0] };

  // 정렬/커서
  const sortSpec: any =
    sort === "helpful"
      ? { helpfulCount: -1, _id: -1 }
      : sort === "rating"
        ? { rating: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

  const invalidCursorResponse = () =>
    NextResponse.json(
      { ok: false, reason: "invalidCursor", message: "잘못된 페이지 요청입니다." },
      { status: 400 },
    );
  const isValidCursorNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value);

  let after: Record<string, unknown> | null = null;
  if (cursorB64) {
    try {
      const parsed = JSON.parse(Buffer.from(cursorB64, "base64").toString("utf-8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return invalidCursorResponse();
      }
      if (!ObjectId.isValid(String(parsed.id ?? ""))) return invalidCursorResponse();
      if (sort === "latest") {
        if (typeof parsed.createdAt !== "string" && !(parsed.createdAt instanceof Date)) {
          return invalidCursorResponse();
        }
        if (Number.isNaN(new Date(parsed.createdAt).getTime())) return invalidCursorResponse();
      }
      if (sort === "helpful" && !isValidCursorNumber(parsed.helpfulCount)) {
        return invalidCursorResponse();
      }
      if (sort === "rating" && !isValidCursorNumber(parsed.rating)) {
        return invalidCursorResponse();
      }
      after = parsed as Record<string, unknown>;
    } catch {
      return invalidCursorResponse();
    }
  }

  const cursorCond: any = {};
  if (after) {
    if (sort === "helpful") {
      cursorCond.$or = [
        { helpfulCount: { $lt: after.helpfulCount as number } },
        {
          helpfulCount: after.helpfulCount as number,
          _id: { $lt: new ObjectId(String(after.id)) },
        },
      ];
    } else if (sort === "rating") {
      cursorCond.$or = [
        { rating: { $lt: after.rating as number } },
        { rating: after.rating as number, _id: { $lt: new ObjectId(String(after.id)) } },
      ];
    } else {
      cursorCond.$or = [
        { createdAt: { $lt: new Date(after.createdAt as string | Date) } },
        {
          createdAt: new Date(after.createdAt as string | Date),
          _id: { $lt: new ObjectId(String(after.id)) },
        },
      ];
    }
  }

  // $lookup으로 상품 표시 정보 붙이기
  const project: any = {
    _id: 1,
    type: {
      $cond: [
        { $or: [{ $eq: ["$reviewType", "rental"] }, { $ifNull: ["$rentalId", false] }] },
        "rental",
        { $cond: [{ $ifNull: ["$productId", false] }, "product", "service"] },
      ],
    },
    productId: 1,
    reviewType: 1,
    rentalTitle: 1,
    rentalTargetName: 1,
    rentalStatus: "$rental.status",
    rentalDays: "$rental.days",
    // products / used_rackets 구분(라켓 리뷰 fallback용)
    productKind: {
      $cond: [
        { $ifNull: ["$product._id", false] },
        "product",
        { $cond: [{ $ifNull: ["$racket._id", false] }, "racket", null] },
      ],
    },

    // products 우선 → 없으면 used_rackets(라켓) fallback
    productName: {
      $ifNull: [
        { $ifNull: ["$product.name", "$product.title"] },
        {
          $cond: [
            {
              $and: [{ $ne: ["$racket.model", null] }, { $ne: ["$racket.model", ""] }],
            },
            {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$racket.brand", ""] },
                    " ",
                    { $ifNull: ["$racket.model", ""] },
                  ],
                },
              },
            },
            null,
          ],
        },
      ],
    },
    productImage: {
      $ifNull: [
        {
          $ifNull: ["$product.thumbnail", { $arrayElemAt: ["$product.images", 0] }],
        },
        {
          $ifNull: ["$racket.thumbnail", { $arrayElemAt: ["$racket.images", 0] }],
        },
      ],
    },

    // 라켓명/이미지 보정용(응답 직전에 브랜드 라벨 적용)
    __racketBrand: "$racket.brand",
    __racketModel: "$racket.model",
    __racketImages: "$racket.images",
    service: 1,
    serviceTitle: 1,
    serviceTargetName: 1,
    serviceContextLabel: 1,
    reviewContext: 1,
    contextLabel: 1,
    __serviceProductIds: 1,
    rating: 1,
    helpfulCount: 1,
    createdAt: 1,
    votedByMe: 1,
    status: 1,
    authorStatus: {
      $cond: [{ $eq: ["$status", "hidden"] }, "hidden", "visible"],
    },
    moderationStatus: {
      $cond: [{ $eq: ["$moderationStatus", "hidden"] }, "hidden", "visible"],
    },
    effectiveStatus: {
      $cond: [
        {
          $and: [{ $ne: ["$status", "hidden"] }, { $ne: ["$moderationStatus", "hidden"] }],
        },
        "visible",
        "hidden",
      ],
    },
    isMine: 1,
  };

  project.status = 1;
  project.ownedByMe = 1;
  project.adminView = 1;
  if (withHidden === "mask") {
    const hiddenCond = {
      $and: [{ $eq: ["$status", "hidden"] }, { $ne: ["$isMine", true] }, { $eq: [isAdmin, false] }],
    };
    project.userName = { $cond: [hiddenCond, null, "$userName"] };
    project.content = { $cond: [hiddenCond, null, "$content"] };
    project.photos = { $cond: [hiddenCond, [], { $ifNull: ["$photos", []] }] };
    project.masked = hiddenCond;
  } else {
    project.userName = "$userName";
    project.content = "$content";
    project.photos = { $ifNull: ["$photos", []] };
    project.masked = false;
  }

  const pipeline: any[] = [
    { $match: match },
    ...(Object.keys(cursorCond).length ? [{ $match: cursorCond }] : []),
    { $sort: sortSpec },
    { $limit: limit + 1 },
    {
      $addFields: {
        // productId(ObjectId/string) 혼용 대비: join용 ObjectId 정규화
        productIdObj: {
          $cond: [
            { $eq: [{ $type: "$productId" }, "objectId"] },
            "$productId",
            {
              $convert: {
                input: "$productId",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productIdObj",
        foreignField: "_id",
        as: "product",
        pipeline: [{ $project: { name: 1, title: 1, thumbnail: 1, images: 1 } }],
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "used_rackets",
        localField: "productIdObj",
        foreignField: "_id",
        as: "racket",
        pipeline: [{ $project: { brand: 1, model: 1, thumbnail: 1, images: 1 } }],
      },
    },
    { $unwind: { path: "$racket", preserveNullAndEmptyArrays: true } },
    ...(needRentalJoin
      ? [
          {
            $addFields: {
              rentalIdObj: {
                $cond: [
                  { $eq: [{ $type: "$rentalId" }, "objectId"] },
                  "$rentalId",
                  { $convert: { input: "$rentalId", to: "objectId", onError: null, onNull: null } },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "rental_orders",
              localField: "rentalIdObj",
              foreignField: "_id",
              as: "rental",
              pipeline: [{ $project: { brand: 1, model: 1, status: 1, days: 1 } }],
            },
          },
          { $unwind: { path: "$rental", preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              rentalTargetName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$rental.brand", ""] },
                      " ",
                      { $ifNull: ["$rental.model", ""] },
                    ],
                  },
                },
              },
              rentalTitle: "라켓 대여 후기",
            },
          },
        ]
      : []),
    ...(needServiceJoin
      ? [
          // 서비스(스트링 교체) 리뷰면 신청서에서 "교체한 스트링 상품명"을 가져와서 제목을 만들어줌
          {
            $lookup: {
              from: "stringing_applications",
              localField: "serviceApplicationId",
              foreignField: "_id",
              as: "application",
              pipeline: [
                {
                  $project: {
                    // 스키마가 케이스별로 다를 수 있어서 후보를 넓게 잡음
                    "stringDetails.stringItems.name": 1,
                    "stringDetails.stringItems.productId": 1,
                    "stringDetails.racketLines.stringName": 1,
                    "stringDetails.racketLines.stringProductId": 1,
                    "stringItems.name": 1,
                    stringTypes: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: { path: "$application", preserveNullAndEmptyArrays: true },
          },

          // 1) 신청서에서 스트링 이름 배열 뽑기
          {
            $addFields: {
              __svcNames: {
                $let: {
                  vars: {
                    fromItems: {
                      $ifNull: ["$application.stringDetails.stringItems", []],
                    },
                    fromLines: {
                      $ifNull: ["$application.stringDetails.racketLines", []],
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$fromItems" }, 0] },
                      {
                        $map: { input: "$$fromItems", as: "x", in: "$$x.name" },
                      },
                      {
                        $map: {
                          input: "$$fromLines",
                          as: "x",
                          in: "$$x.stringName",
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          // 2) 빈 값 제거
          {
            $addFields: {
              __svcNames: {
                $filter: {
                  input: "$__svcNames",
                  as: "n",
                  cond: {
                    $and: [{ $ne: ["$$n", null] }, { $ne: ["$$n", ""] }],
                  },
                },
              },
            },
          },
          // 3) "앞 2개 + 외 N" 라벨 만들기
          {
            $addFields: {
              serviceTargetName: {
                $let: {
                  vars: {
                    names: "$__svcNames",
                    head: { $slice: ["$__svcNames", 2] },
                    more: {
                      $max: [0, { $subtract: [{ $size: "$__svcNames" }, 2] }],
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$names" }, 0] },
                      {
                        $cond: [
                          { $gt: ["$$more", 0] },
                          {
                            $concat: [
                              {
                                $reduce: {
                                  input: "$$head",
                                  initialValue: "",
                                  in: {
                                    $concat: [
                                      "$$value",
                                      {
                                        $cond: [{ $eq: ["$$value", ""] }, "", ", "],
                                      },
                                      "$$this",
                                    ],
                                  },
                                },
                              },
                              " 외 ",
                              { $toString: "$$more" },
                            ],
                          },
                          {
                            $reduce: {
                              input: "$$names",
                              initialValue: "",
                              in: {
                                $concat: [
                                  "$$value",
                                  {
                                    $cond: [{ $eq: ["$$value", ""] }, "", ", "],
                                  },
                                  "$$this",
                                ],
                              },
                            },
                          },
                        ],
                      },
                      null,
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              __serviceProductIds: {
                $concatArrays: [
                  {
                    $map: {
                      input: {
                        $ifNull: ["$application.stringDetails.stringItems", []],
                      },
                      as: "x",
                      in: "$$x.productId",
                    },
                  },
                  {
                    $map: {
                      input: {
                        $ifNull: ["$application.stringDetails.racketLines", []],
                      },
                      as: "x",
                      in: "$$x.stringProductId",
                    },
                  },
                ],
              },
              serviceContextLabel: {
                $ifNull: [
                  "$contextLabel",
                  { $cond: [{ $eq: ["$service", "stringing"] }, "교체서비스 후기", "서비스 후기"] },
                ],
              },
            },
          },
          // 4) 최종 타이틀: "상품·교체서비스 - (상품명…)" 구성
          {
            $addFields: {
              serviceTitle: {
                $cond: [
                  { $eq: ["$service", "stringing"] },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$serviceTargetName", null] },
                          { $ne: ["$serviceTargetName", ""] },
                        ],
                      },
                      {
                        $concat: ["상품·교체서비스 - ", "$serviceTargetName"],
                      },
                      "상품·교체서비스 이용 후기",
                    ],
                  },
                  null,
                ],
              },
            },
          },
        ]
      : []),
    ...(currentUserId
      ? [{ $addFields: { isMine: { $eq: ["$userId", currentUserId] } } }]
      : [{ $addFields: { isMine: false } }]),
    { $addFields: { ownedByMe: "$isMine", adminView: isAdmin } },
    { $project: project },
  ];

  if (currentUserId) {
    pipeline.push(
      {
        $lookup: {
          from: "review_votes",
          let: { rid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$reviewId", "$$rid"] }, { $eq: ["$userId", currentUserId] }],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "myVote",
        },
      },
      { $addFields: { votedByMe: { $gt: [{ $size: "$myVote" }, 0] } } },
      { $project: { myVote: 0 } },
    );
  } else {
    pipeline.push({ $addFields: { votedByMe: false } });
  }

  const rows = await db.collection("reviews").aggregate(pipeline).toArray();

  // nextCursor 생성
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    rows.length = limit;
    const payload =
      sort === "helpful"
        ? { id: String(last._id), helpfulCount: last.helpfulCount ?? 0 }
        : sort === "rating"
          ? { id: String(last._id), rating: last.rating ?? 0 }
          : { id: String(last._id), createdAt: last.createdAt };
    nextCursor = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
  }

  // 응답 직전에 라켓 브랜드 라벨 보정
  for (const row of rows) {
    const kind = row?.productKind;
    const brandRaw = row?.__racketBrand;
    const modelRaw = row?.__racketModel;

    if (kind === "racket" && (brandRaw || modelRaw)) {
      const brandStr = String(brandRaw ?? "").trim();
      const modelStr = String(modelRaw ?? "").trim();

      const computed = `${racketBrandLabel(brandStr)} ${modelStr}`.trim();
      const raw = `${brandStr} ${modelStr}`.trim();

      const curName = typeof row?.productName === "string" ? row.productName.trim() : "";
      if (!curName || curName === raw) row.productName = computed || curName || "라켓";

      if (!row.productImage && Array.isArray(row?.__racketImages) && row.__racketImages.length) {
        row.productImage = row.__racketImages[0];
      }
    }

    delete row.__racketBrand;
    delete row.__racketModel;
    delete row.__racketImages;
    if (row.type === "rental" && row.rentalTargetName) {
      const parts = String(row.rentalTargetName).trim().split(/\s+/);
      if (parts.length > 1)
        row.rentalTargetName = `${racketBrandLabel(parts[0])} ${parts.slice(1).join(" ")}`.trim();
    }

    if (!row.reviewContext) {
      row.reviewContext =
        row.type === "rental"
          ? "rental"
          : row.type === "service"
            ? "standalone_stringing"
            : "product";
    }
    if (!row.contextLabel) row.contextLabel = getReviewContextLabel(row.reviewContext);
    if (!row.serviceContextLabel && row.type === "service")
      row.serviceContextLabel = row.contextLabel;
    delete row.__serviceProductIds;
  }

  return NextResponse.json({ items: rows, nextCursor });
}
