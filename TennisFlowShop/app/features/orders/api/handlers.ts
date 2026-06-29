import { createStringingApplicationFromOrder } from "@/app/features/stringing-applications/api/create-from-order";
import {
  submitStringingApplicationCore,
  type StringingApplicationInput,
} from "@/app/features/stringing-applications/api/submit-core";
import {
  applyPackageToServiceFee,
  resolvePackageUsage,
  resolveRequiredPassCountFromInput,
} from "@/app/features/stringing-applications/lib/package-pricing";
import { verifyAccessToken } from "@/lib/auth.utils";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import {
  buildItemSummary,
  compactId,
  formatOrderPickupLabel,
  formatVisitReservation,
  formatWon,
  maskPhone,
  previewText,
  truthyField,
} from "@/lib/admin-alerts/formatters";
import { getShippingBadge } from "@/lib/badge-style";
import clientPromise from "@/lib/mongodb";
import { ENABLE_RACKET_STANDALONE_ORDER } from "@/lib/orders/racket-standalone-policy";
import { isMountableStringByFee } from "@/lib/orders/string-mounting-policy";
import { ENABLE_STRING_STANDALONE_ORDER } from "@/lib/orders/string-standalone-policy";
import { findOneActivePassForUser } from "@/lib/passes.service";
import { deductPoints } from "@/lib/points.service";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { productVisibilityFilterFor, racketVisibilityFilterFor } from "@/lib/public-visibility";
import {
  getVisibilityViewerFromCookies,
  getVisibilityViewerFromUserId,
} from "@/lib/public-visibility-viewer";
import { getEffectiveRacketPrice } from "@/lib/racket-pricing";
import { normalizeEmailForSearch } from "@/lib/search-email";
import {
  hasStringingServiceInCheckout,
  validateStringingApplicationInputForOrder,
} from "@/lib/checkout-stringing-guard";
import { calcOrderShippingFeeWithBundlePolicy, normalizeItemShippingFee } from "@/lib/shipping-fee";
import type { DBOrder } from "@/lib/types/order-db";
import { ObjectId, type Db } from "mongodb";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchCombinedOrders, findUserSnapshot } from "./db";

/**
 * 서버 최종 유효성 검사 스키마(주문 생성)
 * - 목적:
 *   1) req.json() 파싱 실패/타입 깨짐 요청을 400으로 정리
 *   2) ObjectId 변환(new ObjectId) 이전에 유효성 검사로 500 방지
 *   3) shippingInfo의 최소 규칙(배송 주소 조건부 필수 등) 강제
 *
 * 주의:
 * - 기존 로직을 바꾸지 않기 위해, 필요한 최소 필드만 강제하고 나머지는 passthrough로 허용.
 * - (일반 체크아웃) shippingInfo.deliveryMethod 사용
 * - (라켓 구매 체크아웃) shippingInfo.shippingMethod 사용
 */

// 숫자/문자 혼용으로 들어오는 입력을 안전하게 문자열로 정규화
const toTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

// 연락처: 숫자만 남기기 (클라에서는 이미 digits지만, 서버에서도 방어)
const toPhoneDigits = (v: unknown) => toTrimmedString(v).replace(/\D/g, "");
const PAYMENT_AMOUNT_CHANGED_MESSAGE =
  "상품 가격, 배송비, 포인트 또는 패키지 사용 정보가 변경되어 결제 금액이 달라졌습니다. 주문 정보를 다시 확인한 뒤 다시 시도해주세요.";

const normalizeWonAmountOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.floor(amount);
};

const OrderItemSchema = z.object({
  // createOrder 내부에서 new ObjectId(item.productId)를 호출하므로, 여기서 먼저 검증해 500을 방지합니다.
  productId: z
    .string()
    .trim()
    .min(1)
    .refine((s) => ObjectId.isValid(s), { message: "INVALID_PRODUCT_ID" }),
  quantity: z.coerce.number().int().positive(),
  kind: z.enum(["product", "racket"]).optional(),
  selectedGauge: z.string().trim().optional(),
  selectedColor: z.string().trim().optional(),
  selectedColorLabel: z.string().trim().optional(),
  selectedColorHex: z.string().trim().optional(),
  selectedColorImage: z.string().trim().optional(),
});

const GuestInfoSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    phone: z
      .preprocess(toPhoneDigits, z.string().min(8).max(13))
      // 너무 강하게 막으면 운영 중 예외 케이스가 생길 수 있어, 길이만 최소 방어합니다.
      .optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase()),
  })
  .passthrough();

const ShippingInfoSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    phone: z.preprocess(toPhoneDigits, z.string().min(8).max(13)),

    // 주소 계열은 "택배/발송"일 때만 필수(조건부). 방문이면 빈 문자열도 허용됩니다.
    address: z.preprocess(toTrimmedString, z.string()).optional(),
    addressDetail: z.preprocess(toTrimmedString, z.string()).optional(),
    postalCode: z.preprocess(toTrimmedString, z.string()).optional(),

    depositor: z.string().trim().min(2).max(50),
    deliveryRequest: z.preprocess(toTrimmedString, z.string()).optional(),

    // 일반 체크아웃: deliveryMethod 사용 (택배수령/방문수령)
    deliveryMethod: z.enum(["택배수령", "방문수령"]).optional(),

    // 라켓 구매 체크아웃: shippingMethod 사용 (courier/visit)
    shippingMethod: z.enum(["courier", "visit"]).optional(),

    // 교체 서비스 여부(일반 체크아웃에서만 내려옴). 없으면 false 취급.
    withStringService: z.coerce.boolean().optional(),
  })
  .passthrough()
  .superRefine((v, ctx) => {
    // 둘 중 하나는 반드시 존재(현재 프로젝트의 두 checkout 흐름 모두 해당)
    if (!v.deliveryMethod && !v.shippingMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryMethod"],
        message: "DELIVERY_METHOD_REQUIRED",
      });
    }

    // 택배/발송이면 주소/우편번호 최소 방어
    const needsAddress = v.deliveryMethod === "택배수령" || v.shippingMethod === "courier";
    if (needsAddress) {
      const postal = (v.postalCode ?? "").trim();
      const addr = (v.address ?? "").trim();

      // 우편번호 5자리 (CheckoutButton과 동일 기준)
      if (!/^\d{5}$/.test(postal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: "INVALID_POSTAL_CODE",
        });
      }
      if (!addr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "ADDRESS_REQUIRED",
        });
      }
      // addressDetail은 라켓 구매 체크아웃에서 선택값이므로 서버에서 강제하지 않습니다.
    }
  });

const CreateOrderBodySchema = z
  .object({
    items: z.array(OrderItemSchema).min(1),
    shippingInfo: ShippingInfoSchema,

    // 비회원 주문인 경우에만 createOrder에서 추가로 필수 체크합니다(기존 로직 유지)
    guestInfo: GuestInfoSchema.optional(),

    // 참고/로그용 필드들(서버는 신뢰하지 않고 재계산)
    totalPrice: z.any().optional(),
    shippingFee: z.any().optional(),
    serviceFee: z.any().optional(),
    expectedPayableAmount: z.coerce.number().optional(),

    // 포인트 사용(서버에서 100단위 보정/클램프는 기존 로직 그대로 사용)
    pointsToUse: z.coerce.number().optional(),

    paymentInfo: z
      .object({
        bank: z.preprocess(toTrimmedString, z.string()).optional(),
      })
      .passthrough()
      .optional(),

    // 기타(추가 필드들은 유지하되, 스키마가 걸러내지 않도록 passthrough)
    servicePickupMethod: z.any().optional(),
    isStringServiceApplied: z.any().optional(),
    stringingApplicationInput: z.any().optional(),
  })
  .passthrough();

