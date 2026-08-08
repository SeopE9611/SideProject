import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { verifyAccessToken } from "@/lib/auth.utils";
import clientPromise from "@/lib/mongodb";
import { isExternallyCanceledPayment } from "@/lib/orders/cancel-finalization";
import {
  getAdminCancelPolicyMessage,
  isAdminCancelableOrderStatus,
  isAdminForceCancelRequired,
} from "@/lib/orders/cancel-refund-policy";
import { revertConsumption } from "@/lib/passes.service";
import { cancelNicePaymentByTid, getNicePaymentByTid } from "@/lib/payments/nice/server";
import { deductPoints, grantPoints } from "@/lib/points.service";
import {
  buildCancelRefundSubject,
  recordCancelRefundSignal,
} from "@/lib/risk/recordCancelRefundSignal";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { ClientSession, ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function toReasonPreview(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function maskRefundAccount(account: any) {
  if (!account || typeof account !== "object") return null;
  const digits = String(account.accountNumber ?? "").replace(/\D/g, "");
  return {
    bankLabel: typeof account.bankLabel === "string" ? account.bankLabel : null,
    holder: typeof account.holder === "string" ? account.holder : null,
    accountLast4: digits ? digits.slice(-4) : null,
  };
}

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function createNiceCancelOrderId(orderId: unknown): string {
  const suffix = String(orderId ?? "")
    .replace(/[^0-9a-zA-Z]/g, "")
    .slice(-16);

  const random = Math.random().toString(36).slice(2, 8);

  return `C${Date.now()}${suffix}${random}`.slice(0, 64);
}

function pickStringProductObjectIdFromApplicationDoc(appDoc: any): ObjectId | null {
  const toObjectIdIfValid = (value: unknown): ObjectId | null => {
    if (value == null) return null;
    const str = String(value).trim();
    if (!str || str === "custom" || !ObjectId.isValid(str)) return null;
    return new ObjectId(str);
  };

  const fromStringTypes = Array.isArray(appDoc?.stringDetails?.stringTypes)
    ? appDoc.stringDetails.stringTypes.find((v: unknown) => String(v).trim() !== "custom")
    : null;
  const fromStringTypesObjectId = toObjectIdIfValid(fromStringTypes);
  if (fromStringTypesObjectId) return fromStringTypesObjectId;

  const fromStringItems = Array.isArray(appDoc?.stringItems)
    ? appDoc.stringItems.find((item: any) => {
        const productId = item?.productId ?? item?.id;
        return typeof productId === "string" && productId.trim() && productId.trim() !== "custom";
      })
    : null;
  const fromStringItemsObjectId = toObjectIdIfValid(
    fromStringItems?.productId ?? fromStringItems?.id,
  );
  if (fromStringItemsObjectId) return fromStringItemsObjectId;

  const lines = Array.isArray(appDoc?.stringDetails?.lines)
    ? appDoc.stringDetails.lines
    : Array.isArray(appDoc?.stringDetails?.racketLines)
      ? appDoc.stringDetails.racketLines
      : [];
  const fromLines = lines.find(
    (line: any) =>
      typeof line?.stringProductId === "string" &&
      line.stringProductId.trim() &&
      line.stringProductId.trim() !== "custom",
  );
  const fromLinesObjectId = toObjectIdIfValid(fromLines?.stringProductId);
  if (fromLinesObjectId) return fromLinesObjectId;

  return toObjectIdIfValid(appDoc?.meta?.stringProductId);
}

class CancelFinalizationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function restoreOrderVariantStockIfNeeded(
  db: any,
  existing: any,
  now: Date,
  session: ClientSession,
) {
  const alreadyRestored = Boolean(existing?.stockRestore?.variantStockRestoredAt);
  if (alreadyRestored) {
    return { setFields: {} as Record<string, unknown> };
  }

  const restoreMap = new Map<
    string,
    {
      productObjectId: ObjectId;
      selectedColor: string;
      selectedGauge: string;
      quantity: number;
    }
  >();
  const items = Array.isArray(existing?.items) ? existing.items : [];
  for (const item of items) {
    const kind = typeof item?.kind === "string" ? item.kind.trim() : "";
    if (kind && kind !== "product") continue;
    const stockDeductionMode =
      typeof item?.stockDeductionMode === "string" ? item.stockDeductionMode.trim() : "";
    const stockDeductionModeFromObject =
      typeof item?.stockDeduction?.mode === "string" ? item.stockDeduction.mode.trim() : "";
    const isVariantDeduction =
      stockDeductionMode === "variant" || stockDeductionModeFromObject === "variant";
    if (!isVariantDeduction) continue;

    const selectedColor =
      typeof item?.stockDeduction?.colorValue === "string" && item.stockDeduction.colorValue.trim()
        ? item.stockDeduction.colorValue.trim()
        : typeof item?.selectedColor === "string" && item.selectedColor.trim()
          ? item.selectedColor.trim()
          : "";
    const selectedGauge =
      typeof item?.stockDeduction?.gaugeValue === "string" && item.stockDeduction.gaugeValue.trim()
        ? item.stockDeduction.gaugeValue.trim()
        : typeof item?.selectedGauge === "string" && item.selectedGauge.trim()
          ? item.selectedGauge.trim()
          : "";
    if (!selectedColor || !selectedGauge) continue;

    const productId = String(item?.productId ?? "").trim();
    if (!ObjectId.isValid(productId)) continue;
    const quantity = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
    if (quantity <= 0) continue;
    const key = `${productId}:${selectedColor}:${selectedGauge}`;
    const existingAgg = restoreMap.get(key);
    if (existingAgg) {
      existingAgg.quantity += quantity;
      continue;
    }
    restoreMap.set(key, {
      productObjectId: new ObjectId(productId),
      selectedColor,
      selectedGauge,
      quantity,
    });
  }

  if (restoreMap.size === 0) {
    return { setFields: {} as Record<string, unknown> };
  }

  const products = db.collection("products");
  for (const restoreItem of restoreMap.values()) {
    const restoreResult = await products.updateOne(
      {
        _id: restoreItem.productObjectId,
        sold: { $gte: restoreItem.quantity },
        variantInventories: {
          $elemMatch: {
            colorValue: restoreItem.selectedColor,
            gaugeValue: restoreItem.selectedGauge,
          },
        },
      },
      {
        $inc: {
          "variantInventories.$[variant].stock": restoreItem.quantity,
          "colorInventories.$[color].stock": restoreItem.quantity,
          "gaugeInventories.$[gauge].stock": restoreItem.quantity,
          "inventory.stock": restoreItem.quantity,
          sold: -restoreItem.quantity,
        },
      },
      {
        session,
        arrayFilters: [
          {
            "variant.colorValue": restoreItem.selectedColor,
            "variant.gaugeValue": restoreItem.selectedGauge,
          },
          { "color.value": restoreItem.selectedColor },
          { "gauge.value": restoreItem.selectedGauge },
        ],
      },
    );

    if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
      throw new CancelFinalizationError(
        "VARIANT_STOCK_RESTORE_FAILED",
        "주문 취소 중 옵션 조합 재고 복구에 실패했습니다.",
      );
    }
  }

  return {
    setFields: {
      "stockRestore.variantStockRestoredAt": now,
      "stockRestore.variantStockRestoreReason": "order_cancel_approved",
    } as Record<string, unknown>,
  };
}

async function restoreOrderGaugeStockIfNeeded(
  db: any,
  existing: any,
  now: Date,
  session: ClientSession,
) {
  const alreadyRestored = Boolean(existing?.stockRestore?.gaugeStockRestoredAt);
  if (alreadyRestored) {
    return { setFields: {} as Record<string, unknown> };
  }

  const restoreMap = new Map<
    string,
    { productObjectId: ObjectId; selectedGauge: string; quantity: number }
  >();
  const items = Array.isArray(existing?.items) ? existing.items : [];
  for (const item of items) {
    const kind = typeof item?.kind === "string" ? item.kind.trim() : "";
    if (kind && kind !== "product") continue;
    const stockDeductionMode =
      typeof item?.stockDeductionMode === "string" ? item.stockDeductionMode.trim() : "";
    const stockDeductionModeFromObject =
      typeof item?.stockDeduction?.mode === "string" ? item.stockDeduction.mode.trim() : "";
    if (stockDeductionMode === "variant" || stockDeductionModeFromObject === "variant") continue;
    const selectedGauge =
      typeof item?.selectedGauge === "string" && item.selectedGauge.trim()
        ? item.selectedGauge.trim()
        : undefined;
    if (!selectedGauge) continue;
    const productId = String(item?.productId ?? "").trim();
    if (!ObjectId.isValid(productId)) continue;
    const quantity = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
    if (quantity <= 0) continue;
    const key = `${productId}:${selectedGauge}`;
    const existingAgg = restoreMap.get(key);
    if (existingAgg) {
      existingAgg.quantity += quantity;
      continue;
    }
    restoreMap.set(key, {
      productObjectId: new ObjectId(productId),
      selectedGauge,
      quantity,
    });
  }

  if (restoreMap.size === 0) {
    return { setFields: {} as Record<string, unknown> };
  }

  const products = db.collection("products");
  for (const restoreItem of restoreMap.values()) {
    const restoreResult = await products.updateOne(
      {
        _id: restoreItem.productObjectId,
        sold: { $gte: restoreItem.quantity },
        "gaugeInventories.value": restoreItem.selectedGauge,
      },
      {
        $inc: {
          "gaugeInventories.$.stock": restoreItem.quantity,
          "inventory.stock": restoreItem.quantity,
          sold: -restoreItem.quantity,
        },
      },
      { session },
    );
    if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
      throw new CancelFinalizationError(
        "GAUGE_STOCK_RESTORE_FAILED",
        "주문 취소 중 스트링 게이지(굵기) 재고 복구에 실패했습니다.",
      );
    }
  }

  return {
    setFields: {
      "stockRestore.gaugeStockRestoredAt": now,
      "stockRestore.gaugeStockRestoreReason": "order_cancel_approved",
    } as Record<string, unknown>,
  };
}

