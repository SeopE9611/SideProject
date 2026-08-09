import "server-only";

import type { Db, ObjectId } from "mongodb";
import { ObjectId as MongoObjectId } from "mongodb";

import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import { buildSlotSummaryForDate } from "@/app/features/stringing-applications/lib/slotEngine";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { publicProductFilter } from "@/lib/public-visibility";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { getAppsInTossTossPayMode } from "./config";
import { TossApiError } from "./http";
import { loadActiveAppsInTossUserKey } from "./identity";
import {
  attachAppsInTossPayToken,
  createAppsInTossPaymentIntent,
  findAppsInTossPaymentIntentByAttemptId,
  recordAppsInTossPaymentCreationFailed,
  type AppsCheckoutPayload,
  type AppsInTossPaymentIntentDocument,
} from "./payment-intents";
import {
  canonicalizeAppsPaymentPrepareRequest,
  createSafePaymentIntentResponse,
  isAppsPaymentIntentExpired,
  isPastVisitSlot,
  isSameAppsPaymentPayload,
  type AppsPaymentPrepareRequest,
} from "./payment-prepare-contract";
import { makeTossPayPayment } from "./toss-pay-client";
import { buildAppsTossPayMakePaymentInput } from "./toss-pay-policy";
import { generateTossPayOrderNo, parseTossPayToken, TossPayContractError } from "./toss-pay-contract";

export const APPS_PAYMENT_PREPARE_TTL_MS = 30 * 60 * 1000;

export class AppsPaymentPrepareError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "AppsPaymentPrepareError"; }
}

function ownsIntent(intent: AppsInTossPaymentIntentDocument, userId: ObjectId, identityId: ObjectId) {
  return intent.userId.equals(userId) && intent.identityId.equals(identityId);
}

