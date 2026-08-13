import "server-only";

import { ObjectId, type Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { consumePass } from "@/lib/passes.service";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { guardVisitReservation } from "@/app/features/stringing-applications/lib/visitReservationGuard";
import { normalizeEmail } from "@/lib/claims";
import { normalizeEmailForSearch } from "@/lib/search-email";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import { publicProductFilter, racketVisibilityFilterFor } from "@/lib/public-visibility";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import { applyRentalVariantInventoryDeduction, ensureRentalOrdersIdemIndex } from "@/app/features/rentals/api/create-rental-order-core";
import { createRentalOrderInTransaction } from "@/app/features/rentals/api/rental-order-transaction";
import { appsInTossPaymentIntents, findAppsInTossPaymentIntentByAttemptId, getAppsInTossPaymentPurpose, recordAppsInTossPaymentFinalized, type AppsInTossPaymentIntentDocument } from "./payment-intents";
import { buildAppsRentalStringingApplication } from "./rental-stringing-application";

export class AppsPaymentFinalizationError extends Error {
  constructor(public status: number, public code: string, message: string, public business = false) { super(message); this.name = "AppsPaymentFinalizationError"; }
}

const fail = (code: string, message: string): never => { throw new AppsPaymentFinalizationError(409, code, message, true); };
const owns = (intent: AppsInTossPaymentIntentDocument, userId: ObjectId, identityId: ObjectId) => intent.userId.equals(userId) && intent.identityId.equals(identityId);

const errorCode = (error: unknown) => error instanceof Error && "code" in error ? String(error.code) : error instanceof Error ? error.message : "";
export const classifyPassBusinessError = (error: unknown) => ["PASS_NOT_FOUND", "ORDER_NOT_PAID", "PASS_CONSUME_FAILED"].includes(errorCode(error)) ? "PACKAGE_PASS_UNAVAILABLE" : null;
export const classifyVisitBusinessError = (error: unknown) => errorCode(error) === "VISIT_SLOT_UNAVAILABLE" ? "VISIT_SLOT_UNAVAILABLE" : null;

function validateSnapshot(intent: AppsInTossPaymentIntentDocument) {
  const checkout = intent.checkoutPayload;
  const pricing = intent.pricingSnapshot;
  const items = intent.itemSnapshot;
  if (!intent.packageSnapshot) fail("PAYMENT_FINALIZATION_SNAPSHOT_UNAVAILABLE", "패키지 snapshot을 사용할 수 없습니다.");
  const packageSnapshot = intent.packageSnapshot!;
  if (!checkout || !pricing || !Array.isArray(items)) fail("PAYMENT_FINALIZATION_SNAPSHOT_UNAVAILABLE", "주문 확정 snapshot을 사용할 수 없습니다.");
  if (checkout.items?.length !== 1 || items.length !== 1) fail("PAYMENT_FINALIZATION_SNAPSHOT_UNSUPPORTED", "지원하지 않는 주문 구성입니다.");
  const checkoutItem = checkout.items[0]; const item = items[0];
  if (checkoutItem.kind !== "product" || checkoutItem.quantity !== 1 || item.quantity !== 1 || String(checkoutItem.productId) !== String(item.productId) || checkoutItem.selectedColor !== item.selectedColor || checkoutItem.selectedGauge !== item.selectedGauge) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "결제 snapshot이 일치하지 않습니다.");
  if (!item.selectedColor || !item.selectedGauge || !Number.isFinite(item.price) || item.price < 0 || !Number.isFinite(item.mountingFee) || Number(item.mountingFee) < 0) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "상품 snapshot이 올바르지 않습니다.");
  if (![pricing.subtotal, pricing.shippingFee, pricing.serviceFee, pricing.serviceFeeBeforePackage, pricing.pointsUsed, pricing.payableAmount].every(Number.isFinite) || pricing.subtotal < 0 || pricing.shippingFee < 0 || pricing.serviceFee < 0 || Number(pricing.serviceFeeBeforePackage) < pricing.serviceFee || pricing.payableAmount <= 0) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "가격 snapshot이 올바르지 않습니다.");
  if (pricing.pointsUsed !== 0) fail("PAYMENT_FINALIZATION_POINTS_UNSUPPORTED", "포인트가 사용된 결제는 아직 확정할 수 없습니다.");
  if (packageSnapshot.applied) {
    if (!packageSnapshot.passId || packageSnapshot.requiredPassCount <= 0 || pricing.serviceFee !== 0) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "패키지 snapshot이 올바르지 않습니다.");
  } else if (packageSnapshot.passId) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "패키지 snapshot이 올바르지 않습니다.");
  const cm = normalizeCollection(checkout.collectionMethod);
  if (cm === "visit") {
    const r = intent.reservationSnapshot;
    if (!r?.preferredDate || !r.preferredTime || !r.slotCount || r.slotCount < 1 || !r.durationMinutes || r.durationMinutes <= 0 || checkout.work.preferredDate !== r.preferredDate || checkout.work.preferredTime !== r.preferredTime) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "방문 예약 snapshot이 올바르지 않습니다.");
  }
  return { checkout, pricing, item, pkg: packageSnapshot, cm };
}

