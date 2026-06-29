import { submitStringingApplicationCore } from "@/app/features/stringing-applications/api/submit-core";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import {
  buildSlotSummaryForDate,
  loadStringingSettings,
  validateBookingWindow,
} from "@/app/features/stringing-applications/lib/slotEngine";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import { normalizeOrderStatus, normalizePaymentStatus } from "@/lib/admin-ops-normalize";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { appendAudit } from "@/lib/audit";
import {
  signApplicationAccessToken,
  verifyAccessToken,
  verifyOrderAccessToken,
} from "@/lib/auth.utils";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import clientPromise, { getDb } from "@/lib/mongodb";
import { normalizeOrderShippingMethod } from "@/lib/order-shipping";
import { cancelNicePaymentByTid } from "@/lib/payments/nice/server";
import { revertConsumption } from "@/lib/passes.service";
import {
  buildCancelRefundSubject,
  recordCancelRefundSignal,
} from "@/lib/risk/recordCancelRefundSignal";
import { calcStringingMountingFeeByProductId, calcStringingTotal } from "@/lib/pricing";
import { normalizeEmailForSearch } from "@/lib/search-email";
import {
  findCourierCatalogItem,
  getCourierDisplayName,
  normalizeCourierCode,
} from "@/lib/shipping/courier-map";
import {
  isValidTrackingNumberLength,
  normalizeTrackingNumber,
} from "@/lib/shipping/tracking-number";
import { getStringingServicePrice } from "@/lib/stringing-prices";
import { ServicePassConsumption } from "@/lib/types/pass";
import { HistoryItem, HistoryRecord } from "@/lib/types/stringing-application-db";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const INPROGRESS_STATUSES = ["draft", "검토 중", "접수완료", "작업 중"] as const;
const ORDER_TERMINAL_STATUSES = new Set(["취소", "결제취소", "환불", "구매확정", "완료"]);
const ORDER_SHIPPING_PHASE_STATUSES = new Set(["배송중", "배송완료"]);

type ServicePickupMethod = "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT";

function normalizeServicePickupMethod(raw: unknown): ServicePickupMethod | null {
  if (raw === "SELF_SEND" || raw === "COURIER_VISIT" || raw === "SHOP_VISIT") return raw;
  if (raw === "COURIER_PICKUP") return "COURIER_VISIT";
  if (raw === "VISIT") return "SHOP_VISIT";
  return null;
}

function toCollectionMethodFromServicePickup(
  raw: unknown,
): "self_ship" | "courier_pickup" | "visit" {
  const pickup = normalizeServicePickupMethod(raw);
  if (pickup === "SHOP_VISIT") return "visit";
  if (pickup === "COURIER_VISIT") return "courier_pickup";
  return "self_ship";
}
type CancelStatus = "none" | "requested" | "approved" | "rejected";
type LinkedPaymentSource = "order" | "rental" | "application" | "package" | null;

type LinkedPaymentPayload = {
  source: LinkedPaymentSource;
  status: string | null;
  method: string | null;
  provider: string | null;
  easyPayProvider?: string | null;
  tid?: string | null;
  bank?: string | null;
  depositor?: string | null;
  cardDisplayName?: string | null;
  cardCompany?: string | null;
  cardLabel?: string | null;
  approvedAt?: string | null;
  niceSync?: {
    lastSyncedAt?: string | null;
    pgStatus?: string | null;
    source?: string | null;
    resultCode?: string | null;
    resultMsg?: string | null;
    canceledAt?: string | null;
    cancelAmount?: number | null;
  } | null;
  rawSummary?: {
    orderId?: string | null;
    resultCode?: string | null;
    resultMsg?: string | null;
    goodsName?: string | null;
  } | null;
};

function formatAdminAlertDate(value: unknown) {
  if (!value) return "미입력";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function normalizeCancelStatus(raw: any): CancelStatus {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return "none";

  // 한글/영문 혼재 대응
  if (v === "요청") return "requested";
  if (v === "승인") return "approved";
  if (v === "거절") return "rejected";

  // 이미 표준값이면 그대로
  if (v === "requested" || v === "approved" || v === "rejected" || v === "none") return v;

  // 그 외 알 수 없는 값은 안전하게 none 처리
  return "none";
}

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

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function normalizeLinkedPaymentStatus(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const original = raw.trim();
  if (!original) return null;
  const normalized = original.toLowerCase();

  if (["결제완료", "paid", "done", "approved", "success"].includes(normalized)) return "결제완료";
  if (["결제대기", "ready", "pending", "waiting"].includes(normalized)) return "결제대기";
  if (["결제취소", "취소", "cancelled", "canceled"].includes(normalized)) return "결제취소";
  if (["결제실패", "실패", "failed", "failure"].includes(normalized)) return "결제실패";

  return original;
}

function buildLinkedPaymentFromDoc(
  source: Exclude<LinkedPaymentSource, "application" | "package" | null>,
  doc: any,
): LinkedPaymentPayload {
  const paymentInfo = (doc as any)?.paymentInfo ?? {};
  const niceSyncRaw = paymentInfo?.niceSync;
  const normalizedStatus =
    normalizeLinkedPaymentStatus(doc?.paymentStatus) ??
    normalizeLinkedPaymentStatus(paymentInfo?.status);

  return {
    source,
    status: normalizedStatus,
    method: typeof paymentInfo?.method === "string" ? paymentInfo.method : null,
    provider: typeof paymentInfo?.provider === "string" ? paymentInfo.provider : null,
    easyPayProvider:
      typeof paymentInfo?.easyPayProvider === "string" ? paymentInfo.easyPayProvider : null,
    tid: typeof paymentInfo?.tid === "string" ? paymentInfo.tid : null,
    bank: typeof paymentInfo?.bank === "string" ? paymentInfo.bank : null,
    depositor: typeof paymentInfo?.depositor === "string" ? paymentInfo.depositor : null,
    cardDisplayName:
      typeof paymentInfo?.cardDisplayName === "string" ? paymentInfo.cardDisplayName : null,
    cardCompany: typeof paymentInfo?.cardCompany === "string" ? paymentInfo.cardCompany : null,
    cardLabel: typeof paymentInfo?.cardLabel === "string" ? paymentInfo.cardLabel : null,
    approvedAt: toIsoOrNull(paymentInfo?.approvedAt),
    niceSync: niceSyncRaw
      ? {
          lastSyncedAt: toIsoOrNull(niceSyncRaw.lastSyncedAt),
          pgStatus: typeof niceSyncRaw.pgStatus === "string" ? niceSyncRaw.pgStatus : null,
          source: typeof niceSyncRaw.source === "string" ? niceSyncRaw.source : null,
          resultCode: typeof niceSyncRaw.resultCode === "string" ? niceSyncRaw.resultCode : null,
          resultMsg: typeof niceSyncRaw.resultMsg === "string" ? niceSyncRaw.resultMsg : null,
          canceledAt: toIsoOrNull(niceSyncRaw.canceledAt),
          cancelAmount:
            typeof niceSyncRaw.cancelAmount === "number" ? niceSyncRaw.cancelAmount : null,
        }
      : null,
    rawSummary: paymentInfo?.rawSummary
      ? {
          orderId:
            typeof paymentInfo.rawSummary.orderId === "string"
              ? paymentInfo.rawSummary.orderId
              : null,
          resultCode:
            typeof paymentInfo.rawSummary.resultCode === "string"
              ? paymentInfo.rawSummary.resultCode
              : null,
          resultMsg:
            typeof paymentInfo.rawSummary.resultMsg === "string"
              ? paymentInfo.rawSummary.resultMsg
              : null,
          goodsName:
            typeof paymentInfo.rawSummary.goodsName === "string"
              ? paymentInfo.rawSummary.goodsName
              : null,
        }
      : null,
  };
}

type StringingCancelPaymentContext = {
  packageApplied: boolean;
  status: string | null;
  provider: string;
};

type AdminCancelRefundContext = {
  paymentStatusAtCancel: string | null;
  paymentMethodAtCancel: string | null;
  paymentProviderAtCancel: string | null;
  refundRequired: boolean;
  refundMethod:
    | "package_restore"
    | "nicepay_cancel_required"
    | "nicepay_cancelled"
    | "manual_bank_refund_required"
    | "none"
    | "manual_review_required";
  refundNote: string;
};

function normalizePaymentProvider(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function resolveAdminCancelRefundContext(appDoc: any): AdminCancelRefundContext {
  const packageApplied = Boolean(appDoc?.packageApplied || appDoc?.packageInfo?.applied);
  const paymentInfo = appDoc?.paymentInfo ?? {};
  const paymentStatusAtCancel =
    normalizeLinkedPaymentStatus(appDoc?.paymentStatus ?? paymentInfo?.status) ??
    (typeof appDoc?.paymentStatus === "string" && appDoc.paymentStatus.trim()
      ? appDoc.paymentStatus.trim()
      : null);
  const paymentMethodAtCancel =
    typeof appDoc?.paymentMethod === "string" && appDoc.paymentMethod.trim()
      ? appDoc.paymentMethod.trim()
      : typeof paymentInfo?.method === "string" && paymentInfo.method.trim()
        ? paymentInfo.method.trim()
        : null;
  const paymentProviderAtCancel =
    typeof paymentInfo?.provider === "string" && paymentInfo.provider.trim()
      ? paymentInfo.provider.trim()
      : typeof appDoc?.paymentProvider === "string" && appDoc.paymentProvider.trim()
        ? appDoc.paymentProvider.trim()
        : null;

  if (packageApplied) {
    return {
      paymentStatusAtCancel,
      paymentMethodAtCancel,
      paymentProviderAtCancel,
      refundRequired: false,
      refundMethod: "package_restore",
      refundNote: "패키지 사용 회차 복원 대상입니다.",
    };
  }

  if (paymentStatusAtCancel !== "결제완료") {
    return {
      paymentStatusAtCancel,
      paymentMethodAtCancel,
      paymentProviderAtCancel,
      refundRequired: false,
      refundMethod: "none",
      refundNote: "결제 전 상태로 별도 환불 처리는 필요하지 않습니다.",
    };
  }

  const paymentMethod = normalizePaymentProvider(paymentMethodAtCancel);
  const paymentProvider = normalizePaymentProvider(paymentProviderAtCancel);
  const paymentText = `${paymentMethod} ${paymentProvider} ${normalizePaymentProvider(paymentInfo?.tid)} ${normalizePaymentProvider(paymentInfo?.cardCompany)} ${normalizePaymentProvider(paymentInfo?.cardLabel)}`;

  if (
    paymentProvider === "nicepay" ||
    paymentMethod === "nicepay" ||
    paymentText.includes("card") ||
    paymentText.includes("카드")
  ) {
    return {
      paymentStatusAtCancel,
      paymentMethodAtCancel,
      paymentProviderAtCancel,
      refundRequired: true,
      refundMethod: "nicepay_cancel_required",
      refundNote: "NICEPAY 결제취소 연동 확인 대상입니다.",
    };
  }

  if (
    paymentMethod.includes("bank") ||
    paymentMethod.includes("무통장") ||
    paymentMethod.includes("계좌") ||
    paymentProvider.includes("bank") ||
    paymentProvider.includes("은행")
  ) {
    return {
      paymentStatusAtCancel,
      paymentMethodAtCancel,
      paymentProviderAtCancel,
      refundRequired: true,
      refundMethod: "manual_bank_refund_required",
      refundNote: "수동 환불 처리가 별도로 필요합니다.",
    };
  }

  return {
    paymentStatusAtCancel,
    paymentMethodAtCancel,
    paymentProviderAtCancel,
    refundRequired: true,
    refundMethod: "manual_review_required",
    refundNote: "결제수단 확인 후 환불 필요 여부를 수동 검토해야 합니다.",
  };
}

function isStandaloneStringingApplication(appDoc: any): boolean {
  const paymentSource = String(appDoc?.paymentSource ?? "").trim();
  return (
    !appDoc?.orderId &&
    !appDoc?.rentalId &&
    !paymentSource.startsWith("order:") &&
    !paymentSource.startsWith("rental:")
  );
}

function pickStandaloneStringingNiceOrderId(appDoc: any): string {
  const paymentInfo = appDoc?.paymentInfo ?? {};
  return String(
    paymentInfo?.rawSummary?.orderId ??
      paymentInfo?.orderId ??
      appDoc?.niceOrderId ??
      appDoc?.paymentOrderId ??
      "",
  ).trim();
}

function buildApprovedStringingCancelRequest(params: {
  appDoc: any;
  now: Date;
  adminUserId: string;
  mode: "request_approve" | "admin_direct";
  reason?: string;
}) {
  const existingReq = params.appDoc?.cancelRequest ?? {};
  if (params.mode === "admin_direct") {
    return {
      ...existingReq,
      status: "approved" as const,
      reasonCode: "관리자 직접 취소",
      reasonText: params.reason ?? "",
      requestedAt: existingReq.requestedAt ?? params.now,
      processedAt: params.now,
      handledAt: params.now,
      processedByAdminId: params.adminUserId,
      approvedAt: params.now,
    };
  }

  return {
    ...existingReq,
    status: "approved" as const,
    reasonCode: existingReq.reasonCode ?? "기타",
    reasonText: existingReq.reasonText ?? "",
    requestedAt: existingReq.requestedAt ?? params.now,
    processedAt: params.now,
    handledAt: params.now,
    processedByAdminId: params.adminUserId,
    approvedAt: params.now,
  };
}

async function prepareStandaloneStringingCancellation(params: {
  appDoc: any;
  now: Date;
  adminUserId: string;
  mode: "request_approve" | "admin_direct";
  reason?: string;
}) {
  const { appDoc, now, mode } = params;
  const paymentInfo = appDoc?.paymentInfo ?? {};
  const normalizedProvider = normalizePaymentProvider(paymentInfo?.provider);
  const tid = String(paymentInfo?.tid ?? "").trim();
  const shouldCancelViaNice =
    isStandaloneStringingApplication(appDoc) &&
    normalizedProvider === "nicepay" &&
    Boolean(tid) &&
    appDoc?.paymentStatus === "결제완료";

  const updatedCancelRequest = buildApprovedStringingCancelRequest(params);
  const paymentUpdateFields: Record<string, unknown> = {
    paymentStatus: "결제취소",
    paymentInfo: {
      ...(paymentInfo ?? {}),
      status: "canceled",
    },
  };
  let niceCancelMetadata: Record<string, unknown> = {
    niceCancelAttempted: false,
    niceCancelSucceeded: false,
  };
  let niceCancelSucceeded = false;

  if (shouldCancelViaNice) {
    const clientKey = String(
      process.env.NICEPAY_CLIENT_KEY ?? process.env.NICEPAY_CLIENT_ID ?? "",
    ).trim();
    const secretKey = String(process.env.NICEPAY_SECRET_KEY ?? "").trim();

    if (!clientKey || !secretKey) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_CANCEL_CONFIG_MISSING",
            message: "NICE 취소 설정이 누락되어 취소를 진행할 수 없습니다. 환경설정을 확인해 주세요.",
          },
          { status: 502 },
        ),
      };
    }

    const niceOrderId = pickStandaloneStringingNiceOrderId(appDoc);
    if (!niceOrderId) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_ORDER_ID_REQUIRED",
            message: "NICE 취소에 필요한 주문번호(orderId)가 없어 자동 취소를 진행할 수 없습니다.",
          },
          { status: 400 },
        ),
      };
    }

    try {
      const cancelRaw = await cancelNicePaymentByTid({
        tid,
        orderId: niceOrderId,
        reason:
          mode === "request_approve"
            ? "관리자 교체서비스 신청 취소 요청 승인 처리"
            : "관리자 교체서비스 신청 직접 취소 처리",
        clientKey,
        secretKey,
      });
      const resultCode = String(cancelRaw.resultCode ?? cancelRaw.ResultCode ?? "").trim();
      const resultMsg = String(cancelRaw.resultMsg ?? cancelRaw.ResultMsg ?? "").trim();
      if (resultCode !== "0000") {
        return {
          ok: false as const,
          response: NextResponse.json(
            {
              ok: false,
              errorCode: "NICE_CANCEL_FAILED",
              message: resultMsg || "NICE 결제 취소가 완료되지 않아 신청 취소를 반영할 수 없습니다.",
              data: { resultCode: resultCode || null, resultMsg: resultMsg || null },
            },
            { status: 400 },
          ),
        };
      }

      const canceledAt =
        String(cancelRaw.canceledAt ?? cancelRaw.cancelDate ?? cancelRaw.CancelDate ?? "").trim() ||
        now.toISOString();
      const pgStatus = String(cancelRaw.status ?? "canceled").trim() || "canceled";
      paymentUpdateFields.paymentInfo = {
        ...(paymentInfo ?? {}),
        status: "canceled",
        niceSync: {
          ...(paymentInfo?.niceSync ?? {}),
          lastSyncedAt: now.toISOString(),
          source: mode === "request_approve" ? "stringing_cancel_approve" : "stringing_admin_direct_cancel",
          pgStatus,
          resultCode: resultCode || "0000",
          resultMsg: resultMsg || null,
          canceledAt,
        },
      };
      niceCancelSucceeded = true;
      niceCancelMetadata = {
        niceCancelAttempted: true,
        niceCancelSucceeded: true,
        niceCancelResultCode: resultCode || "0000",
        refundMethod: "nicepay_cancelled",
      };
    } catch (error: any) {
      const httpStatus = Number(error?.httpStatus ?? 0);
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            ok: false,
            errorCode: "NICE_CANCEL_FAILED",
            message: error?.resultMsg || error?.message || "NICE 결제 취소 중 오류가 발생했습니다.",
          },
          { status: httpStatus >= 400 && httpStatus < 500 ? 400 : 502 },
        ),
      };
    }
  }

  return {
    ok: true as const,
    updatedCancelRequest,
    paymentUpdateFields,
    niceCancelSucceeded,
    niceCancelMetadata,
  };
}

