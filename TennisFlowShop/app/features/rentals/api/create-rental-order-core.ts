import { createStringingApplicationFromRental } from "@/app/features/stringing-applications/api/create-from-rental";
import { ensureStringingTTLIndexes } from "@/app/features/stringing-applications/api/indexes";
import {
  submitStringingApplicationCore,
  type StringingApplicationInput,
} from "@/app/features/stringing-applications/api/submit-core";
import { deductPoints, getPointsSummary } from "@/lib/points.service";
import type { MongoClient, Db } from "mongodb";
import { ObjectId } from "mongodb";

const POINT_UNIT = 100;
const ALLOWED_BANKS = new Set(["shinhan", "kookmin", "woori"] as const);

const rentalOrdersIdemIndexGlobal = globalThis as typeof globalThis & {
  __tf_rental_orders_idem_index_promise__?: Promise<string>;
};

async function ensureRentalOrdersIdemIndex(db: Db) {
  if (!rentalOrdersIdemIndexGlobal.__tf_rental_orders_idem_index_promise__) {
    rentalOrdersIdemIndexGlobal.__tf_rental_orders_idem_index_promise__ = db
      .collection("rental_orders")
      .createIndex({ idemKey: 1 }, { unique: true, sparse: true });
  }
  await rentalOrdersIdemIndexGlobal.__tf_rental_orders_idem_index_promise__;
}

export type RentalCreatePayload = {
  racketId: string;
  days: 7 | 15 | 30;
  pointsToUse?: number;
  servicePickupMethod?: "SELF_SEND" | "SHOP_VISIT" | "delivery" | "pickup";
  payment?: {
    method?: "bank_transfer" | "nicepay";
    bank?: string;
    depositor?: string;
  } | null;
  shipping?: {
    name?: string;
    phone?: string;
    postalCode?: string;
    address?: string;
    addressDetail?: string;
    deliveryRequest?: string;
    shippingMethod?: "pickup" | "delivery";
  } | null;
  refundAccount: {
    bank: "shinhan" | "kookmin" | "woori";
    account: string;
    holder: string;
  };
  stringing?: {
    requested?: boolean;
    stringId?: string;
  };
  stringingApplicationInput?: unknown;
};

export type RentalPaidMetadata = {
  paidAt: Date;
  paymentStatus?: string;
  paymentInfo?: Record<string, unknown>;
};

