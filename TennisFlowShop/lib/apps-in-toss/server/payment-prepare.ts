import "server-only";

import type { Db, ObjectId } from "mongodb";
import { ObjectId as MongoObjectId } from "mongodb";

import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import { buildSlotSummaryForDate, loadStringingSettings, resolveDaySchedule } from "@/app/features/stringing-applications/lib/slotEngine";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { publicProductFilter } from "@/lib/public-visibility";
import { racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getEffectiveRacketPrice } from "@/lib/racket-pricing";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { racketBrandLabel } from "@/lib/constants";
import { calculateRacketAvailability } from "@/app/features/rentals/api/paid-rental-availability";
import { getAppsInTossTossPayMode, isAppsInTossTossPayLiveExecuteEnabled, isAppsInTossTossPayLivePrepareEnabled } from "./config";
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
  calculateAppsRentalPaymentAmount,
  createSafePaymentIntentResponse,
  isAppsPaymentIntentExpired,
  isPastVisitSlot,
  isSameAppsPaymentPayload,
  type AppsPaymentPrepareRequest,
  type AppsRacketPurchasePrepareRequest,
  type AppsRacketRentalPrepareRequest,
  type AppsStringingPaymentPrepareRequest,
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

function createCheckoutReadyResponse(intent: AppsInTossPaymentIntentDocument) {
  if (intent.state !== "awaiting_authorization" || isAppsPaymentIntentExpired(intent.expiresAt)) {
    throw new AppsPaymentPrepareError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 준비 상태를 사용할 수 없습니다.");
  }
  try {
    const payToken = parseTossPayToken(intent.payToken);
    return { ...createSafePaymentIntentResponse(intent), payToken };
  } catch {
    throw new AppsPaymentPrepareError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 준비 상태를 사용할 수 없습니다.");
  }
}