function getObjectIdFromPaymentSource(
  paymentSource: string,
  prefix: "order" | "rental",
): ObjectId | null {
  const marker = `${prefix}:`;
  if (!paymentSource.startsWith(marker)) return null;
  const rawId = paymentSource.slice(marker.length).trim();
  if (!ObjectId.isValid(rawId)) return null;
  return new ObjectId(rawId);
}

function getObjectIdFromField(value: unknown): ObjectId | null {
  if (!value) return null;
  const rawId = String(value).trim();
  if (!ObjectId.isValid(rawId)) return null;
  return new ObjectId(rawId);
}

async function resolveStringingCancelPaymentContext(
  db: any,
  appDoc: any,
): Promise<StringingCancelPaymentContext> {
  const packageApplied = Boolean(appDoc?.packageApplied || appDoc?.packageInfo?.applied);
  if (packageApplied) {
    return { packageApplied: true, status: "패키지 적용 완료", provider: "" };
  }

  const paymentSourceRaw = String(appDoc?.paymentSource ?? "").trim();
  const orderObjectId =
    getObjectIdFromPaymentSource(paymentSourceRaw, "order") ??
    getObjectIdFromField(appDoc?.orderId);
  const rentalObjectId =
    getObjectIdFromPaymentSource(paymentSourceRaw, "rental") ??
    getObjectIdFromField(appDoc?.rentalId);

  let linkedPayment: LinkedPaymentPayload | null = null;
  if (paymentSourceRaw.startsWith("order:") && orderObjectId) {
    const order = await db
      .collection("orders")
      .findOne({ _id: orderObjectId }, { projection: { paymentStatus: 1, paymentInfo: 1 } });
    if (order) linkedPayment = buildLinkedPaymentFromDoc("order", order);
  }

  if (!linkedPayment && paymentSourceRaw.startsWith("rental:") && rentalObjectId) {
    const rental = await db
      .collection("rental_orders")
      .findOne({ _id: rentalObjectId }, { projection: { paymentStatus: 1, paymentInfo: 1 } });
    if (rental) linkedPayment = buildLinkedPaymentFromDoc("rental", rental);
  }

  if (!linkedPayment && orderObjectId) {
    const order = await db
      .collection("orders")
      .findOne({ _id: orderObjectId }, { projection: { paymentStatus: 1, paymentInfo: 1 } });
    if (order) linkedPayment = buildLinkedPaymentFromDoc("order", order);
  }

  if (!linkedPayment && rentalObjectId) {
    const rental = await db
      .collection("rental_orders")
      .findOne({ _id: rentalObjectId }, { projection: { paymentStatus: 1, paymentInfo: 1 } });
    if (rental) linkedPayment = buildLinkedPaymentFromDoc("rental", rental);
  }

  const fallbackPaymentInfo = appDoc?.paymentInfo ?? {};
  return {
    packageApplied: false,
    status: linkedPayment?.status ?? normalizeLinkedPaymentStatus(appDoc?.paymentStatus),
    provider: normalizePaymentProvider(
      linkedPayment?.provider ??
        fallbackPaymentInfo?.provider ??
        appDoc?.paymentProvider ??
        appDoc?.paymentMethod,
    ),
  };
}

function getApplicationLines(stringDetails: any): any[] {
  // 통합 플로우 우선(lines) + 레거시(racketLines) fallback
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

async function resolveInboundTrackingPolicy(db: any, appDoc: any, preloadedOrder?: any | null) {
  const collectionMethod = normalizeCollection(
    appDoc?.collectionMethod ?? appDoc?.shippingInfo?.collectionMethod ?? "self_ship",
  );

  let order = preloadedOrder ?? null;
  if (!order && appDoc?.orderId && ObjectId.isValid(String(appDoc.orderId))) {
    order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(String(appDoc.orderId)) }, { projection: { items: 1 } });
  }

  const orderHasRacket =
    Array.isArray(order?.items) && order.items.some((it: any) => it?.kind === "racket");
  const inboundRequired = appDoc?.rentalId ? false : appDoc?.orderId ? !orderHasRacket : true;
  const needsInboundTracking = inboundRequired && collectionMethod === "self_ship";

  return {
    collectionMethod,
    inboundRequired,
    needsInboundTracking,
    orderHasRacket,
  };
}

