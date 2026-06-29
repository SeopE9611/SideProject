import type { ClientSession, Db, ObjectId } from "mongodb";
import { ObjectId as MongoObjectId } from "mongodb";

import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import {
  applyPackageToServiceFee,
  resolvePackageUsage,
  resolveRequiredPassCountFromInput,
} from "@/app/features/stringing-applications/lib/package-pricing";
import {
  loadStringingSettings,
  resolveDaySchedule,
} from "@/app/features/stringing-applications/lib/slotEngine";
import { normalizeEmail } from "@/lib/claims";
import { calcStringingMountingFeeByProductId, calcStringingTotal } from "@/lib/pricing";
import { consumePass, findOneActivePassForUser } from "@/lib/passes.service";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { normalizeEmailForSearch } from "@/lib/search-email";

export type StringingApplicationInput = {
  applicationId?: string;
  orderId?: string;
  rentalId?: string;
  name: string;
  phone: string;
  email?: string;
  shippingInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    depositor?: string;
    bank?: string;
    deliveryRequest?: string;
    collectionMethod?: string;
  };
  racketType?: string;
  stringTypes: string[];
  customStringName?: string;
  preferredDate?: string;
  preferredTime?: string;
  requirements?: string;
  packageOptOut?: boolean;
  paymentMethod?: "bank_transfer" | "nicepay";
  selectedGauge?: string;
  selectedColor?: string;
  selectedColorLabel?: string;
  selectedColorHex?: string;
  selectedColorImage?: string;
  lines?: Array<{
    racketType?: string;
    stringProductId?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    note?: string;
    mountingFee?: number;
  }>;
};

type SubmitCoreParams = {
  db: Db;
  input: StringingApplicationInput;
  userId: ObjectId | null;
  guestOrderId?: string | null;
  guestRentalId?: string | null;
  session?: ClientSession;
};

export type SubmitCoreResult = {
  applicationId: ObjectId;
  orderObjectId: ObjectId | null;
  rentalObjectId: ObjectId | null;
  stringingSubmitted: true;
};

function toObjectIdOrThrow(id: unknown, fieldName: string): ObjectId | null {
  if (typeof id !== "string" || !id.trim()) return null;
  if (!MongoObjectId.isValid(id)) {
    throw Object.assign(new Error(`유효하지 않은 ${fieldName}입니다.`), {
      status: 400,
    });
  }
  return new MongoObjectId(id);
}

function isSameObjectId(a: unknown, b: ObjectId): boolean {
  return !!a && MongoObjectId.isValid(String(a)) && String(a) === String(b);
}

async function applyStringingVariantInventoryDeduction(params: {
  db: Db;
  productId: ObjectId;
  product: any;
  selectedColor?: string;
  selectedGauge?: string;
  quantity: number;
  session?: ClientSession;
}) {
  const { db, productId, product, selectedColor, selectedGauge, quantity, session } = params;
  const variantInventories = Array.isArray(product?.variantInventories)
    ? product.variantInventories
    : [];
  if (variantInventories.length === 0) {
    return { status: "not_managed" as const };
  }

  if (!selectedColor || !selectedGauge) {
    throw Object.assign(new Error("색상과 게이지(굵기)를 모두 선택해주세요."), {
      status: 400,
      code: "VARIANT_SELECTION_REQUIRED",
    });
  }

  const variantRow = variantInventories.find(
    (row: any) =>
      String(row?.colorValue ?? "").trim() === selectedColor &&
      String(row?.gaugeValue ?? "").trim() === selectedGauge,
  );
  if (!variantRow) {
    throw Object.assign(new Error("선택한 옵션 조합 정보를 찾을 수 없습니다."), {
      status: 400,
      code: "VARIANT_NOT_FOUND",
    });
  }
  if (variantRow?.isSoldOut === true) {
    throw Object.assign(new Error("선택한 옵션 조합은 현재 품절입니다."), {
      status: 409,
      code: "VARIANT_SOLD_OUT",
    });
  }
  if (Number(variantRow?.stock ?? 0) < quantity) {
    throw Object.assign(new Error("선택한 옵션 조합의 재고가 부족합니다."), {
      status: 409,
      code: "VARIANT_INSUFFICIENT_STOCK",
    });
  }

  const result = await db.collection("products").updateOne(
    {
      _id: productId,
      ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
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
      arrayFilters: [
        {
          "variant.colorValue": selectedColor,
          "variant.gaugeValue": selectedGauge,
        },
        { "color.value": selectedColor },
        { "gauge.value": selectedGauge },
      ],
      session,
    },
  );

  if (!result.matchedCount || !result.modifiedCount) {
    throw Object.assign(new Error("선택한 옵션 조합의 재고가 부족합니다."), {
      status: 409,
      code: "VARIANT_INSUFFICIENT_STOCK",
    });
  }

  return { status: "deducted" as const };
}

