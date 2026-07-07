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
import { ObjectId } from "mongodb";
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

async function restoreOrderVariantStockIfNeeded(db: any, existing: any, now: Date) {
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
      return {
        errorResponse: NextResponse.json(
          {
            ok: false,
            code: "VARIANT_STOCK_RESTORE_FAILED",
            message: "주문 취소 중 옵션 조합 재고 복구에 실패했습니다.",
          },
          { status: 409 },
        ),
        setFields: {} as Record<string, unknown>,
      };
    }
  }

  return {
    setFields: {
      "stockRestore.variantStockRestoredAt": now,
      "stockRestore.variantStockRestoreReason": "order_cancel_approved",
    } as Record<string, unknown>,
  };
}

async function restoreOrderGaugeStockIfNeeded(db: any, existing: any, now: Date) {
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
    );
    if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
      return {
        errorResponse: NextResponse.json(
          {
            ok: false,
            code: "GAUGE_STOCK_RESTORE_FAILED",
            message: "주문 취소 중 스트링 게이지(굵기) 재고 복구에 실패했습니다.",
          },
          { status: 409 },
        ),
        setFields: {} as Record<string, unknown>,
      };
    }
  }

  return {
    setFields: {
      "stockRestore.gaugeStockRestoredAt": now,
      "stockRestore.gaugeStockRestoreReason": "order_cancel_approved",
    } as Record<string, unknown>,
  };
}

