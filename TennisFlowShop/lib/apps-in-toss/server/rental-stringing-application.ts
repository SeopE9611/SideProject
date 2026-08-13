import type { ObjectId } from "mongodb";

import { normalizeEmail } from "../../claims";
import { normalizeEmailForSearch } from "../../search-email";
import type { AppsInTossPaymentIntentDocument, AppsRentalSnapshot } from "./payment-intents";

export function buildAppsRentalStringingApplication(params: {
  applicationId: ObjectId;
  rentalId: ObjectId;
  userId: ObjectId;
  snapshot: AppsRentalSnapshot;
  reservationSnapshot?: AppsInTossPaymentIntentDocument["reservationSnapshot"];
  now: Date;
}) {
  const { applicationId, rentalId, userId, snapshot, reservationSnapshot, now } = params;
  if (!snapshot.stringing.requested) return null;

  const stringing = snapshot.stringing;
  const collectionMethod = snapshot.collectionMethod;
  const shippingInfo = {
    name: snapshot.applicant.name,
    phone: snapshot.applicant.phone,
    email: snapshot.applicant.email,
    postalCode: collectionMethod === "visit" ? "" : snapshot.shipping.postalCode,
    address: collectionMethod === "visit" ? "" : snapshot.shipping.address,
    addressDetail: collectionMethod === "visit" ? "" : snapshot.shipping.addressDetail,
    deliveryRequest: snapshot.shipping.deliveryRequest,
    shippingMethod: collectionMethod === "visit" ? "pickup" : "delivery",
    collectionMethod,
  };
  const line = {
    racketType: snapshot.displayName,
    stringProductId: String(stringing.stringProductId),
    stringName: stringing.name,
    tensionMain: stringing.work.tensionMain,
    tensionCross: stringing.work.tensionCross,
    note: stringing.work.note,
    mountingFee: stringing.mountingFee,
  };
  const serviceFee = snapshot.pricing.serviceFee;

  return {
    _id: applicationId,
    rentalId,
    paymentSource: `rental:${String(rentalId)}`,
    userId,
    name: snapshot.applicant.name,
    phone: snapshot.applicant.phone,
    email: snapshot.applicant.email,
    searchEmailLower: normalizeEmailForSearch(snapshot.applicant.email),
    contactEmail: normalizeEmail(snapshot.applicant.email),
    contactPhone: snapshot.applicant.phone.replace(/\D/g, "") || null,
    shippingInfo,
    collectionMethod,
    stringDetails: {
      racketType: snapshot.displayName,
      stringTypes: [String(stringing.stringProductId)],
      customStringName: "",
      preferredDate: stringing.work.preferredDate,
      preferredTime: stringing.work.preferredTime,
      requirements: stringing.work.note,
      lines: [line],
    },
    stringItems: [{ productId: String(stringing.stringProductId), name: stringing.name, quantity: 1, mountingFee: stringing.mountingFee }],
    totalPrice: serviceFee,
    serviceFeeBefore: serviceFee,
    serviceFee,
    serviceAmount: serviceFee,
    packageApplied: false,
    packagePassId: null,
    packageRedeemedAt: null,
    status: "검토 중",
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    userSnapshot: { name: snapshot.applicant.name, email: snapshot.applicant.email },
    servicePaid: false,
    ...(collectionMethod === "visit" ? {
      visitSlotCount: reservationSnapshot!.slotCount,
      visitDurationMinutes: reservationSnapshot!.durationMinutes,
    } : {}),
    meta: {
      selectedColor: stringing.selectedColor,
      selectedGauge: stringing.selectedGauge,
      stockDeductionSource: "rental",
    },
  };
}