async function restoreOrderColorStockIfNeeded(
  db: any,
  existing: any,
  now: Date,
  session: ClientSession,
) {
  const alreadyRestored = Boolean(existing?.stockRestore?.colorStockRestoredAt);
  if (alreadyRestored) {
    return { setFields: {} as Record<string, unknown> };
  }

  const restoreMap = new Map<
    string,
    {
      productObjectId: ObjectId;
      selectedColor: string;
      quantity: number;
      hasSelectedGauge: boolean;
    }
  >();
  const items = Array.isArray(existing?.items) ? existing.items : [];
  for (const item of items) {
    const kind = typeof item?.kind === "string" ? item.kind.trim() : "";
    if (kind && kind !== "product") continue;
    const stockDeductionMode =
      typeof item?.stockDeductionMode === "string" ? item.stockDeductionMode.trim() : "";
    const stockDeductionModeFromObject =
      typeof item?.stockDeduction?.mode === "string" ? item.stockDeduction.mode.trim() : "";
    if (stockDeductionMode === "variant" || stockDeductionModeFromObject === "variant") continue;
    const selectedColor =
      typeof item?.selectedColor === "string" && item.selectedColor.trim()
        ? item.selectedColor.trim()
        : undefined;
    if (!selectedColor) continue;
    const productId = String(item?.productId ?? "").trim();
    if (!ObjectId.isValid(productId)) continue;
    const quantity = Math.max(0, Math.trunc(Number(item?.quantity ?? 0)));
    if (quantity <= 0) continue;
    const hasSelectedGauge = Boolean(
      typeof item?.selectedGauge === "string" && item.selectedGauge.trim(),
    );
    const key = `${productId}:${selectedColor}:${hasSelectedGauge ? "gauge" : "plain"}`;
    const existingAgg = restoreMap.get(key);
    if (existingAgg) {
      existingAgg.quantity += quantity;
      continue;
    }
    restoreMap.set(key, {
      productObjectId: new ObjectId(productId),
      selectedColor,
      quantity,
      hasSelectedGauge,
    });
  }

  if (restoreMap.size === 0) {
    return { setFields: {} as Record<string, unknown> };
  }

  const products = db.collection("products");
  let restoredAnyManagedColorStock = false;
  for (const restoreItem of restoreMap.values()) {
    const product = await products.findOne(
      { _id: restoreItem.productObjectId },
      {
        projection: { colorInventories: 1 },
        session,
      },
    );
    const hasManagedColorInventory =
      Array.isArray((product as any)?.colorInventories) &&
      (product as any).colorInventories.length > 0;
    if (!hasManagedColorInventory) {
      continue;
    }

    const restoreResult = await products.updateOne(
      restoreItem.hasSelectedGauge
        ? {
            _id: restoreItem.productObjectId,
            "colorInventories.value": restoreItem.selectedColor,
          }
        : {
            _id: restoreItem.productObjectId,
            sold: { $gte: restoreItem.quantity },
            "colorInventories.value": restoreItem.selectedColor,
          },
      {
        $inc: restoreItem.hasSelectedGauge
          ? {
              "colorInventories.$.stock": restoreItem.quantity,
            }
          : {
              "colorInventories.$.stock": restoreItem.quantity,
              "inventory.stock": restoreItem.quantity,
              sold: -restoreItem.quantity,
          },
      },
      { session },
    );
    if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
      throw new CancelFinalizationError(
        "COLOR_STOCK_RESTORE_FAILED",
        "주문 취소 중 색상 재고 복구에 실패했습니다.",
      );
    }
    restoredAnyManagedColorStock = true;
  }

  if (!restoredAnyManagedColorStock) {
    return { setFields: {} as Record<string, unknown> };
  }

  return {
    setFields: {
      "stockRestore.colorStockRestoredAt": now,
      "stockRestore.colorStockRestoreReason": "order_cancel_approved",
    } as Record<string, unknown>,
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return new NextResponse("유효하지 않은 주문 ID입니다.", { status: 400 });

  const client = await clientPromise;
  const db = client.db();
  const orders = db.collection("orders");
  const _id = new ObjectId(id);
  let existing: any = await orders.findOne({ _id });
  if (!existing) return new NextResponse("주문을 찾을 수 없습니다.", { status: 404 });

  const jar = await cookies();
  let user: any = safeVerifyAccessToken(jar.get("accessToken")?.value);
  if (!user && jar.get("refreshToken")?.value) {
    try {
      user = jwt.verify(jar.get("refreshToken")!.value, process.env.REFRESH_TOKEN_SECRET!);
    } catch {
      /* ignore */
    }
  }
  if (!user?.sub) return new NextResponse("인증이 필요합니다.", { status: 401 });
  const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!(user.role === "admin" || (user.email && adminList.includes(user.email)))) {
    return new NextResponse("관리자만 취소를 승인할 수 있습니다.", { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const hasTrackingNumber = Boolean(
    typeof existing.shippingInfo?.invoice?.trackingNumber === "string" &&
      existing.shippingInfo.invoice.trackingNumber.trim(),
  );
  if (!isAdminCancelableOrderStatus(existing.status)) {
    return new NextResponse(getAdminCancelPolicyMessage(existing.status, hasTrackingNumber), { status: 400 });
  }
  if (isAdminForceCancelRequired(existing.status, hasTrackingNumber) && body.force !== true) {
    return new NextResponse("관리자 강제 취소 확인이 필요합니다.", { status: 409 });
  }

  const inputReasonCode = typeof body.reasonCode === "string" ? body.reasonCode.trim() : undefined;
  const inputReasonText = typeof body.reasonText === "string" ? body.reasonText.trim() : undefined;
  const initialCancelRequest = existing.cancelRequest || {};
  const reasonCode = inputReasonCode || initialCancelRequest.reasonCode || "기타";
  const reasonText = inputReasonText ?? initialCancelRequest.reasonText ?? "";
  const normalizedProvider = String(existing.paymentInfo?.provider ?? "").trim().toLowerCase();
  const tid = String(existing.paymentInfo?.tid ?? "").trim();
  const alreadyCanceled = isExternallyCanceledPayment(existing);
  const shouldCancelViaNice =
    !alreadyCanceled && normalizedProvider === "nicepay" && Boolean(tid) && existing.paymentStatus === "결제완료";

  if (shouldCancelViaNice) {
    const clientKey = String(process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "").trim();
    const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();
    if (!clientKey || !secretKey) {
      return NextResponse.json({ ok: false, errorCode: "NICE_CANCEL_CONFIG_MISSING", message: "NICE 취소 설정이 누락되어 취소를 진행할 수 없습니다. 환경설정을 확인해 주세요." }, { status: 502 });
    }
    const originalNiceOrderId = String(existing.orderId ?? existing.paymentInfo?.rawSummary?.orderId ?? "").trim();
    if (!tid) return NextResponse.json({ ok: false, errorCode: "NICE_TID_REQUIRED", message: "NICE 취소에 필요한 TID가 없습니다." }, { status: 400 });
    if (!originalNiceOrderId) {
      return NextResponse.json({ ok: false, errorCode: "NICE_ORDER_ID_REQUIRED", message: "NICE 취소에 필요한 원 결제 주문번호(orderId)가 없어 자동 취소를 진행할 수 없습니다." }, { status: 400 });
    }

    const claimToken = randomUUID();
    const claimedAt = new Date();
    const claimResult: any = await orders.findOneAndUpdate(
      {
        _id,
        paymentStatus: "결제완료",
        "paymentInfo.provider": { $regex: /^nicepay$/i },
        "paymentInfo.tid": tid,
        "cancelRequest.pgCancelClaim.status": { $ne: "processing" },
      },
      { $set: {
        "cancelRequest.pgCancelClaim.status": "processing",
        "cancelRequest.pgCancelClaim.token": claimToken,
        "cancelRequest.pgCancelClaim.claimedAt": claimedAt,
        "cancelRequest.pgCancelClaim.updatedAt": claimedAt,
      } },
      { returnDocument: "after" },
    );
    const claimedOrder = (claimResult && "value" in claimResult ? claimResult.value : claimResult) as any;
    if (!claimedOrder) {
      const latest: any = await orders.findOne({ _id });
      if (!isExternallyCanceledPayment(latest ?? {})) {
        return NextResponse.json({ ok: false, errorCode: "ORDER_CANCEL_ALREADY_PROCESSING", message: "다른 관리자가 NICE 결제 취소를 처리 중입니다." }, { status: 409 });
      }
      existing = latest;
    } else {
      existing = claimedOrder;
      let cancelCalled = false;
      let cancelOrderId: string | null = null;
      try {
        const pgRaw = await getNicePaymentByTid({ tid, clientKey, secretKey });
        const lookupCode = String(pgRaw.resultCode ?? pgRaw.ResultCode ?? "").trim();
        if (lookupCode && lookupCode !== "0000") throw Object.assign(new Error(String(pgRaw.resultMsg ?? "NICE 상태 조회 실패")), { beforeCancel: true });
        const pgStatus = String(pgRaw.status ?? pgRaw.Status ?? "").trim().toLowerCase().replace("cancelled", "canceled");
        const localExpectedAmount = Math.floor(Number(existing.paymentInfo?.total ?? existing.totalPrice ?? 0));
        const pgBalanceAmount = Math.floor(Number(pgRaw.balanceAmt ?? 0));
        let successRaw = pgRaw;
        let resultCode = lookupCode || "0000";
        let resultMsg = String(pgRaw.resultMsg ?? pgRaw.ResultMsg ?? "").trim();
        let cancelAmount = Math.max(0, Math.floor(Number(pgRaw.cancAmt ?? pgRaw.cancelAmount ?? 0)));

        if (pgStatus !== "canceled") {
          if (pgStatus !== "paid" && pgStatus !== "partialcanceled") {
            throw Object.assign(new Error("NICE 결제 상태가 취소 가능한 상태가 아닙니다."), { beforeCancel: true });
          }
          cancelAmount = pgBalanceAmount > 0 ? pgBalanceAmount : pgStatus === "paid" ? localExpectedAmount : 0;
          if (!Number.isFinite(cancelAmount) || cancelAmount <= 0) {
            throw Object.assign(new Error("NICE 취소 금액을 확인할 수 없습니다."), { beforeCancel: true });
          }
          cancelOrderId = createNiceCancelOrderId(existing._id);
          cancelCalled = true;
          successRaw = await cancelNicePaymentByTid({ tid, orderId: cancelOrderId, cancelAmt: cancelAmount, reason: "관리자 주문 취소 승인 처리", clientKey, secretKey });
          resultCode = String(successRaw.resultCode ?? successRaw.ResultCode ?? "").trim();
          resultMsg = String(successRaw.resultMsg ?? successRaw.ResultMsg ?? "").trim();
          if (resultCode === "2026") {
            const blockedAt = new Date();
            await orders.updateOne({ _id, "cancelRequest.pgCancelClaim.token": claimToken }, { $set: {
              status: "취소처리중",
              "cancelRequest.status": "approved_pending_pg_cancel",
              "cancelRequest.pgCancelClaim.status": "failed",
              "cancelRequest.pgCancelClaim.updatedAt": blockedAt,
              "cancelRequest.pgCancelBlocked": { reason: "unsettled_amount_shortage", resultCode: "2026", resultMsg: resultMsg || null, tid, amount: cancelAmount, blockedAt },
              "paymentInfo.niceSync": { ...(existing.paymentInfo?.niceSync ?? {}), lastSyncedAt: blockedAt.toISOString(), source: "admin_cancel_approve_failed", pgStatus, resultCode: "2026", resultMsg: resultMsg || null, cancelAmount, originalOrderId: originalNiceOrderId, cancelOrderId, manualActionRequired: true, manualActionReason: "unsettled_amount_shortage" },
            }, $push: { history: { status: "PG자동취소실패", date: blockedAt, description: "NICE 미정산금액 부족으로 자동 카드취소가 거절되었습니다. 주문 취소 후처리는 진행하지 않았습니다." } } } as any);
            return NextResponse.json({ ok: false, errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE", message: "NICE 미정산금액 부족으로 자동 카드취소가 불가합니다.", adminGuide: { title: "NICE 자동 카드취소 불가", description: "가맹점 미정산금액이 취소금액보다 부족해 NICE 자동취소가 거절되었습니다. NICE 입금 후 취소 절차를 진행한 뒤, 강제취소 완료 후 PG 상태를 다시 확인해 주세요.", nextActions: ["NICE 미정산금액 입금 후 취소 절차를 진행해 주세요.", "NICE에서 강제취소가 완료되면 관리자 주문 상세에서 PG 상태를 다시 확인해 주세요."] } }, { status: 409 });
          }
          if (!new Set(["0000", "2001", "2211"]).has(resultCode)) {
            await orders.updateOne({ _id, "cancelRequest.pgCancelClaim.token": claimToken }, { $set: { "cancelRequest.pgCancelClaim.status": "failed", "cancelRequest.pgCancelClaim.updatedAt": new Date() } });
            return NextResponse.json({ ok: false, errorCode: "NICE_CANCEL_FAILED", message: resultMsg || "NICE 결제 취소가 완료되지 않았습니다." }, { status: 400 });
          }
        }

        const persistedAt = new Date();
        const canceledAt = String(successRaw.canceledAt ?? successRaw.cancelledAt ?? successRaw.cancelDate ?? "").trim() || persistedAt.toISOString();
        const persisted = await orders.updateOne(
          { _id, "cancelRequest.pgCancelClaim.token": claimToken },
          { $set: {
            status: "취소처리중", paymentStatus: "결제취소", "paymentInfo.status": "canceled",
            "paymentInfo.niceSync": { ...(existing.paymentInfo?.niceSync ?? {}), lastSyncedAt: persistedAt.toISOString(), source: pgStatus === "canceled" ? "admin_cancel_approve_pg_lookup" : "admin_cancel_approve", pgStatus: "canceled", resultCode: resultCode || "0000", resultMsg: resultMsg || null, canceledAt, cancelAmount, originalOrderId: originalNiceOrderId, cancelOrderId },
            "cancelRequest.status": "approved_pending_finalization",
            "cancelRequest.pgCancelClaim.status": "pg_canceled",
            "cancelRequest.pgCancelClaim.updatedAt": persistedAt,
          } },
        );
        if (!persisted.modifiedCount) throw Object.assign(new Error("PG 취소 성공 상태를 주문에 저장하지 못했습니다."), { afterCancel: true });
        existing = await orders.findOne({ _id });
      } catch (error: any) {
        const errorResultCode = String(error?.resultCode ?? "").trim();
        if (errorResultCode === "2026") {
          await orders.updateOne({ _id, "cancelRequest.pgCancelClaim.token": claimToken }, { $set: { "cancelRequest.pgCancelClaim.status": "failed", "cancelRequest.pgCancelClaim.updatedAt": new Date(), "paymentInfo.niceSync.manualActionRequired": true, "paymentInfo.niceSync.manualActionReason": "unsettled_amount_shortage", "paymentInfo.niceSync.resultCode": "2026" } });
          return NextResponse.json({ ok: false, errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE", message: "NICE 미정산금액 부족으로 자동 카드취소가 불가합니다." }, { status: 409 });
        }
        const reconciliation = cancelCalled || error?.afterCancel;
        await orders.updateOne({ _id, "cancelRequest.pgCancelClaim.token": claimToken }, { $set: { "cancelRequest.pgCancelClaim.status": reconciliation ? "needs_reconciliation" : "failed", "cancelRequest.pgCancelClaim.updatedAt": new Date() } });
        return NextResponse.json({ ok: false, errorCode: reconciliation ? "NICE_CANCEL_NEEDS_RECONCILIATION" : "NICE_CANCEL_FAILED", message: reconciliation ? "NICE 취소 결과 확인이 필요합니다. 다시 시도하면 PG 상태를 먼저 확인합니다." : String(error?.message || "NICE 결제 취소 중 오류가 발생했습니다.") }, { status: reconciliation ? 502 : 400 });
      }
    }
  }

  const session = client.startSession();
  let linkedApplicationCount = 0;
  try {
    await session.withTransaction(async () => {
      const current: any = await orders.findOne({ _id }, { session });
      if (!current) throw new CancelFinalizationError("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.");
      if (current.status === "취소" && current.cancelRequest?.status === "approved") return;
      if (normalizedProvider === "nicepay" && !isExternallyCanceledPayment(current)) {
        throw new CancelFinalizationError("PG_CANCEL_NOT_CONFIRMED", "PG 결제 취소가 확인되지 않아 후처리할 수 없습니다.");
      }
      const finalizedAt = new Date();
      const updateFields: Record<string, unknown> = {};
      Object.assign(updateFields, (await restoreOrderVariantStockIfNeeded(db, current, finalizedAt, session)).setFields);
      Object.assign(updateFields, (await restoreOrderGaugeStockIfNeeded(db, current, finalizedAt, session)).setFields);
      Object.assign(updateFields, (await restoreOrderColorStockIfNeeded(db, current, finalizedAt, session)).setFields);

      const uidStr = current.userId ? String(current.userId) : "";
      if (ObjectId.isValid(uidStr)) {
        const userOid = new ObjectId(uidStr);
        const txCol = db.collection("points_transactions");
        const orderObjectId = String(current._id);
        const spendTx: any = await txCol.findOne({ refKey: `order:${orderObjectId}:spend`, status: "confirmed" }, { session });
        const amountToRestore = Math.max(0, Math.trunc(Math.abs(Number(spendTx?.amount ?? 0)) || Number(current.pointsUsed ?? current.paymentInfo?.pointsUsed ?? 0)));
        if (amountToRestore > 0 && !(await txCol.findOne({ refKey: `order:${orderObjectId}:spend_reversal` }, { session }))) {
          await grantPoints(db, { userId: userOid, amount: amountToRestore, type: "reversal", status: "confirmed", refKey: `order:${orderObjectId}:spend_reversal`, reason: `주문 취소로 사용 포인트 복원 (${current.orderId ?? ""})`.trim(), ref: { orderId: current._id } }, { session });
        }
        const rewardTx: any = await txCol.findOne({ refKey: `order_reward:${orderObjectId}`, status: "confirmed" }, { session });
        const earned = Math.max(0, Math.trunc(Number(rewardTx?.amount ?? 0)));
        if (earned > 0 && !(await txCol.findOne({ refKey: `order_reward_revoke:${orderObjectId}` }, { session }))) {
          await deductPoints(db, { userId: userOid, amount: earned, type: "reversal", status: "confirmed", refKey: `order_reward_revoke:${orderObjectId}`, reason: `주문 취소로 적립 포인트 회수 (${current.orderId ?? ""})`.trim(), ref: { orderId: current._id }, allowNegativeBalance: true }, { session });
        }
      }

      const appsCol = db.collection("stringing_applications");
      const linkedApps = await appsCol.find({ orderId: current._id }, { session }).toArray();
      linkedApplicationCount = linkedApps.length;
      for (const appDoc of linkedApps) {
        if (appDoc.status === "취소") continue;
        if (appDoc.packageApplied && appDoc.packagePassId) await revertConsumption(db, appDoc.packagePassId, appDoc._id, { session });
        const appSet: Record<string, unknown> = { status: "취소", cancelRequest: { ...(appDoc.cancelRequest ?? {}), status: "approved", approvedAt: finalizedAt } };
        const selectedGauge = typeof appDoc.meta?.selectedGauge === "string" ? appDoc.meta.selectedGauge.trim() : "";
        if (appDoc.meta?.gaugeStockDeductedAt && !appDoc.meta?.gaugeStockRestoredAt) {
          const productId = pickStringProductObjectIdFromApplicationDoc(appDoc);
          if (!productId || !selectedGauge) throw new CancelFinalizationError("GAUGE_STOCK_RESTORE_FAILED", "연결 교체서비스의 스트링 재고 정보를 찾을 수 없습니다.");
          const restored = await db.collection("products").updateOne({ _id: productId, sold: { $gte: 1 }, "gaugeInventories.value": selectedGauge }, { $inc: { "gaugeInventories.$.stock": 1, "inventory.stock": 1, sold: -1 } }, { session });
          if (!restored.matchedCount || !restored.modifiedCount) throw new CancelFinalizationError("GAUGE_STOCK_RESTORE_FAILED", "주문 취소 중 스트링 게이지(굵기) 재고 복구에 실패했습니다.");
          appSet["meta.gaugeStockRestoredAt"] = finalizedAt;
          appSet["meta.gaugeStockRestoreReason"] = "order_cancel_approved_linked_application";
        }
        await appsCol.updateOne({ _id: appDoc._id }, { $set: appSet, $push: { history: { status: "취소", date: finalizedAt, description: "주문 취소 승인에 따라 신청도 함께 취소되었습니다." } } } as any, { session });
      }

      const currentReq = current.cancelRequest ?? {};
      const descriptionBase = currentReq.status === "requested" ? "고객의 취소 요청을 관리자 권한으로 승인했습니다." : "관리자가 직접 주문을 취소했습니다.";
      const descReason = reasonCode || reasonText ? ` 사유: ${reasonCode}${reasonText ? ` (${reasonText})` : ""}` : "";
      Object.assign(updateFields, { status: "취소", paymentStatus: "결제취소", cancelRequest: { ...currentReq, status: "approved", reasonCode, reasonText, requestedAt: currentReq.requestedAt ?? finalizedAt, processedAt: finalizedAt, processedByAdminId: user.sub }, cancelReason: reasonCode, cancelReasonDetail: reasonCode === "기타" ? reasonText : reasonText || undefined });
      await orders.updateOne({ _id }, { $set: updateFields, $push: { history: { status: "취소", date: finalizedAt, description: `${descriptionBase}${descReason}` } } } as any, { session });
    });
  } catch (error: any) {
    const code = error instanceof CancelFinalizationError ? error.code : "ORDER_CANCEL_FINALIZATION_FAILED";
    return NextResponse.json({ ok: false, errorCode: code, code, message: "PG 결제 취소는 완료되었지만 주문 내부 후처리가 완료되지 않았습니다. 관리자 후처리를 다시 시도해 주세요.", detail: error?.message || null }, { status: code.endsWith("STOCK_RESTORE_FAILED") ? 409 : 500 });
  } finally {
    await session.endSession();
  }

  await appendAdminAudit(db, { type: "order_cancel_request_approved", actorId: user.sub, targetId: _id, message: "관리자 주문 취소 요청 승인", diff: { targetType: "order", orderId: _id.toString(), actorRole: "admin", reasonCode, reasonTextPreview: toReasonPreview(reasonText), refundAccountMasked: maskRefundAccount(initialCancelRequest.refundAccount), prevCancelStatus: initialCancelRequest.status ?? null, nextCancelStatus: "approved", orderStatus: "취소", paymentStatus: "결제취소", linkedApplicationCount } }, req);
  const subject = buildCancelRefundSubject({ userId: existing.userId ? existing.userId.toString() : null, orderId: _id.toString() });
  await recordCancelRefundSignal(db, { eventType: "order_cancel_request_approved", subjectKey: subject.subjectKey, subjectType: subject.subjectType, targetType: "order", targetId: _id, actorRole: "admin", reasonCode, status: "approved" });
  return NextResponse.json({ ok: true });
}