export async function createRentalOrderCore(params: {
  db: Db;
  client: MongoClient;
  userObjectId: ObjectId | null;
  payload: RentalCreatePayload;
  idemKey?: string;
  initialStatus?: "pending" | "paid";
  paidMetadata?: RentalPaidMetadata;
}) {
  const {
    db,
    client,
    userObjectId,
    payload,
    idemKey,
    initialStatus = "pending",
    paidMetadata,
  } = params;
  const rentalOrders = db.collection("rental_orders");

  await ensureRentalOrdersIdemIndex(db);
  await ensureStringingTTLIndexes(db);

  if (idemKey) {
    const existing = await rentalOrders.findOne({ idemKey });
    if (existing) {
      const existingStringingApplicationId =
        (existing as any)?.stringingApplicationId &&
        String((existing as any).stringingApplicationId).trim()
          ? String((existing as any).stringingApplicationId)
          : null;
      return {
        id: String(existing._id),
        stringingApplicationId: (existing as any)?.isStringServiceApplied
          ? existingStringingApplicationId
          : null,
        stringingSubmitted: Boolean((existing as any)?.isStringServiceApplied),
      };
    }
  }

  const {
    racketId,
    days,
    payment,
    shipping,
    refundAccount,
    stringing,
    pointsToUse,
    servicePickupMethod,
    stringingApplicationInput,
  } = payload;

  if (!ObjectId.isValid(racketId)) throw new Error("BAD_RACKET_ID");
  if (![7, 15, 30].includes(days)) throw new Error("허용되지 않는 대여 기간");

  if (
    payment?.method === "bank_transfer" &&
    payment?.bank &&
    !ALLOWED_BANKS.has(payment.bank as any)
  ) {
    throw new Error("INVALID_BANK");
  }

  const rawPickup = servicePickupMethod ?? null;
  let pickupMethod: "SELF_SEND" | "SHOP_VISIT";
  if (!rawPickup) {
    pickupMethod = shipping?.shippingMethod === "pickup" ? "SHOP_VISIT" : "SELF_SEND";
  } else if (rawPickup === "SHOP_VISIT" || rawPickup === "SELF_SEND") {
    pickupMethod = rawPickup;
  } else if (rawPickup === "pickup") {
    pickupMethod = "SHOP_VISIT";
  } else if (rawPickup === "delivery") {
    pickupMethod = "SELF_SEND";
  } else {
    throw new Error("INVALID_PICKUP_METHOD");
  }

  const toTrimmedString = (v: unknown) =>
    v === null || v === undefined ? "" : String(v).trim();
  const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, "");

  const normalizedShipping = {
    ...shipping,
    postalCode:
      pickupMethod === "SHOP_VISIT" ? "" : toDigits(shipping?.postalCode ?? ""),
    address:
      pickupMethod === "SHOP_VISIT" ? "" : toTrimmedString(shipping?.address),
    addressDetail:
      pickupMethod === "SHOP_VISIT"
        ? ""
        : toTrimmedString(shipping?.addressDetail),
    deliveryRequest: toTrimmedString(shipping?.deliveryRequest),
    shippingMethod:
      pickupMethod === "SHOP_VISIT"
        ? ("pickup" as const)
        : ("delivery" as const),
  };

  const requestedPointsRaw = Number(pointsToUse ?? 0);
  const requestedPoints = Number.isFinite(requestedPointsRaw)
    ? Math.max(0, Math.floor(requestedPointsRaw))
    : 0;
  const normalizedRequestedPointsToUse =
    Math.floor(requestedPoints / POINT_UNIT) * POINT_UNIT;

  if (!userObjectId && normalizedRequestedPointsToUse > 0) {
    throw new Error("LOGIN_REQUIRED_FOR_POINTS");
  }

  const racketObjectId = new ObjectId(racketId);
  const racket = await db
    .collection("used_rackets")
    .findOne(
      { _id: racketObjectId },
      { projection: { brand: 1, model: 1, quantity: 1, status: 1, rental: 1 } },
    );
  if (!racket) throw new Error("라켓 없음");

  let stringingSnap: null | {
    requested: true;
    stringId: ObjectId;
    name: string;
    price: number;
    mountingFee: number;
    image: string | null;
    requestedAt: Date;
  } = null;

  const requested = !!stringing?.requested;
  if (requested) {
    const sid = stringing?.stringId;
    if (!sid || !ObjectId.isValid(sid)) throw new Error("BAD_STRING_ID");

    const s = await db
      .collection("products")
      .findOne(
        { _id: new ObjectId(sid) },
        { projection: { name: 1, price: 1, mountingFee: 1, images: 1 } },
      );
    if (!s) throw new Error("STRING_NOT_FOUND");

    const firstImg =
      Array.isArray((s as any).images) && (s as any).images[0]
        ? String((s as any).images[0])
        : null;

    stringingSnap = {
      requested: true,
      stringId: (s as any)._id,
      name: String((s as any).name ?? ""),
      price: Number((s as any).price ?? 0),
      mountingFee: Number((s as any).mountingFee ?? 0),
      image: firstImg,
      requestedAt: new Date(),
    };
  }

  const activeCount = await db.collection("rental_orders").countDocuments({
    racketId: racketObjectId,
    status: { $in: ["paid", "out"] },
  });

  const rawQtyField = (racket as any).quantity;
  const hasStockQty =
    typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
  const baseQty = hasStockQty
    ? Math.max(0, Math.trunc(rawQtyField))
    : racket.status === "available"
      ? 1
      : 0;
  const available = Math.max(0, baseQty - activeCount);
  if (available <= 0) throw new Error("대여 불가 상태(재고 없음)");

  const feeMap = {
    7: racket.rental?.fee?.d7 ?? 0,
    15: racket.rental?.fee?.d15 ?? 0,
    30: racket.rental?.fee?.d30 ?? 0,
  } as const;
  const fee = feeMap[days] ?? 0;
  const deposit = Number(racket.rental?.deposit ?? 0);
  const stringPrice = requested ? Number(stringingSnap?.price ?? 0) : 0;
  const stringingFee = requested ? Number(stringingSnap?.mountingFee ?? 0) : 0;

  const amount = {
    deposit,
    fee,
    stringPrice,
    stringingFee,
    total: deposit + fee + stringPrice + stringingFee,
  };

  const originalTotal = Number(amount.total ?? 0);
  const maxPointsByPolicy = Math.max(0, originalTotal - deposit);

  let pointsUsed = 0;
  if (userObjectId && normalizedRequestedPointsToUse > 0) {
    const summary = await getPointsSummary(db, userObjectId);
    if (summary.debt > 0) throw new Error("POINTS_DEBT_EXISTS");
    const maxSpendable = Math.min(summary.available, maxPointsByPolicy);
    pointsUsed = Math.min(normalizedRequestedPointsToUse, maxSpendable);
  }

  const payableTotal = Math.max(0, originalTotal - pointsUsed);
  const finalAmount = { ...amount, total: payableTotal };

  const now = new Date();
  const doc: Record<string, unknown> = {
    racketId: racket._id,
    brand: racket.brand,
    model: racket.model,
    days,
    amount: finalAmount,
    originalTotal,
    pointsUsed,
    servicePickupMethod: pickupMethod,
    status: initialStatus,
    createdAt: now,
    updatedAt: now,
    userId: userObjectId,
    payment: payment ?? null,
    shipping: normalizedShipping ?? null,
    refundAccount: refundAccount ?? null,
    ...(stringingSnap ? { stringing: stringingSnap } : {}),
  };

  if (initialStatus === "paid") {
    doc.paidAt = paidMetadata?.paidAt ?? now;
    if (paidMetadata?.paymentStatus) doc.paymentStatus = paidMetadata.paymentStatus;
    if (paidMetadata?.paymentInfo) doc.paymentInfo = paidMetadata.paymentInfo;
  }

  const session = client.startSession();
  try {
    let insertedId: ObjectId | null = null;
    let stringingApplicationId: string | null = null;
    let stringingSubmitted = false;

    const hasEnoughStringingInputForSubmitCore = (
      input: unknown,
    ): input is StringingApplicationInput => {
      if (!input || typeof input !== "object") return false;
      const candidate = input as StringingApplicationInput;
      return (
        Boolean(candidate.name?.trim()) &&
        Boolean(candidate.phone?.trim()) &&
        Array.isArray(candidate.stringTypes) &&
        candidate.stringTypes.length > 0
      );
    };

    const isTransientTxnError = (e: any) => {
      const labels = Array.isArray(e?.errorLabels) ? e.errorLabels : [];
      return labels.includes("TransientTransactionError") || e?.code === 251;
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await session.startTransaction();
        const res = await rentalOrders.insertOne(
          {
            ...doc,
            ...(idemKey ? { idemKey } : {}),
          },
          { session },
        );
        insertedId = res.insertedId;
        const rentalIdStr = String(res.insertedId);

        if (stringingSnap?.requested) {
          const normalizedInput = stringingApplicationInput as
            | StringingApplicationInput
            | undefined;

          if (hasEnoughStringingInputForSubmitCore(normalizedInput)) {
            const submitResult = await submitStringingApplicationCore({
              db,
              userId: userObjectId,
              session,
              input: {
                ...normalizedInput,
                rentalId: rentalIdStr,
              },
            });
            stringingApplicationId = String(submitResult.applicationId);
            stringingSubmitted = submitResult.stringingSubmitted;
          } else {
            await createStringingApplicationFromRental(
              {
                _id: res.insertedId,
                userId: userObjectId ?? undefined,
                createdAt: now,
                servicePickupMethod: pickupMethod,
                shipping: normalizedShipping ?? undefined,
                stringing: stringingSnap ?? undefined,
                serviceFeeHint: (doc as any)?.amount?.stringingFee ?? 0,
              },
              { db, session },
            );
            stringingApplicationId = null;
            stringingSubmitted = false;
          }

          if (stringingSubmitted && stringingApplicationId) {
            await db
              .collection("rental_orders")
              .updateOne(
                { _id: res.insertedId },
                {
                  $set: {
                    stringingApplicationId,
                    isStringServiceApplied: true,
                    updatedAt: new Date(),
                  },
                },
                { session },
              );
          }
        }

        if (pointsUsed > 0 && userObjectId) {
          await deductPoints(
            db,
            {
              userId: userObjectId,
              amount: pointsUsed,
              type: "spend_on_order",
              refKey: `rental:${rentalIdStr}:spend`,
              reason: `라켓 대여 결제 포인트 사용 (대여ID: ${rentalIdStr})`,
            },
            { session },
          );
        }

        if (initialStatus === "paid") {
          const rack = await db
            .collection("used_rackets")
            .findOne({ _id: racketObjectId }, { projection: { quantity: 1 } });
          const qty = Number((rack as any)?.quantity ?? 1);
          if (qty <= 1) {
            await db
              .collection("used_rackets")
              .updateOne(
                { _id: racketObjectId },
                { $set: { status: "rented", updatedAt: new Date() } },
                { session },
              );
          }
        }

        await session.commitTransaction();
        break;
      } catch (e: any) {
        await session.abortTransaction().catch(() => {});
        if (attempt < 3 && isTransientTxnError(e)) {
          await new Promise((r) => setTimeout(r, 50 * attempt));
          continue;
        }
        throw e;
      }
    }

    if (!insertedId) throw new Error("RENTAL_INSERT_FAILED");
    return {
      id: String(insertedId),
      stringingApplicationId,
      stringingSubmitted,
    };
  } catch (e: any) {
    if (e?.code === 11000 && idemKey) {
      const existing = await rentalOrders.findOne({ idemKey });
      if (existing) {
        const existingStringingApplicationId =
          (existing as any)?.stringingApplicationId &&
          String((existing as any).stringingApplicationId).trim()
            ? String((existing as any).stringingApplicationId)
            : null;
        return {
          id: String(existing._id),
          stringingApplicationId: (existing as any)?.isStringServiceApplied
            ? existingStringingApplicationId
            : null,
          stringingSubmitted: Boolean((existing as any)?.isStringServiceApplied),
        };
      }
    }
    throw e;
  } finally {
    await session.endSession();
  }
}