function recoverExisting(intent: AppsInTossPaymentIntentDocument, request: AppsPaymentPrepareRequest, userId: ObjectId, identityId: ObjectId) {
  if (!ownsIntent(intent, userId, identityId)) throw new AppsPaymentPrepareError(409, "ATTEMPT_CONFLICT", "결제 시도 식별자를 사용할 수 없습니다.");
  if (!isSameAppsPaymentPayload(intent.checkoutPayload, request)) throw new AppsPaymentPrepareError(409, "ATTEMPT_PAYLOAD_MISMATCH", "같은 결제 시도 식별자의 요청 내용이 다릅니다.");
  if (intent.state === "failed") throw new AppsPaymentPrepareError(409, "PAYMENT_CREATION_FAILED", "결제 준비를 다시 시작해 주세요.");
  if (isAppsPaymentIntentExpired(intent.expiresAt)) throw new AppsPaymentPrepareError(409, "PAYMENT_INTENT_EXPIRED", "결제 준비 시간이 만료되었습니다. 다시 시도해 주세요.");
  if (intent.state === "creating") throw new AppsPaymentPrepareError(409, "PAYMENT_CREATION_IN_PROGRESS", "결제 준비를 처리하고 있습니다. 잠시 후 다시 확인해 주세요.");
  if (intent.state !== "awaiting_authorization") throw new AppsPaymentPrepareError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 준비 상태를 사용할 수 없습니다.");
  return createCheckoutReadyResponse(intent);
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function prepareAppsPayment(params: { db: Db; request: AppsPaymentPrepareRequest; userId: ObjectId; identityId: ObjectId }) {
  if (params.request.purpose === "racket_purchase") return prepareAppsRacketPurchasePayment({ ...params, request: params.request });
  if (params.request.purpose === "racket_rental") return prepareAppsRacketRentalPayment({ ...params, request: params.request });
  const { db, userId, identityId } = params;
  const request = canonicalizeAppsPaymentPrepareRequest(params.request) as AppsStringingPaymentPrepareRequest;
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
  const quotedItem = quote.itemsWithSnapshot[0];
  if (!quotedItem || quotedItem.kind !== "product") throw new AppsPaymentPrepareError(400, "INVALID_PAYMENT_AMOUNT", "결제 금액을 사용할 수 없습니다.");
  let visitSnapshot: { preferredDate: string; preferredTime: string; slotCount: number; durationMinutes: number; capacityAtPrepare: number } | undefined;
  if (isVisit) {
    try {
      if (isPastVisitSlot(request.work.preferredDate, request.work.preferredTime, new Date())) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
      const settings = await loadStringingSettings(db);
      const schedule = resolveDaySchedule(settings, request.work.preferredDate);
      const slots = await buildSlotSummaryForDate(db, request.work.preferredDate, quote.requiredPassCount, settings);
      if (slots.closed || !slots.availableTimes.includes(request.work.preferredTime)) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
      visitSnapshot = {
        preferredDate: request.work.preferredDate, preferredTime: request.work.preferredTime,
        slotCount: quote.requiredPassCount,
        durationMinutes: schedule.interval * quote.requiredPassCount,
        capacityAtPrepare: slots.capacity,
      };
    } catch (error) {
      if (error instanceof AppsPaymentPrepareError) throw error;
      throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    }
  }
  const checkoutPayload: AppsCheckoutPayload = {
    items: [{ productId: request.productId, quantity: 1, kind: "product", selectedColor: request.selectedColor, selectedGauge: request.selectedGauge }],
    applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: request.shipping,
    work: request.work, withStringService: true,
  };
  const mode = getAppsInTossTossPayMode();
  if (mode.mode === "live" && (!isAppsInTossTossPayLivePrepareEnabled() || !isAppsInTossTossPayLiveExecuteEnabled())) {
    throw new AppsPaymentPrepareError(503, "PAYMENT_LIVE_NOT_ENABLED", "라이브 결제 준비는 아직 사용할 수 없습니다.");
  }
  let intent: AppsInTossPaymentIntentDocument;
  try {
    intent = await createAppsInTossPaymentIntent(db, {
      attemptId: request.attemptId, userId, identityId, orderNo: generateTossPayOrderNo(), isTestPayment: mode.isTestPayment,
      paymentPurpose: "stringing_service",
      checkoutPayload,
      pricingSnapshot: { subtotal: quote.subtotal, shippingFee: quote.shippingFee, serviceFee: quote.serviceFee, serviceFeeBeforePackage: quote.serviceFeeBeforePackage, pointsUsed: quote.pointsUsed, payableAmount: quote.payableTotalPrice },
      itemSnapshot: [{ productId, quantity: 1, selectedColor: request.selectedColor, selectedGauge: request.selectedGauge, name: quotedItem.name, price: quotedItem.price, mountingFee: quotedItem.mountingFee }],
      packageSnapshot: { applied: quote.packageApplied, requiredPassCount: quote.requiredPassCount, ...(quote.packagePassId ? { passId: quote.packagePassId } : {}) },
      ...(visitSnapshot ? { reservationSnapshot: visitSnapshot } : {}),
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
    if (attached) return createCheckoutReadyResponse(attached);
  } catch {
    // 외부 결제 생성은 반복하지 않고 아래에서 저장 상태만 확인한다.
  }
  try {
    const persisted = await findAppsInTossPaymentIntentByAttemptId(db, intent.attemptId);
    if (persisted?.state === "awaiting_authorization" && persisted.payToken === payToken) {
      return createCheckoutReadyResponse(persisted);
    }
  } catch {
    // 외부 결제 생성 결과를 잃지 않도록 재호출 없이 안전한 오류로 종료한다.
  }
  throw new AppsPaymentPrepareError(500, "PAYMENT_TOKEN_PERSISTENCE_FAILED", "결제 준비 상태를 저장하지 못했습니다.");
}

function validRentalMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && Number.isInteger(amount) && amount >= 0 ? amount : null;
}

function assertRentalStringProduct(product: any, request: Extract<AppsRacketRentalPrepareRequest["stringing"], { requested: true }>) {
  if (!product || product.isSoldOut === true || Number(product.inventory?.stock ?? 0) < 1) throw new AppsPaymentPrepareError(404, "PRODUCT_NOT_AVAILABLE", "현재 주문할 수 없는 상품입니다.");
  const variant = Array.isArray(product.variantInventories) ? product.variantInventories.find((row: any) => String(row?.colorValue ?? "").trim() === request.selectedColor && String(row?.gaugeValue ?? "").trim() === request.selectedGauge) : undefined;
  const color = Array.isArray(product.colorInventories) ? product.colorInventories.find((row: any) => String(row?.value ?? "").trim() === request.selectedColor) : undefined;
  const gauge = Array.isArray(product.gaugeInventories) ? product.gaugeInventories.find((row: any) => String(row?.value ?? "").trim() === request.selectedGauge) : undefined;
  if (!variant || !color || !gauge) throw new AppsPaymentPrepareError(400, "VARIANT_NOT_FOUND", "선택한 옵션 조합을 찾을 수 없습니다.");
  if (variant.isSoldOut === true || color.isSoldOut === true || gauge.isSoldOut === true || Number(variant.stock ?? 0) < 1 || Number(color.stock ?? 0) < 1 || Number(gauge.stock ?? 0) < 1) {
    throw new AppsPaymentPrepareError(409, "VARIANT_INSUFFICIENT_STOCK", "선택한 상품 옵션의 재고가 부족합니다.");
  }
}

export async function prepareAppsRacketRentalPayment(params: { db: Db; request: AppsRacketRentalPrepareRequest; userId: ObjectId; identityId: ObjectId }) {
  const { db, userId, identityId } = params;
  const request = canonicalizeAppsPaymentPrepareRequest(params.request) as AppsRacketRentalPrepareRequest;
  const existing = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId);
  if (existing) return recoverExisting(existing, request, userId, identityId);

  const racketId = new MongoObjectId(request.racketId);
  const racket = await db.collection("used_rackets").findOne({ _id: racketId, ...racketVisibilityFilterFor({ isAdmin: false }) });
  if (!racket) throw new AppsPaymentPrepareError(404, "RACKET_NOT_AVAILABLE", "현재 대여할 수 없는 라켓입니다.");
  if (racket.rental?.enabled !== true) throw new AppsPaymentPrepareError(409, "RACKET_RENTAL_DISABLED", "현재 대여할 수 없는 라켓입니다.");
  const rentalFee = validRentalMoney(request.days === 7 ? racket.rental?.fee?.d7 : request.days === 15 ? racket.rental?.fee?.d15 : racket.rental?.fee?.d30);
  const deposit = validRentalMoney(racket.rental?.deposit);
  if (rentalFee === null || deposit === null) throw new AppsPaymentPrepareError(409, "RACKET_RENTAL_PRICE_INVALID", "대여 금액을 사용할 수 없습니다.");
  const activeRentalCount = await db.collection("rental_orders").countDocuments({ racketId, status: { $in: ["paid", "out"] } });
  if (calculateRacketAvailability({ quantity: racket.quantity, status: racket.status }, activeRentalCount).available < 1) throw new AppsPaymentPrepareError(409, "RACKET_RENTAL_UNAVAILABLE", "현재 대여 가능한 수량이 없습니다.");

  const displayName = `${racketBrandLabel(String(racket.brand ?? ""))} ${String(racket.model ?? "")}`.trim();
  if (!displayName) throw new AppsPaymentPrepareError(404, "RACKET_NOT_AVAILABLE", "현재 대여할 수 없는 라켓입니다.");
  let stringProductId: MongoObjectId | undefined;
  let stringName = ""; let stringPrice = 0; let mountingFee = 0;
  if (request.stringing.requested) {
    stringProductId = new MongoObjectId(request.stringing.stringProductId);
    const product = await db.collection("products").findOne({ _id: stringProductId, ...publicProductFilter });
    assertRentalStringProduct(product, request.stringing);
    stringName = String(product?.name ?? "").trim();
    stringPrice = getEffectiveProductPrice(product);
    mountingFee = Number(product?.mountingFee ?? 0);
    if (!stringName || validRentalMoney(stringPrice) === null || validRentalMoney(mountingFee) === null) throw new AppsPaymentPrepareError(409, "STRING_PRICE_INVALID", "스트링 금액을 사용할 수 없습니다.");
  }
  let payableAmount: number;
  try { payableAmount = calculateAppsRentalPaymentAmount({ rentalFee, deposit, stringPrice, serviceFee: mountingFee }).payableAmount; }
  catch { throw new AppsPaymentPrepareError(400, "INVALID_PAYMENT_AMOUNT", "결제 금액을 사용할 수 없습니다."); }

  let visitSnapshot: AppsInTossPaymentIntentDocument["reservationSnapshot"];
  if (request.collectionMethod === "visit" && request.stringing.requested) {
    const work = request.stringing.work;
    if (isPastVisitSlot(work.preferredDate, work.preferredTime, new Date())) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    const settings = await loadStringingSettings(db); const schedule = resolveDaySchedule(settings, work.preferredDate);
    const slots = await buildSlotSummaryForDate(db, work.preferredDate, 1, settings);
    if (slots.closed || !slots.availableTimes.includes(work.preferredTime)) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    visitSnapshot = { preferredDate: work.preferredDate, preferredTime: work.preferredTime, slotCount: 1, durationMinutes: schedule.interval, capacityAtPrepare: slots.capacity };
  }
  const work = request.stringing.requested ? request.stringing.work : { tensionMain: "", tensionCross: "", note: "", preferredDate: "", preferredTime: "" };
  const rentalStringing = request.stringing.requested
    ? { requested: true as const, stringProductId: stringProductId!, name: stringName, price: stringPrice, mountingFee, selectedColor: request.stringing.selectedColor, selectedGauge: request.stringing.selectedGauge, work }
    : { requested: false as const };
  const checkoutPayload: AppsCheckoutPayload = {
    items: [{ productId: request.racketId, quantity: 1, kind: "rental_racket" }, ...(request.stringing.requested ? [{ productId: request.stringing.stringProductId, quantity: 1, kind: "product" as const, selectedColor: request.stringing.selectedColor, selectedGauge: request.stringing.selectedGauge }] : [])],
    applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: request.shipping, work,
    withStringService: request.stringing.requested,
    rental: { days: request.days, refundAccount: request.refundAccount, stringing: request.stringing.requested ? { requested: true, stringProductId: request.stringing.stringProductId, selectedColor: request.stringing.selectedColor, selectedGauge: request.stringing.selectedGauge } : { requested: false } },
  };
  const mode = getAppsInTossTossPayMode();
  if (mode.mode === "live" && (!isAppsInTossTossPayLivePrepareEnabled() || !isAppsInTossTossPayLiveExecuteEnabled())) throw new AppsPaymentPrepareError(503, "PAYMENT_LIVE_NOT_ENABLED", "라이브 결제 준비는 아직 사용할 수 없습니다.");
  let intent: AppsInTossPaymentIntentDocument;
  try {
    intent = await createAppsInTossPaymentIntent(db, {
      attemptId: request.attemptId, userId, identityId, orderNo: generateTossPayOrderNo(), isTestPayment: mode.isTestPayment, paymentPurpose: "racket_rental", checkoutPayload,
      pricingSnapshot: { subtotal: rentalFee + deposit + stringPrice, shippingFee: 0, serviceFee: mountingFee, serviceFeeBeforePackage: mountingFee, pointsUsed: 0, payableAmount },
      itemSnapshot: [{ productId: racketId, quantity: 1, kind: "rental_racket", name: `${displayName} ${request.days}일 대여`, price: rentalFee + deposit }, ...(request.stringing.requested ? [{ productId: stringProductId!, quantity: 1, kind: "product" as const, selectedColor: request.stringing.selectedColor, selectedGauge: request.stringing.selectedGauge, name: stringName, price: stringPrice, mountingFee }] : [])],
      rentalSnapshot: { paymentPurpose: "racket_rental", racketId, brand: String(racket.brand ?? ""), model: String(racket.model ?? ""), displayName, days: request.days, rentalFee, deposit, refundAccount: request.refundAccount, applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: { ...request.shipping, deliveryRequest: request.shipping.deliveryRequest ?? "" }, stringing: rentalStringing, pricing: { rentalFee, deposit, stringPrice, serviceFee: mountingFee, total: payableAmount }, payableAmount },
      ...(visitSnapshot ? { reservationSnapshot: visitSnapshot } : {}), expiresAt: new Date(Date.now() + APPS_PAYMENT_PREPARE_TTL_MS),
    });
  } catch (error) { if (!isDuplicateKeyError(error)) throw error; const raced = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId); if (!raced) throw error; return recoverExisting(raced, request, userId, identityId); }

  const userKey = await loadActiveAppsInTossUserKey(db, identityId, userId);
  let makeResult: Awaited<ReturnType<typeof makeTossPayPayment>>;
  try { makeResult = await makeTossPayPayment(userKey, buildAppsTossPayMakePaymentInput(intent)); }
  catch { await recordAppsInTossPaymentCreationFailed(db, intent._id, "MAKE_PAYMENT_UNAVAILABLE"); throw new AppsPaymentPrepareError(503, "TOSS_PAY_UNAVAILABLE", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요."); }
  if (makeResult.kind === "toss_failure") { await recordAppsInTossPaymentCreationFailed(db, intent._id, makeResult.errorCode ?? `MAKE_PAYMENT_${makeResult.resultType}`); throw new AppsPaymentPrepareError(503, "TOSS_PAY_MAKE_FAILED", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요."); }
  const payToken = parseTossPayToken(makeResult.value.success.payToken);
  try {
    const attached = await attachAppsInTossPayToken(db, intent._id, payToken);
    if (attached) return createCheckoutReadyResponse(attached);
  } catch {
    // 외부 결제 생성은 반복하지 않고 저장된 token만 아래에서 확인한다.
  }
  try {
    const persisted = await findAppsInTossPaymentIntentByAttemptId(db, intent.attemptId);
    if (persisted?.state === "awaiting_authorization" && persisted.payToken === payToken) return createCheckoutReadyResponse(persisted);
  } catch {
    // make-payment 결과를 잃지 않도록 같은 attempt에서 외부 결제를 다시 만들지 않는다.
  }
  throw new AppsPaymentPrepareError(500, "PAYMENT_TOKEN_PERSISTENCE_FAILED", "결제 준비 상태를 저장하지 못했습니다.");
}

export async function prepareAppsRacketPurchasePayment(params: { db: Db; request: AppsRacketPurchasePrepareRequest; userId: ObjectId; identityId: ObjectId }) {
  const { db, userId, identityId } = params;
  const request = canonicalizeAppsPaymentPrepareRequest(params.request) as AppsRacketPurchasePrepareRequest;
  const existing = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId);
  if (existing) return recoverExisting(existing, request, userId, identityId);

  const racketId = new MongoObjectId(request.racketId);
  const stringProductId = new MongoObjectId(request.stringProductId);
  const racket = await db.collection("used_rackets").findOne({ _id: racketId, ...racketVisibilityFilterFor({ isAdmin: false }) });
  if (!racket) throw new AppsPaymentPrepareError(404, "RACKET_NOT_AVAILABLE", "현재 구매할 수 없는 라켓입니다.");
  const hasStockQty = typeof racket.quantity === "number" && Number.isFinite(racket.quantity);
  const baseQty = hasStockQty ? Math.max(0, Math.trunc(racket.quantity)) : racket.status === "available" ? 1 : 0;
  const activeRentalCount = await db.collection("rental_orders").countDocuments({ racketId, status: { $in: ["paid", "out"] } });
  if (Math.max(0, baseQty - activeRentalCount) < request.quantity) throw new AppsPaymentPrepareError(409, activeRentalCount > 0 ? "RACKET_RENTAL_RESERVED" : "RACKET_INSUFFICIENT_STOCK", "라켓 재고가 부족합니다.");

  const product = await db.collection("products").findOne({ _id: stringProductId, ...publicProductFilter });
  const variant = Array.isArray(product?.variantInventories) ? product.variantInventories.find((row: any) => String(row?.colorValue ?? "").trim() === request.selectedColor && String(row?.gaugeValue ?? "").trim() === request.selectedGauge) : undefined;
  if (!product || Number(product.inventory?.stock ?? 0) < request.quantity) throw new AppsPaymentPrepareError(404, "PRODUCT_NOT_AVAILABLE", "현재 주문할 수 없는 상품입니다.");
  if (!variant) throw new AppsPaymentPrepareError(400, "VARIANT_NOT_FOUND", "선택한 옵션 조합을 찾을 수 없습니다.");
  if (variant.isSoldOut === true || Number(variant.stock ?? 0) < request.quantity) throw new AppsPaymentPrepareError(409, "VARIANT_INSUFFICIENT_STOCK", "선택한 옵션 조합의 재고가 부족합니다.");
  const productName = String(product.name ?? "").trim();
  const racketName = `${racketBrandLabel(String(racket.brand ?? ""))} ${String(racket.model ?? "")}`.trim();
  if (!productName || !racketName) throw new AppsPaymentPrepareError(404, "PRODUCT_NOT_AVAILABLE", "현재 주문할 수 없는 상품입니다.");
  const mountingFee = Number.isFinite(Number(product.mountingFee)) ? Number(product.mountingFee) : 0;
  const stringingInput: StringingApplicationInput = {
    name: request.applicant.name, email: request.applicant.email, phone: request.applicant.phone,
    shippingInfo: { ...request.applicant, ...request.shipping, collectionMethod: request.collectionMethod },
    racketType: racketName, stringTypes: [productName], preferredDate: request.work.preferredDate || undefined,
    preferredTime: request.work.preferredTime || undefined, requirements: request.work.note,
    selectedColor: request.selectedColor, selectedGauge: request.selectedGauge,
    lines: Array.from({ length: request.quantity }, () => ({ racketType: racketName, stringProductId: request.stringProductId, stringName: productName, tensionMain: request.work.tensionMain, tensionCross: request.work.tensionCross, note: request.work.note, mountingFee })),
  };
  const isVisit = request.collectionMethod === "visit";
  const quote = await calculateCheckoutPayableAmount({ db, userId: String(userId), items: [{ productId: request.racketId, quantity: request.quantity, kind: "racket" }, { productId: request.stringProductId, quantity: request.quantity, kind: "product" }], shippingInfo: { withStringService: true, deliveryMethod: isVisit ? "방문수령" : "택배수령", shippingMethod: request.collectionMethod }, pointsToUse: 0, stringingApplicationInput: stringingInput });
  if (quote.payableTotalPrice <= 0 || quote.payableTotalPrice > 9_999_999) throw new AppsPaymentPrepareError(400, "INVALID_PAYMENT_AMOUNT", "결제 금액을 사용할 수 없습니다.");
  let visitSnapshot: AppsInTossPaymentIntentDocument["reservationSnapshot"];
  if (isVisit) {
    if (isPastVisitSlot(request.work.preferredDate, request.work.preferredTime, new Date())) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    const settings = await loadStringingSettings(db); const schedule = resolveDaySchedule(settings, request.work.preferredDate);
    const slots = await buildSlotSummaryForDate(db, request.work.preferredDate, quote.requiredPassCount, settings);
    if (slots.closed || !slots.availableTimes.includes(request.work.preferredTime)) throw new AppsPaymentPrepareError(409, "VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다.");
    visitSnapshot = { preferredDate: request.work.preferredDate, preferredTime: request.work.preferredTime, slotCount: quote.requiredPassCount, durationMinutes: schedule.interval * quote.requiredPassCount, capacityAtPrepare: slots.capacity };
  }
  const checkoutPayload: AppsCheckoutPayload = { items: [{ productId: request.racketId, quantity: request.quantity, kind: "racket" }, { productId: request.stringProductId, quantity: request.quantity, kind: "product", selectedColor: request.selectedColor, selectedGauge: request.selectedGauge }], applicant: request.applicant, collectionMethod: request.collectionMethod, shipping: request.shipping, work: { ...request.work, racketType: racketName }, withStringService: true };
  const mode = getAppsInTossTossPayMode();
  if (mode.mode === "live" && (!isAppsInTossTossPayLivePrepareEnabled() || !isAppsInTossTossPayLiveExecuteEnabled())) throw new AppsPaymentPrepareError(503, "PAYMENT_LIVE_NOT_ENABLED", "라이브 결제 준비는 아직 사용할 수 없습니다.");
  let intent: AppsInTossPaymentIntentDocument;
  try {
    intent = await createAppsInTossPaymentIntent(db, { attemptId: request.attemptId, userId, identityId, orderNo: generateTossPayOrderNo(), isTestPayment: mode.isTestPayment, paymentPurpose: "racket_purchase", checkoutPayload,
      pricingSnapshot: { subtotal: quote.subtotal, shippingFee: quote.shippingFee, serviceFee: quote.serviceFee, serviceFeeBeforePackage: quote.serviceFeeBeforePackage, pointsUsed: 0, payableAmount: quote.payableTotalPrice },
      itemSnapshot: quote.itemsWithSnapshot.map((item, index) => ({ productId: index === 0 ? racketId : stringProductId, kind: item.kind, quantity: item.quantity, name: item.name, price: item.price, ...(item.kind === "product" ? { selectedColor: request.selectedColor, selectedGauge: request.selectedGauge, mountingFee: item.mountingFee } : {}) })),
      packageSnapshot: { applied: quote.packageApplied, requiredPassCount: quote.requiredPassCount, ...(quote.packagePassId ? { passId: quote.packagePassId } : {}) }, ...(visitSnapshot ? { reservationSnapshot: visitSnapshot } : {}), expiresAt: new Date(Date.now() + APPS_PAYMENT_PREPARE_TTL_MS) });
  } catch (error) { if (!isDuplicateKeyError(error)) throw error; const raced = await findAppsInTossPaymentIntentByAttemptId(db, request.attemptId); if (!raced) throw error; return recoverExisting(raced, request, userId, identityId); }
  const userKey = await loadActiveAppsInTossUserKey(db, identityId, userId);
  let makeResult: Awaited<ReturnType<typeof makeTossPayPayment>>;
  try { makeResult = await makeTossPayPayment(userKey, buildAppsTossPayMakePaymentInput(intent)); }
  catch { await recordAppsInTossPaymentCreationFailed(db, intent._id, "MAKE_PAYMENT_UNAVAILABLE"); throw new AppsPaymentPrepareError(503, "TOSS_PAY_UNAVAILABLE", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요."); }
  if (makeResult.kind === "toss_failure") { await recordAppsInTossPaymentCreationFailed(db, intent._id, makeResult.errorCode ?? `MAKE_PAYMENT_${makeResult.resultType}`); throw new AppsPaymentPrepareError(503, "TOSS_PAY_MAKE_FAILED", "결제 준비를 완료하지 못했습니다. 다시 시도해 주세요."); }
  const payToken = parseTossPayToken(makeResult.value.success.payToken);
  const attached = await attachAppsInTossPayToken(db, intent._id, payToken);
  if (attached) return createCheckoutReadyResponse(attached);
  const persisted = await findAppsInTossPaymentIntentByAttemptId(db, intent.attemptId);
  if (persisted?.state === "awaiting_authorization" && persisted.payToken === payToken) return createCheckoutReadyResponse(persisted);
  throw new AppsPaymentPrepareError(500, "PAYMENT_TOKEN_PERSISTENCE_FAILED", "결제 준비 상태를 저장하지 못했습니다.");
}

export async function getOwnedAppsPaymentIntent(db: Db, attemptId: string, userId: ObjectId, identityId: ObjectId) {
  const intent = await findAppsInTossPaymentIntentByAttemptId(db, attemptId);
  if (!intent || !ownsIntent(intent, userId, identityId)) throw new AppsPaymentPrepareError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  return createSafePaymentIntentResponse(intent);
}
