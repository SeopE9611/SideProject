import {
  productVisibilityFilterFor,
  racketVisibilityFilterFor,
  type VisibilityViewer,
} from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { ensureStringingTTLIndexes } from "@/app/features/stringing-applications/api/indexes";
import {
  submitStringingApplicationCore,
  type StringingApplicationInput,
} from "@/app/features/stringing-applications/api/submit-core";
import {
  hasEnoughStringingApplicationInputForOrder,
  STRINGING_APPLICATION_REQUIRED_MESSAGE,
} from "@/lib/checkout-stringing-guard";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import {
  buildRentalAmountSummary,
  buildRentalRacketName,
  compactId,
  formatRentalPeriod,
  formatRentalPickupLabel,
  formatWon,
  maskPhone,
  previewText,
  truthyField,
} from "@/lib/admin-alerts/formatters";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { RefundAccountSchema, type RefundAccountInfo } from "@/lib/cancel-request/refund-account";
import { deductPoints, getPointsSummary } from "@/lib/points.service";
import type { MongoClient, Db } from "mongodb";
import { ObjectId } from "mongodb";

const POINT_UNIT = 100;
const PAYMENT_BANKS = new Set(["kakao"] as const);

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

async function applyRentalVariantInventoryDeduction(params: {
  db: Db;
  session: any;
  productId: ObjectId;
  selectedColor?: string;
  selectedGauge?: string;
  quantity: number;
  productName: string;
  product: any;
  visibilityViewer: VisibilityViewer;
}) {
  const { db, session, productId, selectedColor, selectedGauge, quantity, product, visibilityViewer } =
    params;
  const variantInventories = Array.isArray(product?.variantInventories)
    ? product.variantInventories
    : [];
  if (variantInventories.length <= 0) return { status: "not_managed" as const };
  if (!selectedColor || !selectedGauge) throw new Error("VARIANT_SELECTION_REQUIRED");

  const variantRow = variantInventories.find(
    (row: any) =>
      String(row?.colorValue ?? "").trim() === selectedColor &&
      String(row?.gaugeValue ?? "").trim() === selectedGauge,
  );
  if (!variantRow) throw new Error("VARIANT_NOT_FOUND");
  if (variantRow?.isSoldOut === true) throw new Error("VARIANT_SOLD_OUT");
  const variantStock = Number(variantRow?.stock ?? 0);
  if (!Number.isFinite(variantStock) || variantStock < quantity) {
    throw new Error("VARIANT_INSUFFICIENT_STOCK");
  }

  const stockUpdateResult = await db.collection("products").updateOne(
    {
      _id: productId,
      ...productVisibilityFilterFor(visibilityViewer),
      "inventory.stock": { $gte: quantity },
      variantInventories: {
        $elemMatch: {
          colorValue: selectedColor,
          gaugeValue: selectedGauge,
          isSoldOut: { $ne: true },
          stock: { $gte: quantity },
        },
      },
    },
    {
      $inc: {
        "variantInventories.$[variant].stock": -quantity,
        "colorInventories.$[color].stock": -quantity,
        "gaugeInventories.$[gauge].stock": -quantity,
        "inventory.stock": -quantity,
        sold: quantity,
      },
    },
    {
      session,
      arrayFilters: [
        {
          "variant.colorValue": selectedColor,
          "variant.gaugeValue": selectedGauge,
        },
        { "color.value": selectedColor },
        { "gauge.value": selectedGauge },
      ],
    },
  );
  if (stockUpdateResult.modifiedCount !== 1) {
    throw new Error("VARIANT_STOCK_UPDATE_FAILED");
  }
  return { status: "deducted" as const };
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
  refundAccount: RefundAccountInfo;
  stringing?: {
    requested?: boolean;
    stringId?: string;
    selectedGauge?: string;
    selectedColor?: string;
    selectedColorLabel?: string;
    selectedColorHex?: string;
    selectedColorImage?: string;
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
  visibilityViewer?: VisibilityViewer;
}) {
  const {
    db,
    client,
    userObjectId,
    payload,
    idemKey,
    initialStatus = "pending",
    paidMetadata,
    visibilityViewer: providedVisibilityViewer,
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

  const visibilityViewer = providedVisibilityViewer ?? (await getVisibilityViewerFromCookies());

  if (
    payment?.method === "bank_transfer" &&
    payment?.bank &&
    !PAYMENT_BANKS.has(payment.bank as any)
  ) {
    throw new Error("INVALID_BANK");
  }

  const parsedRefundAccount = RefundAccountSchema.safeParse(refundAccount);
  if (!parsedRefundAccount.success) {
    throw new Error("INVALID_REFUND_ACCOUNT");
  }
  const normalizedRefundAccount = parsedRefundAccount.data;

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

  const toTrimmedString = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
  const toDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, "");

  const normalizedShipping = {
    ...shipping,
    postalCode: pickupMethod === "SHOP_VISIT" ? "" : toDigits(shipping?.postalCode ?? ""),
    address: pickupMethod === "SHOP_VISIT" ? "" : toTrimmedString(shipping?.address),
    addressDetail: pickupMethod === "SHOP_VISIT" ? "" : toTrimmedString(shipping?.addressDetail),
    deliveryRequest: toTrimmedString(shipping?.deliveryRequest),
    shippingMethod: pickupMethod === "SHOP_VISIT" ? ("pickup" as const) : ("delivery" as const),
  };

  const requestedPointsRaw = Number(pointsToUse ?? 0);
  const requestedPoints = Number.isFinite(requestedPointsRaw)
    ? Math.max(0, Math.floor(requestedPointsRaw))
    : 0;
  const normalizedRequestedPointsToUse = Math.floor(requestedPoints / POINT_UNIT) * POINT_UNIT;

  if (!userObjectId && normalizedRequestedPointsToUse > 0) {
    throw new Error("LOGIN_REQUIRED_FOR_POINTS");
  }

  const racketObjectId = new ObjectId(racketId);
  const racket = await db.collection("used_rackets").findOne(
    {
      _id: racketObjectId,
      ...racketVisibilityFilterFor(visibilityViewer),
    },
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
    selectedGauge?: string;
    selectedColor?: string;
    selectedColorLabel?: string;
    selectedColorHex?: string;
    selectedColorImage?: string;
    stockDeduction?: {
      mode: "variant";
      colorValue: string;
      gaugeValue: string;
    };
    requestedAt: Date;
  } = null;
  let stringingHasManagedColorInventories = false;

  const requested = !!stringing?.requested;
  if (requested) {
    const sid = stringing?.stringId;
    const selectedGauge =
      typeof stringing?.selectedGauge === "string" && stringing.selectedGauge.trim()
        ? stringing.selectedGauge.trim()
        : undefined;
    const selectedColor =
      typeof stringing?.selectedColor === "string" && stringing.selectedColor.trim()
        ? stringing.selectedColor.trim()
        : undefined;
    const selectedColorLabel =
      typeof stringing?.selectedColorLabel === "string" && stringing.selectedColorLabel.trim()
        ? stringing.selectedColorLabel.trim()
        : undefined;
    const selectedColorHex =
      typeof stringing?.selectedColorHex === "string" && stringing.selectedColorHex.trim()
        ? stringing.selectedColorHex.trim()
        : undefined;
    const selectedColorImage =
      typeof stringing?.selectedColorImage === "string" && stringing.selectedColorImage.trim()
        ? stringing.selectedColorImage.trim()
        : undefined;
    if (!sid || !ObjectId.isValid(sid)) throw new Error("BAD_STRING_ID");

    const stringQuantity = 1;
    const stringObjectId = new ObjectId(sid);
    const s = await db.collection("products").findOne(
      {
        _id: stringObjectId,
        ...productVisibilityFilterFor(visibilityViewer),
      },
      {
        projection: {
          name: 1,
          price: 1,
          inventory: 1,
          mountingFee: 1,
          images: 1,
          gaugeOptions: 1,
          gaugeInventories: 1,
          color: 1,
          colorOptions: 1,
          colorInventories: 1,
          variantInventories: 1,
        },
      },
    );
    if (!s) throw new Error("STRING_NOT_FOUND");

    const gaugeOptions = Array.isArray((s as any).gaugeOptions) ? (s as any).gaugeOptions : [];
    const gaugeInventories = Array.isArray((s as any).gaugeInventories)
      ? (s as any).gaugeInventories
      : [];
    const hasGaugeSelection = gaugeOptions.length > 0 || gaugeInventories.length > 0;

    const colorInventories = Array.isArray((s as any).colorInventories)
      ? (s as any).colorInventories
      : [];
    const hasManagedColorInventories = colorInventories.length > 0;
    const hasVariantInventories =
      Array.isArray((s as any).variantInventories) && (s as any).variantInventories.length > 0;
    stringingHasManagedColorInventories = hasManagedColorInventories;

    if (selectedColor && hasManagedColorInventories) {
      const selectedColorInventory = colorInventories.find(
        (row: any) => String(row?.value ?? "").trim() === selectedColor,
      );
      if (!selectedColorInventory) throw new Error("COLOR_NOT_FOUND");
      if (selectedColorInventory?.isSoldOut === true) throw new Error("COLOR_SOLD_OUT");
      const currentColorStock = Number(selectedColorInventory?.stock ?? 0);
      if (!Number.isFinite(currentColorStock) || currentColorStock < stringQuantity) {
        throw new Error("COLOR_INSUFFICIENT_STOCK");
      }
    }
    if (hasGaugeSelection && !selectedGauge) {
      throw new Error("GAUGE_REQUIRED");
    }

    if (selectedGauge) {
      if (gaugeInventories.length <= 0) {
        throw new Error("GAUGE_NOT_FOUND");
      }
      const selectedGaugeInventory = gaugeInventories.find(
        (row: any) => String(row?.value ?? "").trim() === selectedGauge,
      );
      if (!selectedGaugeInventory) {
        throw new Error("GAUGE_NOT_FOUND");
      }
      if (selectedGaugeInventory?.isSoldOut === true) {
        throw new Error("GAUGE_SOLD_OUT");
      }
      const currentGaugeStock = Number(selectedGaugeInventory?.stock ?? 0);
      if (!Number.isFinite(currentGaugeStock) || currentGaugeStock < stringQuantity) {
        throw new Error("GAUGE_INSUFFICIENT_STOCK");
      }
    }

    const firstImg =
      Array.isArray((s as any).images) && (s as any).images[0]
        ? String((s as any).images[0])
        : null;

    stringingSnap = {
      requested: true,
      stringId: (s as any)._id,
      name: String((s as any).name ?? ""),
      price: getEffectiveProductPrice(s),
      mountingFee: Number((s as any).mountingFee ?? 0),
      image: firstImg,
      ...(selectedGauge ? { selectedGauge } : {}),
      ...(selectedColor ? { selectedColor } : {}),
      ...(selectedColorLabel ? { selectedColorLabel } : {}),
      ...(selectedColorHex ? { selectedColorHex } : {}),
      ...(selectedColorImage ? { selectedColorImage } : {}),
      ...(hasVariantInventories && selectedColor && selectedGauge
        ? {
            stockDeduction: {
              mode: "variant" as const,
              colorValue: selectedColor,
              gaugeValue: selectedGauge,
            },
          }
        : {}),
      requestedAt: new Date(),
    };
  }

  const activeCount = await db.collection("rental_orders").countDocuments({
    racketId: racketObjectId,
    status: { $in: ["paid", "out"] },
  });

  const rawQtyField = (racket as any).quantity;
  const hasStockQty = typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
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
  // TODO: 라켓 대여료 할인은 구매 salePrice와 별도 정책으로 설계 필요. 예: rental.saleFee.d7/d15/d30 또는 rental.discount.enabled/rate.
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
    refundAccount: normalizedRefundAccount,
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
          if (stringingSnap.selectedGauge || stringingSnap.selectedColor) {
            const stringQuantity = 1;
            const product = await db.collection("products").findOne(
              { _id: stringingSnap.stringId },
              {
                projection: {
                  name: 1,
                  gaugeInventories: 1,
                  colorInventories: 1,
                  variantInventories: 1,
                },
              },
            );
            if (!product) throw new Error("STRING_NOT_FOUND");
            const hasVariantInventories =
              Array.isArray((product as any).variantInventories) &&
              (product as any).variantInventories.length > 0;

            if (hasVariantInventories) {
              await applyRentalVariantInventoryDeduction({
                db,
                session,
                productId: stringingSnap.stringId,
                selectedColor: stringingSnap.selectedColor,
                selectedGauge: stringingSnap.selectedGauge,
                quantity: stringQuantity,
                productName: stringingSnap.name,
                product,
                visibilityViewer,
              });
            } else if (stringingSnap.selectedGauge && stringingSnap.selectedColor) {
              if (stringingHasManagedColorInventories) {
                const stockUpdateResult = await db.collection("products").updateOne(
                  {
                    _id: stringingSnap.stringId,
                    ...productVisibilityFilterFor(visibilityViewer),
                    "inventory.stock": { $gte: stringQuantity },
                    gaugeInventories: {
                      $elemMatch: {
                        value: stringingSnap.selectedGauge,
                        isSoldOut: { $ne: true },
                        stock: { $gte: stringQuantity },
                      },
                    },
                    colorInventories: {
                      $elemMatch: {
                        value: stringingSnap.selectedColor,
                        isSoldOut: { $ne: true },
                        stock: { $gte: stringQuantity },
                      },
                    },
                  },
                  {
                    $inc: {
                      "gaugeInventories.$[g].stock": -stringQuantity,
                      "colorInventories.$[c].stock": -stringQuantity,
                      "inventory.stock": -stringQuantity,
                      sold: stringQuantity,
                    },
                  },
                  {
                    session,
                    arrayFilters: [
                      { "g.value": stringingSnap.selectedGauge },
                      { "c.value": stringingSnap.selectedColor },
                    ],
                  },
                );
                if (stockUpdateResult.modifiedCount !== 1) {
                  throw new Error("GAUGE_OR_COLOR_STOCK_UPDATE_FAILED");
                }
              } else {
                const stockUpdateResult = await db.collection("products").updateOne(
                  {
                    _id: stringingSnap.stringId,
                    ...productVisibilityFilterFor(visibilityViewer),
                    "inventory.stock": { $gte: stringQuantity },
                    gaugeInventories: {
                      $elemMatch: {
                        value: stringingSnap.selectedGauge,
                        isSoldOut: { $ne: true },
                        stock: { $gte: stringQuantity },
                      },
                    },
                  },
                  {
                    $inc: {
                      "gaugeInventories.$.stock": -stringQuantity,
                      "inventory.stock": -stringQuantity,
                      sold: stringQuantity,
                    },
                  },
                  { session },
                );
                if (stockUpdateResult.modifiedCount !== 1)
                  throw new Error("GAUGE_STOCK_UPDATE_FAILED");
              }
            } else if (stringingSnap.selectedGauge) {
              const stockUpdateResult = await db.collection("products").updateOne(
                {
                  _id: stringingSnap.stringId,
                  ...productVisibilityFilterFor(visibilityViewer),
                  "inventory.stock": { $gte: stringQuantity },
                  gaugeInventories: {
                    $elemMatch: {
                      value: stringingSnap.selectedGauge,
                      isSoldOut: { $ne: true },
                      stock: { $gte: stringQuantity },
                    },
                  },
                },
                {
                  $inc: {
                    "gaugeInventories.$.stock": -stringQuantity,
                    "inventory.stock": -stringQuantity,
                    sold: stringQuantity,
                  },
                },
                { session },
              );
              if (stockUpdateResult.modifiedCount !== 1)
                throw new Error("GAUGE_STOCK_UPDATE_FAILED");
            } else if (stringingSnap.selectedColor) {
              if (stringingHasManagedColorInventories) {
                const stockUpdateResult = await db.collection("products").updateOne(
                  {
                    _id: stringingSnap.stringId,
                    ...productVisibilityFilterFor(visibilityViewer),
                    "inventory.stock": { $gte: stringQuantity },
                    colorInventories: {
                      $elemMatch: {
                        value: stringingSnap.selectedColor,
                        isSoldOut: { $ne: true },
                        stock: { $gte: stringQuantity },
                      },
                    },
                  },
                  {
                    $inc: {
                      "colorInventories.$.stock": -stringQuantity,
                      "inventory.stock": -stringQuantity,
                      sold: stringQuantity,
                    },
                  },
                  { session },
                );
                if (stockUpdateResult.modifiedCount !== 1)
                  throw new Error("COLOR_STOCK_UPDATE_FAILED");
              } else {
                const stockUpdateResult = await db.collection("products").updateOne(
                  {
                    _id: stringingSnap.stringId,
                    ...productVisibilityFilterFor(visibilityViewer),
                    "inventory.stock": { $gte: stringQuantity },
                  },
                  {
                    $inc: {
                      "inventory.stock": -stringQuantity,
                      sold: stringQuantity,
                    },
                  },
                  { session },
                );
                if (stockUpdateResult.modifiedCount !== 1)
                  throw new Error("STRING_STOCK_UPDATE_FAILED");
              }
            }
          }

          const normalizedInput = stringingApplicationInput as
            | StringingApplicationInput
            | undefined;

          if (!hasEnoughStringingApplicationInputForOrder(normalizedInput)) {
            throw Object.assign(new Error(STRINGING_APPLICATION_REQUIRED_MESSAGE), { status: 400 });
          }

          const submitResult = await submitStringingApplicationCore({
            db,
            userId: userObjectId,
            session,
            input: {
              ...normalizedInput,
              rentalId: rentalIdStr,
              selectedGauge: stringingSnap.selectedGauge,
            },
          });
          stringingApplicationId = String(submitResult.applicationId);
          stringingSubmitted = submitResult.stringingSubmitted;

          if (stringingSubmitted && stringingApplicationId) {
            await db.collection("rental_orders").updateOne(
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
          const rack = await db.collection("used_rackets").findOne(
            {
              _id: racketObjectId,
              ...racketVisibilityFilterFor(visibilityViewer),
            },
            { projection: { quantity: 1 } },
          );
          const qty = Number((rack as any)?.quantity ?? 1);
          if (qty <= 1) {
            await db.collection("used_rackets").updateOne(
              {
                _id: racketObjectId,
                ...racketVisibilityFilterFor(visibilityViewer),
              },
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
    const rentalId = String(insertedId);
    const alertDoc = ((await rentalOrders.findOne({ _id: insertedId })) as any) ?? {
      ...doc,
      _id: insertedId,
      stringingApplicationId,
      isStringServiceApplied: stringingSubmitted,
    };
    await sendAdminOperationalAlert({
      kind: "rental_order_created",
      title: "🎾 신규 라켓 대여 주문",
      summary: "신규 라켓 대여 주문이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/rentals/${rentalId}`,
      dedupeKey: `rental_order_created:${rentalId}`,
      fields: [
        { name: "대여번호", value: compactId(rentalId) },
        truthyField("고객명", alertDoc?.shipping?.name || alertDoc?.userSnapshot?.name),
        truthyField("연락처", maskPhone(alertDoc?.shipping?.phone)),
        truthyField("라켓", buildRentalRacketName(alertDoc)),
        truthyField("대여 기간", formatRentalPeriod(alertDoc?.days)),
        { name: "금액", value: formatWon(alertDoc?.amount?.total) },
        truthyField(
          "금액 상세",
          buildRentalAmountSummary(alertDoc?.amount, alertDoc?.originalTotal, alertDoc?.pointsUsed),
        ),
        { name: "결제상태", value: String(alertDoc?.paymentStatus ?? alertDoc?.status ?? "확인 필요") },
        truthyField("결제수단", alertDoc?.payment?.method),
        truthyField(
          "수령/배송 방식",
          formatRentalPickupLabel(alertDoc?.shipping?.shippingMethod || alertDoc?.servicePickupMethod),
        ),
        truthyField("배송/방문 메모", previewText(alertDoc?.shipping?.deliveryRequest, 80)),
        {
          name: "교체서비스",
          value: alertDoc?.stringing?.requested || alertDoc?.isStringServiceApplied ? "포함" : "미포함",
        },
        truthyField("교체서비스 신청서", compactId(alertDoc?.stringingApplicationId)),
      ].filter(Boolean) as Array<{ name: string; value: string }>,
    });
    return {
      id: rentalId,
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