const ordersIdemIndexGlobal = globalThis as typeof globalThis & {
  __tf_orders_idem_index_promise__?: Promise<string>;
};

// 매 요청 createIndex 비용 제거(런타임 1회 보장)
async function ensureOrdersIdemIndex(db: Db) {
  if (!ordersIdemIndexGlobal.__tf_orders_idem_index_promise__) {
    ordersIdemIndexGlobal.__tf_orders_idem_index_promise__ = db
      .collection("orders")
      .createIndex({ idemKey: 1 }, { unique: true, sparse: true });
  }
  await ordersIdemIndexGlobal.__tf_orders_idem_index_promise__;
}

function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const target = error as {
    code?: unknown;
    message?: unknown;
  };

  if (target.code === 11000) return true;

  return typeof target.message === "string" && target.message.includes("E11000");
}

// 주문 생성 핸들러
type CreateOrderExecutionContext = {
  source?: "api_orders_route" | "nicepay_return";
  userIdOverride?: string | null;
};

export async function createOrder(
  req: Request,
  executionContext?: CreateOrderExecutionContext,
): Promise<Response> {
  let idemKeyForDuplicateRecovery: string | undefined;
  let dbForDuplicateRecovery: Db | null = null;

  try {
    const idemKeyRaw = req.headers.get("Idempotency-Key");
    const idemKey = idemKeyRaw && idemKeyRaw.trim() ? idemKeyRaw : undefined;
    idemKeyForDuplicateRecovery = idemKey;

    class HttpError extends Error {
      status: number;
      body: any;
      constructor(status: number, body: any) {
        super("HttpError");
        this.status = status;
        this.body = body;
      }
    }

    // 쿠키에서 accessToken → userId 추출
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    const cookieUserId = payload?.sub ?? null;
    const contextUserId = executionContext?.userIdOverride ?? null;
    const userId = contextUserId || cookieUserId;

    /** ================================================
     * 비회원(게스트) 주문 생성 차단 플래그
     * - 삭제 없이 "운영 정책"만으로 즉시 on/off 가능
     *
     * env: GUEST_ORDER_MODE = 'off' | 'legacy' | 'on'
     *  - off:    비회원 주문 생성/조회 등 모두 중단
     *  - legacy: 신규 비회원 주문 생성 중단(레거시 조회는 추후 P1에서 분기)
     *  - on:     기존대로 비회원 주문 허용
     *
     * P0 목표: 신규 '주문 생성'만 서버에서 확실히 막는다(클라 우회 방지).
     *=========================================================================
     */
    const gomRaw = (process.env.GUEST_ORDER_MODE ?? "on").trim();
    const guestOrderMode =
      gomRaw === "off" || gomRaw === "legacy" || gomRaw === "on" ? gomRaw : "on";
    if (executionContext?.source === "nicepay_return") {
      console.info("[orders][createOrder][context]", {
        source: executionContext.source,
        hasAccessTokenCookie: Boolean(token),
        hasCookieUserId: Boolean(cookieUserId),
        hasContextUserId: Boolean(contextUserId),
        hasResolvedUserId: Boolean(userId),
        guestOrderMode,
      });
    }
    if (!userId && guestOrderMode !== "on") {
      return NextResponse.json(
        {
          error: "비회원 주문은 현재 중단되었습니다. 로그인 후 주문해주세요.",
          code: "GUEST_ORDER_DISABLED",
        },
        { status: 401 },
      );
    }

    // 요청 바디 파싱(JSON 깨짐 방어)
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "요청 본문(JSON)이 올바르지 않습니다." }, { status: 400 });
    }

    // 서버 최종 스키마 검증
    const parsed = CreateOrderBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      // 기존 UX에 맞춰 "무엇이 문제인지"를 가능한 범위에서 분기해줍니다.
      const issues = parsed.error.issues ?? [];

      // 아이템 관련 (빈 배열/형식/ID 등)
      if (issues.some((i) => i.path?.[0] === "items" && i.message === "INVALID_PRODUCT_ID")) {
        return NextResponse.json({ error: "잘못된 상품 ID 입니다." }, { status: 400 });
      }
      if (issues.some((i) => i.path?.[0] === "items")) {
        return NextResponse.json({ error: "주문 상품이 비어있습니다." }, { status: 400 });
      }

      // 배송 정보 관련
      if (issues.some((i) => i.path?.[0] === "shippingInfo")) {
        return NextResponse.json(
          { error: "배송 정보가 누락되었거나 올바르지 않습니다." },
          { status: 400 },
        );
      }

      // 나머지(포인트/게스트 정보 등) - 기본 메시지
      return NextResponse.json({ error: "요청 값이 올바르지 않습니다." }, { status: 400 });
    }

    const body = parsed.data;
    type RawOrderItem = z.infer<typeof OrderItemSchema>;

    // - 서버가 최종 규칙을 강제(클라 입력은 참고용)
    // - 정책: 100P 단위로만 사용 가능 (UI와 동일)
    const POINT_UNIT = 100;
    const requestedPointsToUse = Math.max(0, Math.floor(Number(body?.pointsToUse ?? 0) || 0));
    const normalizedRequestedPointsToUse =
      Math.floor(requestedPointsToUse / POINT_UNIT) * POINT_UNIT;

    // 클라 금액은 절대 신뢰하지 않음(참고 로그용만)
    const { items: rawItems, shippingInfo, guestInfo } = body;
    const stringingApplicationInput = body?.stringingApplicationInput as
      | StringingApplicationInput
      | undefined;
    const clientTotalPrice = body?.totalPrice;
    const clientShippingFee = body?.shippingFee;
    const clientServiceFee = body?.serviceFee;
    const clientExpectedPayableAmountRaw = body?.expectedPayableAmount;

    // 최소 방어
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "주문 상품이 비어있습니다." }, { status: 400 });
    }
    if (!shippingInfo) {
      return NextResponse.json({ error: "배송 정보가 누락되었습니다." }, { status: 400 });
    }
    if (!userId && !guestInfo) {
      return NextResponse.json({ error: "게스트 주문 정보 누락" }, { status: 400 });
    }

    const stringingInputValidation = validateStringingApplicationInputForOrder(
      hasStringingServiceInCheckout({
        shippingInfo,
        isStringServiceApplied: body?.isStringServiceApplied,
      }),
      stringingApplicationInput,
    );
    if (!stringingInputValidation.ok) {
      return NextResponse.json({ error: stringingInputValidation.message }, { status: 400 });
    }

    /**
     * 배송 방식 정규화(중요)
     * - 일반 체크아웃: shippingInfo.deliveryMethod = '택배수령' | '방문수령'
     * - 라켓 구매 체크아웃: shippingInfo.shippingMethod = 'courier' | 'visit'
     *
     * 현재 서버 내부 로직(배송비 계산, getShippingBadge 등)은 deliveryMethod를 기준으로 동작하는 구간이 있으므로,
     * 라켓 구매 흐름도 deliveryMethod로 매핑해 “서버 내부 기준”을 하나로 통일.
     *
     * 효과:
     * - 라켓 구매 + visit 인데 배송비가 0원이 아니게 계산되는 케이스 방지
     * - 주문 목록/상세에서 배송 라벨(뱃지/필터)이 일관되게 표시될 확률 증가
     */
    if (
      shippingInfo &&
      !(shippingInfo as any).deliveryMethod &&
      (shippingInfo as any).shippingMethod
    ) {
      const sm = (shippingInfo as any).shippingMethod;
      if (sm === "visit") (shippingInfo as any).deliveryMethod = "방문수령";
      else if (sm === "courier") (shippingInfo as any).deliveryMethod = "택배수령";
    }

    // DB
    const client = await clientPromise;
    const db = client.db();
    dbForDuplicateRecovery = db;
    const shouldResolveViewerFromUserId =
      executionContext?.source === "nicepay_return" && Boolean(executionContext.userIdOverride);
    const visibilityViewer = shouldResolveViewerFromUserId
      ? await getVisibilityViewerFromUserId(db, executionContext.userIdOverride)
      : await getVisibilityViewerFromCookies();
    if (executionContext?.source === "nicepay_return") {
      console.info("[orders][createOrder][visibility_viewer]", {
        source: executionContext.source,
        hasUserIdOverride: Boolean(executionContext.userIdOverride),
        visibilityViewerSource: shouldResolveViewerFromUserId ? "userIdOverride" : "cookies",
        isAdminViewer: visibilityViewer.isAdmin === true,
      });
    }

    type OrderDoc = Omit<DBOrder, "_id"> & {
      idemKey?: string;
      isStringServiceApplied?: boolean;
      stringingApplicationId?: string;
      servicePickupMethod?: any;
    };

    const ordersCol = db.collection<OrderDoc>("orders");

    // idemKey 유니크 인덱스(여러 번 호출해도 안전)
    await ensureOrdersIdemIndex(db);

    // idemKey로 이미 생성된 주문이면 반환
    if (idemKey) {
      const dup = await ordersCol.findOne({ idemKey });
      if (dup) {
        return NextResponse.json(
          {
            success: true,
            orderId: String(dup._id),
            stringingApplicationId: dup.stringingApplicationId
              ? String(dup.stringingApplicationId)
              : null,
            stringingSubmitted: Boolean(dup.stringingApplicationId),
            idempotent: true,
          },
          { status: 200 },
        );
      }
    }

    // 트랜잭션: 재고 차감 + 주문 생성 + (옵션) 신청서 생성
    const session = client.startSession();
    let createdOrderId: ObjectId | null = null;
    let createdStringingApplicationId: ObjectId | null = null;
    let stringingSubmitted = false;
    let createdOrderSnapshot: any = null;

    try {
      type ColorInventoryDeductionResult = { status: "deducted" } | { status: "not_managed" };

      type VariantInventoryDeductionResult = { status: "deducted" } | { status: "not_managed" };

      async function applyVariantInventoryDeduction(params: {
        productId: ObjectId;
        selectedColor?: string;
        selectedGauge?: string;
        quantity: number;
        session: any;
        productName?: string;
        product?: any;
      }): Promise<VariantInventoryDeductionResult> {
        const { productId, selectedColor, selectedGauge, quantity, session, productName, product } =
          params;
        const productDoc =
          product ??
          (await db.collection("products").findOne(
            {
              _id: productId,
              ...productVisibilityFilterFor(visibilityViewer),
            },
            { session },
          ));
        const variantInventories = Array.isArray((productDoc as any)?.variantInventories)
          ? (productDoc as any).variantInventories
          : [];
        if (variantInventories.length === 0) {
          return { status: "not_managed" };
        }

        const colorValue = typeof selectedColor === "string" ? selectedColor.trim() : "";
        const gaugeValue = typeof selectedGauge === "string" ? selectedGauge.trim() : "";

        if (!colorValue || !gaugeValue) {
          throw new HttpError(400, {
            error: "색상과 게이지(굵기)를 선택해주세요.",
            code: "VARIANT_SELECTION_REQUIRED",
            productName,
            selectedColor: colorValue || undefined,
            selectedGauge: gaugeValue || undefined,
          });
        }

        const variantRow = variantInventories.find(
          (v: any) =>
            String(v?.colorValue ?? "").trim() === colorValue &&
            String(v?.gaugeValue ?? "").trim() === gaugeValue,
        );

        if (!variantRow) {
          throw new HttpError(400, {
            error: "선택한 색상과 게이지(굵기) 조합을 찾을 수 없습니다.",
            code: "VARIANT_NOT_FOUND",
            productName,
            selectedColor: colorValue,
            selectedGauge: gaugeValue,
          });
        }

        if (variantRow?.isSoldOut === true) {
          throw new HttpError(400, {
            error: "선택한 색상과 게이지(굵기) 조합은 현재 품절입니다.",
            code: "VARIANT_SOLD_OUT",
            productName,
            selectedColor: colorValue,
            selectedGauge: gaugeValue,
          });
        }

        const variantStock = Number(variantRow?.stock ?? 0);
        if (variantStock < quantity) {
          throw new HttpError(400, {
            error: "선택한 색상과 게이지(굵기) 조합의 구매 가능 수량을 초과했습니다.",
            code: "VARIANT_INSUFFICIENT_STOCK",
            productName,
            selectedColor: colorValue,
            selectedGauge: gaugeValue,
          });
        }

        const variantUpdated = await db.collection("products").updateOne(
          {
            _id: productId,
            ...productVisibilityFilterFor(visibilityViewer),
            "inventory.stock": { $gte: quantity },
            variantInventories: {
              $elemMatch: {
                colorValue,
                gaugeValue,
                isSoldOut: { $ne: true },
                stock: { $gte: quantity },
              },
            },
            colorInventories: {
              $elemMatch: {
                value: colorValue,
                stock: { $gte: quantity },
              },
            },
            gaugeInventories: {
              $elemMatch: {
                value: gaugeValue,
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
                "variant.colorValue": colorValue,
                "variant.gaugeValue": gaugeValue,
              },
              { "color.value": colorValue },
              { "gauge.value": gaugeValue },
            ],
          },
        );

        if (variantUpdated.matchedCount > 0 && variantUpdated.modifiedCount > 0) {
          return { status: "deducted" };
        }

        throw new HttpError(400, {
          error: "선택한 색상과 게이지(굵기) 조합의 구매 가능 수량을 초과했습니다.",
          code: "VARIANT_STOCK_UPDATE_FAILED",
          productName,
          selectedColor: colorValue,
          selectedGauge: gaugeValue,
        });
      }

      async function applyColorInventoryDeduction(params: {
        productId: ObjectId;
        selectedColor: string;
        quantity: number;
        shouldAffectGlobalStock: boolean;
        session: any;
        productName?: string;
        product?: any;
      }): Promise<ColorInventoryDeductionResult> {
        const {
          productId,
          selectedColor,
          quantity,
          shouldAffectGlobalStock,
          session,
          productName,
          product,
        } = params;
        const productDoc =
          product ??
          (await db.collection("products").findOne(
            {
              _id: productId,
              ...productVisibilityFilterFor(visibilityViewer),
            },
            { session },
          ));
        const hasManagedColorInventory =
          Array.isArray((productDoc as any)?.colorInventories) &&
          (productDoc as any).colorInventories.length > 0;

        if (!hasManagedColorInventory) {
          return { status: "not_managed" };
        }

        const colorUpdated = await db.collection("products").updateOne(
          {
            _id: productId,
            ...productVisibilityFilterFor(visibilityViewer),
            colorInventories: {
              $elemMatch: {
                value: selectedColor,
                isSoldOut: { $ne: true },
                stock: { $gte: quantity },
              },
            },
            ...(shouldAffectGlobalStock ? { "inventory.stock": { $gte: quantity } } : {}),
          },
          {
            $inc: shouldAffectGlobalStock
              ? {
                  "colorInventories.$.stock": -quantity,
                  "inventory.stock": -quantity,
                  sold: quantity,
                }
              : {
                  "colorInventories.$.stock": -quantity,
                },
          },
          { session },
        );

        if (colorUpdated.matchedCount > 0 && colorUpdated.modifiedCount > 0)
          return { status: "deducted" };

        const productForColor = await db.collection("products").findOne(
          {
            _id: productId,
            ...productVisibilityFilterFor(visibilityViewer),
          },
          { session },
        );
        const colorInventories = Array.isArray((productForColor as any)?.colorInventories)
          ? (productForColor as any).colorInventories
          : [];
        const colorRow = colorInventories.find(
          (c: any) => String(c?.value ?? "").trim() === selectedColor,
        );

        if (!colorRow) {
          throw new HttpError(400, {
            error: "선택한 색상 옵션을 찾을 수 없습니다.",
            code: "COLOR_NOT_FOUND",
            productName,
            selectedColor,
          });
        }
        if (colorRow.isSoldOut === true) {
          throw new HttpError(400, {
            error: "선택한 색상은 현재 품절입니다.",
            code: "COLOR_SOLD_OUT",
            productName,
            selectedColor,
          });
        }
        const colorStock = Number(colorRow.stock ?? 0);
        if (colorStock < quantity) {
          throw new HttpError(400, {
            error: "선택한 색상의 구매 가능 수량을 초과했습니다.",
            code: "COLOR_INSUFFICIENT_STOCK",
            productName,
            selectedColor,
          });
        }

        throw new HttpError(400, {
          error: "선택한 색상의 구매 가능 수량을 초과했습니다.",
          code: "COLOR_STOCK_UPDATE_FAILED",
          productName,
          selectedColor,
        });
      }

      await session.withTransaction(async () => {
        // 1) 재고 차감(세션 포함)
        for (const item of rawItems as RawOrderItem[]) {
          const kind = item.kind ?? "product";
          const quantity = Number(item.quantity ?? 0);

          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new HttpError(400, { error: "수량이 잘못되었습니다." });
          }

          if (kind === "product") {
            const productId = new ObjectId(item.productId);
            const product = await db.collection("products").findOne(
              {
                _id: productId,
                ...productVisibilityFilterFor(visibilityViewer),
              },
              { session },
            );
            if (!product) throw new HttpError(404, { error: "상품을 찾을 수 없습니다." });

            const selectedGauge = item.selectedGauge?.trim();
            const selectedColor = item.selectedColor?.trim();
            const hasVariantInventories =
              Array.isArray((product as any).variantInventories) &&
              (product as any).variantInventories.length > 0;

            if (hasVariantInventories) {
              await applyVariantInventoryDeduction({
                productId,
                selectedColor,
                selectedGauge,
                quantity,
                session,
                productName: String((product as any)?.name ?? ""),
                product,
              });
              continue;
            }

            if (selectedGauge) {
              const gaugeInventories = Array.isArray((product as any).gaugeInventories)
                ? ((product as any).gaugeInventories as Array<{
                    value?: string;
                    stock?: number;
                    isSoldOut?: boolean;
                  }>)
                : [];
              const gaugeRow = gaugeInventories.find(
                (g) => String(g?.value ?? "").trim() === selectedGauge,
              );

              if (!gaugeRow) {
                throw new HttpError(400, {
                  error: "선택한 게이지(굵기) 옵션을 찾을 수 없습니다.",
                  code: "GAUGE_NOT_FOUND",
                  productName: product.name,
                  selectedGauge,
                });
              }

              if (gaugeRow.isSoldOut === true) {
                throw new HttpError(400, {
                  error: "선택한 게이지(굵기)는 현재 품절입니다.",
                  code: "GAUGE_SOLD_OUT",
                  productName: product.name,
                  selectedGauge,
                });
              }

              const gaugeStock = Number(gaugeRow.stock ?? 0);
              if (gaugeStock < quantity) {
                throw new HttpError(400, {
                  error: "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다.",
                  code: "GAUGE_INSUFFICIENT_STOCK",
                  productName: product.name,
                  selectedGauge,
                });
              }

              const gaugeUpdated = await db.collection("products").updateOne(
                {
                  _id: productId,
                  ...productVisibilityFilterFor(visibilityViewer),
                  "inventory.stock": { $gte: quantity },
                  gaugeInventories: {
                    $elemMatch: {
                      value: selectedGauge,
                      isSoldOut: { $ne: true },
                      stock: { $gte: quantity },
                    },
                  },
                },
                {
                  $inc: {
                    "gaugeInventories.$.stock": -quantity,
                    "inventory.stock": -quantity,
                    sold: quantity,
                  },
                },
                { session },
              );

              if (gaugeUpdated.matchedCount === 0 || gaugeUpdated.modifiedCount === 0) {
                throw new HttpError(400, {
                  error: "선택한 게이지(굵기)의 구매 가능 수량을 초과했습니다.",
                  code: "GAUGE_STOCK_UPDATE_FAILED",
                  productName: product.name,
                  selectedGauge,
                });
              }
              if (selectedColor) {
                await applyColorInventoryDeduction({
                  productId,
                  selectedColor,
                  quantity,
                  shouldAffectGlobalStock: false,
                  session,
                  productName: String((product as any)?.name ?? ""),
                  product,
                });
              }
              continue;
            }

            if (selectedColor) {
              const colorDeductionResult = await applyColorInventoryDeduction({
                productId,
                selectedColor,
                quantity,
                shouldAffectGlobalStock: true,
                session,
                productName: String((product as any)?.name ?? ""),
                product,
              });
              if (colorDeductionResult.status === "deducted") {
                continue;
              }
            }

            const currentStock = Number(product?.inventory?.stock ?? 0);
            if (currentStock < quantity) {
              throw new HttpError(400, {
                error: "INSUFFICIENT_STOCK",
                productName: product.name,
                currentStock,
              });
            }

            await db.collection("products").updateOne(
              {
                _id: productId,
                ...productVisibilityFilterFor(visibilityViewer),
              },
              { $inc: { "inventory.stock": -quantity, sold: quantity } },
              { session },
            );
            continue;
          }

          if (kind === "racket") {
            const racketId = new ObjectId(item.productId);
            const rackCol = db.collection("used_rackets");

            const racket = await rackCol.findOne(
              {
                _id: racketId,
                ...racketVisibilityFilterFor(visibilityViewer),
              },
              {
                projection: { status: 1, quantity: 1, brand: 1, model: 1 },
                session,
              },
            );
            if (!racket)
              throw new HttpError(400, {
                error: "판매 가능한 라켓이 아닙니다.",
              });

            // 재고형(다수 수량) 라켓 여부는 "값<=1"이 아니라,
            //    "quantity 필드가 실제 숫자로 존재하는지"로 판단해야 함
            //    (레거시 단품 라켓: quantity 없음)
            const rawQtyField = (racket as any).quantity;
            const hasStockQty = typeof rawQtyField === "number" && Number.isFinite(rawQtyField);
            const stockQty = hasStockQty ? rawQtyField : NaN;

            const racketName =
              `${(racket as any).brand ?? ""} ${(racket as any).model ?? ""}`.trim() || "중고 라켓";

            // 대여 점유 수량
            const activeRentalCount = await db
              .collection("rental_orders")
              .countDocuments({ racketId, status: { $in: ["paid", "out"] } }, { session });

            // baseQty는 "실제 보유 수량"을 그대로 사용(0도 0으로 유지)
            // - 레거시 단품 라켓은 status=available일 때만 1개로 취급
            const baseQty = hasStockQty
              ? Math.max(0, Math.trunc(stockQty))
              : racket.status === "available"
                ? 1
                : 0;
            const sellableQty = Math.max(0, baseQty - activeRentalCount);

            if (sellableQty < quantity) {
              const reason = activeRentalCount > 0 ? "RENTAL_RESERVED" : "OUT_OF_STOCK";
              throw new HttpError(400, {
                error: "INSUFFICIENT_STOCK",
                kind: "racket",
                productName: racketName,
                currentStock: sellableQty,
                baseQty,
                reason,
                activeRentalCount,
              });
            }

            // (A) 단품(1점)
            // 단품 판단: "quantity가 없음"인 경우만 단품 로직 적용
            if (!hasStockQty) {
              if (racket.status !== "available")
                throw new HttpError(400, {
                  error: "판매 가능한 라켓이 아닙니다.",
                });
              if (quantity !== 1)
                throw new HttpError(400, {
                  error: "라켓은 1개만 구매할 수 있습니다.",
                });

              const r = await rackCol.updateOne(
                { _id: racketId, status: "available" },
                {
                  $set: { status: "sold", updatedAt: new Date().toISOString() },
                },
                { session },
              );

              if (r.matchedCount === 0) {
                throw new HttpError(400, {
                  error: "INSUFFICIENT_STOCK",
                  kind: "racket",
                  productName: racketName,
                  currentStock: 0,
                  reason: "CONCURRENT_UPDATE",
                });
              }
              continue;
            }

            // (B) 재고형(다수 수량)
            const nowIso = new Date().toISOString();
            const updated = await rackCol.findOneAndUpdate(
              // 대여 점유(activeRentalCount)를 고려한 "판매 가능 수량" 확보
              // quantity(요청 수량)만큼 판매하려면: quantity >= activeRentalCount + quantity
              {
                _id: racketId,
                quantity: { $gte: activeRentalCount + quantity },
                status: { $nin: ["inactive", "비노출"] },
              },
              [
                // 요청 수량만큼 차감
                {
                  $set: {
                    quantity: { $subtract: ["$quantity", quantity] },
                    updatedAt: nowIso,
                  },
                },
                // sold 처리는 "물리 재고(quantity)가 0 이하"일 때만
                // - 대여로 인해 일시적으로 sellable이 0이 되는 경우까지 sold로 숨기면,
                //   이후 반납되어도 sold가 유지되어 목록에서 사라지는 문제가 생길 수 있음.
                {
                  $set: {
                    status: {
                      $cond: [{ $lte: ["$quantity", 0] }, "sold", "available"],
                    },
                  },
                },
              ] as any,
              { returnDocument: "after", session } as any,
            );

            const updatedDoc =
              updated && typeof updated === "object" && "value" in (updated as any)
                ? (updated as any).value
                : updated;

            if (!updatedDoc) {
              throw new HttpError(400, {
                error: "INSUFFICIENT_STOCK",
                kind: "racket",
                productName: racketName,
                currentStock: 0,
                reason: "CONCURRENT_UPDATE",
              });
            }

            continue;
          }

          throw new HttpError(400, { error: "INVALID_ITEM_KIND" });
        }

        // 스냅샷 구성(세션 포함)
        const itemsWithSnapshot = await Promise.all(
          (rawItems as RawOrderItem[]).map(async (it) => {
            const kind = it.kind ?? "product";
            const quantity = Number(it.quantity ?? 0);

            if (kind === "product") {
              const oid = new ObjectId(it.productId);
              const prod = await db.collection("products").findOne(
                {
                  _id: oid,
                  ...productVisibilityFilterFor(visibilityViewer),
                },
                { session },
              );

              return {
                productId: oid,
                name: prod?.name ?? "알 수 없는 상품",
                brand: prod?.brand,
                category: prod?.category,
                price: getEffectiveProductPrice(prod),

                // 서비스비 근거 데이터(DB 기준)
                mountingFee: Number.isFinite(Number((prod as any)?.mountingFee))
                  ? Number((prod as any).mountingFee)
                  : 0,
                isMountableString: isMountableStringByFee((prod as any)?.mountingFee),
                shippingFee: normalizeItemShippingFee((prod as any)?.shippingFee),

                imageUrl: prod?.images?.[0],
                quantity,
                kind: "product" as const,
                selectedGauge: it.selectedGauge?.trim() || undefined,
                selectedColor: it.selectedColor?.trim() || undefined,
                selectedColorLabel: it.selectedColorLabel?.trim() || undefined,
                selectedColorHex: it.selectedColorHex?.trim() || undefined,
                selectedColorImage: it.selectedColorImage?.trim() || undefined,
                stockDeduction:
                  Array.isArray((prod as any)?.variantInventories) &&
                  (prod as any).variantInventories.length > 0 &&
                  it.selectedColor?.trim() &&
                  it.selectedGauge?.trim()
                    ? {
                        mode: "variant" as const,
                        colorValue: it.selectedColor.trim(),
                        gaugeValue: it.selectedGauge.trim(),
                      }
                    : undefined,
              };
            }

            const rid = new ObjectId(it.productId);
            const racket = await db.collection("used_rackets").findOne(
              {
                _id: rid,
                ...racketVisibilityFilterFor(visibilityViewer),
              },
              { session },
            );
            const racketName = racket
              ? `${racket.brand} ${racket.model}`.trim()
              : "알 수 없는 라켓";

            return {
              productId: rid,
              name: racketName,
              price: getEffectiveRacketPrice(racket),
              imageUrl: (racket as any)?.images?.[0] ?? null,
              quantity,
              kind: "racket" as const,
              shippingFee: normalizeItemShippingFee((racket as any)?.shippingFee),
            };
          }),
        );

        if (!ENABLE_RACKET_STANDALONE_ORDER) {
          const hasRacketItem = itemsWithSnapshot.some((it) => it.kind === "racket");
          const hasMountableStringItem = itemsWithSnapshot.some(
            (it) => it.kind === "product" && (it as any).isMountableString === true,
          );
          if (
            hasRacketItem &&
            (!hasMountableStringItem || shippingInfo?.withStringService !== true)
          ) {
            throw new HttpError(400, {
              error: "RACKET_STANDALONE_ORDER_DISABLED",
              reason: "RACKET_SERVICE_REQUIRED",
              message:
                "라켓 단품구매는 현재 운영하지 않습니다. 스트링 선택 후 교체서비스 포함 주문으로 진행해주세요.",
            });
          }
        }

        if (!ENABLE_STRING_STANDALONE_ORDER) {
          const isMountableStringOnlyOrder =
            itemsWithSnapshot.length > 0 &&
            itemsWithSnapshot.every(
              (it) => it.kind === "product" && (it as any).isMountableString === true,
            );
          if (isMountableStringOnlyOrder && shippingInfo?.withStringService !== true) {
            throw new HttpError(400, {
              error: "STRING_ONLY_ORDER_DISABLED",
              reason: "STRING_SERVICE_REQUIRED",
            });
          }
        }

        // 번들 수량/구성 검증(라켓 구매 + 스트링 장착 서비스)
        // - 라켓이 주문에 포함된 경우에만 강제 (보유 라켓 교체 서비스는 라켓 아이템이 없을 수 있음)
        // - 장착비(mountingFee)가 있는 상품을 "스트링(장착 대상)"으로 간주.
        if (shippingInfo?.withStringService) {
          // 라켓/장착스트링 라인들
          const racketItems = itemsWithSnapshot.filter((it) => it.kind === "racket");
          const serviceItems = itemsWithSnapshot.filter(
            (it) => it.kind === "product" && (it as any).isMountableString === true,
          );

          // 총 수량(단체 주문은 quantity로만 증가)
          const racketQty = racketItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
          const serviceQty = serviceItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

          /**
           * 핵심 정책(강화)
           * 라켓이 포함된 주문(= 라켓 구매/대여 + 장착 서비스)이라면:
           *  1) 라켓 라인은 1종만 허용 (다종 라켓은 STEP2/일괄 적용 의미가 깨짐)
           *  2) 장착 대상 스트링도 1종만 허용 (중복 스트링은 어떤 스트링이 어떤 라켓에 매핑되는지 불명확)
           *  3) 라켓 총수량 === 장착 대상 스트링 총수량
           *
           * 라켓이 없는 주문(= 보유 라켓 교체 서비스 등)은 기존처럼 통과시키되,
           * 여기서는 라켓 기반 번들 규칙을 강제하지 않는다.
           */
          if (racketQty > 0) {
            const racketLineCount = racketItems.length;
            const serviceLineCount = serviceItems.length;

            // 1) 구성(라인 개수) 강제: 라켓 1종 + 장착 스트링 1종만 허용
            // - 단체 주문은 "라인 수"가 아니라 quantity로 처리한다.
            if (racketLineCount !== 1 || serviceLineCount !== 1) {
              throw new HttpError(400, {
                error: "BUNDLE_QTY_MISMATCH",
                reason: "INVALID_COMPOSITION",
                racketLineCount,
                serviceLineCount,
                racketQty,
                serviceQty,
              });
            }

            // 2) 수량 강제: 라켓 수량과 장착 스트링 수량은 반드시 같아야 함
            // - serviceQty가 0이어도 "불일치"로 간주해서 차단해야 함 (스트링 제거 우회 방지)
            if (racketQty !== serviceQty) {
              throw new HttpError(400, {
                error: "BUNDLE_QTY_MISMATCH",
                reason: "QTY_MISMATCH",
                racketQty,
                serviceQty,
              });
            }
          }
        }

        // 서버에서 금액 재계산(조작 무력화)
        const computedSubtotal = itemsWithSnapshot.reduce((sum, it) => {
          return sum + (Number(it.price) || 0) * (Number(it.quantity) || 0);
        }, 0);

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

        const packageOptOut = !!stringingApplicationInput?.packageOptOut;
        const pass =
          userId && shippingInfo?.withStringService
            ? await findOneActivePassForUser(db, new ObjectId(userId))
            : null;
        const packageUsage = resolvePackageUsage({
          hasPackage: !!pass,
          packageRemaining: Number(pass?.remainingCount ?? 0),
          requiredPassCount,
          packageOptOut,
        });

        const computedServiceFee = shippingInfo?.withStringService
          ? applyPackageToServiceFee(baseServiceFee, packageUsage)
          : 0;

        const computedShippingFee = calcOrderShippingFeeWithBundlePolicy({
          items: itemsWithSnapshot,
          isVisitPickup: shippingInfo?.deliveryMethod === "방문수령",
          withStringService: !!shippingInfo?.withStringService,
        });

        const computedTotalPrice = computedSubtotal + computedServiceFee + computedShippingFee;

        // 포인트 사용(회원만) — 서버가 최종 확정
        // 정책: 배송비는 포인트 적용 제외(= 상품금액 + 서비스비까지만 차감 가능)
        const maxPointsByPolicy = Math.max(0, computedTotalPrice - computedShippingFee); // = computedSubtotal + computedServiceFee
        let pointsToUse = 0;

        if (userId && normalizedRequestedPointsToUse > 0 && maxPointsByPolicy > 0) {
          const userOid = new ObjectId(userId);
          const u = await db.collection("users").findOne({ _id: userOid }, {
            projection: { pointsBalance: 1, pointsDebt: 1 },
            session,
          } as any);

          const balanceRaw = Number((u as any)?.pointsBalance ?? 0);
          const debtRaw = Number((u as any)?.pointsDebt ?? 0);

          const balance =
            Number.isFinite(balanceRaw) && balanceRaw > 0 ? Math.floor(balanceRaw) : 0;
          const debt = Number.isFinite(debtRaw) && debtRaw > 0 ? Math.floor(debtRaw) : 0;

          // 실제 사용 가능 포인트 = balance - debt (0 미만 방지)
          const available = Math.max(0, balance - debt);

          // 정책(배송비 제외)과 available 둘 다 만족하는 범위로 클램프
          const maxPointsByBalanceAndPolicy = Math.min(available, maxPointsByPolicy);

          // 요청값(100P 단위 정규화)도 결국 서버가 최종 확정
          pointsToUse = Math.min(normalizedRequestedPointsToUse, maxPointsByBalanceAndPolicy);
        }

        const payableTotalPrice = Math.max(0, computedTotalPrice - pointsToUse);
        const expectedPayableAmount = normalizeWonAmountOrNull(clientExpectedPayableAmountRaw);

        if (expectedPayableAmount !== null && expectedPayableAmount !== payableTotalPrice) {
          throw new HttpError(409, {
            success: false,
            error: "PAYMENT_AMOUNT_MISMATCH",
            code: "PAYMENT_AMOUNT_MISMATCH",
            message: PAYMENT_AMOUNT_CHANGED_MESSAGE,
            clientAmount: expectedPayableAmount,
            serverAmount: payableTotalPrice,
          });
        }

        // 결제 은행(Checkout에서 paymentInfo.bank로 내려옴)
        const bankRaw = body?.paymentInfo?.bank;
        const bank =
          typeof bankRaw === "string" && bankRaw.trim() !== "" ? bankRaw.trim() : undefined;

        // 주문 문서 생성(저장 값은 서버 계산값만)
        const order: any = {
          items: itemsWithSnapshot,
          shippingInfo,
          guestInfo: userId ? null : guestInfo || null,

          originalTotalPrice: computedTotalPrice,
          pointsUsed: pointsToUse,
          totalPrice: payableTotalPrice,
          shippingFee: computedShippingFee,
          serviceFee: computedServiceFee,

          status: "대기중",
          createdAt: new Date(),
          updatedAt: new Date(),

          paymentInfo: {
            method: "무통장 입금",
            status: "pending",
            originalTotal: computedTotalPrice,
            pointsUsed: pointsToUse,
            // total: computedTotalPrice,
            total: payableTotalPrice,
            shippingFee: computedShippingFee,
            serviceFee: computedServiceFee,
            bank,
            createdAt: new Date(),
          },
          paymentStatus: "결제대기",

          history: [{ status: "대기중", date: new Date(), description: "주문 생성" }],
        };

        // 옵션 값들
        order.servicePickupMethod = body.servicePickupMethod;
        if (idemKey) order.idemKey = idemKey;

        // 회원이면 snapshot 추가
        if (userId) {
          order.userId = new ObjectId(userId);
          const snapshot = await findUserSnapshot(userId);
          if (snapshot) order.userSnapshot = snapshot;
        }

        const orderSearchEmailLower = normalizeEmailForSearch(
          order?.customer?.email ?? order?.userSnapshot?.email ?? order?.guestInfo?.email ?? null,
        );
        if (orderSearchEmailLower) {
          order.searchEmailLower = orderSearchEmailLower;
        }

        // insert
        const inserted = await ordersCol.insertOne(order, { session });
        createdOrderId = inserted.insertedId as ObjectId;
        createdOrderSnapshot = order;

        // 포인트 차감(회원 + pointsToUse>0 일 때만)
        if (userId && pointsToUse > 0) {
          try {
            await deductPoints(
              db,
              {
                userId: new ObjectId(userId),
                amount: pointsToUse,
                type: "spend_on_order",
                status: "confirmed",
                refKey: `order:${String(createdOrderId)}:spend`,
                ref: { orderId: createdOrderId },
                reason: "주문 포인트 사용",
              },
              { session },
            );
          } catch (e: any) {
            // (1) 중복 차감 시도(재시도/중복 호출)면 이미 반영된 것으로 보고 통과
            if (e?.code === 11000) {
              // noop
            } else if (e?.code === "INSUFFICIENT_POINTS") {
              throw new HttpError(400, {
                error: "INSUFFICIENT_POINTS",
                message: "포인트 잔액이 부족합니다.",
              });
            } else {
              throw e;
            }
          }
        }
        // 주문 기반 신청서 자동 생성(옵션)
        if (shippingInfo?.withStringService === true && stringingApplicationInput) {
          const submitResult = await submitStringingApplicationCore({
            db,
            userId: order.userId ?? null,
            session,
            input: {
              ...stringingApplicationInput,
              orderId: String(createdOrderId),
            },
          });
          createdStringingApplicationId = submitResult.applicationId;
          stringingSubmitted = submitResult.stringingSubmitted;
        } else if (shippingInfo?.withStringService === true) {
          await createStringingApplicationFromOrder(
            {
              _id: createdOrderId,
              userId: order.userId,
              shippingInfo: order.shippingInfo,
              createdAt: order.createdAt,
              servicePickupMethod: order.servicePickupMethod,
            } as any,
            { db, session },
          );

          // fallback(create-from-order)는 초안(draft) 생성 경로다.
          // 주문을 "접수 완료"로 보이게 만드는 필드는 submit-core(실제 제출)에서만 갱신한다.
          createdStringingApplicationId = null;
        }

        // 조작 탐지 로그
        // console.log('[createOrder] client fees', { clientTotalPrice, clientShippingFee, clientServiceFee });
        // console.log('[createOrder] computed fees', { computedSubtotal, computedShippingFee, computedServiceFee, computedTotalPrice });
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrderId) {
      return NextResponse.json(
        { success: false, error: "주문 생성 실패(트랜잭션 결과 누락)" },
        { status: 500 },
      );
    }

    let createdStringingApplicationSnapshot: any = null;
    if (createdStringingApplicationId) {
      try {
        const client = await clientPromise;
        createdStringingApplicationSnapshot = await client
          .db()
          .collection("stringing_applications")
          .findOne({ _id: createdStringingApplicationId });
      } catch (error) {
        console.warn("[admin-alerts] order stringing lookup failed", {
          orderId: String(createdOrderId),
          stringingApplicationId: String(createdStringingApplicationId),
          error,
        });
      }
    }

    const orderForAlert: any = createdOrderSnapshot ?? {};
    const shippingForAlert: any = orderForAlert.shippingInfo ?? {};
    const paymentForAlert: any = orderForAlert.paymentInfo ?? {};
    const alertFields = [
      { name: "주문번호", value: compactId(createdOrderId) },
      truthyField("고객명", orderForAlert.userSnapshot?.name || orderForAlert.guestInfo?.name || shippingForAlert.name),
      truthyField("연락처", maskPhone(shippingForAlert.phone || orderForAlert.guestInfo?.phone)),
      truthyField("상품 요약", buildItemSummary(orderForAlert.items)),
      { name: "금액 상세", value: `상품/원금 ${formatWon(orderForAlert.originalTotalPrice)} · 배송비 ${formatWon(orderForAlert.shippingFee)} · 장착/서비스 ${formatWon(orderForAlert.serviceFee)} · 포인트 ${formatWon(orderForAlert.pointsUsed)}` },
      { name: "최종 결제금액", value: formatWon(orderForAlert.totalPrice) },
      { name: "결제상태", value: String(orderForAlert.paymentStatus ?? "확인 필요") },
      truthyField("결제/입금", [paymentForAlert.method, paymentForAlert.bank, shippingForAlert.depositor ? `입금자 ${shippingForAlert.depositor}` : ""].filter(Boolean).join(" · ")),
      { name: "주문 유형", value: shippingForAlert.withStringService ? "교체서비스 포함" : "일반 주문" },
      truthyField("수령/배송 방식", formatOrderPickupLabel(shippingForAlert.deliveryMethod || shippingForAlert.shippingMethod)),
      truthyField("배송/방문 메모", previewText(shippingForAlert.deliveryRequest, 80)),
      ...(shippingForAlert.withStringService
        ? [{ name: "교체서비스", value: createdStringingApplicationId ? `신청서 ${compactId(createdStringingApplicationId)}` : "포함" }]
        : []),
      ...(createdStringingApplicationSnapshot
        ? [{ name: "방문 예약", value: formatVisitReservation(createdStringingApplicationSnapshot?.stringDetails?.preferredDate, createdStringingApplicationSnapshot?.stringDetails?.preferredTime, createdStringingApplicationSnapshot?.visitDurationMinutes, createdStringingApplicationSnapshot?.visitSlotCount) }]
        : []),
      ...(shippingForAlert.zipCode || shippingForAlert.postalCode
        ? [{ name: "주소", value: `주소 입력됨 / 우편번호 ${shippingForAlert.zipCode || shippingForAlert.postalCode}` }]
        : []),
    ].filter(Boolean) as Array<{ name: string; value: string }>;

    await sendAdminOperationalAlert({
      kind: "order_created",
      title: "🛒 신규 주문 접수",
      summary: `신규 주문이 접수되었습니다. 관리자 주문 상세에서 확인해 주세요.`,
      href: `/admin/orders/${String(createdOrderId)}`,
      dedupeKey: `order_created:${String(createdOrderId)}`,
      fields: alertFields,
    });

    return NextResponse.json(
      {
        success: true,
        orderId: String(createdOrderId),
        stringingApplicationId: createdStringingApplicationId
          ? String(createdStringingApplicationId)
          : null,
        stringingSubmitted,
      },
      { status: 201 },
    );
  } catch (error) {
    if (idemKeyForDuplicateRecovery && dbForDuplicateRecovery && isDuplicateKeyError(error)) {
      const dup = await dbForDuplicateRecovery.collection("orders").findOne(
        {
          idemKey: idemKeyForDuplicateRecovery,
        },
        {
          projection: {
            _id: 1,
            stringingApplicationId: 1,
          },
        },
      );

      if (dup?._id) {
        return NextResponse.json(
          {
            success: true,
            orderId: String(dup._id),
            stringingApplicationId: dup.stringingApplicationId
              ? String(dup.stringingApplicationId)
              : null,
            stringingSubmitted: Boolean(dup.stringingApplicationId),
            idempotent: true,
          },
          { status: 200 },
        );
      }
    }

    const fallbackMessage = "주문 생성 중 오류 발생";

    const getErrorStatus = (target: unknown) => {
      if (target && typeof target === "object") {
        const status = (target as { status?: unknown }).status;
        if (typeof status === "number" && status >= 400 && status < 600) return status;

        const statusCode = (target as { statusCode?: unknown }).statusCode;
        if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600)
          return statusCode;
      }
      return 500;
    };

    const isLikelyErrorCode = (value: string) => /^[A-Z][A-Z0-9_]*$/.test(value.trim());

    const getErrorCode = (target: unknown) => {
      if (target && typeof target === "object") {
        const body = (target as { body?: { code?: unknown; error?: unknown } }).body;
        const bodyCode = body?.code;
        if (typeof bodyCode === "string" && bodyCode.trim()) return bodyCode.trim();

        const code = (target as { code?: unknown }).code;
        if (typeof code === "string" && code.trim()) return code.trim();

        const bodyError = body?.error;
        if (typeof bodyError === "string" && bodyError.trim() && isLikelyErrorCode(bodyError))
          return bodyError.trim();
      }
      return "ORDER_CREATE_FAILED";
    };

    const getErrorMessage = (target: unknown) => {
      if (target && typeof target === "object") {
        const bodyMessage = (target as { body?: { message?: unknown } }).body?.message;
        if (typeof bodyMessage === "string" && bodyMessage.trim()) return bodyMessage.trim();

        const bodyError = (target as { body?: { error?: unknown } }).body?.error;
        if (typeof bodyError === "string" && bodyError.trim()) return bodyError.trim();
      }

      if (target instanceof Error && typeof target.message === "string" && target.message.trim()) {
        return target.message.trim();
      }

      return fallbackMessage;
    };

    const getErrorField = (target: unknown, messageValue: string) => {
      if (target && typeof target === "object") {
        const bodyError = (target as { body?: { error?: unknown } }).body?.error;
        if (typeof bodyError === "string" && bodyError.trim()) return bodyError.trim();
      }

      return messageValue;
    };

    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    const errorField = getErrorField(error, message);

    const responseBody =
      error &&
      typeof error === "object" &&
      "body" in error &&
      typeof (error as { body?: unknown }).body === "object" &&
      (error as { body?: unknown }).body
        ? {
            success: false,
            ...((error as { body: Record<string, unknown> }).body ?? {}),
            error: errorField,
            message,
            code,
          }
        : {
            success: false,
            error: errorField,
            message,
            code,
          };

    if (status >= 500) {
      console.error("주문 POST 에러:", error);
    }

    return NextResponse.json(responseBody, { status });
  }
}