export async function submitStringingApplicationCore({
  db,
  input,
  userId,
  guestOrderId,
  guestRentalId,
  session,
}: SubmitCoreParams): Promise<SubmitCoreResult> {
  const {
    applicationId: bodyAppId,
    orderId,
    rentalId,
    name,
    phone,
    email,
    shippingInfo,
    racketType,
    stringTypes,
    customStringName,
    preferredDate,
    preferredTime,
    requirements,
    packageOptOut,
    paymentMethod,
    selectedGauge,
    selectedColor,
    selectedColorLabel,
    selectedColorHex,
    selectedColorImage,
    lines,
  } = input;

  if (!name || !phone || !Array.isArray(stringTypes) || stringTypes.length === 0) {
    throw Object.assign(new Error("필수 항목 누락"), { status: 400 });
  }

  const cm = normalizeCollection(shippingInfo?.collectionMethod ?? "self_ship");
  const orderObjectId = toObjectIdOrThrow(orderId, "orderId");
  const rentalObjectId = toObjectIdOrThrow(rentalId, "rentalId");

  if (orderObjectId && rentalObjectId) {
    throw Object.assign(new Error("orderId와 rentalId는 동시에 제출할 수 없습니다."), {
      status: 400,
    });
  }

  const bodyApplicationObjectId = toObjectIdOrThrow(bodyAppId, "applicationId");

  if (bodyApplicationObjectId) {
    const existingApp = await db
      .collection("stringing_applications")
      .findOne(
        { _id: bodyApplicationObjectId },
        { projection: { _id: 1, userId: 1, orderId: 1, rentalId: 1 }, session },
      );

    if (!existingApp) {
      throw Object.assign(new Error("수정 권한이 없는 신청서입니다."), {
        status: 403,
      });
    }

    const isMemberOwner = !!userId && isSameObjectId((existingApp as any).userId, userId);
    const isGuestOrderOwner =
      !userId &&
      !!guestOrderId &&
      !!(existingApp as any).orderId &&
      String((existingApp as any).orderId) === String(guestOrderId);
    const isGuestRentalOwner =
      !userId &&
      !!guestRentalId &&
      !!(existingApp as any).rentalId &&
      String((existingApp as any).rentalId) === String(guestRentalId);

    if (!isMemberOwner && !isGuestOrderOwner && !isGuestRentalOwner) {
      throw Object.assign(new Error("수정 권한이 없는 신청서입니다."), {
        status: 403,
      });
    }
  }

  const applicationId: ObjectId = bodyApplicationObjectId ?? new MongoObjectId();

  if (orderObjectId) {
    const order = await db
      .collection("orders")
      .findOne({ _id: orderObjectId }, { projection: { _id: 1, userId: 1, guest: 1 }, session });
    if (!order) {
      throw Object.assign(new Error("접근할 수 없는 주문입니다."), {
        status: 403,
      });
    }

    const isOwner = !!userId && isSameObjectId((order as any).userId, userId);
    const isGuestOrder = !userId && (!(order as any).userId || (order as any).guest === true);
    const guestOwns =
      !!isGuestOrder && !!guestOrderId && String(guestOrderId) === String((order as any)._id);
    if (!isOwner && !guestOwns) {
      throw Object.assign(new Error("접근할 수 없는 주문입니다."), {
        status: 403,
      });
    }
  }

  if (rentalObjectId) {
    const rental = await db
      .collection("rental_orders")
      .findOne({ _id: rentalObjectId }, { projection: { _id: 1, userId: 1 }, session });
    if (!rental) {
      throw Object.assign(new Error("접근할 수 없는 대여입니다."), {
        status: 403,
      });
    }

    const isOwner = !!userId && isSameObjectId((rental as any).userId, userId);
    const guestOwns =
      !userId &&
      !(rental as any).userId &&
      !!guestRentalId &&
      String(guestRentalId) === String((rental as any)._id);
    if (!isOwner && !guestOwns) {
      throw Object.assign(new Error("접근할 수 없는 대여입니다."), {
        status: 403,
      });
    }
  }

  const usingLines = Array.isArray(lines) && lines.length > 0;
  const normalizedLines = usingLines
    ? await Promise.all(
        lines.map(async (line) => {
          const stringProductId = line.stringProductId ?? "custom";
          const serverMountingFee = await calcStringingMountingFeeByProductId(db, stringProductId);
          return {
            racketType: line.racketType ?? "",
            stringProductId,
            stringName:
              line.stringName ??
              (stringProductId === "custom"
                ? (customStringName ?? "커스텀 스트링")
                : "선택한 스트링"),
            tensionMain: line.tensionMain ?? "",
            tensionCross: line.tensionCross ?? "",
            note: line.note ?? "",
            mountingFee: serverMountingFee,
          };
        }),
      )
    : [];

  const normalizedStringItems = usingLines
    ? normalizedLines.map((line) => ({
        productId: line.stringProductId,
        name: line.stringName,
        quantity: 1,
        mountingFee: line.mountingFee,
      }))
    : stringTypes.map((id) => ({
        productId: id,
        name: id === "custom" ? customStringName?.trim() || "커스텀 스트링" : "선택한 스트링",
        quantity: 1,
      }));

  const stringDetails = {
    racketType: racketType ?? "",
    stringTypes,
    customStringName: customStringName ?? "",
    preferredDate: preferredDate ?? "",
    preferredTime: preferredTime ?? "",
    requirements: requirements ?? "",
    lines: normalizedLines,
  };

  const normalizedShippingInfo = {
    ...(shippingInfo ?? {}),
    collectionMethod: cm,
    address: cm === "visit" ? "" : (shippingInfo?.address ?? ""),
    addressDetail: cm === "visit" ? "" : (shippingInfo?.addressDetail ?? ""),
    postalCode: cm === "visit" ? "" : (shippingInfo?.postalCode ?? ""),
  };

  const serviceFeeBeforeRaw = usingLines
    ? normalizedLines.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0)
    : await calcStringingTotal(db, stringTypes);
  const serviceFeeBefore = Math.max(
    0,
    Math.round(Number.isFinite(serviceFeeBeforeRaw) ? serviceFeeBeforeRaw : 0),
  );

  const packageUseCount = resolveRequiredPassCountFromInput({
    lines: normalizedLines,
    stringTypes,
  });

  // 멀티 슬롯 예약 정확도: 방문 예약은 라인 수(패스 사용량)만큼 슬롯 점유 길이가 늘어나므로
  // 신청서 저장 시 슬롯 수/총 소요시간을 함께 기록해 예약 엔진의 점유 계산과 일치시킨다.
  let visitSlotCount: number | null = null;
  let visitDurationMinutes: number | null = null;
  if (cm === "visit") {
    const slotCount = Math.max(1, Math.floor(packageUseCount || 1));
    let intervalMinutes = 30;

    if (preferredDate) {
      const settings = await loadStringingSettings(db);
      const schedule = resolveDaySchedule(settings, preferredDate);
      const resolvedInterval = Number(schedule.interval);
      if (Number.isFinite(resolvedInterval) && resolvedInterval > 0) {
        intervalMinutes = resolvedInterval;
      }
    }

    visitSlotCount = slotCount;
    visitDurationMinutes = slotCount * intervalMinutes;
  }

  let packageApplied = false;
  let packagePassId: ObjectId | null = null;
  let packageRedeemedAt: Date | null = null;

  if (userId) {
    const pass = await findOneActivePassForUser(db, userId);
    const packageUsage = resolvePackageUsage({
      hasPackage: !!pass,
      packageRemaining: Number(pass?.remainingCount ?? 0),
      requiredPassCount: packageUseCount,
      packageOptOut: !!packageOptOut,
    });

    if (pass && packageUsage.usingPackage) {
      await consumePass(db, pass._id, applicationId, packageUseCount, {
        session,
      });
      packageApplied = true;
      packagePassId = pass._id;
      packageRedeemedAt = new Date();
    }
  }

  const totalPriceRaw = applyPackageToServiceFee(serviceFeeBefore, {
    usingPackage: packageApplied,
  });
  const totalPrice = Math.max(0, Math.round(Number.isFinite(totalPriceRaw) ? totalPriceRaw : 0));
  const paymentSource = orderObjectId
    ? `order:${String(orderObjectId)}`
    : rentalObjectId
      ? `rental:${String(rentalObjectId)}`
      : undefined;
  const standalonePaymentMethod =
    !orderObjectId && !rentalObjectId && !packageApplied
      ? paymentMethod === "nicepay"
        ? "nicepay"
        : "bank_transfer"
      : null;
  const standalonePaymentInfo = standalonePaymentMethod
    ? {
        provider: standalonePaymentMethod === "nicepay" ? "nicepay" : "bank",
        method: standalonePaymentMethod === "nicepay" ? "card" : "무통장입금",
        status: "결제대기",
        ...(standalonePaymentMethod === "bank_transfer"
          ? {
              bank: normalizedShippingInfo.bank ?? null,
              depositor: normalizedShippingInfo.depositor ?? null,
            }
          : {}),
      }
    : null;

  const standalonePaymentFields = packageApplied
    ? {
        paymentMethod: "package",
        paymentStatus: "패키지 적용 완료",
        paymentInfo: {
          provider: "package",
          method: "패키지 사용",
          status: "패키지 적용 완료",
        },
      }
    : standalonePaymentInfo
      ? {
          paymentMethod: standalonePaymentMethod,
          paymentStatus: standalonePaymentInfo.status,
          paymentInfo: standalonePaymentInfo,
        }
      : {};

  const normalizedSelectedGauge =
    typeof selectedGauge === "string" && selectedGauge.trim() ? selectedGauge.trim() : undefined;
  const normalizedSelectedColor =
    typeof selectedColor === "string" && selectedColor.trim() ? selectedColor.trim() : undefined;
  const orderForGauge =
    orderObjectId && !rentalObjectId
      ? await db.collection("orders").findOne(
          { _id: orderObjectId },
          {
            projection: {
              items: 1,
            },
            session,
          },
        )
      : null;

  const existingDraft = orderObjectId
    ? await db
        .collection("stringing_applications")
        .findOne(
          { orderId: orderObjectId, status: "draft" },
          { projection: { _id: 1, meta: 1 }, session },
        )
    : null;

  const targetId = existingDraft?._id ?? applicationId;

  const updateDoc: Record<string, unknown> = {
    orderId: orderObjectId,
    rentalId: rentalObjectId,
    paymentSource,
    name,
    phone,
    email: email ?? "",
    searchEmailLower: normalizeEmailForSearch(email),
    contactEmail: normalizeEmail(email),
    contactPhone: phone.replace(/\D/g, "") || null,
    shippingInfo: normalizedShippingInfo,
    collectionMethod: cm,
    stringDetails,
    stringItems: normalizedStringItems,
    totalPrice,
    serviceFeeBefore,
    serviceFee: totalPrice,
    serviceAmount: totalPrice,
    ...standalonePaymentFields,
    packageApplied,
    packagePassId,
    packageRedeemedAt,
    status: "검토 중",
    submittedAt: new Date(),
    userId,
    guestName: userId ? null : name,
    guestEmail: userId ? null : (email ?? ""),
    guestPhone: userId ? null : phone,
    userSnapshot: userId ? { name, email: email ?? "" } : null,
    updatedAt: new Date(),
    ...(cm === "visit" ? { visitSlotCount, visitDurationMinutes } : {}),
  };

  const existingApplication = await db
    .collection("stringing_applications")
    .findOne({ _id: targetId }, { projection: { _id: 1, meta: 1 }, session });

  const alreadyDeductedGaugeStock = Boolean(
    (existingApplication as any)?.meta?.gaugeStockDeductedAt,
  );
  const alreadyDeductedColorStock = Boolean(
    (existingApplication as any)?.meta?.colorStockDeductedAt,
  );

  const selectedProductIdCandidate =
    (Array.isArray(stringTypes) ? stringTypes.find((id) => id && id !== "custom") : undefined) ??
    normalizedStringItems.find((item) => item.productId && item.productId !== "custom")
      ?.productId ??
    normalizedLines.find((line) => line.stringProductId && line.stringProductId !== "custom")
      ?.stringProductId;

  const normalizedStringProductId =
    typeof selectedProductIdCandidate === "string" && selectedProductIdCandidate.trim()
      ? selectedProductIdCandidate.trim()
      : "";

  if (orderObjectId && !rentalObjectId && normalizedStringProductId) {
    const stringProductObjectId = toObjectIdOrThrow(normalizedStringProductId, "stringProductId");

    if (!stringProductObjectId) {
      throw Object.assign(new Error("유효하지 않은 stringProductId입니다."), {
        status: 400,
      });
    }

    const purchasedStringItem = Array.isArray((orderForGauge as any)?.items)
      ? (orderForGauge as any).items.find((item: any) => {
          const kind = item?.kind ?? "product";
          const productId = String(item?.productId ?? "");
          return kind === "product" && productId === String(stringProductObjectId);
        })
      : null;

    const selectedGaugeFromOrderItem =
      typeof purchasedStringItem?.selectedGauge === "string" &&
      purchasedStringItem.selectedGauge.trim()
        ? purchasedStringItem.selectedGauge.trim()
        : undefined;
    const selectedColorFromOrderItem =
      typeof purchasedStringItem?.selectedColor === "string" &&
      purchasedStringItem.selectedColor.trim()
        ? purchasedStringItem.selectedColor.trim()
        : undefined;

    const effectiveSelectedGauge = normalizedSelectedGauge ?? selectedGaugeFromOrderItem;
    const effectiveSelectedColor = normalizedSelectedColor ?? selectedColorFromOrderItem;

    const isStockAlreadyDeductedByOrderItem =
      Boolean(selectedGaugeFromOrderItem) && selectedGaugeFromOrderItem === effectiveSelectedGauge;
    const isColorStockAlreadyDeductedByOrderItem =
      Boolean(selectedColorFromOrderItem) && selectedColorFromOrderItem === effectiveSelectedColor;
    const isVariantStockAlreadyDeductedByOrderItem =
      isStockAlreadyDeductedByOrderItem && isColorStockAlreadyDeductedByOrderItem;

    const stringProduct = await db.collection("products").findOne(
      {
        _id: stringProductObjectId,
        ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
      },
      {
        projection: {
          _id: 1,
          gaugeInventories: 1,
          gaugeOptions: 1,
          color: 1,
          colorOptions: 1,
          colorInventories: 1,
          variantInventories: 1,
        },
        session,
      },
    );

    const hasGaugeInventories =
      Array.isArray((stringProduct as any)?.gaugeInventories) &&
      (stringProduct as any).gaugeInventories.length > 0;
    const hasGaugeOptions =
      Array.isArray((stringProduct as any)?.gaugeOptions) &&
      (stringProduct as any).gaugeOptions.length > 0;
    const isGaugeSelectableProduct = hasGaugeInventories || hasGaugeOptions;

    if (isGaugeSelectableProduct && !effectiveSelectedGauge) {
      throw Object.assign(new Error("게이지(굵기)를 선택해주세요."), {
        status: 400,
        code: "GAUGE_REQUIRED",
      });
    }

    if (effectiveSelectedGauge) {
      updateDoc["meta.selectedGauge"] = effectiveSelectedGauge;
    }
    if (effectiveSelectedColor) {
      updateDoc["meta.selectedColor"] = effectiveSelectedColor;
    }
    if (typeof selectedColorLabel === "string" && selectedColorLabel.trim()) {
      updateDoc["meta.selectedColorLabel"] = selectedColorLabel.trim();
    }
    if (typeof selectedColorHex === "string" && selectedColorHex.trim()) {
      updateDoc["meta.selectedColorHex"] = selectedColorHex.trim();
    }
    if (typeof selectedColorImage === "string" && selectedColorImage.trim()) {
      updateDoc["meta.selectedColorImage"] = selectedColorImage.trim();
    }

    const existingSelectedGauge = (existingApplication as any)?.meta?.selectedGauge;
    if (
      isGaugeSelectableProduct &&
      alreadyDeductedGaugeStock &&
      effectiveSelectedGauge &&
      existingSelectedGauge &&
      existingSelectedGauge !== effectiveSelectedGauge
    ) {
      throw Object.assign(new Error("이미 재고가 차감된 신청서의 게이지(굵기)는 변경할 수 없습니다."), {
        status: 409,
        code: "GAUGE_ALREADY_DEDUCTED",
      });
    }

    const existingSelectedColor = (existingApplication as any)?.meta?.selectedColor;
    if (
      alreadyDeductedColorStock &&
      effectiveSelectedColor &&
      existingSelectedColor &&
      existingSelectedColor !== effectiveSelectedColor
    ) {
      throw Object.assign(new Error("이미 재고가 차감된 신청서의 색상은 변경할 수 없습니다."), {
        status: 409,
        code: "COLOR_ALREADY_DEDUCTED",
      });
    }

    const hasManagedColorInventories =
      Array.isArray((stringProduct as any)?.colorInventories) &&
      (stringProduct as any).colorInventories.length > 0;
    const hasVariantInventories =
      Array.isArray((stringProduct as any)?.variantInventories) &&
      (stringProduct as any).variantInventories.length > 0;

    let didVariantDeduct = false;

    if (
      hasVariantInventories &&
      !alreadyDeductedGaugeStock &&
      !isVariantStockAlreadyDeductedByOrderItem
    ) {
      const variantDeduction = await applyStringingVariantInventoryDeduction({
        db,
        productId: stringProductObjectId,
        product: stringProduct,
        selectedColor: effectiveSelectedColor,
        selectedGauge: effectiveSelectedGauge,
        quantity: 1,
        session,
      });

      if (variantDeduction.status === "deducted") {
        didVariantDeduct = true;
        updateDoc["meta.gaugeStockDeductedAt"] = new Date();
        updateDoc["meta.colorStockDeductedAt"] = new Date();
        updateDoc["stockDeduction"] = {
          mode: "variant",
          colorValue: effectiveSelectedColor ?? null,
          gaugeValue: effectiveSelectedGauge ?? null,
        };
      }
    } else if (
      effectiveSelectedColor &&
      !alreadyDeductedColorStock &&
      !isColorStockAlreadyDeductedByOrderItem &&
      hasManagedColorInventories
    ) {
      const colorRow = (stringProduct as any).colorInventories.find(
        (row: any) => String(row?.value ?? "").trim() === effectiveSelectedColor,
      );
      if (!colorRow) {
        throw Object.assign(new Error("선택한 색상 정보를 찾을 수 없습니다."), {
          status: 400,
          code: "COLOR_NOT_FOUND",
        });
      }
      if (colorRow?.isSoldOut === true) {
        throw Object.assign(new Error("선택한 색상은 현재 품절입니다."), {
          status: 409,
          code: "COLOR_SOLD_OUT",
        });
      }
      if (Number(colorRow?.stock ?? 0) < 1) {
        throw Object.assign(new Error("선택한 색상의 구매 가능 수량을 초과했습니다."), {
          status: 409,
          code: "COLOR_INSUFFICIENT_STOCK",
        });
      }

      const shouldAdjustGlobalInventory = !effectiveSelectedGauge;
      const colorDeductResult = await db.collection("products").updateOne(
        {
          _id: stringProductObjectId,
          ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
          ...(shouldAdjustGlobalInventory ? { "inventory.stock": { $gte: 1 } } : {}),
          colorInventories: {
            $elemMatch: {
              value: effectiveSelectedColor,
              isSoldOut: { $ne: true },
              stock: { $gte: 1 },
            },
          },
        },
        {
          $inc: shouldAdjustGlobalInventory
            ? { "colorInventories.$.stock": -1, "inventory.stock": -1, sold: 1 }
            : { "colorInventories.$.stock": -1 },
        },
        { session },
      );

      if (!colorDeductResult.matchedCount || !colorDeductResult.modifiedCount) {
        throw Object.assign(new Error("선택한 색상의 구매 가능 수량을 초과했습니다."), {
          status: 409,
          code: "COLOR_INSUFFICIENT_STOCK",
        });
      }
      updateDoc["meta.colorStockDeductedAt"] = new Date();
    }

    if (
      !didVariantDeduct &&
      isGaugeSelectableProduct &&
      effectiveSelectedGauge &&
      !alreadyDeductedGaugeStock &&
      !isStockAlreadyDeductedByOrderItem
    ) {
      const stringQuantity = 1;

      const gaugeRow = (
        Array.isArray((stringProduct as any)?.gaugeInventories)
          ? (stringProduct as any).gaugeInventories
          : []
      ).find((row: any) => String(row?.value ?? "").trim() === effectiveSelectedGauge);

      if (!gaugeRow) {
        throw Object.assign(new Error("선택한 게이지(굵기)를 찾을 수 없습니다."), {
          status: 400,
          code: "GAUGE_NOT_FOUND",
        });
      }

      if (gaugeRow?.isSoldOut === true) {
        throw Object.assign(new Error("선택한 게이지(굵기)는 품절입니다."), {
          status: 409,
          code: "GAUGE_SOLD_OUT",
        });
      }

      if (Number(gaugeRow?.stock ?? 0) < stringQuantity) {
        throw Object.assign(new Error("선택한 게이지(굵기)의 재고가 부족합니다."), {
          status: 409,
          code: "GAUGE_INSUFFICIENT_STOCK",
        });
      }

      const gaugeDeductResult = await db.collection("products").updateOne(
        {
          _id: stringProductObjectId,
          ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
          "inventory.stock": { $gte: stringQuantity },
          gaugeInventories: {
            $elemMatch: {
              value: effectiveSelectedGauge,
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

      if (!gaugeDeductResult.matchedCount || !gaugeDeductResult.modifiedCount) {
        throw Object.assign(new Error("선택한 게이지(굵기)의 재고가 부족합니다."), {
          status: 409,
          code: "GAUGE_INSUFFICIENT_STOCK",
        });
      }

      updateDoc["meta.gaugeStockDeductedAt"] = new Date();
    }
  }

  const updateResult = await db.collection("stringing_applications").updateOne(
    { _id: targetId },
    {
      $unset: { expireAt: "" },
      $set: updateDoc,
      $setOnInsert: { createdAt: new Date(), servicePaid: false },
    },
    { upsert: true, session },
  );

  if (!updateResult.acknowledged) {
    throw Object.assign(new Error("신청서 저장 실패"), { status: 500 });
  }

  if (orderObjectId) {
    await db.collection("orders").updateOne(
      { _id: orderObjectId },
      {
        $set: {
          isStringServiceApplied: true,
          stringingApplicationId: String(targetId),
        },
      },
      { session },
    );
  }

  if (rentalObjectId) {
    await db.collection("rental_orders").updateOne(
      { _id: rentalObjectId },
      {
        $set: {
          isStringServiceApplied: true,
          stringingApplicationId: String(targetId),
          updatedAt: new Date(),
        },
      },
      { session },
    );
  }

  return {
    applicationId: targetId,
    orderObjectId,
    rentalObjectId,
    stringingSubmitted: true,
  };
}