async function requireAdminUserFromAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) {
    return {
      ok: false as const,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  const payload = verifyAccessToken(token);
  const userId = (payload as any)?.sub;
  if (!payload || typeof userId !== "string" || !ObjectId.isValid(userId)) {
    return {
      ok: false as const,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  const db = await getDb();
  const me = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
  if (!me || me.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, db, userId };
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

function resolveVariantStockDeduction(
  appDoc: any,
): { mode: string; colorValue?: string; gaugeValue?: string } | null {
  const candidates = [
    appDoc?.stockDeduction,
    appDoc?.stringing?.stockDeduction,
    appDoc?.selectedString?.stockDeduction,
    appDoc?.stringProduct?.stockDeduction,
  ];
  for (const item of candidates) {
    if (item && typeof item === "object" && typeof item.mode === "string") {
      return item as { mode: string; colorValue?: string; gaugeValue?: string };
    }
  }
  return null;
}

async function restoreStringingVariantStockIfNeeded(db: any, appDoc: any, now: Date) {
  const stockDeduction = resolveVariantStockDeduction(appDoc);
  const mode = String(stockDeduction?.mode ?? "").trim();
  const alreadyRestored = Boolean(appDoc?.stockRestore?.variantStockRestoredAt);
  if (mode !== "variant" || alreadyRestored) {
    return {
      restored: false,
      skippedReason: "not_required",
      setFields: {} as Record<string, unknown>,
    };
  }

  const selectedColor =
    typeof stockDeduction?.colorValue === "string" && stockDeduction.colorValue.trim()
      ? stockDeduction.colorValue.trim()
      : typeof appDoc?.meta?.selectedColor === "string" && appDoc.meta.selectedColor.trim()
        ? appDoc.meta.selectedColor.trim()
        : undefined;
  const selectedGauge =
    typeof stockDeduction?.gaugeValue === "string" && stockDeduction.gaugeValue.trim()
      ? stockDeduction.gaugeValue.trim()
      : typeof appDoc?.meta?.selectedGauge === "string" && appDoc.meta.selectedGauge.trim()
        ? appDoc.meta.selectedGauge.trim()
        : undefined;
  if (!selectedColor || !selectedGauge) {
    return {
      restored: false,
      skippedReason: "missing_selection",
      setFields: {} as Record<string, unknown>,
    };
  }

  const stringProductObjectId = pickStringProductObjectIdFromApplicationDoc(appDoc);
  if (!stringProductObjectId) {
    return {
      restored: false,
      skippedReason: "missing_product_id",
      setFields: {} as Record<string, unknown>,
    };
  }

  const quantity = 1;
  const restoreResult = await db.collection("products").updateOne(
    {
      _id: stringProductObjectId,
      sold: { $gte: quantity },
      variantInventories: {
        $elemMatch: {
          colorValue: selectedColor,
          gaugeValue: selectedGauge,
        },
      },
    },
    {
      $inc: {
        "variantInventories.$[variant].stock": quantity,
        "colorInventories.$[color].stock": quantity,
        "gaugeInventories.$[gauge].stock": quantity,
        "inventory.stock": quantity,
        sold: -quantity,
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
    },
  );

  if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
    return {
      restored: false,
      skippedReason: "restore_failed",
      errorResponse: NextResponse.json(
        {
          error: "신청서 취소 중 옵션 조합 재고 복구에 실패했습니다.",
          code: "VARIANT_STOCK_RESTORE_FAILED",
        },
        { status: 409 },
      ),
      setFields: {} as Record<string, unknown>,
    };
  }

  return {
    restored: true,
    skippedReason: null,
    setFields: {
      "stockRestore.variantStockRestoredAt": now,
      "stockRestore.variantStockRestoreReason": "stringing_application_cancelled",
    } as Record<string, unknown>,
  };
}

async function restoreStringingGaugeStockIfNeeded(
  db: any,
  appDoc: any,
  now: Date,
  restoreReason = "cancel_approved",
) {
  if (resolveVariantStockDeduction(appDoc)?.mode === "variant") {
    return {
      restored: false,
      skippedReason: "variant_mode",
      setFields: {} as Record<string, unknown>,
    };
  }
  const selectedGauge =
    typeof appDoc?.meta?.selectedGauge === "string" && appDoc.meta.selectedGauge.trim()
      ? appDoc.meta.selectedGauge.trim()
      : undefined;
  const hasDeducted = Boolean(appDoc?.meta?.gaugeStockDeductedAt);
  const alreadyRestored = Boolean(appDoc?.meta?.gaugeStockRestoredAt);

  if (!hasDeducted || alreadyRestored || !selectedGauge) {
    return {
      restored: false,
      skippedReason: "not_required",
      setFields: {} as Record<string, unknown>,
    };
  }

  const stringProductObjectId = pickStringProductObjectIdFromApplicationDoc(appDoc);
  if (!stringProductObjectId) {
    console.error(
      "[restoreStringingGaugeStockIfNeeded] missing string product id for deducted application",
      {
        applicationId: appDoc?._id ? String(appDoc._id) : null,
        selectedGauge,
      },
    );
    return {
      restored: false,
      skippedReason: "missing_product_id",
      setFields: {} as Record<string, unknown>,
    };
  }

  const restoreResult = await db.collection("products").updateOne(
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

  if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
    return {
      restored: false,
      skippedReason: "restore_failed",
      errorResponse: NextResponse.json(
        {
          error: "스트링 굵기 재고 복구에 실패했습니다.",
          code: "GAUGE_STOCK_RESTORE_FAILED",
        },
        { status: 409 },
      ),
      setFields: {} as Record<string, unknown>,
    };
  }

  return {
    restored: true,
    skippedReason: null,
    setFields: {
      "meta.gaugeStockRestoredAt": now,
      "meta.gaugeStockRestoreReason": restoreReason,
    } as Record<string, unknown>,
  };
}

async function restoreStringingColorStockIfNeeded(
  db: any,
  appDoc: any,
  now: Date,
  restoreReason = "cancel_approved",
) {
  if (resolveVariantStockDeduction(appDoc)?.mode === "variant") {
    return {
      restored: false,
      skippedReason: "variant_mode",
      setFields: {} as Record<string, unknown>,
    };
  }
  const selectedColor =
    typeof appDoc?.meta?.selectedColor === "string" && appDoc.meta.selectedColor.trim()
      ? appDoc.meta.selectedColor.trim()
      : undefined;
  const hasDeducted = Boolean(appDoc?.meta?.colorStockDeductedAt);
  const alreadyRestored = Boolean(appDoc?.meta?.colorStockRestoredAt);
  if (!hasDeducted || alreadyRestored || !selectedColor) {
    return {
      restored: false,
      skippedReason: "not_required",
      setFields: {} as Record<string, unknown>,
    };
  }

  const stringProductObjectId = pickStringProductObjectIdFromApplicationDoc(appDoc);
  if (!stringProductObjectId) {
    return {
      restored: false,
      skippedReason: "missing_product_id",
      setFields: {} as Record<string, unknown>,
    };
  }
  const hasGaugeDeducted = Boolean(appDoc?.meta?.gaugeStockDeductedAt);
  const restoreResult = await db.collection("products").updateOne(
    {
      _id: stringProductObjectId,
      "colorInventories.value": selectedColor,
      ...(hasGaugeDeducted ? {} : { sold: { $gte: 1 } }),
    },
    {
      $inc: hasGaugeDeducted
        ? { "colorInventories.$.stock": 1 }
        : { "colorInventories.$.stock": 1, "inventory.stock": 1, sold: -1 },
    },
  );
  if (!restoreResult.matchedCount || !restoreResult.modifiedCount) {
    return {
      restored: false,
      skippedReason: "restore_failed",
      errorResponse: NextResponse.json(
        {
          error: "스트링 색상 재고 복구에 실패했습니다.",
          code: "COLOR_STOCK_RESTORE_FAILED",
        },
        { status: 409 },
      ),
      setFields: {} as Record<string, unknown>,
    };
  }
  return {
    restored: true,
    skippedReason: null,
    setFields: {
      "meta.colorStockRestoredAt": now,
      "meta.colorStockRestoreReason": restoreReason,
    } as Record<string, unknown>,
  };
}

// ================= GET (단일 신청서 조회) =================
export async function handleGetStringingApplication(req: Request, id: string) {
  const client = await clientPromise;
  const db = await getDb();

  try {
    // 단일 조회 핸들러의 id 검사
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(id) });
    if (!app) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 1순위: 새 표준 필드(app.stringItems)가 있으면 그대로 사용
    let stringItems: { id: string; name: string }[] = [];

    if (Array.isArray((app as any).stringItems) && (app as any).stringItems.length > 0) {
      stringItems = (app as any).stringItems.map((it: any) => ({
        id: it.productId ?? it.id ?? "custom",
        name: it.name ?? "알 수 없는 상품",
      }));
    } else {
      // 2순위: 과거 구조(stringDetails.stringTypes + customStringName) 기반으로 복원
      stringItems = await Promise.all(
        (app.stringDetails?.stringTypes || []).map(async (prodId: string) => {
          if (prodId === "custom") {
            return {
              id: "custom",
              name: app.stringDetails?.customStringName ?? "커스텀 스트링",
            };
          }
          const prod = await db
            .collection("products")
            .findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
          return {
            id: prodId,
            name: prod?.name ?? "알 수 없는 상품",
          };
        }),
      );
    }

    //  items 배열 재구성 (id, name, price, quantity)
    const items = await Promise.all(
      stringItems.map(async (item) => {
        if (item.id === "custom") {
          return {
            id: "custom",
            name: item.name,
            price: getStringingServicePrice(item.id, true), // 커스텀 요금
            quantity: 1,
          };
        }
        const prod = await db
          .collection("products")
          .findOne({ _id: new ObjectId(item.id) }, { projection: { mountingFee: 1 } });
        return {
          id: item.id,
          name: item.name,
          price: prod?.mountingFee ?? getStringingServicePrice(item.id, false),
          quantity: 1,
        };
      }),
    );

    // total 계산
    const total = items.reduce((sum, x) => sum + x.price * x.quantity, 0);

    // 주문 조회 전에 “주문에 취소요청이 걸린 상태인지” 판단
    let order: any = null;
    if (app.orderId && ObjectId.isValid(app.orderId)) {
      order = await db.collection("orders").findOne(
        { _id: new ObjectId(app.orderId) },
        {
          projection: {
            items: 1,
            status: 1,
            paymentStatus: 1,
            paymentInfo: 1,
            cancelRequest: 1,
            shippingInfo: 1,
            servicePickupMethod: 1,
          },
        },
      );
    }

    const rentalIdRaw = (app as any).rentalId;
    const rentalObjectId = ObjectId.isValid(String(rentalIdRaw ?? ""))
      ? new ObjectId(String(rentalIdRaw))
      : null;
    const linkedRental = rentalObjectId
      ? await db.collection("rental_orders").findOne(
          { _id: rentalObjectId },
          {
            projection: {
              paymentStatus: 1,
              paymentInfo: 1,
            },
          },
        )
      : null;

    const rawOrderItems = (order?.items ?? []) as any[];

    const orderStrings = await Promise.all(
      rawOrderItems.map(async (oi) => {
        const productId = String(oi.productId ?? oi.id ?? "").trim();
        const prod = ObjectId.isValid(productId)
          ? await db
              .collection("products")
              .findOne(
                { _id: new ObjectId(productId) },
                { projection: { name: 1, mountingFee: 1 } },
              )
          : null;
        return {
          id: productId,
          name: oi.name ?? prod?.name ?? "알 수 없는 상품",
          mountingFee: prod?.mountingFee ?? 0,
        };
      }),
    );
    const linkedOrderItems = rawOrderItems.map((oi) => ({
      id: String(oi.productId ?? oi.id ?? ""),
      productName: String(oi.name ?? oi.productName ?? "주문 상품"),
      quantity: typeof oi.quantity === "number" ? oi.quantity : 1,
      price: typeof oi.price === "number" ? oi.price : null,
      stringPrice: typeof oi.stringPrice === "number" ? oi.stringPrice : null,
      stringingFee:
        typeof oi.stringingFee === "number"
          ? oi.stringingFee
          : typeof oi.mountingFee === "number"
            ? oi.mountingFee
            : null,
      selectedGauge: oi.selectedGauge ?? null,
      selectedColor: oi.selectedColor ?? null,
      selectedColorLabel: oi.selectedColorLabel ?? oi.selectedColor ?? null,
      stringName: oi.stringName ?? oi.selectedStringName ?? null,
      racketName: oi.racketName ?? oi.name ?? oi.productName ?? null,
    }));

    const linkedOrderPickupMethod = (() => {
      if (!order) return null;
      const pickup = normalizeServicePickupMethod((order as any).servicePickupMethod);
      const codeFromPickup =
        pickup === "SHOP_VISIT"
          ? "visit"
          : pickup === "COURIER_VISIT" || pickup === "SELF_SEND"
            ? "courier"
            : undefined;

      const shippingRaw =
        (order as any).shippingInfo?.shippingMethod ??
        (order as any).shippingInfo?.deliveryMethod ??
        null;
      const code = normalizeOrderShippingMethod(shippingRaw) ?? codeFromPickup;
      if (!code) return null;
      return code === "courier" ? "delivery" : code;
    })();

    // -------------------------------------------
    //고객→매장 "입고/운송장" 필요 여부 판단
    // - rentalId 연결: 매장 라켓 기반 → 고객 입고 불필요
    // - orderId 연결 + 주문 items 중 kind==='racket' 포함: 매장 라켓(구매) 기반 → 고객 입고 불필요
    // - 그 외(스트링만 구매+교체 / 단독 신청): 고객 라켓 기반 → 입고 필요
    // - 운송장 필요: 입고가 필요 + self_ship(자가발송)인 경우
    // -------------------------------------------
    const { collectionMethod, inboundRequired, needsInboundTracking, orderHasRacket } =
      await resolveInboundTrackingPolicy(db, app, order);

    // 체크박스 옵션으로 그대로 사용
    const purchasedStrings = orderStrings;
    const sd = app.stringDetails || {};

    // 라켓별 세부 장착 정보(lines 우선 + racketLines fallback) 정리
    const racketLines = getApplicationLines(sd).map((line: any, index: number) => {
      // 저장된 racketType 이 있으면 우선 사용, 없으면 racketLabel 로 보정
      const rawName =
        (line.racketType && String(line.racketType).trim()) ||
        (line.racketLabel && String(line.racketLabel).trim()) ||
        "";

      const racketName = rawName || "";

      return {
        // key 용 ID – 기존 DB에 id가 있으면 그대로 쓰고, 없으면 index 기반으로 생성
        id: String(line.id ?? `${index}`),

        // 라켓 이름: null 허용 (없을 수도 있으니)
        racketLabel: racketName || null,
        racketType: racketName, // 클라이언트에서 바로 쓸 수 있게 별도 필드 제공

        // 어떤 스트링 상품을 장착하는지
        stringProductId: line.stringProductId ?? "",
        stringName: line.stringName ?? "",

        // 메인/크로스 텐션
        tensionMain: line.tensionMain ?? "",
        tensionCross: line.tensionCross ?? "",

        // 라켓별 메모
        note: line.note ?? "",

        // 한 자루당 장착비 – 숫자가 아니면 0으로 방어
        mountingFee: typeof line.mountingFee === "number" ? line.mountingFee : 0,
      };
    });

    // === 패키지 사용 정보 계산 ===
    // - 제출 시점 로직과 동일하게, 라켓 라인 개수를 사용 회차로 간주
    const usingLinesForPackage = Array.isArray(racketLines) && racketLines.length > 0;
    const packageUseCount = usingLinesForPackage ? racketLines.length : 1;

    // 조건 없이 항상 packageInfo 객체 생성
    const packageInfo = {
      // 실제 패키지 차감 여부 (true면 사용, false면 미사용)
      applied: !!(app as any).packageApplied,

      // 이번 신청이 패키지 기준으로 몇 회에 해당하는지
      useCount: packageUseCount,

      // 패스 관련 정보 (있으면 값, 없으면 null)
      passId: (app as any).packagePassId ? String((app as any).packagePassId) : null,
      passTitle: null,
      packageSize: null,
      usedCount: null,
      remainingCount: null,
      redeemedAt: (app as any).packageRedeemedAt
        ? (app as any).packageRedeemedAt.toISOString()
        : null,
      expiresAt: null,
    };

    // === service_pass_consumptions 차감 이력 조회 ===
    const rawConsumptions = await db
      .collection<ServicePassConsumption>("service_pass_consumptions")
      .find({ applicationId: app._id })
      .sort({ usedAt: 1 })
      .toArray();

    const packageConsumptions = rawConsumptions.map((c) => ({
      id: c._id.toString(),
      passId: c.passId.toString(),
      usedAt: c.usedAt instanceof Date ? c.usedAt.toISOString() : new Date(c.usedAt).toISOString(),
      count: typeof c.count === "number" ? c.count : 1,
      reverted: !!c.reverted,
    }));

    const paymentSourceRaw = String((app as any).paymentSource ?? "").trim();
    const hasPackageApplied = !!(app as any).packageApplied;
    const linkedPayment: LinkedPaymentPayload = hasPackageApplied
      ? {
          source: "package",
          status: "패키지 적용 완료",
          method: "패키지 사용",
          provider: null,
          easyPayProvider: null,
          tid: null,
          bank: null,
          depositor: null,
          cardDisplayName: null,
          cardCompany: null,
          cardLabel: null,
          approvedAt: toIsoOrNull((app as any).packageRedeemedAt),
          niceSync: null,
          rawSummary: null,
        }
      : (paymentSourceRaw.startsWith("order:") || app.orderId) && order
        ? buildLinkedPaymentFromDoc("order", order)
        : (paymentSourceRaw.startsWith("rental:") || rentalObjectId) && linkedRental
          ? buildLinkedPaymentFromDoc("rental", linkedRental)
          : {
              source: "application",
              status: typeof app.paymentStatus === "string" ? app.paymentStatus : null,
              method: typeof app.paymentMethod === "string" ? app.paymentMethod : null,
              provider:
                typeof (app as any).paymentInfo?.provider === "string"
                  ? (app as any).paymentInfo.provider
                  : null,
              easyPayProvider:
                typeof (app as any).paymentInfo?.easyPayProvider === "string"
                  ? (app as any).paymentInfo.easyPayProvider
                  : null,
              tid:
                typeof (app as any).paymentInfo?.tid === "string"
                  ? (app as any).paymentInfo.tid
                  : null,
              bank:
                typeof (app as any).paymentInfo?.bank === "string"
                  ? (app as any).paymentInfo.bank
                  : typeof app.shippingInfo?.bank === "string"
                    ? app.shippingInfo.bank
                    : null,
              depositor:
                typeof (app as any).paymentInfo?.depositor === "string"
                  ? (app as any).paymentInfo.depositor
                  : typeof app.shippingInfo?.depositor === "string"
                    ? app.shippingInfo.depositor
                    : null,
              cardDisplayName:
                typeof (app as any).paymentInfo?.cardDisplayName === "string"
                  ? (app as any).paymentInfo.cardDisplayName
                  : null,
              cardCompany:
                typeof (app as any).paymentInfo?.cardCompany === "string"
                  ? (app as any).paymentInfo.cardCompany
                  : null,
              cardLabel:
                typeof (app as any).paymentInfo?.cardLabel === "string"
                  ? (app as any).paymentInfo.cardLabel
                  : null,
              approvedAt: toIsoOrNull((app as any).paymentInfo?.approvedAt),
              niceSync: (app as any).paymentInfo?.niceSync
                ? {
                    lastSyncedAt: toIsoOrNull((app as any).paymentInfo.niceSync.lastSyncedAt),
                    pgStatus:
                      typeof (app as any).paymentInfo.niceSync.pgStatus === "string"
                        ? (app as any).paymentInfo.niceSync.pgStatus
                        : null,
                    source:
                      typeof (app as any).paymentInfo.niceSync.source === "string"
                        ? (app as any).paymentInfo.niceSync.source
                        : null,
                    resultCode:
                      typeof (app as any).paymentInfo.niceSync.resultCode === "string"
                        ? (app as any).paymentInfo.niceSync.resultCode
                        : null,
                    resultMsg:
                      typeof (app as any).paymentInfo.niceSync.resultMsg === "string"
                        ? (app as any).paymentInfo.niceSync.resultMsg
                        : null,
                    canceledAt: toIsoOrNull((app as any).paymentInfo.niceSync.canceledAt),
                    cancelAmount:
                      typeof (app as any).paymentInfo.niceSync.cancelAmount === "number"
                        ? (app as any).paymentInfo.niceSync.cancelAmount
                        : null,
                  }
                : null,
              rawSummary: (app as any).paymentInfo?.rawSummary
                ? {
                    orderId:
                      typeof (app as any).paymentInfo.rawSummary.orderId === "string"
                        ? (app as any).paymentInfo.rawSummary.orderId
                        : null,
                    resultCode:
                      typeof (app as any).paymentInfo.rawSummary.resultCode === "string"
                        ? (app as any).paymentInfo.rawSummary.resultCode
                        : null,
                    resultMsg:
                      typeof (app as any).paymentInfo.rawSummary.resultMsg === "string"
                        ? (app as any).paymentInfo.rawSummary.resultMsg
                        : null,
                    goodsName:
                      typeof (app as any).paymentInfo.rawSummary.goodsName === "string"
                        ? (app as any).paymentInfo.rawSummary.goodsName
                        : null,
                  }
                : null,
            };

    return NextResponse.json({
      id: app._id.toString(),
      orderId: app.orderId?.toString() || null,
      rentalId: (app as any).rentalId?.toString?.() || null,
      paymentSource: paymentSourceRaw || null,
      linkedOrderPickupMethod,
      linkedOrderItems,
      // 사용자 확정 시각 (없으면 null)
      userConfirmedAt:
        (app as any).userConfirmedAt instanceof Date
          ? (app as any).userConfirmedAt.toISOString()
          : typeof (app as any).userConfirmedAt === "string"
            ? (app as any).userConfirmedAt
            : null,
      // 주문 cancelRequest도 한글/영문 혼재 가능 → 표준화해서 내려야 UI가 안 깨짐
      orderCancelStatus: normalizeCancelStatus(order?.cancelRequest?.status) ?? "none",
      orderStatus: order?.status ?? null,
      orderPaymentStatus: order?.paymentStatus ?? null,
      customer: {
        name: app.customer?.name ?? app.userSnapshot?.name ?? app.guestName ?? "-",
        email: app.customer?.email ?? app.userSnapshot?.email ?? app.guestEmail ?? "-",
        phone: app.customer?.phone ?? app.shippingInfo?.phone ?? app.guestPhone ?? "",
        address: app.customer?.address ?? app.shippingInfo?.address ?? "",
        addressDetail: app.customer?.addressDetail ?? app.shippingInfo?.addressDetail ?? "",
        postalCode: app.customer?.postalCode ?? app.shippingInfo?.postalCode ?? "",
      },
      // Date/string 혼재 방어 (NextResponse.json에서 Date는 ISO로 직렬화되지만, 명시해두면 안전)
      requestedAt:
        app.createdAt instanceof Date ? app.createdAt.toISOString() : (app.createdAt ?? null),
      desiredDateTime: app.desiredDateTime,
      status: app.status,
      paymentStatus: app.paymentStatus,
      linkedPayment,
      shippingInfo: app.shippingInfo || null,
      collectionMethod,
      inboundRequired,
      needsInboundTracking,
      memo: app.memo || "",
      photos: app.photos || [],
      stringDetails: {
        racketType: sd.racketType ?? "",
        preferredDate: sd.preferredDate ?? "",
        preferredTime: sd.preferredTime ?? "",
        requirements: sd.requirements ?? "",
        stringTypes: Array.isArray(sd.stringTypes) ? sd.stringTypes : [],
        stringItems,
        racketLines,
        ...(sd.customStringName ? { customStringName: sd.customStringName } : {}),
      },
      // 방문 예약 슬롯 정보 (없으면 null)
      visitSlotCount:
        typeof (app as any).visitSlotCount === "number" ? (app as any).visitSlotCount : null,
      visitDurationMinutes:
        typeof (app as any).visitDurationMinutes === "number"
          ? (app as any).visitDurationMinutes
          : null,

      lines: racketLines,
      items,
      total,
      totalPrice: app.totalPrice ?? 0,
      packageInfo,
      packageConsumptions,
      // 신청 취소 요청 정보
      cancelRequest: (() => {
        const effectiveCancelRequest =
          app.cancelRequest ??
          ((app as any).status === "취소" && (app as any).adminCancel
            ? {
                status: "approved",
                reasonCode: "관리자 직접 취소",
                reasonText: (app as any).adminCancel.reason ?? "",
                requestedAt: (app as any).adminCancel.canceledAt ?? (app as any).updatedAt ?? null,
                handledAt: (app as any).adminCancel.canceledAt ?? null,
                refundAccount: null,
              }
            : null);
        return effectiveCancelRequest
          ? {
              status: normalizeCancelStatus(effectiveCancelRequest.status),
              reasonCode: effectiveCancelRequest.reasonCode ?? undefined,
              reasonText: effectiveCancelRequest.reasonText ?? undefined,
              requestedAt: effectiveCancelRequest.requestedAt ?? null,
              handledAt: effectiveCancelRequest.handledAt ?? null,
              refundAccount: effectiveCancelRequest.refundAccount ?? null,
            }
          : { status: "none", refundAccount: null };
      })(),

      history: (app.history ?? []).map((record: HistoryRecord) => ({
        status: record.status,
        date: record.date,
        description: record.description,
      })),
      purchasedStrings,
      orderStrings,
      orderHasRacket,
    });
  } catch (e) {
    console.error("[GET stringing_application]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ================= PATCH (관리자용 수정) =================
export async function handlePatchStringingApplication(req: Request, id: string) {
  try {
    const client = await clientPromise;
    const db = await getDb();
    const { name, email, phone, address, addressDetail, postalCode, depositor, stringDetails } =
      await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }

    const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(id) });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const appDoc = app as NonNullable<typeof app>;

    const setFields: any = {};
    const pushHistory: any[] = [];

    const updatePayload = {
      name,
      email,
      phone,
      address,
      addressDetail,
      postalCode,
      depositor,
      stringDetails,
    };
    const updatedTypes: string[] = (updatePayload?.stringDetails?.stringTypes ??
      app.stringDetails?.stringTypes ??
      []) as string[];

    // const recalculated = await calcStringingTotal(db, updatedTypes);
    // setFields.totalPrice = recalculated;

    // 고객정보 변경
    if (name || email || phone || address || addressDetail || postalCode) {
      // 기존 customer 병합
      const baseCustomer = appDoc.customer ?? {
        name: appDoc.userSnapshot?.name ?? appDoc.guestName ?? "",
        email: appDoc.userSnapshot?.email ?? appDoc.guestEmail ?? "",
        phone: appDoc.guestPhone ?? appDoc.shippingInfo?.phone ?? "",
        address: appDoc.shippingInfo?.address ?? "",
        addressDetail: appDoc.shippingInfo?.addressDetail ?? "",
        postalCode: appDoc.shippingInfo?.postalCode ?? "",
      };
      setFields.customer = {
        ...baseCustomer,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
        ...(addressDetail ? { addressDetail } : {}),
        ...(postalCode ? { postalCode } : {}),
      };
      setFields.searchEmailLower = normalizeEmailForSearch(setFields.customer.email);
      pushHistory.push({
        status: "고객정보수정",
        date: new Date(),
        description: "고객 정보를 수정했습니다.",
      });
    }

    // 결제정보 변경
    if (depositor !== undefined) {
      setFields["shippingInfo.depositor"] = depositor;
      pushHistory.push({
        status: "입금자명 수정",
        date: new Date(),
        description: `입금자명을 "${depositor}"(으)로 수정했습니다.`,
      });
    }

    // 스트링 세부정보 변경
    let hasTimeChange = false; //
    if (stringDetails) {
      //  스트링 관련 필드 변경 감지
      hasTimeChange = typeof stringDetails.desiredDateTime !== "undefined";
      const hasTypesChange = Array.isArray(stringDetails.stringTypes);
      const hasCustomNameChange = "customStringName" in stringDetails;
      const hasRacketChange = typeof stringDetails.racketType !== "undefined";

      // 날짜/시간
      if (hasTimeChange) {
        const [date, time] = String(stringDetails.desiredDateTime ?? "").split("T");
        if (date && time) {
          setFields["stringDetails.preferredDate"] = date;
          setFields["stringDetails.preferredTime"] = time;
          setFields.desiredDateTime = stringDetails.desiredDateTime;
        }
      }

      // 스트링 타입 & 커스텀 이름
      if (hasTypesChange) {
        const prevTypes: string[] = Array.isArray(appDoc?.stringDetails?.stringTypes)
          ? appDoc.stringDetails.stringTypes
          : []; //
        const types: string[] = Array.isArray(stringDetails.stringTypes)
          ? stringDetails.stringTypes
          : prevTypes;
        setFields["stringDetails.stringTypes"] = types;
        setFields["stringDetails.customStringName"] = stringDetails.customStringName ?? null;
      }

      // 라켓 종류
      if (hasRacketChange) {
        setFields["stringDetails.racketType"] = stringDetails.racketType;
      }

      // stringItems 재계산
      if (hasTimeChange || hasTypesChange || hasCustomNameChange) {
        const typesForItems: string[] = Array.isArray(stringDetails?.stringTypes)
          ? stringDetails.stringTypes
          : Array.isArray(appDoc?.stringDetails?.stringTypes)
            ? appDoc.stringDetails.stringTypes
            : [];
        const newItems = await Promise.all(
          typesForItems.map(async (prodId: any) => {
            if (prodId === "custom") {
              return {
                id: "custom",
                name:
                  stringDetails?.customStringName?.trim() ||
                  appDoc?.stringDetails?.customStringName ||
                  "커스텀 스트링",
                price: getStringingServicePrice("custom", true), //   커스텀도 price 포함
                quantity: 1, //
              };
            }
            const mountingFee = await calcStringingMountingFeeByProductId(db, prodId);
            const prod = await db
              .collection("products")
              .findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
            return {
              id: prodId,
              name: prod?.name ?? "알 수 없는 상품",
              price: mountingFee,
              quantity: 1, //
            };
          }),
        );
        // stringDetails.stringItems는 "표시용" 형태({id,name})로 유지 (POST/GET과 shape 통일)
        setFields["stringDetails.stringItems"] = newItems.map((it) => ({
          id: it.id,
          name: it.name,
        }));

        //  GET의 1순위 표준 필드(app.stringItems)도 함께 갱신
        // - POST(handleSubmitStringingApplication)에서 저장하는 구조와 동일하게 맞춤
        setFields.stringItems = newItems.map((it) => ({
          productId: it.id,
          name: it.name,
          quantity: typeof it.quantity === "number" ? it.quantity : 1,
          // mountingFee는 이 단계에서 굳이 강제하지 않음(필요하면 추후 보강)
        }));

        // 스트링 요금(newItems) 합산하여 totalPrice 자동 설정
        // 유틸 기준으로 최종 금액 1회 확정
        if (hasTypesChange || hasCustomNameChange) {
          const typesForTotal: string[] = Array.isArray(setFields["stringDetails.stringTypes"])
            ? setFields["stringDetails.stringTypes"]
            : (appDoc.stringDetails?.stringTypes ?? []);

          const recalculated = await calcStringingTotal(db, typesForTotal);
          setFields.totalPrice = recalculated;
          pushHistory.push({
            status: "결제 금액 자동 업데이트",
            date: new Date(),
            description: `결제 금액을 ${recalculated.toLocaleString()}원으로 업데이트했습니다. (정산 유틸)`,
          });
        }
      }
      if (hasTimeChange || hasTypesChange || hasCustomNameChange || hasRacketChange) {
        pushHistory.push({
          status: "스트링 정보 수정",
          date: new Date(),
          description: "스트링 세부 정보를 수정했습니다.",
        });
      }

      if (
        typeof stringDetails.requirements !== "undefined" &&
        stringDetails.requirements !== appDoc.stringDetails?.requirements
      ) {
        setFields["stringDetails.requirements"] = stringDetails.requirements;
        pushHistory.push({
          status: "요청사항 수정",
          date: new Date(),
          description: "요청사항을 수정했습니다.",
        });
      }
    }

    // 실제 업데이트
    const result = await db
      .collection("stringing_applications")
      .updateOne({ _id: new ObjectId(id) }, {
        $set: setFields,
        $push: { history: { $each: pushHistory } },
      } as any);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // 동기화: 연결된 일반 주문서가 있으면 고객 정보 / 입금자명 반영
    if (appDoc.orderId && ObjectId.isValid(appDoc.orderId)) {
      const ordersColl = db.collection("orders");
      const order = await ordersColl.findOne({
        _id: new ObjectId(appDoc.orderId),
      });
      if (order) {
        // 고객 정보 동기화
        if (setFields.customer) {
          await ordersColl.updateOne({ _id: new ObjectId(appDoc.orderId) }, {
            $set: {
              customer: {
                ...((order as any).customer ?? {}),
                name: setFields.customer.name,
                email: setFields.customer.email,
                phone: setFields.customer.phone,
                address: setFields.customer.address,
                addressDetail: setFields.customer.addressDetail ?? "",
                postalCode: setFields.customer.postalCode,
              },
            },
            $push: {
              history: {
                status: "고객정보수정(동기화)",
                date: new Date(),
                description: "스트링 신청서에서 고객 정보를 동기화했습니다.",
              },
            },
          } as any);
        }

        // 입금자명(depositor) 동기화 (스트링 신청서에서 변경된 경우)
        if (typeof depositor !== "undefined") {
          await ordersColl.updateOne({ _id: new ObjectId(appDoc.orderId) }, {
            $set: { "shippingInfo.depositor": depositor },
            $push: {
              history: {
                status: "입금자명 수정(동기화)",
                date: new Date(),
                description: "스트링 신청서에서 입금자명을 동기화했습니다.",
              },
            },
          } as any);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.status) {
      return NextResponse.json({ error: e.message ?? "요청 처리 실패" }, { status: e.status });
    }
    console.error("[PATCH stringing_application]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ========== 신청서의 상태 업데이트 ==========
function isCancelApplicationStatus(status: unknown): boolean {
  return String(status ?? "").trim() === "취소";
}

export async function handleUpdateApplicationStatus(
  req: Request,
  context: { params: { id: string } },
) {
  const adminAuth = await requireAdminUserFromAccessToken();
  if (!adminAuth.ok) return adminAuth.response;

  // URL 파라미터로부터 신청 ID 추출
  const { id } = context.params;
  if (!ObjectId.isValid(id)) return new NextResponse("Invalid ID", { status: 400 }); // MongoDB ObjectId 형식 검증

  // 요청 본문에서 status 값 추출
  const { status: statusStr } = await req.json(); //   변수명 명확화
  if (!statusStr || typeof statusStr !== "string") {
    return NextResponse.json({ error: "상태값 누락 또는 형식 오류" }, { status: 400 });
  }

  //   상태 유니온 타입 보장
  const STATUS_VALUES = ["draft", "검토 중", "접수완료", "작업 중", "교체완료", "취소"] as const; //
  type AppStatus = (typeof STATUS_VALUES)[number]; //
  const toAppStatus = (s: string): AppStatus | null =>
    (STATUS_VALUES as readonly string[]).includes(s) ? (s as AppStatus) : null; //
  const status = toAppStatus(statusStr); //
  if (!status) {
    //
    return NextResponse.json({ error: "허용되지 않는 상태값입니다." }, { status: 400 });
  } //

  // MongoDB 연결
  const db = adminAuth.db;
  const actorId = ObjectId.isValid(adminAuth.userId)
    ? new ObjectId(adminAuth.userId)
    : adminAuth.userId;
  const beforeAppDoc = await db
    .collection("stringing_applications")
    .findOne({ _id: new ObjectId(id) });
  if (!beforeAppDoc) {
    return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  }
  const linkedPaymentSource = String(beforeAppDoc.paymentSource ?? "").trim();
  if (
    beforeAppDoc.orderId ||
    beforeAppDoc.rentalId ||
    linkedPaymentSource.startsWith("order:") ||
    linkedPaymentSource.startsWith("rental:")
  ) {
    return NextResponse.json(
      {
        error:
          "주문/대여와 연결된 신청서는 신청서 상세에서 단독으로 상태를 변경할 수 없습니다. 연결된 주문/대여 상세의 통합 진행 단계에서 처리해주세요.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const wasCanceled = isCancelApplicationStatus(beforeAppDoc?.status);
  const willBeCanceled = isCancelApplicationStatus(status);

  let gaugeRestore: any = {
    restored: false,
    skippedReason: "not_checked",
    setFields: {} as Record<string, unknown>,
  };
  let variantRestore: any = {
    restored: false,
    skippedReason: "not_checked",
    setFields: {} as Record<string, unknown>,
  };
  if (willBeCanceled && !wasCanceled) {
    variantRestore = await restoreStringingVariantStockIfNeeded(db, beforeAppDoc, now);
    if (variantRestore.errorResponse) {
      return variantRestore.errorResponse;
    }
    gaugeRestore = await restoreStringingGaugeStockIfNeeded(
      db,
      beforeAppDoc,
      now,
      "status_changed_to_cancel",
    );
    if (gaugeRestore.errorResponse) {
      return gaugeRestore.errorResponse;
    }
  }

  // description 따로 준비
  const description = `신청서 상태가 [${status}]로 변경되었습니다.`;

  // historyEntry 객체 구성
  const historyEntry = {
    status,
    date: now,
    description,
  };

  // 상태 + 이력 함께 업데이트
  const colorRestore =
    status === "취소"
      ? await restoreStringingColorStockIfNeeded(db, beforeAppDoc, now, "status_changed_to_cancel")
      : { setFields: {} };
  if ((colorRestore as any).errorResponse) return (colorRestore as any).errorResponse;
  const updateOps: any = {
    $set: {
      status,
      ...(variantRestore.setFields ?? {}),
      ...(gaugeRestore.setFields ?? {}),
      ...((colorRestore as any).setFields ?? {}),
    },
    $push: { history: { $each: [historyEntry] } },
  };

  // draft가 아니면 TTL 필드 제거(삭제 대상에서 제외)
  if (status !== "draft") {
    updateOps.$unset = { expireAt: "" };
  }

  const result = await db
    .collection("stringing_applications")
    .updateOne({ _id: new ObjectId(id) }, updateOps);

  // 신청서를 찾지 못했을 경우
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  }

  const appDoc = await db.collection("stringing_applications").findOne({ _id: new ObjectId(id) });
  if (!appDoc) {
    return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  }

  await appendAdminAudit(
    db,
    {
      type: "stringing_application.update",
      actorId,
      targetId: new ObjectId(id),
      message: "관리자 스트링잉 신청 상태 변경",
      diff: {
        before: {
          status: beforeAppDoc?.status ?? null,
          paymentStatus: normalizeLinkedPaymentStatus(beforeAppDoc?.paymentStatus ?? null),
          serviceType: beforeAppDoc?.serviceType ?? null,
        },
        after: {
          status,
          paymentStatus: normalizeLinkedPaymentStatus(appDoc?.paymentStatus ?? null),
          serviceType: appDoc?.serviceType ?? null,
        },
        metadata: {
          changedKeys: ["status"],
          actor: {
            id: String(adminAuth.userId),
            email: null,
            name: null,
            role: "admin",
          },
        },
      },
    },
    req,
  );

  //  정상 처리 시 성공 응답 반환
  return NextResponse.json({ success: true });
}

// ======== 스트링 신청서 취소 요청 (마이페이지) ========
export async function handleStringingCancelRequest(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    // 인증/인가는 route.ts에서 선행 처리

    // 1) 파라미터 검증
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection("stringing_applications");

    const appDoc = await col.findOne({ _id: new ObjectId(id) });
    if (!appDoc) {
      return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    }

    const paymentSourceRaw = String((appDoc as any).paymentSource ?? "").trim();
    if ((appDoc as any).rentalId || paymentSourceRaw.startsWith("rental:")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "대여와 연결된 교체서비스 신청은 신청서 상세에서 단독으로 취소 요청할 수 없습니다.",
        },
        { status: 409 },
      );
    }

    // 3) 현재 상태가 취소 요청 가능한 상태인지 체크
    //    (완료/반송/취소는 요청 불가)
    if (["교체완료", "반송완료", "취소"].includes(appDoc.status)) {
      return NextResponse.json(
        { error: "이미 처리된 신청은 취소 요청을 할 수 없습니다." },
        { status: 400 },
      );
    }

    // 4) 요청 바디에서 사유 코드/자유 입력값 받기 (없으면 기본값)
    const body = await req.json().catch(() => ({}));
    const { reasonCode, reasonText } = (body ?? {}) as {
      reasonCode?: string;
      reasonText?: string;
    };

    const paymentContext = await resolveStringingCancelPaymentContext(db, appDoc);
    const needsRefundAccount =
      !paymentContext.packageApplied &&
      paymentContext.status === "결제완료" &&
      paymentContext.provider !== "nicepay";

    let refundAccount: { bank: string; account: string; holder: string } | undefined;
    if (needsRefundAccount) {
      const parsedRefundAccount = RefundAccountSchema.safeParse(
        (body as any)?.refundAccount ?? null,
      );
      if (!parsedRefundAccount.success) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "INVALID_REFUND_ACCOUNT",
            message: "환불 계좌 정보를 정확히 입력해주세요.",
            fieldErrors: parsedRefundAccount.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }
      refundAccount = parsedRefundAccount.data;
    }

    const reasonLabelMap: Record<string, string> = {
      CHANGE_MIND: "단순 변심",
      WRONG_INFO: "신청 정보와 다름",
      SHIPPING_ISSUE: "배송 관련 문제",
      OTHER: "기타",
    };

    let reasonLabel: string;
    if (!reasonCode) {
      reasonLabel = "기타";
    } else if (reasonLabelMap[reasonCode]) {
      // 코드값으로 들어온 경우
      reasonLabel = reasonLabelMap[reasonCode];
    } else {
      // 이미 한글 라벨(예: '다른 상품으로 대체', '상품 정보와 다름')로 들어온 경우
      reasonLabel = reasonCode.trim();
    }

    const extra = reasonText?.trim() ? ` (${reasonText.trim()})` : "";

    const historyEntry: HistoryRecord = {
      status: "취소요청",
      date: new Date(),
      description: `고객이 신청 취소를 요청했습니다. 사유: ${reasonLabel}${extra} · ${needsRefundAccount ? "환불 계좌 정보가 등록되었습니다." : "환불계좌 입력 없이 접수되었습니다."}`,
    };

    // 5) 신청서 문서에 취소 요청 정보 + 히스토리 추가
    const now = new Date();
    const nextCancelRequest = {
      status: "requested",
      reasonCode: reasonCode ?? "OTHER",
      reasonText: reasonText ?? "",
      requestedAt: now,
      ...(refundAccount ? { refundAccount } : {}),
    };

    await col.updateOne({ _id: new ObjectId(id) }, {
      $set: {
        cancelRequest: nextCancelRequest,
      },
      // history 타입이 any라서 push에 as any 한 번 감싸줌
      $push: { history: historyEntry as any },
    } as any);

    void sendAdminOperationalAlert({
      kind: "cancel_requested",
      title: "⚠️ 취소 요청 접수",
      summary: "교체서비스 신청 취소 요청이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/applications/stringing/${id}`,
      dedupeKey: `cancel_requested:stringing_application:${id}:${now.toISOString()}`,
      priority: "high",
      fields: [
        { name: "대상", value: "교체서비스 신청" },
        { name: "신청번호", value: id },
        { name: "사유", value: reasonLabel },
        { name: "환불계좌", value: needsRefundAccount ? "등록됨" : "미필요/미입력" },
      ],
    });

    const subject = buildCancelRefundSubject({
      userId: (appDoc as any).userId ? String((appDoc as any).userId) : null,
      applicationId: id,
    });

    try {
      await appendAudit(
        db,
        {
          type: "stringing_cancel_request_created",
          actorId: (appDoc as any).userId ? String((appDoc as any).userId) : undefined,
          targetId: id,
          message: "교체서비스 신청 취소 요청 생성",
          diff: {
            targetType: "stringing_application",
            applicationId: id,
            actorRole: "user",
            reasonCode: nextCancelRequest.reasonCode,
            reasonTextPreview: toReasonPreview(nextCancelRequest.reasonText),
            refundAccountMasked: maskRefundAccount(nextCancelRequest.refundAccount),
            prevCancelStatus: appDoc.cancelRequest?.status ?? null,
            nextCancelStatus: nextCancelRequest.status,
            applicationStatus: appDoc.status ?? null,
          },
        },
        req,
      );
    } catch (error) {
      console.error("[handleStringingCancelRequest] appendAudit failed", error);
    }

    await recordCancelRefundSignal(db, {
      eventType: "stringing_cancel_request_created",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "stringing_application",
      targetId: id,
      actorRole: "user",
      reasonCode: nextCancelRequest.reasonCode,
      status: nextCancelRequest.status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[handleStringingCancelRequest] error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ======== 스트링 신청서 취소 요청 "승인" (관리자) ========
export async function handleStringingCancelApprove(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const adminAuth = await requireAdminUserFromAccessToken();
    if (!adminAuth.ok) return adminAuth.response;

    // 파라미터 검증
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = adminAuth.db;
    const col = db.collection("stringing_applications");
    const _id = new ObjectId(id);

    const appDoc: any = await col.findOne({ _id });
    if (!appDoc) {
      return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    }
    const paymentSource = String(appDoc.paymentSource ?? "").trim();
    if (
      appDoc.orderId ||
      appDoc.rentalId ||
      paymentSource.startsWith("order:") ||
      paymentSource.startsWith("rental:")
    ) {
      return NextResponse.json(
        {
          error:
            "주문/대여와 연결된 신청서는 신청서 상세에서 단독으로 취소 승인할 수 없습니다. 연결된 주문/대여 상세에서 취소/환불을 처리해주세요.",
        },
        { status: 409 },
      );
    }

    // 취소 요청이 없는 경우 / 이미 처리된 경우 방어
    const cur = normalizeCancelStatus(appDoc.cancelRequest?.status);
    if (!appDoc.cancelRequest || cur !== "requested") {
      return NextResponse.json({ error: "처리할 취소 요청이 없습니다." }, { status: 400 });
    }

    const now = new Date();
    const cancellation = await prepareStandaloneStringingCancellation({
      appDoc,
      now,
      adminUserId: adminAuth.userId,
      mode: "request_approve",
    });
    if (!cancellation.ok) return cancellation.response;

    const variantRestore = await restoreStringingVariantStockIfNeeded(db, appDoc, now);
    const gaugeRestore = await restoreStringingGaugeStockIfNeeded(db, appDoc, now);
    const colorRestore = await restoreStringingColorStockIfNeeded(db, appDoc, now);
    if (variantRestore.errorResponse) {
      return variantRestore.errorResponse;
    }
    if (gaugeRestore.errorResponse) {
      return gaugeRestore.errorResponse;
    }
    if (colorRestore.errorResponse) return colorRestore.errorResponse;

    // 히스토리 한 줄 구성
    const historyEntry: HistoryRecord = {
      status: "취소",
      date: now,
      description: "관리자가 신청 취소를 승인했습니다.",
    };

    // 패키지 사용분 복원 (패키지 사용 + passId가 있을 때만)
    if (appDoc.packageApplied && appDoc.packagePassId) {
      try {
        await revertConsumption(db, appDoc.packagePassId as ObjectId, _id);
      } catch (e) {
        // 패키지 복원 실패해도 취소 자체는 진행
        console.error("[handleStringingCancelApprove] revertConsumption error", e);
      }
    }

    // 신청 상태를 "취소"로 변경 + 결제/취소요청 상태 정리
    await col.updateOne({ _id }, {
      $set: {
        status: "취소",
        cancelRequest: cancellation.updatedCancelRequest,
        ...cancellation.paymentUpdateFields,
        ...variantRestore.setFields,
        ...gaugeRestore.setFields,
        ...colorRestore.setFields,
      },
      $push: { history: historyEntry as any },
    } as any);

    await appendAdminAudit(
      db,
      {
        type: "stringing_cancel_request_approved",
        actorId: adminAuth.userId,
        targetId: id,
        message: "관리자 교체서비스 신청 취소 요청 승인",
        diff: {
          targetType: "stringing_application",
          applicationId: id,
          actorRole: "admin",
          metadata: {
            actor: {
              id: String(adminAuth.userId),
              email: null,
              name: null,
              role: "admin",
            },
          },
          reasonCode: appDoc.cancelRequest?.reasonCode ?? null,
          reasonTextPreview: toReasonPreview(appDoc.cancelRequest?.reasonText),
          refundAccountMasked: maskRefundAccount(appDoc.cancelRequest?.refundAccount),
          prevCancelStatus: appDoc.cancelRequest?.status ?? null,
          nextCancelStatus: "approved",
          applicationStatus: "취소",
        },
      },
      req,
    );

    const subject = buildCancelRefundSubject({
      userId: (appDoc as any).userId ? String((appDoc as any).userId) : null,
      applicationId: id,
    });

    await recordCancelRefundSignal(db, {
      eventType: "stringing_cancel_request_approved",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "stringing_application",
      targetId: id,
      actorRole: "admin",
      reasonCode: appDoc.cancelRequest?.reasonCode ?? null,
      status: "approved",
      metadata: cancellation.niceCancelMetadata,
    });

    const updated = await col.findOne({ _id });

    return NextResponse.json({
      ok: true,
      success: true,
      application: updated,
      gaugeStockRestore: gaugeRestore.restored ? "restored" : gaugeRestore.skippedReason,
      colorStockRestore: colorRestore.restored ? "restored" : colorRestore.skippedReason,
    });
  } catch (error) {
    console.error("[handleStringingCancelApprove] error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ======== 스트링 신청서 관리자 직접 취소 (관리자) ========
export async function handleStringingAdminCancel(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const adminAuth = await requireAdminUserFromAccessToken();
    if (!adminAuth.ok) return adminAuth.response;

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "관리자 취소 사유를 입력해주세요." }, { status: 400 });
    }

    const db = adminAuth.db;
    const col = db.collection("stringing_applications");
    const _id = new ObjectId(id);

    const appDoc: any = await col.findOne({ _id });
    if (!appDoc) {
      return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    }

    if (appDoc.status === "취소") {
      return NextResponse.json({ error: "이미 취소된 신청입니다." }, { status: 400 });
    }

    if (appDoc.status === "교체완료") {
      return NextResponse.json({ error: "교체완료 상태의 신청은 직접 취소할 수 없습니다." }, { status: 400 });
    }

    if (appDoc.status === "작업 중") {
      return NextResponse.json(
        { error: "작업 중 상태의 신청은 운영상 위험하므로 직접 취소할 수 없습니다." },
        { status: 400 },
      );
    }

    const cancellableStatuses = new Set(["검토 중", "접수완료"]);
    if (!cancellableStatuses.has(String(appDoc.status ?? ""))) {
      return NextResponse.json(
        { error: "검토 중 또는 접수완료 상태의 신청만 직접 취소할 수 있습니다." },
        { status: 400 },
      );
    }

    const paymentSource = String(appDoc.paymentSource ?? "").trim();
    if (
      appDoc.orderId ||
      appDoc.rentalId ||
      paymentSource.startsWith("order:") ||
      paymentSource.startsWith("rental:")
    ) {
      return NextResponse.json(
        { error: "주문/대여와 연결된 신청서는 해당 주문/대여 상세에서 취소 처리해야 합니다." },
        { status: 409 },
      );
    }

    const now = new Date();
    const refundContext = resolveAdminCancelRefundContext(appDoc);
    const cancellation = await prepareStandaloneStringingCancellation({
      appDoc,
      now,
      adminUserId: adminAuth.userId,
      mode: "admin_direct",
      reason,
    });
    if (!cancellation.ok) return cancellation.response;

    const variantRestore = await restoreStringingVariantStockIfNeeded(db, appDoc, now);
    const gaugeRestore = await restoreStringingGaugeStockIfNeeded(db, appDoc, now);
    const colorRestore = await restoreStringingColorStockIfNeeded(
      db,
      appDoc,
      now,
      "admin_direct_cancel",
    );
    if (variantRestore.errorResponse) return variantRestore.errorResponse;
    if (gaugeRestore.errorResponse) return gaugeRestore.errorResponse;
    if (colorRestore.errorResponse) return colorRestore.errorResponse;

    if (appDoc.packageApplied && appDoc.packagePassId) {
      try {
        await revertConsumption(db, appDoc.packagePassId as ObjectId, _id);
      } catch (e) {
        console.error("[handleStringingAdminCancel] revertConsumption error", e);
      }
    }

    const adminCancelRefundNote = cancellation.niceCancelSucceeded
      ? "NICEPAY 결제취소가 완료되었습니다."
      : refundContext.refundNote;
    const historyEntry: HistoryRecord = {
      status: "취소",
      date: now,
      description: `관리자가 직접 신청을 취소했습니다. 취소 사유: ${reason} ${adminCancelRefundNote}`,
    };

    await col.updateOne(
      { _id },
      {
        $set: {
          status: "취소",
          cancelRequest: cancellation.updatedCancelRequest,
          ...cancellation.paymentUpdateFields,
          adminCancel: {
            reason,
            canceledAt: now,
            canceledBy: adminAuth.userId,
            paymentStatusAtCancel: refundContext.paymentStatusAtCancel,
            paymentMethodAtCancel: refundContext.paymentMethodAtCancel,
            paymentProviderAtCancel: refundContext.paymentProviderAtCancel,
            refundRequired: cancellation.niceCancelSucceeded ? false : refundContext.refundRequired,
            refundMethod: cancellation.niceCancelSucceeded ? "nicepay_cancelled" : refundContext.refundMethod,
            refundNote: adminCancelRefundNote,
          },
          ...variantRestore.setFields,
          ...gaugeRestore.setFields,
          ...colorRestore.setFields,
        },
        $push: { history: historyEntry as any },
      } as any,
    );

    await appendAdminAudit(
      db,
      {
        type: "stringing_admin_direct_cancelled",
        actorId: adminAuth.userId,
        targetId: id,
        message: "관리자 교체서비스 신청 직접 취소",
        diff: {
          targetType: "stringing_application",
          applicationId: id,
          actorRole: "admin",
          prevStatus: appDoc.status ?? null,
          nextStatus: "취소",
          reasonTextPreview: toReasonPreview(reason),
          paymentStatusAtCancel: refundContext.paymentStatusAtCancel,
          paymentMethodAtCancel: refundContext.paymentMethodAtCancel,
          paymentProviderAtCancel: refundContext.paymentProviderAtCancel,
          refundRequired: cancellation.niceCancelSucceeded ? false : refundContext.refundRequired,
          refundMethod: cancellation.niceCancelSucceeded ? "nicepay_cancelled" : refundContext.refundMethod,
          metadata: {
            actor: {
              id: String(adminAuth.userId),
              email: null,
              name: null,
              role: "admin",
            },
          },
        },
      },
      req,
    );

    const subject = buildCancelRefundSubject({
      userId: (appDoc as any).userId ? String((appDoc as any).userId) : null,
      applicationId: id,
    });

    await recordCancelRefundSignal(db, {
      eventType: "stringing_admin_direct_cancelled",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "stringing_application",
      targetId: id,
      actorRole: "admin",
      reasonCode: "admin_direct_cancel",
      status: "approved",
      metadata: {
        refundRequired: cancellation.niceCancelSucceeded ? false : refundContext.refundRequired,
        refundMethod: cancellation.niceCancelSucceeded ? "nicepay_cancelled" : refundContext.refundMethod,
        paymentStatusAtCancel: refundContext.paymentStatusAtCancel,
        paymentMethodAtCancel: refundContext.paymentMethodAtCancel,
        paymentProviderAtCancel: refundContext.paymentProviderAtCancel,
        ...cancellation.niceCancelMetadata,
      },
    });

    const updated = await col.findOne({ _id });

    return NextResponse.json({
      ok: true,
      success: true,
      application: updated,
      gaugeStockRestore: gaugeRestore.restored ? "restored" : gaugeRestore.skippedReason,
      colorStockRestore: colorRestore.restored ? "restored" : colorRestore.skippedReason,
    });
  } catch (error) {
    console.error("[handleStringingAdminCancel] error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ======== 스트링 신청서 취소 요청 "거절" (관리자) ========
export async function handleStringingCancelReject(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const adminAuth = await requireAdminUserFromAccessToken();
    if (!adminAuth.ok) return adminAuth.response;

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const db = adminAuth.db;
    const col = db.collection("stringing_applications");
    const _id = new ObjectId(id);

    const appDoc: any = await col.findOne({ _id });
    if (!appDoc) {
      return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
    }

    const cur = normalizeCancelStatus(appDoc.cancelRequest?.status);
    if (!appDoc.cancelRequest || cur !== "requested") {
      return NextResponse.json({ error: "처리할 취소 요청이 없습니다." }, { status: 400 });
    }

    // 관리자 거절 사유(선택)를 body에서 받기
    const body = await req.json().catch(() => ({}));
    const { reason }: { reason?: string } = body ?? {};
    const trimmed = reason?.trim();

    const now = new Date();
    const descSuffix = trimmed ? ` 사유: ${trimmed}` : "";

    const historyEntry: HistoryRecord = {
      status: "취소거절",
      date: now,
      description: `관리자가 신청 취소 요청을 거절했습니다.${descSuffix}`,
    };

    await col.updateOne({ _id }, {
      $set: {
        "cancelRequest.status": "rejected",
        "cancelRequest.rejectedAt": now,
        "cancelRequest.rejectReason": trimmed ?? "",
      },
      $push: { history: historyEntry as any },
    } as any);

    await appendAdminAudit(
      db,
      {
        type: "stringing_cancel_request_rejected",
        actorId: adminAuth.userId,
        targetId: id,
        message: "관리자 교체서비스 신청 취소 요청 거절",
        diff: {
          targetType: "stringing_application",
          applicationId: id,
          actorRole: "admin",
          metadata: {
            actor: {
              id: String(adminAuth.userId),
              email: null,
              name: null,
              role: "admin",
            },
          },
          reasonCode: appDoc.cancelRequest?.reasonCode ?? null,
          reasonTextPreview: toReasonPreview(trimmed ?? appDoc.cancelRequest?.reasonText),
          refundAccountMasked: maskRefundAccount(appDoc.cancelRequest?.refundAccount),
          prevCancelStatus: appDoc.cancelRequest?.status ?? null,
          nextCancelStatus: "rejected",
          applicationStatus: appDoc.status ?? null,
        },
      },
      req,
    );

    const subject = buildCancelRefundSubject({
      userId: (appDoc as any).userId ? String((appDoc as any).userId) : null,
      applicationId: id,
    });

    await recordCancelRefundSignal(db, {
      eventType: "stringing_cancel_request_rejected",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "stringing_application",
      targetId: id,
      actorRole: "admin",
      reasonCode: appDoc.cancelRequest?.reasonCode ?? null,
      status: "rejected",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[handleStringingCancelReject] error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ========== 배송 정보 수정 (스트링 신청서 + 연결된 주문서) ==========
export async function handleUpdateShippingInfo(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json();

    const db = await getDb();
    const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(id) });

    if (!app) {
      return new NextResponse("신청서를 찾을 수 없습니다.", { status: 404 });
    }

    const newShippingInfo = body.shippingInfo;
    if (!newShippingInfo) {
      return new NextResponse("배송 정보가 필요합니다.", { status: 400 });
    }

    const normalizeMethod = (raw: unknown): "delivery" | "quick" | "visit" | null => {
      const s = String(raw ?? "")
        .trim()
        .toLowerCase();
      if (!s) return null;
      if (["visit", "pickup", "방문", "방문수령", "매장"].includes(s)) return "visit";
      if (["quick", "퀵", "퀵배송"].includes(s)) return "quick";
      if (["delivery", "courier", "parcel", "ship", "shipping", "택배", "택배배송"].includes(s))
        return "delivery";
      return null;
    };

    const linkedOrder = (app as any).orderId
      ? await db.collection("orders").findOne(
          { _id: new ObjectId((app as any).orderId) },
          {
            projection: {
              shippingInfo: 1,
              servicePickupMethod: 1,
              status: 1,
              paymentStatus: 1,
              paymentInfo: 1,
            },
          },
        )
      : null;

    const deriveVisitContext = (doc: any, order: any): boolean => {
      const collectionRaw = doc?.collectionMethod ?? doc?.shippingInfo?.collectionMethod;
      if (normalizeCollection(collectionRaw) === "visit") return true;

      const linkedPickup = (() => {
        if (!order) return null;
        const pickup = normalizeServicePickupMethod((order as any).servicePickupMethod);
        const codeFromPickup =
          pickup === "SHOP_VISIT"
            ? "visit"
            : pickup === "COURIER_VISIT" || pickup === "SELF_SEND"
              ? "courier"
              : undefined;
        const shippingRaw =
          (order as any).shippingInfo?.shippingMethod ??
          (order as any).shippingInfo?.deliveryMethod ??
          null;
        return normalizeOrderShippingMethod(shippingRaw) ?? codeFromPickup ?? null;
      })();
      if (linkedPickup === "visit") return true;

      const shippingMethodRaw =
        doc?.shippingInfo?.shippingMethod ?? doc?.shippingInfo?.deliveryMethod;
      return normalizeMethod(shippingMethodRaw) === "visit";
    };

    const isOriginalVisitContext = deriveVisitContext(app as any, linkedOrder);
    const nextMethodNormalized = normalizeMethod((newShippingInfo as any)?.shippingMethod);

    if (isOriginalVisitContext) {
      if (nextMethodNormalized && nextMethodNormalized !== "visit") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "방문 수령 신청은 배송 방식 변경이 불가합니다. 예외 전환은 별도 관리자 절차를 통해 진행해주세요.",
          },
          { status: 400 },
        );
      }
    } else if (nextMethodNormalized === "visit") {
      return NextResponse.json(
        {
          ok: false,
          message: "일반 배송 신청은 방문 수령으로 변경할 수 없습니다.",
        },
        { status: 400 },
      );
    }

    // 기존 배송 정보와 병합 (신청서 기준)
    const mergedShippingInfo: any = {
      ...(app as any).shippingInfo,
      ...newShippingInfo,
    };

    const isInvoiceCourierShipping =
      Boolean((newShippingInfo as any).invoice) &&
      (nextMethodNormalized === "delivery" ||
        normalizeMethod(mergedShippingInfo.shippingMethod) === "delivery");

    if (isInvoiceCourierShipping) {
      const invoice = (newShippingInfo as any).invoice || {};
      const normalizedCourier = normalizeCourierCode(invoice.courier);
      const courierItem = findCourierCatalogItem(normalizedCourier);

      if (!courierItem) {
        return NextResponse.json({ success: false, message: "INVALID_COURIER" }, { status: 400 });
      }

      if (courierItem.code === "ems") {
        return NextResponse.json(
          {
            success: false,
            message: "EMS는 현재 운송장 등록을 지원하지 않습니다.",
          },
          { status: 400 },
        );
      }

      const normalizedTracking = normalizeTrackingNumber(invoice.trackingNumber);

      if (!normalizedTracking) {
        return NextResponse.json(
          { success: false, message: "운송장 번호를 입력해주세요." },
          { status: 400 },
        );
      }

      if (!isValidTrackingNumberLength(normalizedTracking)) {
        return NextResponse.json(
          {
            success: false,
            message: "운송장 번호는 숫자 9~20자리로 입력해주세요.",
          },
          { status: 400 },
        );
      }

      mergedShippingInfo.invoice = {
        ...mergedShippingInfo.invoice,
        courier: normalizedCourier,
        trackingNumber: normalizedTracking,
      };
      newShippingInfo.invoice = {
        ...newShippingInfo.invoice,
        courier: normalizedCourier,
        trackingNumber: normalizedTracking,
      };
    }

    // 실제 DB $set 에 사용할 필드
    const setFields: any = {
      shippingInfo: mergedShippingInfo,
    };

    // estimatedDate 가 있으면 invoice.shippedAt 이 비어있는 경우 채워주기
    if (typeof mergedShippingInfo.estimatedDate === "string") {
      const est = mergedShippingInfo.estimatedDate;
      if (!mergedShippingInfo.invoice) mergedShippingInfo.invoice = {};
      if (!mergedShippingInfo.invoice.shippedAt) {
        mergedShippingInfo.invoice.shippedAt = est;
      }
    }

    // 이력 작성을 위한 이전/이후 값 준비
    const prevShippingInfo: any = (app as any).shippingInfo || {};
    const prevSelfShip: any = prevShippingInfo.selfShip || {};
    const prevInvoice: any = prevShippingInfo.invoice || {};

    const nextSelfShip: any = mergedShippingInfo.selfShip || {};
    const nextInvoice: any = mergedShippingInfo.invoice || {};

    const now = new Date();
    const historyEntries: HistoryRecord[] = [];

    // 매장 발송 정보(방식/예정일/운송장) 통합 로그
    const prevMethod = (prevShippingInfo.shippingMethod ?? null) as string | null;
    const nextMethod = (mergedShippingInfo.shippingMethod ?? null) as string | null;

    const prevEst = (prevShippingInfo.estimatedDate ?? null) as string | null;
    const nextEst = (mergedShippingInfo.estimatedDate ?? null) as string | null;

    const prevTrackingStore =
      ((prevInvoice.trackingNumber as string | undefined) || "").trim() || null;
    const nextTrackingStore =
      ((nextInvoice.trackingNumber as string | undefined) || "").trim() || null;

    const prevCourierStore = ((prevInvoice.courier as string | undefined) || "").trim() || null;
    const nextCourierStore = ((nextInvoice.courier as string | undefined) || "").trim() || null;

    const changedMethod = prevMethod !== nextMethod;
    const changedEst = prevEst !== nextEst;
    const changedTracking = prevTrackingStore !== nextTrackingStore;
    const changedCourier = prevCourierStore !== nextCourierStore;

    // "처음 등록인지" 여부: 이전에는 아무 정보도 없었는데 이번에 뭔가 생긴 경우
    const hasPrevStoreShipping = Boolean(
      prevMethod || prevEst || prevTrackingStore || prevCourierStore,
    );
    const hasNextStoreShipping = Boolean(
      nextMethod || nextEst || nextTrackingStore || nextCourierStore,
    );
    const isStoreRegister = !hasPrevStoreShipping && hasNextStoreShipping;

    const storeChanges: string[] = [];

    if (changedMethod && nextMethod) {
      const methodLabel =
        nextMethod === "delivery"
          ? "택배"
          : nextMethod === "quick"
            ? "퀵배송"
            : nextMethod === "visit"
              ? "매장 방문 수령"
              : nextMethod;
      storeChanges.push(`방식: ${methodLabel}`);
    }

    if (changedEst) {
      storeChanges.push(`예정일: ${nextEst ?? "-"}`);
    }

    if (changedCourier && nextCourierStore) {
      const courierLabel = getCourierDisplayName(nextCourierStore);
      storeChanges.push(`택배사: ${courierLabel}`);
    }

    if (changedTracking && nextTrackingStore) {
      storeChanges.push(`운송장번호 끝자리 ${nextTrackingStore.slice(-4)}`);
    }

    if (storeChanges.length > 0) {
      historyEntries.push({
        status: isStoreRegister ? "매장 발송 정보 등록" : "매장 발송 정보 수정",
        date: now,
        description: `관리자가 매장 발송 정보를 ${isStoreRegister ? "등록" : "수정"}했습니다. (${storeChanges.join(", ")})`,
      });
    }

    // 자가 발송(사용자 → 매장) 운송장 등록/수정 로그
    if (newShippingInfo.selfShip) {
      const prevTracking = (prevSelfShip.trackingNo || "").trim();
      const nextTracking = (nextSelfShip.trackingNo || "").trim();
      const prevCourier = (prevSelfShip.courier || "").trim();
      const nextCourier = (nextSelfShip.courier || "").trim();
      const courierLabel = getCourierDisplayName(nextCourier);

      if (nextTracking && !prevTracking) {
        // 최초 등록
        historyEntries.push({
          status: "자가발송 운송장 등록",
          date: now,
          description: `사용자가 자가 발송 운송장을 등록했습니다. (택배사: ${courierLabel}, 운송장번호 끝자리 ${nextTracking.slice(-4)})`,
        });
      } else if (
        nextTracking &&
        prevTracking &&
        (nextTracking !== prevTracking || nextCourier !== prevCourier)
      ) {
        // 번호 또는 택배사 변경
        historyEntries.push({
          status: "자가발송 운송장 수정",
          date: now,
          description: `사용자가 자가 발송 운송장을 수정했습니다. (택배사: ${courierLabel}, 운송장번호 끝자리 ${nextTracking.slice(-4)})`,
        });
      }
    }

    // collectionMethod 정규화 (신청서 최상위 + shippingInfo 모두 반영)
    if (typeof newShippingInfo.collectionMethod === "string") {
      const normalized = normalizeCollection(newShippingInfo.collectionMethod);

      // 주문 병합용
      newShippingInfo.collectionMethod = normalized;
      // 신청서 shippingInfo 저장용
      mergedShippingInfo.collectionMethod = normalized;
      // 신청서 문서 최상위 필드
      setFields.collectionMethod = normalized;
    }

    // 신청서 업데이트 (배송 정보 + history)
    const updateDoc: any = {
      $set: setFields,
    };

    if (historyEntries.length > 0) {
      updateDoc.$push = {
        history: {
          $each: historyEntries as any[],
        },
      };
    }

    await db.collection("stringing_applications").updateOne({ _id: new ObjectId(id) }, updateDoc);

    // 연결된 주문에도 동일 병합
    if ((app as any).orderId) {
      const orderShipping = (linkedOrder as any)?.shippingInfo || {};
      const mergedOrderShippingInfo = {
        ...orderShipping,
        ...newShippingInfo,
      };

      const linkedOrderStatusRaw = String((linkedOrder as any)?.status ?? "").trim();
      const linkedOrderStatus = normalizeOrderStatus(linkedOrderStatusRaw);
      const linkedOrderPaymentStatus = normalizePaymentStatus(
        String(
          (linkedOrder as any)?.paymentStatus ?? (linkedOrder as any)?.paymentInfo?.status ?? "",
        ).trim(),
      );
      const linkedOrderPaid =
        linkedOrderPaymentStatus === "결제완료" || linkedOrderStatus === "결제완료";
      const shouldAutoTransitLinkedOrder =
        !isOriginalVisitContext &&
        isStoreRegister &&
        linkedOrderPaid &&
        !ORDER_TERMINAL_STATUSES.has(linkedOrderStatus) &&
        !ORDER_SHIPPING_PHASE_STATUSES.has(linkedOrderStatus);

      const orderUpdateDoc: any = {
        $set: {
          shippingInfo: mergedOrderShippingInfo,
        },
      };

      if (shouldAutoTransitLinkedOrder) {
        orderUpdateDoc.$set.status = "배송중";
        orderUpdateDoc.$push = {
          history: {
            status: "배송중",
            date: now,
            description:
              "스트링 신청서 배송정보 최초 등록에 따라 연결 주문 상태가 자동으로 배송중으로 전환되었습니다.",
          },
        };
      }

      await db
        .collection("orders")
        .updateOne({ _id: new ObjectId((app as any).orderId) }, orderUpdateDoc);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/applications/stringing/[id]/shipping] error:", err);
    return new NextResponse("서버 오류 발생", { status: 500 });
  }
}

// ========== 신청서의 history 필드 조회 (날짜 내림차순 + 페이지네이션) =========
export async function handleGetApplicationHistory(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { id } = context.params;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "5", 10);
  const skip = (page - 1) * limit;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = await getDb();
  const application = await db
    .collection("stringing_applications")
    .findOne({ _id: new ObjectId(id) }, { projection: { history: 1 } });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // 날짜 내림차순 정렬
  const allLogs = (application.history || []).sort(
    (a: HistoryItem, b: HistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // 페이징
  const paginated = allLogs.slice(skip, skip + limit);

  return NextResponse.json({
    history: paginated,
    total: allLogs.length,
  });
}
// ================= 신청 취소 "요청" =================
export async function handleApplicationCancelRequest(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // 1) ID 검증
    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 신청 ID입니다.", { status: 400 });
    }
    const _id = new ObjectId(id);

    // 2) DB/신청서 조회
    const db = await getDb();
    const applications = db.collection("stringing_applications");
    const existing: any = await applications.findOne({ _id });

    if (!existing) {
      return new NextResponse("신청서를 찾을 수 없습니다.", { status: 404 });
    }

    // 3) 인증 (accessToken 기반) – 마이페이지 신청 목록과 동일 패턴
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    // 4) 권한 체크
    //    - userId 가 있는 신청서: 해당 사용자만 취소 요청 가능
    //    - guest 신청( userId 없음 ): 마이페이지에서 보이지 않으므로 여기서는 차단
    if (existing.userId) {
      const isOwner = payload.sub === existing.userId.toString();
      if (!isOwner) {
        return new NextResponse("신청서를 취소할 권한이 없습니다.", {
          status: 403,
        });
      }
    } else {
      // userId 없는 신청서는 여기서 취소 요청 허용하지 않음 (운영 정책에 따라 조정 가능)
      return new NextResponse("게스트 신청서는 마이페이지에서 취소 요청을 할 수 없습니다.", {
        status: 403,
      });
    }

    // 5) 비즈니스 룰 체크
    // 5-1) 이미 취소된 신청이면 추가 요청 불가
    if (existing.status === "취소") {
      return new NextResponse("이미 취소된 신청입니다.", { status: 400 });
    }

    // 5-2) 운송장(배송) 정보가 이미 있는 경우 취소 요청 불가
    //      - selfShip.trackingNumber
    //      - shippingInfo.trackingNumber
    const shippingInfo: any = existing.shippingInfo ?? {};
    const trackingCandidates: string[] = [];

    const t1 = shippingInfo?.trackingNumber;
    const t2 = shippingInfo?.selfShip?.trackingNumber ?? shippingInfo?.selfShip?.trackingNo;

    if (typeof t1 === "string") trackingCandidates.push(t1.trim());
    if (typeof t2 === "string") trackingCandidates.push(t2.trim());

    const hasTracking = trackingCandidates.some((v) => v.length > 0);

    if (hasTracking) {
      return new NextResponse("이미 배송이 진행 중이어서 취소 요청을 할 수 없습니다.", {
        status: 400,
      });
    }

    // 6) 요청 body 에서 사유 파싱
    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reasonCode: string | undefined =
      typeof body.reasonCode === "string" ? body.reasonCode.trim() : undefined;
    const reasonText: string | undefined =
      typeof body.reasonText === "string" ? body.reasonText.trim() : undefined;

    const paymentContext = await resolveStringingCancelPaymentContext(db, existing);
    const needsRefundAccount =
      !paymentContext.packageApplied &&
      paymentContext.status === "결제완료" &&
      paymentContext.provider !== "nicepay";

    let refundAccount: { bank: string; account: string; holder: string } | undefined;
    if (needsRefundAccount) {
      const parsedRefundAccount = RefundAccountSchema.safeParse(body.refundAccount ?? null);
      if (!parsedRefundAccount.success) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "INVALID_REFUND_ACCOUNT",
            message: "환불 계좌 정보를 정확히 입력해주세요.",
            fieldErrors: parsedRefundAccount.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }
      refundAccount = parsedRefundAccount.data;
    }

    const now = new Date();

    // 7) cancelRequest 필드 구성 (DB에는 Date 타입으로 저장)
    const cancelRequest = {
      status: "requested" as const,
      reasonCode: reasonCode || "기타",
      reasonText: reasonText || "",
      requestedAt: now,
      ...(refundAccount ? { refundAccount } : {}),
      // handledAt / handledByAdminId 등은 승인/거절 시 채움 예정
    };

    // 8) history 한 줄 추가 (신청서 도메인에 맞는 문구 사용)
    const descBase = reasonCode || "사유 미입력";
    const descDetail = reasonText ? ` (${reasonText})` : "";

    const historyEntry: HistoryRecord = {
      status: "취소요청",
      date: now,
      description: `고객이 스트링 교체 서비스 신청 취소를 요청했습니다. 사유: ${descBase}${descDetail} · ${needsRefundAccount ? "환불 계좌 정보가 등록되었습니다." : "환불계좌 입력 없이 접수되었습니다."}`,
    };

    // 9) DB 업데이트
    await applications.updateOne({ _id }, {
      $set: { cancelRequest },
      $push: { history: historyEntry },
    } as any);

    void sendAdminOperationalAlert({
      kind: "cancel_requested",
      title: "⚠️ 취소 요청 접수",
      summary: "교체서비스 신청 취소 요청이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/applications/stringing/${id}`,
      dedupeKey: `cancel_requested:stringing_application:${id}:${now.toISOString()}`,
      priority: "high",
      fields: [
        { name: "대상", value: "교체서비스 신청" },
        { name: "신청번호", value: id },
        { name: "사유", value: descBase },
        { name: "환불계좌", value: needsRefundAccount ? "등록됨" : "미필요/미입력" },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/applications/stringing/[id]/cancel-request 오류:", err);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}

// ================= 신청 취소 "요청 철회" =================
export async function handleApplicationCancelRequestWithdraw(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 신청 ID입니다.", { status: 400 });
    }
    const _id = new ObjectId(id);

    const db = await getDb();
    const applications = db.collection("stringing_applications");
    const existing: any = await applications.findOne({ _id });

    if (!existing) {
      return new NextResponse("신청서를 찾을 수 없습니다.", { status: 404 });
    }

    // ── 인증 + 권한: 취소 요청과 동일하게 "본인 신청"만 철회 가능 ──
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    if (existing.userId) {
      const isOwner = payload.sub === existing.userId.toString();
      if (!isOwner) {
        return new NextResponse("신청서를 취소할 권한이 없습니다.", {
          status: 403,
        });
      }
    } else {
      return new NextResponse("게스트 신청서는 마이페이지에서 취소 요청을 철회할 수 없습니다.", {
        status: 403,
      });
    }

    // ── 비즈니스 룰 ──
    // 1) 이미 취소된 신청은 철회 의미 없음
    if (existing.status === "취소") {
      return new NextResponse("이미 취소된 신청입니다.", { status: 400 });
    }

    // 2) 운송장 정보가 이미 있으면 철회 불가 (요청 때와 동일 룰)
    const shippingInfo: any = existing.shippingInfo ?? {};
    const trackingCandidates: string[] = [];

    const t1 = shippingInfo?.trackingNumber;
    const t2 = shippingInfo?.selfShip?.trackingNumber ?? shippingInfo?.selfShip?.trackingNo;

    if (typeof t1 === "string") trackingCandidates.push(t1.trim());
    if (typeof t2 === "string") trackingCandidates.push(t2.trim());

    const hasTracking = trackingCandidates.some((v) => v.length > 0);

    if (hasTracking) {
      return new NextResponse("이미 배송이 진행 중이어서 취소 요청을 철회할 수 없습니다.", {
        status: 400,
      });
    }

    // 현재 cancelRequest 상태 확인
    const currentCancel = existing.cancelRequest ?? {};
    const currentStatus = currentCancel.status;

    if (currentStatus !== "requested" && currentStatus !== "요청") {
      return new NextResponse("현재는 취소 요청 상태가 아니어서 철회할 수 없습니다.", {
        status: 400,
      });
    }

    const now = new Date();

    const updatedCancelRequest = {
      ...currentCancel,
      status: "none" as const,
      handledAt: now, // 철회 시각을 handledAt 으로 기록
    };

    const historyEntry: HistoryRecord = {
      status: "취소요청철회",
      date: now,
      description: "고객이 스트링 교체 서비스 신청 취소 요청을 철회했습니다.",
    };

    await applications.updateOne({ _id }, {
      $set: { cancelRequest: updatedCancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/applications/stringing/[id]/cancel-request-withdraw 오류:", err);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}

// ================= 신청 취소 "승인" (관리자) =================
export async function handleApplicationCancelApprove(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 신청 ID입니다.", { status: 400 });
    }
    const _id = new ObjectId(id);

    const db = await getDb();
    const applications = db.collection("stringing_applications");
    const existing: any = await applications.findOne({ _id });

    if (!existing) {
      return new NextResponse("신청서를 찾을 수 없습니다.", { status: 404 });
    }

    // ── 관리자 인증/권한 ──
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin =
      payload.role === "admin" || (payload.email && adminList.includes(payload.email));
    if (!isAdmin) {
      return new NextResponse("관리자만 신청 취소를 승인할 수 있습니다.", {
        status: 403,
      });
    }

    // ── 비즈니스 룰 ──
    if (existing.status === "취소") {
      return new NextResponse("이미 취소된 신청입니다.", { status: 400 });
    }

    const currentCancel = existing.cancelRequest ?? {};
    if (currentCancel.status !== "requested") {
      return new NextResponse("현재는 취소 요청 상태가 아니어서 승인할 수 없습니다.", {
        status: 400,
      });
    }

    const now = new Date();
    const variantRestore = await restoreStringingVariantStockIfNeeded(db, existing, now);
    const gaugeRestore = await restoreStringingGaugeStockIfNeeded(db, existing, now);
    const colorRestore = await restoreStringingColorStockIfNeeded(db, existing, now);
    if (variantRestore.errorResponse) {
      return variantRestore.errorResponse;
    }
    if (gaugeRestore.errorResponse) {
      return gaugeRestore.errorResponse;
    }
    if (colorRestore.errorResponse) return colorRestore.errorResponse;

    const updatedCancelRequest = {
      ...currentCancel,
      status: "approved" as const,
      handledAt: now,
    };

    const historyEntry: HistoryRecord = {
      status: "취소승인",
      date: now,
      description: "관리자가 신청 취소 요청을 승인했습니다.",
    };

    await applications.updateOne({ _id }, {
      $set: {
        cancelRequest: updatedCancelRequest,
        status: "취소", // 신청 자체 상태를 "취소"로 전환
        ...variantRestore.setFields,
        ...gaugeRestore.setFields,
        ...colorRestore.setFields,
      },
      $push: { history: historyEntry },
    } as any);

    // ] 패키지 사용분 복원
    if (existing.packageApplied && existing.packagePassId) {
      try {
        await revertConsumption(db, existing.packagePassId as ObjectId, _id);
      } catch (err) {
        console.error("[handleApplicationCancelApprove] revertConsumption error", err);
        // 복원 실패해도 취소 자체는 유지
      }
    }

    return NextResponse.json({
      ok: true,
      gaugeStockRestore: gaugeRestore.restored ? "restored" : gaugeRestore.skippedReason,
      colorStockRestore: colorRestore.restored ? "restored" : colorRestore.skippedReason,
    });
  } catch (err) {
    console.error("POST /api/applications/stringing/[id]/cancel-approve 오류:", err);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}

// ================= 신청 취소 "거절" (관리자) =================
export async function handleApplicationCancelReject(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 신청 ID입니다.", { status: 400 });
    }
    const _id = new ObjectId(id);

    const db = await getDb();
    const applications = db.collection("stringing_applications");
    const existing: any = await applications.findOne({ _id });

    if (!existing) {
      return new NextResponse("신청서를 찾을 수 없습니다.", { status: 404 });
    }

    // ── 관리자 인증/권한 ──
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin =
      payload.role === "admin" || (payload.email && adminList.includes(payload.email));
    if (!isAdmin) {
      return new NextResponse("관리자만 신청 취소를 거절할 수 있습니다.", {
        status: 403,
      });
    }

    // ── 비즈니스 룰 ──
    const currentCancel = existing.cancelRequest ?? {};
    if (currentCancel.status !== "requested") {
      return new NextResponse("현재는 취소 요청 상태가 아니어서 거절할 수 없습니다.", {
        status: 400,
      });
    }

    const now = new Date();

    // body 에서 관리자 메모(거절 사유)를 받을 수도 있음 (선택)
    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const adminMemo: string | undefined =
      typeof body.adminMemo === "string" ? body.adminMemo.trim() : undefined;

    const updatedCancelRequest = {
      ...currentCancel,
      status: "rejected" as const,
      handledAt: now,
    };

    const reasonSuffix = adminMemo ? ` (관리자 메모: ${adminMemo})` : "";

    const historyEntry: HistoryRecord = {
      status: "취소거절",
      date: now,
      description: `관리자가 신청 취소 요청을 거절했습니다.${reasonSuffix}`,
    };

    await applications.updateOne({ _id }, {
      $set: { cancelRequest: updatedCancelRequest },
      $push: { history: historyEntry },
    } as any);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/applications/stringing/[id]/cancel-reject 오류:", err);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}

// ========== 로그인한 사용자의 스트링 신청서 전체 목록 조회 ==========
export async function handleGetApplicationList() {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse("Unauthorized", { status: 401 });
  try {
    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db();

    const userId = new ObjectId(payload.sub);

    // 'stringing_applications' 컬렉션에서 신청서 목록 전체 조회
    const rawList = await db
      .collection("stringing_applications") // 정확한 컬렉션명 주의
      .find({ userId })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .toArray();

    // 각 신청서에 장착 상품 요약(stringSummary) 필드 추가
    const applications = await Promise.all(
      rawList.map(async (doc) => {
        const details: any = (doc as any).stringDetails ?? {};
        const typeIds: string[] = Array.isArray(details.stringTypes) ? details.stringTypes : [];

        // 스트링 이름 목록 생성 (커스텀/상품명 혼합)
        const names = await Promise.all(
          typeIds.map(async (prodId: string) => {
            if (prodId === "custom") {
              return (details.customStringName ?? "커스텀 스트링") as string;
            }
            const prod = await db
              .collection("products")
              .findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
            return (prod?.name as string) ?? "알 수 없는 스트링";
          }),
        );

        const primaryName = names[0];
        const kinds = names.length;

        let stringSummary: string | undefined;
        if (primaryName) {
          stringSummary = kinds <= 1 ? primaryName : `${primaryName} 외 ${kinds - 1}종`;
        }

        return {
          ...(doc as any),
          stringSummary,
        };
      }),
    );

    // 신청서 목록을 JSON 응답으로 반환
    return NextResponse.json(applications);
  } catch (err) {
    console.error("신청 목록 조회 오류:", err);
    //  에러 발생 시 500 상태와 메시지 반환
    return NextResponse.json({ message: "목록을 불러올 수 없습니다." }, { status: 500 });
  }
}

// ==== 특정 날짜(preferredDate)에 예약된 시간대(preferredTime) 목록을 반환 ====

export async function handleGetReservedTimeSlots(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD

    // 0) 날짜 형식 검증
    const isValidDate = (s: string | null | undefined): s is string =>
      typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isValidDate(date)) {
      return NextResponse.json({ message: "유효하지 않은 날짜입니다." }, { status: 400 });
    }

    const db = (await clientPromise).db();

    const capRaw = searchParams.get("cap");
    const cap = Number(capRaw);
    const capCount = Math.max(1, Math.floor((Number.isNaN(cap) ? 1 : cap) || 1));

    // 1) 우선 설정을 로드하고, "예약 가능 기간" 검증을 slotEngine 로직으로 수행
    const settings = await loadStringingSettings(db);
    const win = validateBookingWindow(settings, date);
    if (!win.ok) {
      return NextResponse.json(
        {
          message:
            win.message ??
            `예약 가능 기간을 벗어났습니다. (오늘부터 ${win.windowDays}일 이내만 예약 가능)`,
        },
        { status: 400 },
      );
    }

    // 2) slotEngine에 하루 요약 계산을 위임
    const summary = await buildSlotSummaryForDate(db, date, capCount);

    // 3) 그대로 프론트로 반환
    //    - allTimes / reservedTimes / availableTimes / capacity / date / closed
    // 훅이 기대하는 closed 필드를 그대로 전달해 휴무일이 오류처럼 보이는 오해를 방지한다.
    return NextResponse.json(summary, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[handleGetReservedTimeSlots] error", error);
    return NextResponse.json(
      { message: "예약 시간 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// ========== 스트링 서비스 신청서 제출(POST) API ==========
export async function handleSubmitStringingApplication(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const userId = payload?.sub ? new ObjectId(payload.sub) : null;
  const guestClaims = verifyOrderAccessToken(cookieStore.get("orderAccessToken")?.value ?? "");

  const guestOrderId =
    guestClaims && "orderId" in guestClaims && typeof guestClaims.orderId === "string"
      ? guestClaims.orderId
      : null;
  const guestRentalId =
    guestClaims && "rentalId" in guestClaims && typeof guestClaims.rentalId === "string"
      ? guestClaims.rentalId
      : null;

  try {
    const body = await req.json();
    const db = await getDb();

    const result = await submitStringingApplicationCore({
      db,
      userId,
      guestOrderId,
      guestRentalId,
      input: body,
    });

    const applicationId = String(result.applicationId);

    void sendAdminOperationalAlert({
      kind: "stringing_application_submitted",
      title: "🧵 신규 교체서비스 신청",
      summary: "신규 교체서비스 신청이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/applications/stringing/${applicationId}`,
      dedupeKey: `stringing_application_submitted:${applicationId}`,
      fields: [
        { name: "신청자명", value: String(body?.name ?? body?.customerName ?? "미입력") },
        { name: "접수 방식", value: String(body?.serviceType ?? body?.pickupMethod ?? "확인 필요") },
        { name: "희망일", value: formatAdminAlertDate(body?.preferredDate ?? body?.date) },
        { name: "희망 시간", value: String(body?.preferredTime ?? body?.time ?? "미입력") },
        { name: "주문 연결 여부", value: body?.orderId || guestOrderId ? "연결됨" : "없음" },
      ],
    });

    const response = NextResponse.json(
      { message: "success", applicationId: result.applicationId },
      { status: 201 },
    );

    const hasGuestOrderToken = typeof guestOrderId === "string";
    const hasGuestRentalToken = typeof guestRentalId === "string";
    const hasOrderIdInPayload = typeof body?.orderId === "string" && body.orderId.trim().length > 0;
    const hasRentalIdInPayload =
      typeof body?.rentalId === "string" && body.rentalId.trim().length > 0;
    const isGuestStandaloneSubmit =
      !userId &&
      !hasGuestOrderToken &&
      !hasGuestRentalToken &&
      !hasOrderIdInPayload &&
      !hasRentalIdInPayload;

    if (isGuestStandaloneSubmit) {
      const applicationAccessToken = signApplicationAccessToken({
        applicationId: String(result.applicationId),
      });
      response.cookies.set("applicationAccessToken", applicationAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (e: any) {
    if (e?.status) {
      return NextResponse.json({ message: e.message ?? "요청 처리 실패" }, { status: e.status });
    }
    console.error("[POST stringing_application]", e);
    return NextResponse.json({ message: "서버 오류 발생" }, { status: 500 });
  }
}

// ================= DRAFT(초안) 생성/재사용 =================
// 목적: /services/apply?orderId=... 진입 시, 해당 주문에 진행 중 신청서가 "항상 1개" 존재하도록 보장
// 불변식: 같은 orderId에 status ∈ INPROGRESS_STATUSES 문서는 동시에 1개만
async function safeJson<T = any>(req: Request): Promise<T | null> {
  try {
    // 본문이 비어 있거나 이미 소비된 경우 에러가 나므로 안전하게 감쌉니다.
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
export async function handleCreateOrGetDraftApplication(req: Request) {
  // 쿼리스트링에서도 orderId를 받는 fallback
  const url = new URL(req.url);
  const qsOrderId = url.searchParams.get("orderId");

  // 본문 JSON은 안전하게 파싱
  const body = await safeJson<{ orderId?: string }>(req);
  const orderId = body?.orderId ?? qsOrderId ?? "";

  // 디버깅: 요청 URL과 파싱된 값 로깅
  console.debug("[stringing drafts] req.url=", String(req.url));
  console.debug(
    "[stringing drafts] qsOrderId=",
    String(qsOrderId),
    "bodyOrderId=",
    body?.orderId,
    "orderId=",
    orderId,
  );

  if (!orderId || !ObjectId.isValid(orderId)) {
    console.warn("[stringing drafts] invalid orderId:", orderId);
    return NextResponse.json({ ok: false, error: "Invalid or missing orderId" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const jar = await cookies();

    // 로그인 사용자/관리자 페이로드
    const at = jar.get("accessToken")?.value ?? null;
    const payload = at ? verifyAccessToken(at) : null;
    const userId = payload?.sub ?? null;
    const isAdmin = payload?.role === "admin";

    // 주문 조회 (이후 권한 판단에서 'order'를 사용하므로 반드시 먼저 조회)
    const ordersCol = db.collection("orders");
    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return new Response(JSON.stringify({ message: "주문을 찾을 수 없습니다." }), { status: 404 });
    }

    // 게스트용 쿠키 토큰(있을 수도/없을 수도) → order 조회 후에 일치 여부 판단
    const oax = jar.get("orderAccessToken")?.value ?? null;
    const guestClaims = oax ? verifyOrderAccessToken(oax) : null;
    const guestOrderId =
      guestClaims && "orderId" in guestClaims && typeof guestClaims.orderId === "string"
        ? guestClaims.orderId
        : null;
    // 권한: (주문 소유자) or (관리자) or (게스트 토큰의 orderId 일치)
    const isOwner = !!(order?.userId && String(order.userId) === String(userId));
    const guestOwnsOrder = !!(guestOrderId && guestOrderId === String(order._id));

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
      });
    }

    // 서비스 대상 확인: withStringService / isStringServiceApplied 둘 다 허용
    const withString =
      Boolean(order?.shippingInfo?.withStringService) || Boolean(order?.isStringServiceApplied);
    if (!withString) {
      return new Response(JSON.stringify({ message: "스트링 서비스 대상 주문이 아닙니다." }), {
        status: 400,
      });
    }

    const appsCol = db.collection("stringing_applications");

    // 이미 진행중(draft/received) 있으면 재사용
    const existing = await appsCol.findOne({
      orderId: { $in: [order._id, String(order._id)] }, // ObjectId와 string 모두 매칭
      status: { $in: INPROGRESS_STATUSES },
    });

    const link = `/services/apply?orderId=${orderId}`;
    if (existing) {
      // 초안이면 expireAt 24h 연장 (사용자가 계속 작업 중인 경우 자동 연장)
      if (existing.status === "draft") {
        await appsCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              updatedAt: new Date().toISOString(),
            },
          },
        );
      }
      return new Response(
        JSON.stringify({
          applicationId: String(existing._id),
          orderId,
          link,
          reused: true,
        }),
        { status: 200 },
      );
    }

    // 주문의 선택에 따라 기본 수거방식 결정
    const initialCollectionMethod: "self_ship" | "courier_pickup" | "visit" =
      (order as any)?.shippingInfo?.deliveryMethod === "방문수령"
        ? "visit"
        : toCollectionMethodFromServicePickup((order as any)?.servicePickupMethod);

    // 없으면 초안 생성
    const now = new Date();
    const doc = {
      userId: userId ? new ObjectId(userId) : null,
      orderId: order._id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),

      // 최소 스키마 기본값(고아 draft 방지)
      customer: {
        name:
          (order as any)?.customer?.name ??
          (order as any)?.userSnapshot?.name ??
          (order as any)?.guestInfo?.name ??
          "",
        email:
          (order as any)?.customer?.email ??
          (order as any)?.userSnapshot?.email ??
          (order as any)?.guestInfo?.email ??
          "",
        phone:
          (order as any)?.customer?.phone ??
          (order as any)?.shippingInfo?.phone ??
          (order as any)?.guestInfo?.phone ??
          "",
      },
      searchEmailLower: normalizeEmailForSearch(
        (order as any)?.customer?.email ??
          (order as any)?.userSnapshot?.email ??
          (order as any)?.guestInfo?.email ??
          null,
      ),

      stringDetails: { stringTypes: [], customStringName: "" },

      shippingInfo: {
        name: (order as any)?.shippingInfo?.name ?? (order as any)?.customer?.name ?? "",
        phone: (order as any)?.shippingInfo?.phone ?? (order as any)?.customer?.phone ?? "",
        email: (order as any)?.customer?.email ?? undefined,
        address: (order as any)?.shippingInfo?.address ?? "",
        addressDetail: (order as any)?.shippingInfo?.addressDetail ?? "",
        postalCode: (order as any)?.shippingInfo?.postalCode ?? "",
        depositor: (order as any)?.shippingInfo?.depositor ?? null,
        bank: (order as any)?.paymentInfo?.bank ?? null,
        deliveryRequest: (order as any)?.shippingInfo?.deliveryRequest ?? "",
        collectionMethod: initialCollectionMethod,
      },

      collectionMethod: initialCollectionMethod,
      pickup: null,

      stringItems: [],
      totalPrice: 0,

      usedPackage: { passId: undefined, consumed: false },

      status: "draft",
      expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // TTL
      history: [
        {
          status: "draft",
          date: now.toISOString(),
          description: "주문 기반 자동 초안 생성",
        },
      ],
    };

    let result;
    try {
      result = await appsCol.insertOne(doc);
    } catch (err: any) {
      if (err?.code === 11000) {
        // 레이스 시 재조회해서 재사용으로 응답
        const reused = await appsCol.findOne(
          { orderId: String(order._id), status: { $in: INPROGRESS_STATUSES } },
          { projection: { _id: 1 } },
        );
        if (reused) {
          return new Response(
            JSON.stringify({
              applicationId: String(reused._id),
              orderId,
              link,
              reused: true,
            }),
            { status: 200 },
          );
        }
      }
      throw err;
    }

    return new Response(
      JSON.stringify({
        applicationId: String(result.insertedId),
        orderId,
        link,
        reused: false,
      }),
      { status: 201 },
    );
  } catch (e) {
    console.error("[stringing drafts] error:", e);
    return new Response(JSON.stringify({ message: "서버 오류" }), {
      status: 500,
    });
  }
}