async function idempotentResult(db: Db, intent: AppsInTossPaymentIntentDocument) {
  if (!intent.finalOrderId) throw new AppsPaymentFinalizationError(500, "PAYMENT_FINALIZATION_STATE_INCONSISTENT", "확정 주문 정보가 없습니다.");
  if (getAppsInTossPaymentPurpose(intent) === "racket_rental") {
    const rental = await db.collection("rental_orders").findOne({ _id: intent.finalOrderId }, { projection: { stringingApplicationId: 1, isStringServiceApplied: 1 } });
    if (!rental) throw new AppsPaymentFinalizationError(500, "PAYMENT_FINALIZATION_STATE_INCONSISTENT", "확정 대여 주문을 찾을 수 없습니다.");
    return {
      success: true, attemptId: intent.attemptId, state: "finalized" as const, rentalId: String(intent.finalOrderId),
      ...(rental.isStringServiceApplied && rental.stringingApplicationId ? { stringingApplicationId: String(rental.stringingApplicationId) } : {}),
    };
  }
  const order = await db.collection("orders").findOne({ _id: intent.finalOrderId }, { projection: { stringingApplicationId: 1 } });
  if (!order?.stringingApplicationId) throw new AppsPaymentFinalizationError(500, "PAYMENT_FINALIZATION_STATE_INCONSISTENT", "확정 주문을 찾을 수 없습니다.");
  return { success: true, attemptId: intent.attemptId, state: "finalized" as const, orderId: String(intent.finalOrderId), stringingApplicationId: String(order.stringingApplicationId) };
}