// 관리자 주문 목록 GET 핸들러
export async function getOrders(req: NextRequest): Promise<Response> {
  // 인증 토큰 확인
  const token = req.cookies.get("accessToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAccessToken(token);
  const sub = (payload as any)?.sub;
  if (!sub || typeof sub !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 토큰이 비정상/오염된 경우 new ObjectId(sub)에서 500이 나지 않도록 방어
  if (!ObjectId.isValid(sub)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 사용자 role 확인 (admin 여부 판단)
  const client = await clientPromise;
  const db = client.db();
  const userIdObj = new ObjectId(sub);
  const me = await db.collection("users").findOne({ _id: userIdObj }, { projection: { role: 1 } });
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = me.role === "admin";

  // 쿼리에서 page, limit 파싱
  const sp = req.nextUrl.searchParams;
  const pageRaw = parseInt(sp.get("page") || "1", 10);
  const limitRaw = parseInt(sp.get("limit") || "10", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  /**
   * limit 클램프(상한)
   * - fetchCombinedOrders가 전체를 메모리로 들고 와서 필터/슬라이스 하는 구조라
   *   과도한 limit 요청은 응답/메모리 부담이 됩니다. (서버 안정성 목적)
   */
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 10;
  const skip = (page - 1) * limit;

  // 클라이언트가 보내는 검색/필터 파라미터들
  const q = (sp.get("q") || "").trim().toLowerCase();
  const status = sp.get("status") || "all";
  const type = sp.get("type") || "all";
  const payment = sp.get("payment") || "all";
  const shipping = sp.get("shipping") || "all";
  const customerType = sp.get("customerType") || "all"; // member | guest | all
  const cancel = sp.get("cancel") || "all"; // all | requested | approved | rejected
  const dateYmd = sp.get("date") || ""; // "YYYY-MM-DD" (OrdersClient에서 KST로 보냄)
  const rawSort = sp.get("sort") || "-date";
  const allowedSorts = new Set(["date", "-date", "total", "-total"]);
  const sort = allowedSorts.has(rawSort) ? rawSort : "-date";

  // KST 기준 YYYY-MM-DD 변환 (클라 DateFilter와 동일 기준 맞추기)
  const toKstYmd = (input: any) => {
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d); // e.g. "2025-12-31"
  };

  const safeLower = (v: any) => (typeof v === "string" ? v.toLowerCase() : "");

  // 통합된 주문 목록 불러오기
  const combined = await fetchCombinedOrders({ userId: userIdObj, isAdmin });

  // 1) 필터 먼저 적용 (전체 기준)
  const filtered = combined.filter((order: any) => {
    const linkedApplication = order?.linkedStringingApplication;

    // --- 검색(q): id, 고객명, 이메일 ---
    const idStr = safeLower(order?.id ?? order?._id);
    const nameStr = safeLower(order?.customer?.name);
    const emailStr = safeLower(order?.customer?.email);
    const searchMatch = !q || idStr.includes(q) || nameStr.includes(q) || emailStr.includes(q);

    // --- 상태/유형/결제 ---
    const statusMatch = status === "all" || order?.status === status;
    const typeMatch =
      type === "all" ||
      order?.type === type ||
      (type === "서비스" && order?.hasStringingApplication === true);
    const paymentMatch = payment === "all" || order?.paymentStatus === payment;

    // --- 고객유형(member/guest) ---
    const customerTypeMatch =
      customerType === "all" ||
      (customerType === "member" && !!order?.userId) ||
      (customerType === "guest" && !order?.userId);

    // --- 운송장(shipping): OrdersClient의 기준(getShippingBadge.label)과 동일하게 ---
    const shippingTarget =
      order?.hasStringingApplication && linkedApplication
        ? {
            ...order,
            shippingInfo: linkedApplication.shippingInfo ?? order?.shippingInfo,
          }
        : order;
    const shippingLabel = getShippingBadge(shippingTarget).label;
    const shippingMatch = shipping === "all" || shippingLabel === shipping;

    // --- 취소 요청 상태(cancel) ---
    const cancelMatch =
      cancel === "all" ||
      order?.cancelStatus === cancel ||
      linkedApplication?.cancelStatus === cancel;

    // --- 날짜(date): KST YYYY-MM-DD 기준 일치 여부 ---
    const orderYmd = dateYmd ? toKstYmd(order?.date ?? order?.createdAt) : "";
    const dateMatch = !dateYmd || (orderYmd && orderYmd === dateYmd);

    return (
      searchMatch &&
      statusMatch &&
      typeMatch &&
      paymentMatch &&
      customerTypeMatch &&
      cancelMatch &&
      shippingMatch &&
      dateMatch
    );
  });

  const safeTime = (value: any) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  // 2) 서버 정렬 적용 (전체 필터 결과 기준)
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sort === "date") {
      return safeTime(a?.date ?? a?.createdAt) - safeTime(b?.date ?? b?.createdAt);
    }
    if (sort === "-date") {
      return safeTime(b?.date ?? b?.createdAt) - safeTime(a?.date ?? a?.createdAt);
    }
    if (sort === "total") {
      return (Number(a?.total) || 0) - (Number(b?.total) || 0);
    }
    if (sort === "-total") {
      return (Number(b?.total) || 0) - (Number(a?.total) || 0);
    }
    return 0;
  });

  // 3) 정렬된 결과에 대해 페이징
  const paged = sorted.slice(skip, skip + limit);
  const total = filtered.length;
  // 응답 반환

  return NextResponse.json({ items: paged, total });
}
