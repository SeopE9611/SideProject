import { productVisibilityFilterFor, racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { ObjectId, type Db } from "mongodb";
import {
  calcOrderShippingFeeWithBundlePolicy,
  normalizeItemShippingFee,
} from "@/lib/shipping-fee";
import {
  applyPackageToServiceFee,
  resolvePackageUsage,
  resolveRequiredPassCountFromInput,
} from "@/app/features/stringing-applications/lib/package-pricing";
import { findOneActivePassForUser } from "@/lib/passes.service";
import type { StringingApplicationInput } from "@/app/features/stringing-applications/api/submit-core";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { getEffectiveRacketPrice } from "@/lib/racket-pricing";
import { racketBrandLabel } from "@/lib/constants";

export async function calculateCheckoutPayableAmount(params: {
  db: Db;
  userId: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    kind?: "product" | "racket";
  }>;
  shippingInfo: {
    withStringService?: boolean;
    deliveryMethod?: string;
    shippingMethod?: string;
  };
  pointsToUse?: number;
  stringingApplicationInput?: StringingApplicationInput;
}) {
  const {
    db,
    userId,
    items,
    shippingInfo,
    pointsToUse = 0,
    stringingApplicationInput,
  } = params;

  const itemsWithSnapshot = await Promise.all(
    items.map(async (it) => {
      const kind = it.kind ?? "product";
      const quantity = Number(it.quantity ?? 0);
      if (kind === "product") {
        const prod = await db
          .collection("products")
          .findOne({ _id: new ObjectId(it.productId), ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()) });
        if (!prod) throw new Error("PRODUCT_NOT_AVAILABLE");
        return {
          name: prod?.name ?? "알 수 없는 상품",
          price: getEffectiveProductPrice(prod),
          quantity,
          kind: "product" as const,
          mountingFee: Number.isFinite(Number((prod as any)?.mountingFee))
            ? Number((prod as any).mountingFee)
            : 0,
          isMountableString: isMountableStringByFee((prod as any)?.mountingFee),
          shippingFee: normalizeItemShippingFee((prod as any)?.shippingFee),
        };
      }
      const racket = await db
        .collection("used_rackets")
        .findOne({ _id: new ObjectId(it.productId), ...racketVisibilityFilterFor(await getVisibilityViewerFromCookies()) });
      if (!racket) throw new Error("RACKET_NOT_AVAILABLE");
      return {
        name: racket
          ? `${racketBrandLabel(String(racket.brand ?? ""))} ${racket.model}`.trim()
          : "알 수 없는 라켓",
        price: getEffectiveRacketPrice(racket),
        quantity,
        kind: "racket" as const,
        shippingFee: normalizeItemShippingFee((racket as any)?.shippingFee),
      };
    }),
  );

  if (shippingInfo?.withStringService) {
    const racketItems = itemsWithSnapshot.filter((it) => it.kind === "racket");
    const serviceItems = itemsWithSnapshot.filter(
      (it) => it.kind === "product" && (it as any).isMountableString === true,
    );
    const racketQty = racketItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0),
      0,
    );
    const serviceQty = serviceItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0),
      0,
    );
    if (racketQty > 0) {
      if (racketItems.length !== 1 || serviceItems.length !== 1) {
        throw new Error("INVALID_COMPOSITION");
      }
      if (racketQty !== serviceQty) {
        throw new Error("BUNDLE_QTY_MISMATCH");
      }
    }
  }

  const computedSubtotal = itemsWithSnapshot.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0,
  );
  const baseServiceFee = shippingInfo?.withStringService
    ? itemsWithSnapshot.reduce((sum, it) => {
        if (it.kind !== "product") return sum;
        const mf = Number((it as any).mountingFee || 0);
        if (!Number.isFinite(mf) || mf <= 0) return sum;
        return sum + mf * (Number(it.quantity) || 0);
      }, 0)
    : 0;

  const requiredPassCount = resolveRequiredPassCountFromInput({
    lines: stringingApplicationInput?.lines,
    stringTypes: stringingApplicationInput?.stringTypes,
  });

  const pass =
    userId && shippingInfo?.withStringService
      ? await findOneActivePassForUser(db, new ObjectId(userId))
      : null;
  const packageUsage = resolvePackageUsage({
    hasPackage: !!pass,
    packageRemaining: Number(pass?.remainingCount ?? 0),
    requiredPassCount,
    packageOptOut: !!stringingApplicationInput?.packageOptOut,
  });

  const computedServiceFee = shippingInfo?.withStringService
    ? applyPackageToServiceFee(baseServiceFee, packageUsage)
    : 0;

  const computedShippingFee = calcOrderShippingFeeWithBundlePolicy({
    items: itemsWithSnapshot,
    isVisitPickup:
      shippingInfo?.deliveryMethod === "방문수령" ||
      shippingInfo?.shippingMethod === "visit",
    withStringService: !!shippingInfo?.withStringService,
  });

  const computedTotalPrice =
    computedSubtotal + computedServiceFee + computedShippingFee;

  const POINT_UNIT = 100;
  const normalizedRequestedPointsToUse =
    Math.floor(Math.max(0, Math.floor(Number(pointsToUse) || 0)) / POINT_UNIT) *
    POINT_UNIT;

  let serverPointsToUse = 0;
  const maxPointsByPolicy = Math.max(
    0,
    computedTotalPrice - computedShippingFee,
  );

  if (userId && normalizedRequestedPointsToUse > 0 && maxPointsByPolicy > 0) {
    const u = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { pointsBalance: 1, pointsDebt: 1 } },
      );

    const balance = Math.max(
      0,
      Math.floor(Number((u as any)?.pointsBalance ?? 0)),
    );
    const debt = Math.max(0, Math.floor(Number((u as any)?.pointsDebt ?? 0)));
    const available = Math.max(0, balance - debt);
    serverPointsToUse = Math.min(
      normalizedRequestedPointsToUse,
      Math.min(available, maxPointsByPolicy),
    );
  }

  const payableTotalPrice = Math.max(0, computedTotalPrice - serverPointsToUse);

  return {
    subtotal: computedSubtotal,
    shippingFee: computedShippingFee,
    serviceFee: computedServiceFee,
    originalTotalPrice: computedTotalPrice,
    pointsUsed: serverPointsToUse,
    payableTotalPrice,
    itemsWithSnapshot,
  };
}