export async function finalizeAppsInTossPayment(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }) {
  let initial = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
  if (!initial || !owns(initial, params.userId, params.identityId)) throw new AppsPaymentFinalizationError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
  if (initial.state === "finalized") return idempotentResult(params.db, initial);
  if (initial.state !== "paid") throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_UNAVAILABLE", "현재 결제 상태에서는 주문을 확정할 수 없습니다.");
  if (initial.isTestPayment) throw new AppsPaymentFinalizationError(409, "TEST_PAYMENT_FINALIZATION_FORBIDDEN", "테스트 결제는 주문으로 확정할 수 없습니다.");
  if (initial.finalization?.failureCode) throw new AppsPaymentFinalizationError(409, "PAYMENT_FINALIZATION_FAILED_REFUND_REQUIRED", "주문 확정 실패로 환불 처리가 필요합니다.");
  if (getAppsInTossPaymentPurpose(initial) === "racket_purchase") return finalizeRacketPurchase(params, initial);
  if (getAppsInTossPaymentPurpose(initial) === "racket_rental") return finalizeRacketRental(params, initial);
  const orderId = new ObjectId(); const applicationId = new ObjectId();
  const client = await clientPromise; const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const intent = await appsInTossPaymentIntents(params.db).findOne({ _id: initial!._id }, { session });
      if (!intent || !owns(intent, params.userId, params.identityId)) throw new AppsPaymentFinalizationError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
      if (intent.state !== "paid" || intent.finalization?.failureCode) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
      const { checkout, pricing, item, pkg: packageSnapshot, cm } = validateSnapshot(intent);
      const product = await params.db.collection("products").findOne({ _id: item.productId, isDeleted: { $ne: true } }, { projection: { _id: 1 }, session });
      if (!product) fail("PRODUCT_UNAVAILABLE", "결제한 상품을 제공할 수 없습니다.");
      if (cm === "visit") {
        try { await guardVisitReservation({ db: params.db, date: intent.reservationSnapshot!.preferredDate!, time: intent.reservationSnapshot!.preferredTime!, slotCount: intent.reservationSnapshot!.slotCount!, session }); }
        catch (error) {
          const code = classifyVisitBusinessError(error);
          if (code) fail(code, "선택한 방문 시간을 예약할 수 없습니다.");
          throw error;
        }
      }
      const quantity = item.quantity;
      const stock = await params.db.collection("products").updateOne({ _id: item.productId, isDeleted: { $ne: true }, "inventory.stock": { $gte: quantity }, variantInventories: { $elemMatch: { colorValue: item.selectedColor, gaugeValue: item.selectedGauge, isSoldOut: { $ne: true }, stock: { $gte: quantity } } }, colorInventories: { $elemMatch: { value: item.selectedColor, stock: { $gte: quantity } } }, gaugeInventories: { $elemMatch: { value: item.selectedGauge, stock: { $gte: quantity } } } }, { $inc: { "variantInventories.$[variant].stock": -quantity, "colorInventories.$[color].stock": -quantity, "gaugeInventories.$[gauge].stock": -quantity, "inventory.stock": -quantity, sold: quantity } }, { arrayFilters: [{ "variant.colorValue": item.selectedColor, "variant.gaugeValue": item.selectedGauge }, { "color.value": item.selectedColor }, { "gauge.value": item.selectedGauge }], session });
      if (!stock.matchedCount || !stock.modifiedCount) fail("VARIANT_INSUFFICIENT_STOCK", "선택한 상품 옵션의 재고가 부족합니다.");
      if (packageSnapshot.applied) {
        try { await consumePass(params.db, packageSnapshot.passId!, applicationId, packageSnapshot.requiredPassCount, { session }); }
        catch (error) {
          const code = classifyPassBusinessError(error);
          if (code) fail(code, "결제에 적용한 패스를 사용할 수 없습니다.");
          throw error;
        }
      }
      const now = new Date(); const serviceBefore = Number(pricing.serviceFeeBeforePackage);
      const orderItem = { productId: item.productId, kind: "product", name: item.name, quantity, price: item.price, mountingFee: item.mountingFee, selectedColor: item.selectedColor, selectedGauge: item.selectedGauge, stockDeduction: { mode: "variant", colorValue: item.selectedColor, gaugeValue: item.selectedGauge } };
      const shippingInfo = { name: checkout.applicant.name, phone: checkout.applicant.phone, email: checkout.applicant.email, address: cm === "visit" ? "" : checkout.shipping.address, addressDetail: cm === "visit" ? "" : checkout.shipping.addressDetail, postalCode: cm === "visit" ? "" : checkout.shipping.postalCode, collectionMethod: cm, deliveryMethod: cm === "visit" ? "방문수령" : "택배수령", withStringService: true };
      await params.db.collection("orders").insertOne({ _id: orderId, items: [orderItem], shippingInfo, userId: intent.userId, userSnapshot: { name: checkout.applicant.name, email: checkout.applicant.email }, originalTotalPrice: pricing.payableAmount, pointsUsed: 0, totalPrice: pricing.payableAmount, shippingFee: pricing.shippingFee, serviceFee: pricing.serviceFee, status: "대기중", paymentStatus: "결제완료", paymentInfo: { provider: "apps_in_toss_toss_pay", method: "EASY_PAY", easyPayProvider: "TOSSPAY", status: "paid", total: pricing.payableAmount, originalTotal: pricing.payableAmount, pointsUsed: 0, shippingFee: pricing.shippingFee, serviceFee: pricing.serviceFee, approvedAt: intent.paidAt ?? now }, isStringServiceApplied: true, stringingApplicationId: String(applicationId), idemKey: `apps-in-toss:${intent.attemptId}`, createdAt: now, updatedAt: now, history: [{ status: "대기중", date: now, description: "주문 생성" }] }, { session });
      const line = { racketType: checkout.work.racketType, stringProductId: String(item.productId), stringName: item.name, tensionMain: checkout.work.tensionMain, tensionCross: checkout.work.tensionCross, note: checkout.work.note, mountingFee: item.mountingFee };
      await params.db.collection("stringing_applications").insertOne({ _id: applicationId, orderId, userId: intent.userId, paymentSource: `order:${String(orderId)}`, name: checkout.applicant.name, phone: checkout.applicant.phone, email: checkout.applicant.email, searchEmailLower: normalizeEmailForSearch(checkout.applicant.email), contactEmail: normalizeEmail(checkout.applicant.email), contactPhone: checkout.applicant.phone.replace(/\D/g, "") || null, shippingInfo, collectionMethod: cm, stringDetails: { racketType: checkout.work.racketType, stringTypes: [String(item.productId)], preferredDate: checkout.work.preferredDate, preferredTime: checkout.work.preferredTime, requirements: checkout.work.note, lines: [line] }, stringItems: [{ productId: String(item.productId), name: item.name, quantity, mountingFee: item.mountingFee }], totalPrice: pricing.serviceFee, serviceFeeBefore: serviceBefore, serviceFee: pricing.serviceFee, serviceAmount: pricing.serviceFee, packageApplied: packageSnapshot.applied, packagePassId: packageSnapshot.applied ? packageSnapshot.passId : null, packageRedeemedAt: packageSnapshot.applied ? now : null, ...(packageSnapshot.applied ? { paymentMethod: "package", paymentStatus: "패키지 적용 완료", paymentInfo: { provider: "package", method: "패키지 사용", status: "패키지 적용 완료" } } : {}), status: "검토 중", submittedAt: now, createdAt: now, updatedAt: now, userSnapshot: { name: checkout.applicant.name, email: checkout.applicant.email }, servicePaid: false, ...(cm === "visit" ? { visitSlotCount: intent.reservationSnapshot!.slotCount, visitDurationMinutes: intent.reservationSnapshot!.durationMinutes } : {}), meta: { selectedGauge: item.selectedGauge, selectedColor: item.selectedColor, stockDeductionSource: "order" } }, { session });
      const finalized = await recordAppsInTossPaymentFinalized(params.db, intent._id, orderId, session);
      if (!finalized) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
    });
  } catch (error) {
    const current = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
    if (current?.state === "finalized" && owns(current, params.userId, params.identityId)) return idempotentResult(params.db, current);
    if (error instanceof AppsPaymentFinalizationError && error.business) await appsInTossPaymentIntents(params.db).updateOne({ _id: initial._id, state: "paid", "finalization.failureCode": { $exists: false } }, { $set: { finalization: { failureCode: error.code.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100), failedAt: new Date() }, updatedAt: new Date() } });
    throw error;
  } finally { await session.endSession(); }
  await sendAdminOperationalAlert({ kind: "order_created", title: "🛒 신규 주문", summary: "Apps in Toss 토스페이 결제 주문이 생성되었습니다.", href: `/admin/orders/${orderId}`, dedupeKey: `order_created:${orderId}` });
  initial = (await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId))!;
  return idempotentResult(params.db, initial);
}

