import "server-only";

import { ObjectId, type Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { consumePass } from "@/lib/passes.service";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { guardVisitReservation } from "@/app/features/stringing-applications/lib/visitReservationGuard";
import { normalizeEmail } from "@/lib/claims";
import { normalizeEmailForSearch } from "@/lib/search-email";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import { appsInTossPaymentIntents, findAppsInTossPaymentIntentByAttemptId, recordAppsInTossPaymentFinalized, type AppsInTossPaymentIntentDocument } from "./payment-intents";

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