function recoverExisting(intent: AppsInTossPaymentIntentDocument, request: AppsPaymentPrepareRequest, userId: ObjectId, identityId: ObjectId) {
  if (!ownsIntent(intent, userId, identityId)) throw new AppsPaymentPrepareError(409, "ATTEMPT_CONFLICT", "결제 시도 식별자를 사용할 수 없습니다.");
  if (!isSameAppsPaymentPayload(intent.checkoutPayload, request)) throw new AppsPaymentPrepareError(409, "ATTEMPT_PAYLOAD_MISMATCH", "같은 결제 시도 식별자의 요청 내용이 다릅니다.");
  if (intent.state === "failed") throw new AppsPaymentPrepareError(409, "PAYMENT_CREATION_FAILED", "결제 준비를 다시 시작해 주세요.");
  if (isAppsPaymentIntentExpired(intent.expiresAt)) throw new AppsPaymentPrepareError(409, "PAYMENT_INTENT_EXPIRED", "결제 준비 시간이 만료되었습니다. 다시 시도해 주세요.");
  if (intent.state === "creating") throw new AppsPaymentPrepareError(409, "PAYMENT_CREATION_IN_PROGRESS", "결제 준비를 처리하고 있습니다. 잠시 후 다시 확인해 주세요.");
  if (intent.state !== "awaiting_authorization") throw new AppsPaymentPrepareError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 준비 상태를 사용할 수 없습니다.");
  return createSafePaymentIntentResponse(intent.attemptId, "awaiting_authorization", intent.expiresAt);
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function prepareAppsPayment(params: { db: Db; request: AppsPaymentPrepareRequest; userId: ObjectId; identityId: ObjectId }) {
  const { db, userId, identityId } = params;
  const request = canonicalizeAppsPaymentPrepareRequest(params.request);
  const existing = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId);
  if (existing) return recoverExisting(existing, request, userId, identityId);

  const productId = new MongoObjectId(request.productId);
  const product = await db.collection("products").findOne({ _id: productId, ...publicProductFilter });
  if (!product || Number(product.inventory?.stock ?? 0) < 1) throw new AppsPaymentPrepareError(404, "PRODUCT_NOT_AVAILABLE", "현재 주문할 수 없는 상품입니다.");

  const variants = Array.isArray(product.variantInventories) ? product.variantInventories : [];
  const variant = variants.find((row) => String(row?.colorValue ?? "").trim() === request.selectedColor && String(row?.gaugeValue ?? "").trim() === request.selectedGauge);
  if (!variant) throw new AppsPaymentPrepareError(400, "VARIANT_NOT_FOUND", "선택한 옵션 조합을 찾을 수 없습니다.");
  if (variant.isSoldOut === true) throw new AppsPaymentPrepareError(409, "VARIANT_SOLD_OUT", "선택한 옵션 조합은 품절입니다.");
  if (Number(variant.stock ?? 0) < 1) throw new AppsPaymentPrepareError(409, "VARIANT_INSUFFICIENT_STOCK", "선택한 옵션 조합의 재고가 부족합니다.");

  if (request.collectionMethod === "visit") {
    try {
      if (isPastVisitSlot(request.work.preferredDate, request.work.preferredTime, new Date())) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
      const slots = await buildSlotSummaryForDate(db, request.work.preferredDate, 1);
      if (slots.closed || !slots.availableTimes.includes(request.work.preferredTime)) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    } catch (error) {
      if (error instanceof AppsPaymentPrepareError) throw error;
      throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    }
  }

  const productName = String(product.name ?? "").trim();
  if (!productName) throw new AppsPaymentPrepareError(404, "PRODUCT_NOT_AVAILABLE", "현재 주문할 수 없는 상품입니다.");
  const mountingFee = Number.isFinite(Number(product.mountingFee)) ? Number(product.mountingFee) : 0;
  const stringingInput: StringingApplicationInput = {
    name: request.applicant.name, email: request.applicant.email, phone: request.applicant.phone,
    shippingInfo: { ...request.applicant, ...request.shipping, collectionMethod: request.collectionMethod },
    racketType: request.work.racketType, stringTypes: [productName],
    preferredDate: request.work.preferredDate || undefined, preferredTime: request.work.preferredTime || undefined,
    requirements: request.work.note, selectedColor: request.selectedColor, selectedGauge: request.selectedGauge,
    lines: [{ racketType: request.work.racketType, stringProductId: request.productId, stringName: productName, tensionMain: request.work.tensionMain, tensionCross: request.work.tensionCross, note: request.work.note, mountingFee }],
  };
  const isVisit = request.collectionMethod === "visit";
  const quote = await calculateCheckoutPayableAmount({
    db, userId: userId.toString(), items: [{ productId: request.productId, quantity: 1, kind: "product" }],
    shippingInfo: { withStringService: true, deliveryMethod: isVisit ? "방문수령" : "택배수령", shippingMethod: request.collectionMethod },
    pointsToUse: 0, stringingApplicationInput: stringingInput,
  });
  if (quote.payableTotalPrice <= 0 || quote.payableTotalPrice > 9_999_999) throw new AppsPaymentPrepareError(400, "INVALID_PAYMENT_AMOUNT", "결제 금액을 사용할 수 없습니다.");
  const checkoutPayload: AppsCheckoutPayload = {
    items: [{ productId: request.productId, quantity: 1, kind: "product", selectedColor: request.selectedColor, selectedGauge: request.selectedGauge }],
    applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: request.shipping,
    work: request.work, withStringService: true,
  };
  const mode = getAppsInTossTossPayMode();
  if (mode.mode !== "sandbox") throw new AppsPaymentPrepareError(503, "PAYMENT_LIVE_NOT_ENABLED", "라이브 결제 준비는 아직 사용할 수 없습니다.");
  let intent: AppsInTossPaymentIntentDocument;
  try {
    intent = await createAppsInTossPaymentIntent(db, {
      attemptId: request.attemptId, userId, identityId, orderNo: generateTossPayOrderNo(), isTestPayment: mode.isTestPayment,
      checkoutPayload,
      pricingSnapshot: { subtotal: quote.subtotal, shippingFee: quote.shippingFee, serviceFee: quote.serviceFee, pointsUsed: quote.pointsUsed, payableAmount: quote.payableTotalPrice },
      itemSnapshot: [{ productId, quantity: 1, selectedColor: request.selectedColor, selectedGauge: request.selectedGauge, name: productName, price: getEffectiveProductPrice(product) }],
      ...(isVisit ? { reservationSnapshot: { preferredDate: request.work.preferredDate, preferredTime: request.work.preferredTime } } : {}),
      expiresAt: new Date(Date.now() + APPS_PAYMENT_PREPARE_TTL_MS),
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId);
    if (!raced) throw error;
    return recoverExisting(raced, request, userId, identityId);
  }

  const userKey = await loadActiveAppsInTossUserKey(db, identityId, userId);
  if (isAppsPaymentIntentExpired(intent.expiresAt)) throw new AppsPaymentPrepareError(409, "PAYMENT_INTENT_EXPIRED", "결제 준비 시간이 만료되었습니다. 다시 시도해 주세요.");

  let makeResult: Awaited<ReturnType<typeof makeTossPayPayment>>;
  try {
    makeResult = await makeTossPayPayment(userKey, buildAppsTossPayMakePaymentInput(intent));
  } catch (error) {
    const failureCode = error instanceof TossApiError
      ? `MAKE_PAYMENT_${error.kind.toUpperCase()}`
      : error instanceof TossPayContractError
        ? "MAKE_PAYMENT_INVALID_RESPONSE"
        : "MAKE_PAYMENT_UNAVAILABLE";
    await recordAppsInTossPaymentCreationFailed(db, intent._id, failureCode);
    throw new AppsPaymentPrepareError(503, "TOSS_PAY_UNAVAILABLE", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요.");
  }

  if (makeResult.kind === "toss_failure") {
    await recordAppsInTossPaymentCreationFailed(db, intent._id, makeResult.errorCode ?? `MAKE_PAYMENT_${makeResult.resultType}`);
    throw new AppsPaymentPrepareError(503, "TOSS_PAY_MAKE_FAILED", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요.");
  }

  const payToken = parseTossPayToken(makeResult.value.success.payToken);
  try {
    const attached = await attachAppsInTossPayToken(db, intent._id, payToken);
    if (attached) return createSafePaymentIntentResponse(attached.attemptId, attached.state, attached.expiresAt);
  } catch {
    // 외부 결제 생성은 반복하지 않고 아래에서 저장 상태만 확인한다.
  }
  try {
    const persisted = await findAppsInTossPaymentIntentByAttemptId(db, intent.attemptId);
    if (persisted?.state === "awaiting_authorization" && persisted.payToken === payToken) {
      return createSafePaymentIntentResponse(persisted.attemptId, persisted.state, persisted.expiresAt);
    }
  } catch {
    // 외부 결제 생성 결과를 잃지 않도록 재호출 없이 안전한 오류로 종료한다.
  }
  throw new AppsPaymentPrepareError(500, "PAYMENT_TOKEN_PERSISTENCE_FAILED", "결제 준비 상태를 저장하지 못했습니다.");
}

export async function getOwnedAppsPaymentIntent(db: Db, attemptId: string, userId: ObjectId, identityId: ObjectId) {
  const intent = await findAppsInTossPaymentIntentByAttemptId(db, attemptId);
  if (!intent || !ownsIntent(intent, userId, identityId)) throw new AppsPaymentPrepareError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  return createSafePaymentIntentResponse(intent.attemptId, intent.state, intent.expiresAt);
}