function validateRentalSnapshot(intent: AppsInTossPaymentIntentDocument) {
  if (getAppsInTossPaymentPurpose(intent) !== "racket_rental") fail("PAYMENT_FINALIZATION_SNAPSHOT_UNAVAILABLE", "대여 snapshot을 사용할 수 없습니다.");
  const snapshot = intent.rentalSnapshot!;
  if (!snapshot) fail("PAYMENT_FINALIZATION_SNAPSHOT_UNAVAILABLE", "대여 snapshot을 사용할 수 없습니다.");
  const checkout = intent.checkoutPayload;
  const pricing = intent.pricingSnapshot;
  if (snapshot.paymentPurpose !== "racket_rental") fail("PAYMENT_FINALIZATION_SNAPSHOT_UNAVAILABLE", "대여 snapshot을 사용할 수 없습니다.");
  if (!RefundAccountSchema.safeParse(snapshot.refundAccount).success) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "환불 계좌 snapshot이 올바르지 않습니다.");
  const rentalItem = intent.itemSnapshot.filter((item) => item.kind === "rental_racket");
  const stringItems = intent.itemSnapshot.filter((item) => item.kind === "product");
  const checkoutRental = checkout.items.filter((item) => item.kind === "rental_racket");
  const checkoutStrings = checkout.items.filter((item) => item.kind === "product");
  const expectedItems = snapshot.stringing.requested ? 2 : 1;
  if (intent.itemSnapshot.length !== expectedItems || checkout.items.length !== expectedItems || rentalItem.length !== 1 || checkoutRental.length !== 1 ||
    String(rentalItem[0].productId) !== String(snapshot.racketId) || checkoutRental[0].productId !== String(snapshot.racketId) || rentalItem[0].quantity !== 1 || checkoutRental[0].quantity !== 1 ||
    rentalItem[0].price !== snapshot.rentalFee + snapshot.deposit || !snapshot.displayName || !snapshot.model ||
    checkout.rental?.days !== snapshot.days || JSON.stringify(checkout.rental.refundAccount) !== JSON.stringify(snapshot.refundAccount)) {
    fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "대여 상품 snapshot이 올바르지 않습니다.");
  }
  const numeric = [snapshot.rentalFee, snapshot.deposit, snapshot.pricing.rentalFee, snapshot.pricing.deposit, snapshot.pricing.stringPrice, snapshot.pricing.serviceFee, snapshot.pricing.total, snapshot.payableAmount, pricing.subtotal, pricing.shippingFee, pricing.serviceFee, pricing.pointsUsed, pricing.payableAmount];
  if (!numeric.every((value) => Number.isInteger(value) && value >= 0) || snapshot.payableAmount <= 0 || snapshot.pricing.total !== snapshot.payableAmount ||
    snapshot.pricing.rentalFee !== snapshot.rentalFee || snapshot.pricing.deposit !== snapshot.deposit ||
    snapshot.rentalFee + snapshot.deposit + snapshot.pricing.stringPrice + snapshot.pricing.serviceFee !== snapshot.payableAmount ||
    pricing.subtotal !== snapshot.rentalFee + snapshot.deposit + snapshot.pricing.stringPrice || pricing.shippingFee !== 0 || pricing.serviceFee !== snapshot.pricing.serviceFee || pricing.serviceFeeBeforePackage !== snapshot.pricing.serviceFee || pricing.pointsUsed !== 0 || pricing.payableAmount !== snapshot.payableAmount ||
    intent.packageSnapshot?.applied === true || ![7, 15, 30].includes(snapshot.days)) {
    fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "대여 가격 snapshot이 올바르지 않습니다.");
  }
  if (JSON.stringify(snapshot.applicant) !== JSON.stringify(checkout.applicant) || snapshot.collectionMethod !== checkout.collectionMethod || JSON.stringify(snapshot.shipping) !== JSON.stringify({ ...checkout.shipping, deliveryRequest: checkout.shipping.deliveryRequest ?? "" })) {
    fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "대여 신청자 snapshot이 올바르지 않습니다.");
  }
  if (!snapshot.stringing.requested) {
    if (stringItems.length || checkoutStrings.length || checkout.withStringService || intent.reservationSnapshot || JSON.stringify(checkout.rental?.stringing) !== JSON.stringify({ requested: false })) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "스트링 미신청 snapshot이 올바르지 않습니다.");
    return { snapshot, checkout, stringing: null };
  }
  const stringing = snapshot.stringing;
  const item = stringItems[0]; const checkoutItem = checkoutStrings[0];
  if (stringItems.length !== 1 || checkoutStrings.length !== 1 || !item || !checkoutItem || item.quantity !== 1 || checkoutItem.quantity !== 1 ||
    String(item.productId) !== String(stringing.stringProductId) || checkoutItem.productId !== String(stringing.stringProductId) ||
    item.selectedColor !== stringing.selectedColor || item.selectedGauge !== stringing.selectedGauge || checkoutItem.selectedColor !== stringing.selectedColor || checkoutItem.selectedGauge !== stringing.selectedGauge ||
    !stringing.name || !stringing.selectedColor || !stringing.selectedGauge || item.name !== stringing.name || item.price !== stringing.price || item.mountingFee !== stringing.mountingFee || !Number.isInteger(stringing.price) || stringing.price < 0 || !Number.isInteger(stringing.mountingFee) || stringing.mountingFee < 0 ||
    stringing.price !== snapshot.pricing.stringPrice || stringing.mountingFee !== snapshot.pricing.serviceFee || JSON.stringify(checkout.work) !== JSON.stringify(stringing.work)) {
    fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "스트링 snapshot이 올바르지 않습니다.");
  }
  if (JSON.stringify(checkout.rental?.stringing) !== JSON.stringify({ requested: true, stringProductId: String(stringing.stringProductId), selectedColor: stringing.selectedColor, selectedGauge: stringing.selectedGauge })) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "스트링 요청 snapshot이 올바르지 않습니다.");
  if (snapshot.collectionMethod === "visit") {
    const reservation = intent.reservationSnapshot;
    if (!reservation?.preferredDate || !reservation.preferredTime || reservation.slotCount !== 1 || !reservation.durationMinutes || reservation.durationMinutes <= 0 || !Number.isInteger(reservation.capacityAtPrepare) || Number(reservation.capacityAtPrepare) < 1 || reservation.preferredDate !== stringing.work.preferredDate || reservation.preferredTime !== stringing.work.preferredTime) {
      fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "방문 예약 snapshot이 올바르지 않습니다.");
    }
  } else if (intent.reservationSnapshot) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "방문 예약 snapshot이 올바르지 않습니다.");
  return { snapshot, checkout, stringing };
}

