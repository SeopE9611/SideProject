import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { verifyAccessToken, verifyOrderAccessToken } from "@/lib/auth.utils";
import { issuePassesForPaidOrder } from "@/lib/passes.service";
import jwt from "jsonwebtoken";
import { deductPoints, grantPoints } from "@/lib/points.service";
import { z } from "zod";
import {
  getAdminCancelPolicyMessage,
  isAdminCancelableOrderStatus,
} from "@/lib/orders/cancel-refund-policy";
import {
  canEnterShippingPhase,
  getOrderStatusLabelForDisplay,
} from "@/lib/order-shipping";
import {
  LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES,
  LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES,
  isApplicationEligibleForLinkedStage,
} from "@/lib/admin/linked-flow-stage";
import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { normalizeEmailForSearch } from "@/lib/search-email";

// 고객정보 서버 검증(관리자 PATCH)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhoneDigits = (digits: string) =>
  digits.length === 10 || digits.length === 11;

const customerSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "이름은 필수입니다." })
    .refine((s) => s.length <= 50, {
      message: "이름은 50자 이내로 입력해주세요.",
    }),
  email: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "이메일은 필수입니다." })
    .refine((s) => EMAIL_RE.test(s), {
      message: "유효한 이메일 주소를 입력해주세요.",
    })
    .refine((s) => s.length <= 254, { message: "이메일이 너무 깁니다." }),
  phone: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((d) => isValidKoreanPhoneDigits(d), {
      message: "전화번호는 숫자 10~11자리만 입력해주세요.",
    }),
  postalCode: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((d) => d.length === 5, {
      message: "우편번호는 숫자 5자리만 입력해주세요.",
    }),
  address: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "주소는 필수입니다." })
    .refine((s) => s.length <= 200, {
      message: "주소는 200자 이내로 입력해주세요.",
    }),
  addressDetail: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= 100, {
      message: "상세주소는 100자 이내로 입력해주세요.",
    }),
});

function getApplicationLines(stringDetails: any): any[] {
  // 통합 플로우 우선(lines) + 레거시(racketLines) fallback
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines))
    return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === "visit") return "방문 접수";
  if (collectionMethod === "courier_pickup") return "기사 방문 수거";
  return "발송 접수";
}

function getTensionSummary(lines: any[]): string | null {
  const set = Array.from(
    new Set(
      lines
        .map((line: any) => {
          const main = String(line?.tensionMain ?? "").trim();
          const cross = String(line?.tensionCross ?? "").trim();
          if (!main && !cross) return "";
          return cross && cross !== main ? `${main}/${cross}` : main || cross;
        })
        .filter(Boolean),
    ),
  );
  return set.length ? set.join(", ") : null;
}

function toNullableIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// 주문-스트링 신청서 동기화 정책:
// - draft(임시저장)는 제외
// - 취소는 포함(운영 추적/감사를 위해 이력 동기화 유지)
const CUSTOMER_SYNC_APPLICATION_FILTER = {
  status: { $ne: "draft" },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 주문 ID입니다.", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(id) });

    if (!order) {
      return new NextResponse("주문을 찾을 수 없습니다.", { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 취급
    let payload: any = null;
    try {
      payload = token ? verifyAccessToken(token) : null;
    } catch {
      payload = null;
    }

    const isOwner = payload?.sub === order.userId?.toString();
    const isAdmin = payload?.role === "admin";
    // console.log('raw cookie header:', _req.headers.get('cookie'));
    const oax = cookieStore.get("orderAccessToken")?.value ?? null;
    // orderAccessToken도 깨졌을 수 있으므로 throw 방어
    let guestClaims: any = null;
    try {
      guestClaims = oax ? verifyOrderAccessToken(oax) : null;
    } catch {
      guestClaims = null;
    }
    const isGuestOrder = !order.userId || (order as any).guest === true;
    const guestOwnsOrder = !!(
      isGuestOrder &&
      guestClaims &&
      guestClaims.orderId === String(order._id)
    );

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return new NextResponse("권한이 없습니다.", { status: 403 });
    }
    const enrichedItems = await Promise.all(
      (
        order.items as {
          productId: any;
          quantity: number;
          kind?: "product" | "racket";
        }[]
      ).map(async (item) => {
        const kind = item.kind ?? "product";

        // productId가 오염/레거시 데이터일 때 new ObjectId에서 500이 나지 않도록 방어
        const raw = item.productId;
        const idStr =
          raw instanceof ObjectId ? raw.toString() : String(raw ?? "");
        const oid =
          raw instanceof ObjectId
            ? raw
            : ObjectId.isValid(idStr)
              ? new ObjectId(idStr)
              : null;
        if (!oid) {
          return {
            id: idStr,
            name: kind === "racket" ? "알 수 없는 라켓" : "알 수 없는 상품",
            price: 0,
            mountingFee: 0,
            quantity: item.quantity,
            kind,
          };
        }

        // product
        if (kind === "product") {
          const prod = await db.collection("products").findOne({ _id: oid });

          if (!prod) {
            console.warn(`상품을 찾을 수 없음:`, oid);
            return {
              id: oid.toString(),
              name: "알 수 없는 상품",
              price: 0,
              mountingFee: 0,
              quantity: item.quantity,
              kind: "product" as const,
            };
          }

          return {
            id: prod._id.toString(),
            name: prod.name,
            price: prod.price,
            mountingFee: prod.mountingFee ?? 0,
            quantity: item.quantity,
            kind: "product" as const,
          };
        }

        // racket
        const racket = await db
          .collection("used_rackets")
          .findOne({ _id: oid });

        if (!racket) {
          console.warn(`라켓으 찾을 수 없음:`, oid);
          return {
            id: oid.toString(),
            name: "알 수 없는 라켓",
            price: 0,
            mountingFee: 0, // 라켓 자체는 장착비 없음
            quantity: item.quantity,
            kind: "racket" as const,
          };
        }

        return {
          id: oid.toString(),
          name: `${racket.brand} ${racket.model}`.trim(),
          price: racket.price ?? 0,
          mountingFee: 0,
          quantity: item.quantity,
          kind: "racket" as const,
        };
      }),
    );

    //  customer 통합 처리 시작
    // PATCH에서 $set: { customer: … } 한 값이 있으면 우선 사용
    let customer = (order as any).customer ?? null;

    // DB에 customer 필드가 없을 때만, 기존 guestInfo/userSnapshot/userId 로 로직 실행
    if (!customer) {
      if (order.guestInfo) {
        customer = {
          name: order.guestInfo.name,
          email: order.guestInfo.email,
          phone: order.guestInfo.phone,
          address: order.shippingInfo?.address ?? "주소 없음",
          addressDetail: order.shippingInfo?.addressDetail ?? "",
          postalCode: order.shippingInfo?.postalCode ?? "-",
        };
      } else if (order.userSnapshot) {
        customer = {
          name: order.userSnapshot.name,
          email: order.userSnapshot.email,
          phone: order.shippingInfo?.phone ?? "-",
          address: order.shippingInfo?.address ?? "주소 없음",
          addressDetail: order.shippingInfo?.addressDetail ?? "",
          postalCode: order.shippingInfo?.postalCode ?? "-",
        };
      } else if (order.userId) {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(order.userId) });
        if (user) {
          customer = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address ?? "주소 없음",
            addressDetail: order.shippingInfo?.addressDetail ?? "",
            postalCode: user.postalCode ?? "-",
          };
        }
      }
    }

    // 대표 stage 카드 기준과 동일: draft/취소/cancelRequest 승인 제외 + 최신 1건
    const [linkedApp] = await db
      .collection("stringing_applications")
      .find(
        {
          orderId: { $in: [order._id, String(order._id)] },
          status: {
            $nin: [...LINKED_FLOW_STAGE_EXCLUDED_APPLICATION_STATUSES],
          },
          $or: [
            { "cancelRequest.status": { $exists: false } },
            {
              "cancelRequest.status": {
                $nin: [...LINKED_FLOW_STAGE_EXCLUDED_CANCEL_REQUEST_STATUSES],
              },
            },
          ],
        },
        { projection: { _id: 1, createdAt: 1, updatedAt: 1 } },
      )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(1)
      .toArray();

    const isStringServiceApplied = !!linkedApp;
    const stringingApplicationId = linkedApp?._id?.toString() ?? null;

    // 주문 전체에서 스트링 장착 상품이 몇 개인지 계산
    const totalSlots = enrichedItems
      .filter((item) => item.mountingFee > 0)
      .reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    // 이 주문으로 생성된 모든 스트링 신청서 조회 (취소 제외)
    const apps = await db
      .collection("stringing_applications")
      .find({
        orderId: { $in: [order._id, String(order._id)] },
        status: { $ne: "취소" },
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    // 각 신청서에서 사용된 슬롯(= 라켓 개수) 합산
    const usedSlots = apps.reduce(
      (sum, app) => sum + getApplicationLines(app?.stringDetails).length,
      0,
    );

    // 남은 슬롯 계산 (음수 방지)
    const remainingSlots = Math.max(totalSlots - usedSlots, 0);

    const packagePassIds = Array.from(
      new Set(
        apps
          .map((app: any) => {
            const raw = app?.packagePassId;
            if (!raw) return null;
            const value = String(raw);
            return ObjectId.isValid(value) ? value : null;
          })
          .filter(Boolean),
      ),
    ) as string[];

    const passDocs = packagePassIds.length
      ? await db
          .collection("service_passes")
          .find(
            { _id: { $in: packagePassIds.map((id) => new ObjectId(id)) } },
            {
              projection: {
                packageSize: 1,
                usedCount: 1,
                remainingCount: 1,
                expiresAt: 1,
                redeemedAt: 1,
                meta: 1,
              },
            },
          )
          .toArray()
      : [];

    const passDocById = new Map(
      passDocs.map((pass: any) => [String(pass?._id), pass]),
    );

    // 이 주문과 연결된 신청서 요약 정보 배열
    const stringingApplications = apps.map((app: any) => {
      const lines = getApplicationLines(app?.stringDetails);
      const stringNames = Array.from(
        new Set(
          lines
            .map((line: any) => String(line?.stringName ?? "").trim())
            .filter(Boolean),
        ),
      );
      const preferredDate = String(
        app?.stringDetails?.preferredDate ?? "",
      ).trim();
      const preferredTime = String(
        app?.stringDetails?.preferredTime ?? "",
      ).trim();
      const selfShip = app?.shippingInfo?.selfShip ?? null;
      const collectionMethod = normalizeCollection(
        app?.collectionMethod ?? app?.shippingInfo?.collectionMethod ?? "self_ship",
      );
      const orderHasRacket =
        Array.isArray(order?.items) &&
        order.items.some((it: any) => it?.kind === "racket");
      const inboundRequired = app?.rentalId
        ? false
        : app?.orderId
          ? !orderHasRacket
          : true;
      const needsInboundTracking =
        inboundRequired && collectionMethod === "self_ship";
      const packagePassId = app?.packagePassId ? String(app.packagePassId) : null;
      const passDoc = packagePassId ? passDocById.get(packagePassId) : null;
      const packageInfo = {
        applied: !!app?.packageApplied,
        useCount:
          typeof app?.packageUseCount === "number"
            ? app.packageUseCount
            : lines.length > 0
              ? lines.length
              : 1,
        passId: packagePassId,
        passTitle: String(passDoc?.meta?.planTitle ?? "").trim() || null,
        packageSize:
          typeof passDoc?.packageSize === "number" ? passDoc.packageSize : null,
        usedCount:
          typeof passDoc?.usedCount === "number" ? passDoc.usedCount : null,
        remainingCount:
          typeof passDoc?.remainingCount === "number"
            ? passDoc.remainingCount
            : null,
        expiresAt: toNullableIsoString(passDoc?.expiresAt),
        redeemedAt:
          toNullableIsoString(app?.packageRedeemedAt) ??
          toNullableIsoString(passDoc?.redeemedAt),
      };
      return {
        id: app._id?.toString(),
        status: app.status ?? "draft",
        cancelRequestStatus: app?.cancelRequest?.status ?? null,
        createdAt: app.createdAt ?? null,
        updatedAt: app.updatedAt ?? null,
        collectionMethod,
        inboundRequired,
        needsInboundTracking,
        racketCount: lines.length,
        receptionLabel: getReceptionLabel(collectionMethod),
        tensionSummary: getTensionSummary(lines),
        stringNames,
        totalPrice:
          typeof app?.totalPrice === "number" ? app.totalPrice : null,
        packageInfo,
        reservationLabel:
          preferredDate && preferredTime
            ? `${preferredDate} ${preferredTime}`
            : null,
        shippingInfo: {
          selfShip: selfShip
            ? {
                courier: selfShip.courier ?? null,
                trackingNo: selfShip.trackingNo ?? null,
                shippedAt: selfShip.shippedAt ?? null,
              }
            : null,
        },
      };
    });

    const latestActiveLinkedApplication =
      stringingApplications.find((app: any) =>
        isApplicationEligibleForLinkedStage({
          status: app?.status,
          cancelRequestStatus: app?.cancelRequestStatus,
        }),
      ) ?? null;

    return NextResponse.json({
      ...order, // 원문은 펴주되,
      customer,
      items: enrichedItems,
      shippingInfo: {
        ...order.shippingInfo,
        deliveryMethod: order.shippingInfo?.deliveryMethod ?? "택배수령",
        withStringService: Boolean(order.shippingInfo?.withStringService), // 의사표시(체크박스)

        invoice: {
          courier: order.shippingInfo?.invoice?.courier ?? null,
          trackingNumber: order.shippingInfo?.invoice?.trackingNumber ?? null,
        },
      },
      paymentStatus: order.paymentStatus || "결제대기",
      paymentMethod: order.paymentInfo?.method ?? "결제방법 없음",
      paymentProvider: order.paymentInfo?.provider ?? null,
      paymentApprovedAt: toNullableIsoString(order.paymentInfo?.approvedAt),
      paymentEasyPayProvider:
        order.paymentInfo?.rawSummary?.easyPay?.provider ?? null,
      paymentBank: order.paymentInfo?.bank ?? null,
      paymentTid: order.paymentInfo?.tid ?? null,
      paymentNiceSync: order.paymentInfo?.niceSync ?? null,
      total: order.totalPrice,
      date: order.createdAt,
      history: order.history ?? [],
      status: order.status,
      reason: order.cancelReason ?? null,
      // 의사표시와 '실제 신청 존재'를 분리해 내려줌(여기가 핵심)
      isStringServiceApplied,
      stringingApplicationId,
      stringService: {
        totalSlots,
        usedSlots,
        remainingSlots,
      },
      // 대표 stage 카드용 신청서(서버 변경 대상과 동일 기준)
      latestActiveLinkedApplication,
      // 주문 1건에 연결된 모든 신청서 요약 리스트
      stringingApplications,
    });
  } catch (error) {
    console.error(" 주문 상세 조회 실패:", error);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 파라미터/바디 파싱
    const { id } = await params; // 동적 세그먼트
    // 깨진 JSON이면 throw → 500 방지 (400으로 정리)
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: "INVALID_JSON" },
        { status: 400 },
      );
    }
    const {
      status,
      cancelReason,
      cancelReasonDetail,
      payment,
      deliveryRequest,
      customer,
    } = body;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 주문 ID입니다.", { status: 400 });
    }

    // DB/기존 주문 조회
    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection("orders");

    const _id = new ObjectId(id); // ObjectId 한 번만 생성해서 재사용
    const existing = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse("해당 주문을 찾을 수 없습니다.", { status: 404 });
    }

    // 인증/인가 가드
    const jar = await cookies();
    const at = jar.get("accessToken")?.value;
    const rt = jar.get("refreshToken")?.value;

    // access 우선
    // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 인증 실패로 정리
    let user: any = null;
    try {
      user = at ? verifyAccessToken(at) : null;
    } catch {
      user = null;
    }

    // access 만료 시 refresh 보조 (쿠키 기반 JWT)
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        /* refresh도 실패시 아래에서 401 */
      }
    }

    if (!user?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    // 관리자 화이트리스트 ADMIN_EMAIL_WHITELIST="a@x.com,b@y.com"
    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = user?.sub === existing.userId?.toString();
    const isAdmin =
      user?.role === "admin" || (user?.email && adminList.includes(user.email));

    // 주문에 userId가 있을 때만 소유자 체크, 없으면(비회원 주문 등) 관리자만 허용
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse("권한이 없습니다.", { status: 403 });
    }

    // 취소된 주문은 추가 변경 금지
    if (existing.status === "취소") {
      return new NextResponse("취소된 주문입니다.", { status: 400 });
    }

    // 구매확정된 주문은 추가 변경 금지
    if (existing.status === "구매확정") {
      return new NextResponse("구매확정된 주문은 상태를 변경할 수 없습니다.", {
        status: 400,
      });
    }

    // 고객정보 수정 분기
    // - 패스 발급은 여기서 하지 않도록 수정(아래 상태변경 분기로 이동)
    if (customer) {
      const parsed = customerSchema.safeParse(customer);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        return NextResponse.json(
          {
            ok: false,
            message: "INVALID_CUSTOMER",
            error: flat.formErrors?.[0] ?? "고객 정보가 올바르지 않습니다.",
            fieldErrors: flat.fieldErrors,
          },
          { status: 400 },
        );
      }

      const c = parsed.data;

      const updateFields = {
        customer: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          addressDetail: c.addressDetail,
          postalCode: c.postalCode,
        },
        searchEmailLower: normalizeEmailForSearch(c.email),
      };

      const historyEntry = {
        status: "고객정보수정",
        date: new Date(),
        description: "고객 정보가 업데이트되었습니다.",
      };

      await orders.updateOne({ _id }, {
        $set: updateFields,
        $push: { history: historyEntry },
      } as any);

      // 연결된 스트링 신청서 동기화
      // 정책: draft 제외, 취소 포함
      const stringingColl = db.collection("stringing_applications");
      const syncedAt = new Date();
      const syncHistoryEntry = {
        status: "고객정보수정(동기화)",
        date: syncedAt,
        description: "연결된 주문서에서 고객 정보를 동기화했습니다.",
      };

      const syncResult = await stringingColl.updateMany(
        {
          orderId: _id,
          ...CUSTOMER_SYNC_APPLICATION_FILTER,
        },
        {
          $set: {
            customer: {
              name: c.name,
              email: c.email,
              phone: c.phone,
              address: c.address,
              addressDetail: c.addressDetail || "",
              postalCode: c.postalCode,
            },
            searchEmailLower: normalizeEmailForSearch(c.email),
          },
          $push: {
            history: syncHistoryEntry,
          },
        } as any,
      );

      return NextResponse.json({
        ok: true,
        syncedApplicationCount: syncResult.modifiedCount,
      });
    }

    // 결제 금액 수정
    if (payment) {
      const { total } = payment;
      const totalNum = Number(total);
      if (!Number.isFinite(totalNum) || totalNum < 0) {
        return NextResponse.json(
          { ok: false, message: "INVALID_PAYMENT_TOTAL" },
          { status: 400 },
        );
      }
      const historyEntry = {
        status: "결제금액수정",
        date: new Date(),
        description: `결제 금액이 ${totalNum.toLocaleString()}원(으)로 수정되었습니다.`,
      };

      await orders.updateOne({ _id }, {
        $set: { totalPrice: totalNum },
        $push: { history: historyEntry },
      } as any);

      return NextResponse.json({ ok: true });
    }

    // 배송 요청사항 수정
    if (deliveryRequest !== undefined) {
      const historyEntry = {
        status: "배송요청사항수정",
        date: new Date(),
        description: "배송 요청사항이 수정되었습니다.",
      };

      await orders.updateOne({ _id }, {
        $set: { "shippingInfo.deliveryRequest": deliveryRequest },
        $push: { history: historyEntry },
      } as any);

      return NextResponse.json({ ok: true });
    }

    // 역행 여부 판정: 배송완료→배송중 같은 되돌림은 허용하되, 나중에 히스토리에 표시
    const __phaseIndex: Record<string, number> = {
      대기중: 0,
      결제완료: 1,
      배송중: 2,
      배송완료: 3,
      // '환불', '취소'는 종단 상태라 인덱스 필요 없음 (이미 서버에서 락)
    };

    const __prevStatus = String(existing.status); // 기존 문서의 상태
    // status 유효성(현재 프로젝트에서 사용하는 상태만 허용)
    if (typeof status !== "string" || status.trim().length === 0) {
      return new NextResponse("상태 값이 필요합니다.", { status: 400 });
    }
    const nextStatus = status.trim();
    const ALLOWED_STATUS = new Set([
      "대기중",
      "결제완료",
      "배송중",
      "배송완료",
      "취소",
      "환불",
    ]);
    if (!ALLOWED_STATUS.has(nextStatus)) {
      return new NextResponse("허용되지 않은 상태 값입니다.", { status: 400 });
    }
    if (nextStatus === "배송중" || nextStatus === "배송완료") {
      const guard = canEnterShippingPhase((existing as any)?.shippingInfo);
      if (!guard.ok) {
        return new NextResponse(
          guard.message ?? "배송 정보가 등록되지 않았습니다.",
          { status: 400 },
        );
      }
    }

    const __nextStatus = nextStatus; // 이번에 바꾸려는 상태
    const __isBackward =
      (__phaseIndex[__nextStatus] ?? 0) < (__phaseIndex[__prevStatus] ?? 0);

    // 상태 변경 분기
    // - paymentStatus 계산/정규화를 한 곳에서 수행
    // - 이 시점에서만 패스 발급 멱등 트리거
    const updateFields: Record<string, any> = { status: nextStatus };

    // 취소면 사유/상세 저장
    if (nextStatus === "취소") {
      if (!isAdminCancelableOrderStatus(existing.status)) {
        return new NextResponse(getAdminCancelPolicyMessage(existing.status), {
          status: 400,
        });
      }

      const reason =
        typeof cancelReason === "string" ? cancelReason.trim() : "";
      if (!reason) {
        return new NextResponse("취소 사유가 필요합니다.", { status: 400 });
      }
      updateFields.cancelReason = reason;
      if (reason === "기타") {
        const detail =
          typeof cancelReasonDetail === "string"
            ? cancelReasonDetail.trim()
            : "";
        if (!detail)
          return new NextResponse("기타 사유 상세가 필요합니다.", {
            status: 400,
          });
        if (detail.length > 200)
          return new NextResponse(
            "기타 사유 상세는 200자 이내로 입력해주세요.",
            { status: 400 },
          );
        updateFields.cancelReasonDetail = detail;
      }
    }

    // 결제상태 정규화
    let newPaymentStatus: string | undefined = undefined;
    if (["결제완료", "배송중", "배송완료"].includes(nextStatus)) {
      newPaymentStatus = "결제완료";
    } else if (nextStatus === "대기중") {
      newPaymentStatus = "결제대기";
    } else if (nextStatus === "취소") {
      newPaymentStatus = "결제취소";
    } else if (nextStatus === "환불") {
      newPaymentStatus = "환불";
    }
    if (newPaymentStatus) {
      updateFields.paymentStatus = newPaymentStatus;
    }

    // 히스토리 메시지(방문수령은 화면/기록 문구만 수령 맥락으로 치환)
    const prevDisplayStatus = getOrderStatusLabelForDisplay(
      __prevStatus,
      (existing as any)?.shippingInfo,
    );
    const nextDisplayStatus = getOrderStatusLabelForDisplay(
      __nextStatus,
      (existing as any)?.shippingInfo,
    );

    const description =
      __nextStatus === "취소"
        ? `주문이 취소되었습니다. 사유: ${cancelReason}${cancelReason === "기타" && cancelReasonDetail ? ` (${cancelReasonDetail})` : ""}`
        : __isBackward
          ? `주문 상태가 '${prevDisplayStatus}' → '${nextDisplayStatus}'(으)로 되돌려졌습니다.`
          : `주문 상태가 '${nextDisplayStatus}'(으)로 변경되었습니다.`;

    const historyEntry = {
      status: nextStatus,
      date: new Date(),
      description,
    };

    // 상태 업데이트
    const result = await orders.updateOne({ _id }, {
      $set: updateFields,
      $push: { history: historyEntry },
    } as any);

    if (result.modifiedCount === 0) {
      return new NextResponse("주문 상태 업데이트에 실패했습니다.", {
        status: 500,
      });
    }

    // 패스 발급 멱등 트리거
    const becamePaid =
      (existing.paymentStatus ?? null) !== "결제완료" &&
      newPaymentStatus === "결제완료";

    if (becamePaid) {
      try {
        const updatedOrder = await orders.findOne({ _id }); // 최신 문서 읽어서 전달
        if (updatedOrder) {
          await issuePassesForPaidOrder(db, updatedOrder);
          // - 포인트는 "구매확정" 시점(/api/orders/[id]/confirm)에서만 지급
          // - 중복 지급 방지는 points_transactions.refKey로 멱등 보장
        }
      } catch (e) {
        console.error("issuePassesForPaidOrder error:", e);
      }
    }

    // 포인트 사용(차감) 복원:
    // - 주문 생성 시점에 pointsToUse를 즉시 차감하기 때문에,
    //   결제대기 상태에서 '취소'가 발생하면 사용 포인트를 되돌려줘야 함.
    // - (중요) 멱등키(refKey)를 사용해 중복 복원을 방지
    const becameCanceledBeforePaid =
      (existing.paymentStatus ?? null) !== "결제완료" &&
      newPaymentStatus === "결제취소";

    if (becameCanceledBeforePaid) {
      try {
        const updatedOrder = await orders.findOne({ _id });
        if (!updatedOrder) return NextResponse.json({ ok: true });

        const uid = (updatedOrder as any).userId;
        const uidStr = uid ? String(uid) : "";
        if (!ObjectId.isValid(uidStr)) return NextResponse.json({ ok: true });

        const orderObjectId = String((updatedOrder as any)._id);

        const txCol = db.collection("points_transactions");
        const spendRefKey = `order:${orderObjectId}:spend`;
        const restoreRefKey = `order:${orderObjectId}:spend_reversal`;

        // 가능한 한 "실제로 차감된 amount"를 원장에서 찾아 복원(주문 문서 필드보다 안전)
        const spendTx = await txCol.findOne({
          refKey: spendRefKey,
          status: "confirmed",
        });
        const amountFromTx = Math.abs(Number((spendTx as any)?.amount ?? 0));

        const amountFromOrder = Number(
          (updatedOrder as any).pointsUsed ??
            (updatedOrder as any).paymentInfo?.pointsUsed ??
            0,
        );
        const amountToRestore = Math.max(
          0,
          Math.trunc(amountFromTx || amountFromOrder || 0),
        );

        if (amountToRestore <= 0) return NextResponse.json({ ok: true });

        await grantPoints(db, {
          userId: new ObjectId(uidStr),
          amount: amountToRestore,
          type: "reversal",
          status: "confirmed",
          refKey: restoreRefKey, // 복원 멱등키
          reason:
            `주문 취소로 사용 포인트 복원 (${(updatedOrder as any).orderId ?? ""})`.trim(),
          ref: { orderId: (updatedOrder as any)._id },
        });
      } catch (e: any) {
        // 복원 실패가 "주문 취소" 자체를 막으면 UX 최악 → 로그만 남기고 종료
        console.error("restore spend points (before paid) error:", e);
      }
    }

    const becameCanceledOrRefunded =
      (existing.paymentStatus ?? null) === "결제완료" &&
      ["결제취소", "환불"].includes(newPaymentStatus ?? "");

    if (becameCanceledOrRefunded) {
      try {
        const updatedOrder = await orders.findOne({ _id });
        if (!updatedOrder) return NextResponse.json({ ok: true });

        const uid = (updatedOrder as any).userId;
        const uidStr = uid ? String(uid) : "";
        if (!ObjectId.isValid(uidStr)) return NextResponse.json({ ok: true });

        const orderObjectId = String((updatedOrder as any)._id);
        const rewardRefKey = `order_reward:${orderObjectId}`;
        const revokeRefKey = `order_reward_revoke:${orderObjectId}`; // 회수 멱등키

        // "얼마를 회수해야 하는지"는 가능하면 적립 트랜잭션을 찾아서 그 amount를 쓰는 게 제일 안전
        const txCol = db.collection("points_transactions");

        // (1) 사용 포인트 복원 (이미 복원된 경우 refKey 유니크로 자동 스킵)
        const spendRefKey = `order:${orderObjectId}:spend`;
        const restoreRefKey = `order:${orderObjectId}:spend_reversal`;

        const spendTx = await txCol.findOne({
          refKey: spendRefKey,
          status: "confirmed",
        });
        const amountFromTx = Math.abs(Number((spendTx as any)?.amount ?? 0));

        const amountFromOrder = Number(
          (updatedOrder as any).pointsUsed ??
            (updatedOrder as any).paymentInfo?.pointsUsed ??
            0,
        );
        const amountToRestore = Math.max(
          0,
          Math.trunc(amountFromTx || amountFromOrder || 0),
        );

        if (amountToRestore > 0) {
          await grantPoints(db, {
            userId: new ObjectId(uidStr),
            amount: amountToRestore,
            type: "reversal",
            status: "confirmed",
            refKey: restoreRefKey,
            reason:
              `주문 취소/환불로 사용 포인트 복원 (${(updatedOrder as any).orderId ?? ""})`.trim(),
            ref: { orderId: (updatedOrder as any)._id },
          });
        }

        const rewardTx = await txCol.findOne({
          refKey: rewardRefKey,
          status: "confirmed",
        });

        // 적립이 없으면 회수할 것도 없음
        const amountToRevoke = Number((rewardTx as any)?.amount ?? 0);
        if (amountToRevoke <= 0) return NextResponse.json({ ok: true });

        await deductPoints(db, {
          userId: new ObjectId(uidStr),
          amount: amountToRevoke,
          type: "order_reward", // 같은 타입으로 “-amount” 기록이 남게 됨
          status: "confirmed",
          refKey: revokeRefKey, // 회수 멱등
          reason:
            `주문 취소/환불로 적립 포인트 회수 (${(updatedOrder as any).orderId ?? ""})`.trim(),
          ref: { orderId: (updatedOrder as any)._id },
          // 적립 포인트를 이미 사용한 상태에서도 환불이 발생할 수 있음 → 회수는 음수 잔액을 허용(정책)
          allowNegativeBalance: true,
        });
      } catch (e: any) {
        // 여기서 throw로 터뜨리면 "주문 취소/환불" 자체가 실패하는 최악의 UX가 됨 → 로그만 남기고 종료
        console.error("revoke order_reward error:", e);

        // 포인트 회수 실패를 주문 히스토리에 남기고 싶으면 history push 추가
        // - INSUFFICIENT_POINTS(이미 사용됨) 같은 케이스는 "관리자 확인 필요"로 남겨두는 게 현실적
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/orders/[id] 오류:", error);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}