async function restoreOrderColorStockIfNeeded(db: any, existing: any, now: Date) {
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
    );
    if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
      return {
        errorResponse: NextResponse.json(
          {
            ok: false,
            code: "COLOR_STOCK_RESTORE_FAILED",
            message: "주문 취소 중 색상 재고 복구에 실패했습니다.",
          },
          { status: 409 },
        ),
        setFields: {} as Record<string, unknown>,
      };
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
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 주문 ID입니다.", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection("orders");

    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse("주문을 찾을 수 없습니다.", { status: 404 });
    }

    // ───────────────── 인증/인가: 관리자만 ─────────────────
    const jar = await cookies();
    const at = jar.get("accessToken")?.value;
    const rt = jar.get("refreshToken")?.value;

    let user: any = safeVerifyAccessToken(at);

    // access 만료 시 refresh 토큰으로 한 번 더 시도
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        /* ignore */
      }
    }

    if (!user?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.role === "admin" || (user.email && adminList.includes(user.email));

    if (!isAdmin) {
      return new NextResponse("관리자만 취소를 승인할 수 있습니다.", {
        status: 403,
      });
    }

    const hasTrackingNumber =
      existing.shippingInfo?.invoice?.trackingNumber &&
      typeof existing.shippingInfo.invoice.trackingNumber === "string" &&
      existing.shippingInfo.invoice.trackingNumber.trim().length > 0;

    // ───────────────── 요청 바디에서 사유/강제 취소 확인 받기 ─────────────────
    const body = await req.json().catch(() => ({}));

    if (!isAdminCancelableOrderStatus(existing.status)) {
      return new NextResponse(
        getAdminCancelPolicyMessage(existing.status, Boolean(hasTrackingNumber)),
        {
          status: 400,
        },
      );
    }

    if (
      isAdminForceCancelRequired(existing.status, Boolean(hasTrackingNumber)) &&
      body.force !== true
    ) {
      return new NextResponse("관리자 강제 취소 확인이 필요합니다.", {
        status: 409,
      });
    }
    const inputReasonCode =
      typeof body.reasonCode === "string" ? body.reasonCode.trim() : undefined;
    const inputReasonText =
      typeof body.reasonText === "string" ? body.reasonText.trim() : undefined;

    const existingReq = existing.cancelRequest || {};
    const now = new Date();

    const normalizedProvider = String(existing?.paymentInfo?.provider ?? "")
      .trim()
      .toLowerCase();
    const tid = String(existing?.paymentInfo?.tid ?? "").trim();
    const isPaymentAlreadyCanceled = isExternallyCanceledPayment({
      paymentStatus: existing.paymentStatus,
      paymentInfo: existing.paymentInfo,
    });
    const shouldCancelViaNice =
      !isPaymentAlreadyCanceled &&
      normalizedProvider === "nicepay" &&
      Boolean(tid) &&
      existing.paymentStatus === "결제완료";

    let nextPaymentInfo: Record<string, any> | null = null;

    if (shouldCancelViaNice) {
      const clientKey = String(
        process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "",
      ).trim();
      const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();

      if (!clientKey || !secretKey) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_CANCEL_CONFIG_MISSING",
            message:
              "NICE 취소 설정이 누락되어 취소를 진행할 수 없습니다. 환경설정을 확인해 주세요.",
          },
          { status: 502 },
        );
      }

      const originalNiceOrderId = String(
        existing.orderId ?? existing.paymentInfo?.rawSummary?.orderId ?? "",
      ).trim();

      if (!originalNiceOrderId) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_ORDER_ID_REQUIRED",
            message:
              "NICE 취소에 필요한 원 결제 주문번호(orderId)가 없어 자동 취소를 진행할 수 없습니다.",
          },
          { status: 400 },
        );
      }

      let niceCancelFailureContext: {
        originalNiceOrderId: string;
        niceCancelOrderId: string;
        cancelAmount: number;
        pgBalanceAmount: number;
        pgStatus: string | null;
      } | null = null;

      try {
        const niceBeforeCancel = await getNicePaymentByTid({
          tid,
          clientKey,
          secretKey,
        });

        const localExpectedAmount = Math.floor(
          Number(existing.paymentInfo?.total ?? existing.totalPrice ?? 0),
        );

        const pgBalanceAmount = Math.floor(Number(niceBeforeCancel.balanceAmt ?? 0));

        const cancelAmount = pgBalanceAmount > 0 ? pgBalanceAmount : localExpectedAmount;

        if (!Number.isFinite(cancelAmount) || cancelAmount <= 0) {
          return NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_CANCEL_AMOUNT_INVALID",
              message: "NICE 취소 금액을 확인할 수 없습니다.",
              data: {
                localExpectedAmount,
                pgBalanceAmount,
                pgStatus: niceBeforeCancel.status ?? null,
              },
            },
            { status: 400 },
          );
        }

        const niceCancelOrderId = createNiceCancelOrderId(existing._id);

        if (process.env.NODE_ENV !== "production") {
          console.info("[nicepay][cancel_amount_decision]", {
            orderId: String(existing._id),
            tid,
            localExpectedAmount,
            pgAmount: niceBeforeCancel.amount ?? null,
            pgBalanceAmount,
            selectedCancelAmount: cancelAmount,
            pgStatus: niceBeforeCancel.status ?? null,
            payMethod: niceBeforeCancel.payMethod ?? null,
            cardCanPartCancel: niceBeforeCancel["card.canPartCancel"] ?? null,
            cancelledAt: niceBeforeCancel.cancelledAt ?? null,
            cancels: niceBeforeCancel.cancels ?? null,
            rawKeys: Object.keys(niceBeforeCancel),
          });
        }

        niceCancelFailureContext = {
          originalNiceOrderId,
          niceCancelOrderId,
          cancelAmount,
          pgBalanceAmount,
          pgStatus: String(niceBeforeCancel.status ?? "").trim() || null,
        };

        const cancelRaw = await cancelNicePaymentByTid({
          tid,
          orderId: niceCancelOrderId,
          cancelAmt: cancelAmount,
          reason: "관리자 주문 취소 승인 처리",
          clientKey,
          secretKey,
        });

        const resultCode = String(cancelRaw.resultCode ?? cancelRaw.ResultCode ?? "").trim();
        const resultMsg = String(cancelRaw.resultMsg ?? cancelRaw.ResultMsg ?? "").trim();
        const successCodes = new Set(["0000", "2001", "2211"]);

        if (resultCode === "2026") {
          const pgStatus = String(niceBeforeCancel.status ?? "").trim() || null;

          await orders.updateOne(
            { _id },
            {
              $set: {
                status: "취소처리중",
                "cancelRequest.status": "approved_pending_pg_cancel",
                "paymentInfo.niceSync.lastSyncedAt": now.toISOString(),
                "paymentInfo.niceSync.source": "admin_cancel_approve_failed",
                "paymentInfo.niceSync.pgStatus": pgStatus,
                "paymentInfo.niceSync.resultCode": "2026",
                "paymentInfo.niceSync.resultMsg": resultMsg || null,
                "paymentInfo.niceSync.cancelAmount": cancelAmount,
                "paymentInfo.niceSync.originalOrderId": originalNiceOrderId,
                "paymentInfo.niceSync.cancelOrderId": niceCancelOrderId,
                "paymentInfo.niceSync.manualActionRequired": true,
                "paymentInfo.niceSync.manualActionReason": "unsettled_amount_shortage",
                "cancelRequest.pgCancelBlocked": {
                  reason: "unsettled_amount_shortage",
                  resultCode: "2026",
                  resultMsg: resultMsg || null,
                  tid,
                  amount: cancelAmount,
                  blockedAt: now,
                },
              },
              $push: {
                history: {
                  status: "PG자동취소실패",
                  date: now,
                  description:
                    "NICE 미정산금액 부족으로 자동 카드취소가 거절되었습니다. 주문 취소 후처리는 진행하지 않았습니다.",
                },
              },
            } as any,
          );

          return NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE",
              message: "NICE 미정산금액 부족으로 자동 카드취소가 불가합니다.",
              adminGuide: {
                title: "NICE 자동 카드취소 불가",
                description:
                  "가맹점 미정산금액이 취소금액보다 부족해 NICE 자동취소가 거절되었습니다. NICE 입금 후 취소 절차를 진행한 뒤, 강제취소 완료 후 PG 상태를 다시 확인해 주세요.",
                nextActions: [
                  "NICE 미정산금액 입금 후 취소 절차를 진행해 주세요.",
                  "NICE에서 강제취소가 완료되면 관리자 주문 상세에서 PG 상태를 다시 확인해 주세요.",
                ],
              },
              data: {
                resultCode: "2026",
                resultMsg: resultMsg || null,
                tid,
                orderId: String(existing._id),
                cancelAmount,
                pgBalanceAmount,
                pgStatus,
              },
            },
            { status: 409 },
          );
        }

        if (!successCodes.has(resultCode)) {
          return NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_CANCEL_FAILED",
              message:
                resultMsg || "NICE 결제 취소가 완료되지 않아 주문 취소를 반영할 수 없습니다.",
              data: {
                resultCode: resultCode || null,
                resultMsg: resultMsg || null,
              },
            },
            { status: 400 },
          );
        }

        const canceledAt =
          String(
            cancelRaw.canceledAt ?? cancelRaw.cancelDate ?? cancelRaw.CancelDate ?? "",
          ).trim() || now.toISOString();
        const pgStatus = String(cancelRaw.status ?? "canceled").trim() || "canceled";

        nextPaymentInfo = {
          ...(existing.paymentInfo ?? {}),
          status: "canceled",
          niceSync: {
            ...(existing.paymentInfo?.niceSync ?? {}),
            lastSyncedAt: now.toISOString(),
            source: "admin_cancel_approve",
            pgStatus,
            resultCode: resultCode || "0000",
            resultMsg: resultMsg || null,
            canceledAt,
            cancelAmount,
            originalOrderId: originalNiceOrderId,
            cancelOrderId: niceCancelOrderId,
          },
        };
      } catch (error: any) {
        const httpStatus = Number(error?.httpStatus ?? 0);
        const errorResultCode = String(error?.resultCode ?? "").trim();
        const errorResultMsg = String(error?.resultMsg ?? error?.message ?? "").trim();

        if (errorResultCode === "2026" && niceCancelFailureContext) {
          await orders.updateOne(
            { _id },
            {
              $set: {
                status: "취소처리중",
                "cancelRequest.status": "approved_pending_pg_cancel",
                "paymentInfo.niceSync.lastSyncedAt": now.toISOString(),
                "paymentInfo.niceSync.source": "admin_cancel_approve_failed",
                "paymentInfo.niceSync.pgStatus": niceCancelFailureContext.pgStatus,
                "paymentInfo.niceSync.resultCode": "2026",
                "paymentInfo.niceSync.resultMsg": errorResultMsg || null,
                "paymentInfo.niceSync.cancelAmount": niceCancelFailureContext.cancelAmount,
                "paymentInfo.niceSync.originalOrderId": niceCancelFailureContext.originalNiceOrderId,
                "paymentInfo.niceSync.cancelOrderId": niceCancelFailureContext.niceCancelOrderId,
                "paymentInfo.niceSync.manualActionRequired": true,
                "paymentInfo.niceSync.manualActionReason": "unsettled_amount_shortage",
                "cancelRequest.pgCancelBlocked": {
                  reason: "unsettled_amount_shortage",
                  resultCode: "2026",
                  resultMsg: errorResultMsg || null,
                  tid,
                  amount: niceCancelFailureContext.cancelAmount,
                  blockedAt: now,
                },
              },
              $push: {
                history: {
                  status: "PG자동취소실패",
                  date: now,
                  description:
                    "NICE 미정산금액 부족으로 자동 카드취소가 거절되었습니다. 주문 취소 후처리는 진행하지 않았습니다.",
                },
              },
            } as any,
          );

          return NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_UNSETTLED_AMOUNT_SHORTAGE",
              message: "NICE 미정산금액 부족으로 자동 카드취소가 불가합니다.",
              adminGuide: {
                title: "NICE 자동 카드취소 불가",
                description:
                  "가맹점 미정산금액이 취소금액보다 부족해 NICE 자동취소가 거절되었습니다. NICE 입금 후 취소 절차를 진행한 뒤, 강제취소 완료 후 PG 상태를 다시 확인해 주세요.",
                nextActions: [
                  "NICE 미정산금액 입금 후 취소 절차를 진행해 주세요.",
                  "NICE에서 강제취소가 완료되면 관리자 주문 상세에서 PG 상태를 다시 확인해 주세요.",
                ],
              },
              data: {
                resultCode: "2026",
                resultMsg: errorResultMsg || null,
                tid,
                orderId: String(existing._id),
                cancelAmount: niceCancelFailureContext.cancelAmount,
                pgBalanceAmount: niceCancelFailureContext.pgBalanceAmount,
                pgStatus: niceCancelFailureContext.pgStatus,
              },
            },
            { status: 409 },
          );
        }

        return NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_CANCEL_FAILED",
            message: errorResultMsg || "NICE 결제 취소 중 오류가 발생했습니다.",
          },
          { status: httpStatus >= 400 && httpStatus < 500 ? 400 : 502 },
        );
      }
    }

    // reasonCode / reasonText 우선순위:
    // 1) 관리자 입력값 > 2) 기존 cancelRequest 값 > 3) 기본값 '기타'
    const reasonCode = inputReasonCode || existingReq.reasonCode || "기타";
    const reasonText = inputReasonText ?? existingReq.reasonText ?? "";

    const updatedCancelRequest = {
      ...existingReq,
      status: "approved" as const,
      reasonCode,
      reasonText,
      requestedAt: existingReq.requestedAt ?? now,
      processedAt: now,
      processedByAdminId: user.sub,
    };

    // ───────────────── 주문 상태/결제 상태/취소 사유 정리 ─────────────────
    const updateFields: any = {
      status: "취소",
      paymentStatus: "결제취소",
      cancelRequest: updatedCancelRequest,
      ...(nextPaymentInfo ? { paymentInfo: nextPaymentInfo } : {}),
    };
    const variantRestore = await restoreOrderVariantStockIfNeeded(db, existing, now);
    if (variantRestore.errorResponse) return variantRestore.errorResponse;
    Object.assign(updateFields, variantRestore.setFields);
    const gaugeRestore = await restoreOrderGaugeStockIfNeeded(db, existing, now);
    if (gaugeRestore.errorResponse) return gaugeRestore.errorResponse;
    Object.assign(updateFields, gaugeRestore.setFields);
    const colorRestore = await restoreOrderColorStockIfNeeded(db, existing, now);
    if (colorRestore.errorResponse) return colorRestore.errorResponse;
    Object.assign(updateFields, colorRestore.setFields);

    // 기존 cancelReason / cancelReasonDetail 필드도 같이 맞춰줌
    updateFields.cancelReason = reasonCode;
    if (reasonCode === "기타") {
      updateFields.cancelReasonDetail = reasonText;
    } else {
      updateFields.cancelReasonDetail = reasonText || undefined;
    }

    // 히스토리 메시지 생성
    const descriptionBase =
      existingReq && existingReq.status === "requested"
        ? "고객의 취소 요청을 관리자 권한으로 승인했습니다."
        : "관리자가 직접 주문을 취소했습니다.";

    const descReason =
      reasonCode || reasonText ? ` 사유: ${reasonCode}${reasonText ? ` (${reasonText})` : ""}` : "";

    const historyEntry = {
      status: "취소",
      date: now,
      description: `${descriptionBase}${descReason}`,
    };

    await orders.updateOne({ _id }, {
      $set: updateFields,
      $push: { history: historyEntry },
    } as any);

    // ───────────────── 포인트 복원/회수 (주문 취소 확정 시점) ─────────────────
    // 이 라우트(/cancel-approve)는 /api/orders/[id] PATCH를 "우회"하므로,
    // 포인트 복원/회수 로직을 여기서도 반드시 수행해야 함.
    // 정책:
    // - pointsUsed(사용 포인트)는 주문 취소/환불 시 항상 복원
    // - 결제완료로 적립된 포인트(order_reward)는 취소/환불 시 회수
    // - refKey 유니크 인덱스로 멱등 처리(중복 실행되어도 1회만 반영)
    try {
      const uid = existing.userId;
      const uidStr = uid ? String(uid) : "";
      if (ObjectId.isValid(uidStr)) {
        const userOid = new ObjectId(uidStr);

        const orderObjectId = String(existing._id);
        const txCol = db.collection("points_transactions");

        // (1) 사용 포인트 복원
        const spendRefKey = `order:${orderObjectId}:spend`;
        const restoreRefKey = `order:${orderObjectId}:spend_reversal`;

        const spendTx: any = await txCol.findOne({
          refKey: spendRefKey,
          status: "confirmed",
        });
        const amountFromTx = Math.abs(Number(spendTx?.amount ?? 0));
        const amountFromOrder = Number(
          existing.pointsUsed ?? existing.paymentInfo?.pointsUsed ?? 0,
        );
        const amountToRestore = Math.max(0, Math.trunc(amountFromTx || amountFromOrder || 0));

        if (amountToRestore > 0) {
          await grantPoints(db, {
            userId: userOid,
            amount: amountToRestore,
            type: "reversal",
            status: "confirmed",
            refKey: restoreRefKey,
            reason: `주문 취소로 사용 포인트 복원 (${existing.orderId ?? ""})`.trim(),
            ref: { orderId: existing._id },
          });
        }

        // (2) 결제완료로 적립된 포인트 회수
        const rewardRefKey = `order_reward:${orderObjectId}`;
        const revokeRefKey = `order_reward_revoke:${orderObjectId}`;

        const rewardTx: any = await txCol.findOne({
          refKey: rewardRefKey,
          status: "confirmed",
        });
        const earned = Math.max(0, Math.trunc(Number(rewardTx?.amount ?? 0)));

        if (earned > 0) {
          await deductPoints(db, {
            userId: userOid,
            amount: earned,
            type: "reversal",
            status: "confirmed",
            refKey: revokeRefKey,
            reason: `주문 취소로 적립 포인트 회수 (${existing.orderId ?? ""})`.trim(),
            ref: { orderId: existing._id },
            // 적립 포인트를 이미 사용한 상태에서도 취소/환불이 발생할 수 있음 → 음수 허용(정책)
            allowNegativeBalance: true,
          });
        }
      }
    } catch (e) {
      // 포인트 처리 실패가 "주문 취소 승인" 자체를 막으면 UX가 깨짐 → 로그만 남기고 진행
      console.error("[cancel-approve] points restore/revoke error:", e);
    }

    let linkedApplicationCount = 0;

    // 연결된 스트링 교체 서비스 신청이 있는 경우 함께 취소 처리
    try {
      const appsCol = db.collection("stringing_applications");

      // orderId 기준으로 모든 신청 조회
      const linkedApps = await appsCol.find({ orderId: existing._id }).toArray();
      linkedApplicationCount = linkedApps.length;

      const now = new Date();

      for (const appDoc of linkedApps) {
        if (!appDoc) continue;
        if (appDoc.status === "취소") continue;

        const appKey = appDoc._id;

        // 1) 패키지 사용분 복원
        if (appDoc.packageApplied && appDoc.packagePassId) {
          try {
            await revertConsumption(db, appDoc.packagePassId, appKey);
          } catch (e) {
            console.error("[cancel-approve] revertConsumption error (linked application)", e);
          }
        }

        // 2) cancelRequest + status + history 업데이트
        const currentCancel = appDoc.cancelRequest ?? {};
        const linkedAppSetFields: Record<string, unknown> = {
          status: "취소",
          cancelRequest: {
            ...currentCancel,
            status: "approved",
            approvedAt: now,
          },
        };
        const selectedGauge =
          typeof appDoc?.meta?.selectedGauge === "string" && appDoc.meta.selectedGauge.trim()
            ? appDoc.meta.selectedGauge.trim()
            : undefined;
        const hasDeductedGaugeStock = Boolean(appDoc?.meta?.gaugeStockDeductedAt);
        const alreadyRestoredGaugeStock = Boolean(appDoc?.meta?.gaugeStockRestoredAt);

        if (hasDeductedGaugeStock && selectedGauge && !alreadyRestoredGaugeStock) {
          const stringProductObjectId = pickStringProductObjectIdFromApplicationDoc(appDoc);
          if (!stringProductObjectId) {
            console.error(
              "[cancel-approve] missing linked application string product id for gauge stock restore",
              {
                applicationId: appDoc?._id ? String(appDoc._id) : null,
                selectedGauge,
              },
            );
          } else {
            const linkedRestoreResult = await db.collection("products").updateOne(
              {
                _id: stringProductObjectId,
                sold: { $gte: 1 },
                "gaugeInventories.value": selectedGauge,
              },
              {
                $inc: {
                  "gaugeInventories.$.stock": 1,
                  "inventory.stock": 1,
                  sold: -1,
                },
              },
            );
            if (!linkedRestoreResult.matchedCount || !linkedRestoreResult.modifiedCount) {
              return NextResponse.json(
                {
                  ok: false,
                  code: "GAUGE_STOCK_RESTORE_FAILED",
                  message: "주문 취소 중 스트링 게이지(굵기) 재고 복구에 실패했습니다.",
                },
                { status: 409 },
              );
            }
            linkedAppSetFields["meta.gaugeStockRestoredAt"] = now;
            linkedAppSetFields["meta.gaugeStockRestoreReason"] =
              "order_cancel_approved_linked_application";
          }
        }

        await appsCol.updateOne(
          { _id: appKey } as any,
          {
            $set: linkedAppSetFields,
            $push: {
              history: {
                status: "취소",
                date: now,
                description: "주문 취소 승인에 따라 신청도 함께 취소되었습니다.",
              },
            },
          } as any,
        );
      }
    } catch (e) {
      console.error("[cancel-approve] linked stringing application cancel error:", e);
    }

    await appendAdminAudit(
      db,
      {
        type: "order_cancel_request_approved",
        actorId: user.sub,
        targetId: _id,
        message: "관리자 주문 취소 요청 승인",
        diff: {
          targetType: "order",
          orderId: _id.toString(),
          actorRole: "admin",
          reasonCode,
          reasonTextPreview: toReasonPreview(reasonText),
          refundAccountMasked: maskRefundAccount(existingReq.refundAccount),
          prevCancelStatus: existingReq.status ?? null,
          nextCancelStatus: updatedCancelRequest.status,
          orderStatus: updateFields.status ?? existing.status ?? null,
          paymentStatus: updateFields.paymentStatus ?? existing.paymentStatus ?? null,
          linkedApplicationCount,
        },
      },
      req,
    );

    const subject = buildCancelRefundSubject({
      userId: existing.userId ? existing.userId.toString() : null,
      orderId: _id.toString(),
    });

    await recordCancelRefundSignal(db, {
      eventType: "order_cancel_request_approved",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "order",
      targetId: _id,
      actorRole: "admin",
      reasonCode,
      status: updatedCancelRequest.status,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/orders/[id]/cancel-approve 오류:", error);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}