function classifyRentalBusinessError(error: unknown) {
  const code = errorCode(error);
  if (code === "VISIT_SLOT_UNAVAILABLE") return "VISIT_SLOT_UNAVAILABLE";
  if (["라켓 없음", "대여 불가 상태(재고 없음)", "대여 불가 상태(재고 변경)"].includes(code)) return "RACKET_RENTAL_UNAVAILABLE";
  if (["STRING_NOT_FOUND", "VARIANT_SELECTION_REQUIRED", "VARIANT_NOT_FOUND", "VARIANT_SOLD_OUT", "VARIANT_INSUFFICIENT_STOCK", "VARIANT_STOCK_UPDATE_FAILED", "GAUGE_OR_COLOR_STOCK_UPDATE_FAILED", "STRING_STOCK_UPDATE_FAILED"].includes(code)) return code;
  if (code === "INVALID_REFUND_ACCOUNT") return "PAYMENT_FINALIZATION_SNAPSHOT_INVALID";
  return null;
}

async function finalizeRacketRental(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }, initial: AppsInTossPaymentIntentDocument) {
  await ensureRentalOrdersIdemIndex(params.db);
  const rentalId = new ObjectId();
  const applicationId = new ObjectId();
  const client = await clientPromise; const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const intent = await appsInTossPaymentIntents(params.db).findOne({ _id: initial._id }, { session });
      if (!intent || !owns(intent, params.userId, params.identityId)) throw new AppsPaymentFinalizationError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
      if (intent.state !== "paid" || intent.finalization?.failureCode) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
      const { snapshot, checkout, stringing } = validateRentalSnapshot(intent);
      const racket = await params.db.collection("used_rackets").findOne({ _id: snapshot.racketId, ...racketVisibilityFilterFor({ isAdmin: false }), "rental.enabled": true }, { projection: { _id: 1 }, session });
      if (!racket) fail("RACKET_RENTAL_UNAVAILABLE", "결제한 라켓을 대여할 수 없습니다.");
      let currentStringProduct: any = null;
      if (stringing) {
        currentStringProduct = await params.db.collection("products").findOne({ _id: stringing.stringProductId, ...publicProductFilter, isSoldOut: { $ne: true } }, { projection: { name: 1, inventory: 1, variantInventories: 1, colorInventories: 1, gaugeInventories: 1 }, session });
        if (!currentStringProduct) fail("PRODUCT_UNAVAILABLE", "결제한 스트링을 제공할 수 없습니다.");
      }
      const now = new Date();
      const shipping = { name: snapshot.applicant.name, phone: snapshot.applicant.phone, email: snapshot.applicant.email, postalCode: snapshot.collectionMethod === "visit" ? "" : snapshot.shipping.postalCode, address: snapshot.collectionMethod === "visit" ? "" : snapshot.shipping.address, addressDetail: snapshot.collectionMethod === "visit" ? "" : snapshot.shipping.addressDetail, deliveryRequest: snapshot.shipping.deliveryRequest, shippingMethod: snapshot.collectionMethod === "visit" ? "pickup" : "delivery" };
      const rentalDocument = {
        racketId: snapshot.racketId, brand: snapshot.brand, model: snapshot.model, days: snapshot.days,
        amount: { deposit: snapshot.deposit, fee: snapshot.rentalFee, stringPrice: snapshot.pricing.stringPrice, stringingFee: snapshot.pricing.serviceFee, total: snapshot.payableAmount },
        originalTotal: snapshot.payableAmount, pointsUsed: 0, servicePickupMethod: snapshot.collectionMethod === "visit" ? "SHOP_VISIT" : "SELF_SEND",
        status: "paid", paidAt: intent.paidAt ?? now, userId: intent.userId, shipping, refundAccount: snapshot.refundAccount,
        ...(stringing ? { stringing: { requested: true, stringId: stringing.stringProductId, name: stringing.name, price: stringing.price, mountingFee: stringing.mountingFee, selectedColor: stringing.selectedColor, selectedGauge: stringing.selectedGauge, requestedAt: now } } : {}),
        isStringServiceApplied: false,
        payment: { method: "apps_in_toss_toss_pay" }, paymentStatus: "결제완료",
        paymentInfo: { provider: "apps_in_toss_toss_pay", method: "EASY_PAY", easyPayProvider: "TOSSPAY", status: "paid", originalTotal: snapshot.payableAmount, pointsUsed: 0, deposit: snapshot.deposit, rentalFee: snapshot.rentalFee, stringPrice: snapshot.pricing.stringPrice, serviceFee: snapshot.pricing.serviceFee, total: snapshot.payableAmount, approvedAt: intent.paidAt ?? now },
        createdAt: now, updatedAt: now,
      };
      try {
        await createRentalOrderInTransaction({
          db: params.db, session, rentalId, racketId: snapshot.racketId, rentalDocument,
          idemKey: `apps-in-toss:rental:${intent.attemptId}`, reservePaidRental: true, visibilityViewer: { isAdmin: false },
          beforeInsert: stringing ? async () => {
            if (snapshot.collectionMethod === "visit") {
              try { await guardVisitReservation({ db: params.db, date: stringing.work.preferredDate, time: stringing.work.preferredTime, slotCount: intent.reservationSnapshot!.slotCount!, session }); }
              catch (error) {
                const code = classifyVisitBusinessError(error);
                if (code) fail(code, "선택한 방문 시간을 예약할 수 없습니다.");
                throw error;
              }
            }
            await applyRentalVariantInventoryDeduction({ db: params.db, session, productId: stringing.stringProductId, selectedColor: stringing.selectedColor, selectedGauge: stringing.selectedGauge, quantity: 1, productName: stringing.name, product: currentStringProduct, visibilityViewer: { isAdmin: false } });
          } : undefined,
          afterInsert: stringing ? async (insertedRentalId) => {
            const application = buildAppsRentalStringingApplication({ applicationId, rentalId: insertedRentalId, userId: intent.userId, snapshot, reservationSnapshot: intent.reservationSnapshot, now });
            await params.db.collection("stringing_applications").insertOne(application!, { session });
            const stringingApplicationId = String(applicationId);
            await params.db.collection("rental_orders").updateOne({ _id: insertedRentalId }, { $set: { stringingApplicationId, isStringServiceApplied: true, updatedAt: now } }, { session });
            return { stringingApplicationId, stringingSubmitted: true };
          } : undefined,
        });
      } catch (error) {
        const code = classifyRentalBusinessError(error);
        if (code) fail(code, "대여 주문을 확정할 수 없습니다.");
        throw error;
      }
      const finalized = await recordAppsInTossPaymentFinalized(params.db, intent._id, rentalId, session);
      if (!finalized) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
    });
  } catch (error) {
    const current = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId);
    if (current?.state === "finalized" && owns(current, params.userId, params.identityId)) return idempotentResult(params.db, current);
    if (error instanceof AppsPaymentFinalizationError && error.business) await appsInTossPaymentIntents(params.db).updateOne({ _id: initial._id, state: "paid", "finalization.failureCode": { $exists: false } }, { $set: { finalization: { failureCode: error.code.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100), failedAt: new Date() }, updatedAt: new Date() } });
    throw error;
  } finally { await session.endSession(); }
  await sendAdminOperationalAlert({ kind: "rental_order_created", title: "🎾 신규 라켓 대여 주문", summary: "Apps in Toss 라켓 대여 주문이 생성되었습니다.", href: `/admin/rentals/${rentalId}`, dedupeKey: `rental_order_created:${rentalId}` });
  return idempotentResult(params.db, (await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId))!);
}

async function finalizeRacketPurchase(params: { db: Db; attemptId: string; userId: ObjectId; identityId: ObjectId }, initial: AppsInTossPaymentIntentDocument) {
  const orderId = new ObjectId(); const applicationId = new ObjectId();
  const client = await clientPromise; const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const intent = await appsInTossPaymentIntents(params.db).findOne({ _id: initial._id }, { session });
      if (!intent || !owns(intent, params.userId, params.identityId)) throw new AppsPaymentFinalizationError(404, "PAYMENT_INTENT_NOT_FOUND", "결제 시도를 찾을 수 없습니다.");
      if (intent.state !== "paid" || intent.finalization?.failureCode) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
      const checkout = intent.checkoutPayload; const pricing = intent.pricingSnapshot; const pkg = intent.packageSnapshot;
      const racketItem = intent.itemSnapshot.find((item) => item.kind === "racket");
      const stringItem = intent.itemSnapshot.find((item) => item.kind === "product");
      const checkoutRacket = checkout.items.find((item) => item.kind === "racket");
      const checkoutString = checkout.items.find((item) => item.kind === "product");
      if (getAppsInTossPaymentPurpose(intent) !== "racket_purchase" || !pkg || intent.itemSnapshot.length !== 2 || checkout.items.length !== 2 ||
        intent.itemSnapshot.filter((item) => item.kind === "racket").length !== 1 || intent.itemSnapshot.filter((item) => item.kind === "product").length !== 1 ||
        checkout.items.filter((item) => item.kind === "racket").length !== 1 || checkout.items.filter((item) => item.kind === "product").length !== 1 ||
        !racketItem || !stringItem || !checkoutRacket || !checkoutString ||
        racketItem.quantity < 1 || racketItem.quantity !== stringItem.quantity || racketItem.quantity !== checkoutRacket.quantity || stringItem.quantity !== checkoutString.quantity ||
        !stringItem.selectedColor || !stringItem.selectedGauge || stringItem.selectedColor !== checkoutString.selectedColor || stringItem.selectedGauge !== checkoutString.selectedGauge ||
        String(racketItem.productId) !== checkoutRacket.productId || String(stringItem.productId) !== checkoutString.productId ||
        ![racketItem.price, stringItem.price, stringItem.mountingFee, pricing.subtotal, pricing.shippingFee, pricing.serviceFee, pricing.serviceFeeBeforePackage, pricing.payableAmount].every((value) => Number.isFinite(value)) ||
        racketItem.price < 0 || stringItem.price < 0 || Number(stringItem.mountingFee) < 0 || pricing.subtotal < 0 || pricing.shippingFee < 0 || pricing.serviceFee < 0 ||
        Number(pricing.serviceFeeBeforePackage) < pricing.serviceFee || pricing.payableAmount <= 0 || pricing.pointsUsed !== 0 ||
        (pkg.applied ? (!pkg.passId || pkg.requiredPassCount <= 0 || pricing.serviceFee !== 0) : Boolean(pkg.passId))) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "결제 snapshot이 올바르지 않습니다.");
      const safeRacketItem = racketItem!; const safeStringItem = stringItem!; const safePkg = pkg!;
      const cm = normalizeCollection(checkout.collectionMethod); const quantity = safeRacketItem.quantity;
      if (cm === "visit") {
        const reservation = intent.reservationSnapshot;
        if (!reservation?.preferredDate || !reservation.preferredTime || !reservation.slotCount || reservation.slotCount < 1 || !reservation.durationMinutes || reservation.durationMinutes <= 0 || checkout.work.preferredDate !== reservation.preferredDate || checkout.work.preferredTime !== reservation.preferredTime || reservation.slotCount !== safePkg.requiredPassCount) fail("PAYMENT_FINALIZATION_SNAPSHOT_INVALID", "방문 예약 snapshot이 올바르지 않습니다.");
        const date = reservation!.preferredDate!; const time = reservation!.preferredTime!; const slotCount = reservation!.slotCount!;
        try { await guardVisitReservation({ db: params.db, date, time, slotCount, session }); } catch (error) { if (classifyVisitBusinessError(error)) fail("VISIT_SLOT_UNAVAILABLE", "선택한 방문 시간을 예약할 수 없습니다."); throw error; }
      }
      const publicRacketFilter = racketVisibilityFilterFor({ isAdmin: false });
      const racket = await params.db.collection("used_rackets").findOne({ _id: safeRacketItem.productId, ...publicRacketFilter }, { session });
      if (!racket) fail("RACKET_UNAVAILABLE", "결제한 라켓을 제공할 수 없습니다.");
      const safeRacket = racket!;
      const activeRentalCount = await params.db.collection("rental_orders").countDocuments({ racketId: safeRacketItem.productId, status: { $in: ["paid", "out"] } }, { session });
      const hasStockQty = typeof safeRacket.quantity === "number" && Number.isFinite(safeRacket.quantity);
      const baseQty = hasStockQty ? Math.max(0, Math.trunc(safeRacket.quantity)) : safeRacket.status === "available" ? 1 : 0;
      if (Math.max(0, baseQty - activeRentalCount) < quantity) fail(activeRentalCount > 0 ? "RACKET_RENTAL_RESERVED" : "RACKET_INSUFFICIENT_STOCK", "라켓 재고가 부족합니다.");
      if (hasStockQty) {
        const updated = await params.db.collection("used_rackets").findOneAndUpdate({ _id: safeRacketItem.productId, ...publicRacketFilter, quantity: { $gte: activeRentalCount + quantity } }, [{ $set: { quantity: { $subtract: ["$quantity", quantity] }, updatedAt: new Date().toISOString() } }, { $set: { status: { $cond: [{ $lte: ["$quantity", 0] }, "sold", "available"] } } }] as any, { returnDocument: "after", session });
        if (!updated) fail("RACKET_INSUFFICIENT_STOCK", "라켓 재고가 부족합니다.");
      } else {
        const updated = await params.db.collection("used_rackets").updateOne({ _id: safeRacketItem.productId, ...publicRacketFilter, status: "available" }, { $set: { status: "sold", updatedAt: new Date().toISOString() } }, { session });
        if (!updated.modifiedCount) fail("RACKET_INSUFFICIENT_STOCK", "라켓 재고가 부족합니다.");
      }
      const stock = await params.db.collection("products").updateOne({ _id: safeStringItem.productId, ...publicProductFilter, "inventory.stock": { $gte: quantity }, variantInventories: { $elemMatch: { colorValue: safeStringItem.selectedColor, gaugeValue: safeStringItem.selectedGauge, isSoldOut: { $ne: true }, stock: { $gte: quantity } } }, colorInventories: { $elemMatch: { value: safeStringItem.selectedColor, isSoldOut: { $ne: true }, stock: { $gte: quantity } } }, gaugeInventories: { $elemMatch: { value: safeStringItem.selectedGauge, isSoldOut: { $ne: true }, stock: { $gte: quantity } } } }, { $inc: { "variantInventories.$[variant].stock": -quantity, "colorInventories.$[color].stock": -quantity, "gaugeInventories.$[gauge].stock": -quantity, "inventory.stock": -quantity, sold: quantity } }, { arrayFilters: [{ "variant.colorValue": safeStringItem.selectedColor, "variant.gaugeValue": safeStringItem.selectedGauge }, { "color.value": safeStringItem.selectedColor }, { "gauge.value": safeStringItem.selectedGauge }], session });
      if (!stock.modifiedCount) fail("VARIANT_INSUFFICIENT_STOCK", "선택한 상품 옵션의 재고가 부족합니다.");
      if (safePkg.applied) { try { await consumePass(params.db, safePkg.passId!, applicationId, safePkg.requiredPassCount, { session }); } catch (error) { if (classifyPassBusinessError(error)) fail("PACKAGE_PASS_UNAVAILABLE", "결제에 적용한 패스를 사용할 수 없습니다."); throw error; } }
      const now = new Date(); const shippingInfo = { name: checkout.applicant.name, phone: checkout.applicant.phone, email: checkout.applicant.email, address: cm === "visit" ? "" : checkout.shipping.address, addressDetail: cm === "visit" ? "" : checkout.shipping.addressDetail, postalCode: cm === "visit" ? "" : checkout.shipping.postalCode, collectionMethod: cm, deliveryMethod: cm === "visit" ? "방문수령" : "택배수령", withStringService: true };
      const orderItems = [{ productId: safeRacketItem.productId, kind: "racket", name: safeRacketItem.name, quantity, price: safeRacketItem.price }, { productId: safeStringItem.productId, kind: "product", name: safeStringItem.name, quantity, price: safeStringItem.price, mountingFee: safeStringItem.mountingFee, selectedColor: safeStringItem.selectedColor, selectedGauge: safeStringItem.selectedGauge, stockDeduction: { mode: "variant", colorValue: safeStringItem.selectedColor, gaugeValue: safeStringItem.selectedGauge } }];
      await params.db.collection("orders").insertOne({ _id: orderId, items: orderItems, shippingInfo, userId: intent.userId, userSnapshot: { name: checkout.applicant.name, email: checkout.applicant.email }, originalTotalPrice: pricing.payableAmount, pointsUsed: 0, totalPrice: pricing.payableAmount, shippingFee: pricing.shippingFee, serviceFee: pricing.serviceFee, status: "대기중", paymentStatus: "결제완료", paymentInfo: { provider: "apps_in_toss_toss_pay", method: "EASY_PAY", easyPayProvider: "TOSSPAY", status: "paid", total: pricing.payableAmount, originalTotal: pricing.payableAmount, pointsUsed: 0, shippingFee: pricing.shippingFee, serviceFee: pricing.serviceFee, approvedAt: intent.paidAt ?? now }, isStringServiceApplied: true, stringingApplicationId: String(applicationId), idemKey: `apps-in-toss:${intent.attemptId}`, createdAt: now, updatedAt: now, history: [{ status: "대기중", date: now, description: "주문 생성" }] }, { session });
      const line = { racketType: safeRacketItem.name, stringProductId: String(safeStringItem.productId), stringName: safeStringItem.name, tensionMain: checkout.work.tensionMain, tensionCross: checkout.work.tensionCross, note: checkout.work.note, mountingFee: safeStringItem.mountingFee };
      await params.db.collection("stringing_applications").insertOne({ _id: applicationId, orderId, userId: intent.userId, paymentSource: `order:${orderId}`, name: checkout.applicant.name, phone: checkout.applicant.phone, email: checkout.applicant.email, searchEmailLower: normalizeEmailForSearch(checkout.applicant.email), contactEmail: normalizeEmail(checkout.applicant.email), contactPhone: checkout.applicant.phone.replace(/\D/g, "") || null, shippingInfo, collectionMethod: cm, stringDetails: { racketType: safeRacketItem.name, stringTypes: [String(safeStringItem.productId)], preferredDate: checkout.work.preferredDate, preferredTime: checkout.work.preferredTime, requirements: checkout.work.note, lines: Array.from({ length: quantity }, () => line) }, stringItems: [{ productId: String(safeStringItem.productId), name: safeStringItem.name, quantity, mountingFee: safeStringItem.mountingFee }], totalPrice: pricing.serviceFee, serviceFeeBefore: pricing.serviceFeeBeforePackage, serviceFee: pricing.serviceFee, serviceAmount: pricing.serviceFee, packageApplied: safePkg.applied, packagePassId: safePkg.applied ? safePkg.passId : null, packageRedeemedAt: safePkg.applied ? now : null, ...(safePkg.applied ? { paymentMethod: "package", paymentStatus: "패키지 적용 완료", paymentInfo: { provider: "package", method: "패키지 사용", status: "패키지 적용 완료" } } : {}), status: "검토 중", submittedAt: now, createdAt: now, updatedAt: now, userSnapshot: { name: checkout.applicant.name, email: checkout.applicant.email }, servicePaid: false, ...(cm === "visit" ? { visitSlotCount: intent.reservationSnapshot!.slotCount, visitDurationMinutes: intent.reservationSnapshot!.durationMinutes } : {}), meta: { racketId: String(safeRacketItem.productId), selectedGauge: safeStringItem.selectedGauge, selectedColor: safeStringItem.selectedColor, stockDeductionSource: "order" } }, { session });
      const finalized = await recordAppsInTossPaymentFinalized(params.db, intent._id, orderId, session); if (!finalized) throw new AppsPaymentFinalizationError(409, "PAYMENT_STATE_CHANGED", "결제 상태가 변경되었습니다.");
    });
  } catch (error) {
    const current = await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId); if (current?.state === "finalized" && owns(current, params.userId, params.identityId)) return idempotentResult(params.db, current);
    if (error instanceof AppsPaymentFinalizationError && error.business) await appsInTossPaymentIntents(params.db).updateOne({ _id: initial._id, state: "paid", "finalization.failureCode": { $exists: false } }, { $set: { finalization: { failureCode: error.code, failedAt: new Date() }, updatedAt: new Date() } }); throw error;
  } finally { await session.endSession(); }
  await sendAdminOperationalAlert({ kind: "order_created", title: "🛒 신규 주문", summary: "Apps in Toss 라켓 구매 주문이 생성되었습니다.", href: `/admin/orders/${orderId}`, dedupeKey: `order_created:${orderId}` });
  return idempotentResult(params.db, (await findAppsInTossPaymentIntentByAttemptId(params.db, params.attemptId))!);
}
