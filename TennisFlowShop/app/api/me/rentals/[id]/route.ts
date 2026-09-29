import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { canTransitIdempotent } from "@/app/features/rentals/utils/status";
import { getCustomerTransactionPaymentStatusLabel } from "@/app/mypage/_lib/flow-display";
import { isApplicationEligibleForLinkedStage } from "@/lib/admin/linked-flow-stage";

export const dynamic = "force-dynamic";

function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === "visit") return "방문 접수";
  if (collectionMethod === "courier_pickup") return "택배 방문 수거";
  if (collectionMethod === "self_ship") return "자가 발송(택배)";
  return "발송 접수";
}

const nullableTrim = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toNullableIsoString = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
};

function toNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveRawPaymentStatus(doc: any, paymentInfo: Record<string, unknown>): string | null {
  return nullableTrim(doc?.paymentStatus) ?? nullableTrim(paymentInfo.status);
}

function resolvePaymentMethod(
  doc: any,
  paymentInfo: Record<string, unknown>,
  legacyPayment: Record<string, unknown>,
): string | null {
  return (
    nullableTrim(paymentInfo.method) ??
    nullableTrim(doc?.paymentMethod) ??
    nullableTrim(legacyPayment.method)
  );
}

function resolvePaymentProvider(doc: any, paymentInfo: Record<string, unknown>): string | null {
  return nullableTrim(paymentInfo.provider) ?? nullableTrim(doc?.paymentProvider);
}

function firstImageUrl(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickUsedRacketImage(doc: any): string | null {
  if (!doc) return null;

  const firstImageFromArray =
    Array.isArray(doc.images) && typeof doc.images[0] === "string" ? doc.images[0] : null;

  return firstImageUrl(doc.image, doc.thumbnail, doc.thumbnailUrl, firstImageFromArray);
}

function getTensionSummary(lines: any[]): string | null {
  const tensionSet = Array.from(
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
  return tensionSet.length ? tensionSet.join(", ") : null;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  // 인증
  const at = (await cookies()).get("accessToken")?.value;
  if (!at) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sub = String(payload?.sub ?? "");
  if (!sub || !ObjectId.isValid(sub))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = new ObjectId(sub);

  // 파라미터
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "Bad Request" }, { status: 400 });

  const db = (await clientPromise).db();
  const doc = await db.collection("rental_orders").findOne({
    _id: new ObjectId(id),
    userId: userId, // 소유자 검증(중요)
  });
  if (!doc) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const appId = (doc as any).stringingApplicationId
    ? ((doc as any).stringingApplicationId.toString?.() ??
      String((doc as any).stringingApplicationId))
    : null;
  let applicationSummary = null;
  let stringingApplication = null;
  let activeStringingApplicationId: string | null = null;
  let applicationHistorySummary: {
    id: string;
    status: string;
    cancelRequestStatus: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null = null;
  if (appId && ObjectId.isValid(appId)) {
    const app = await db.collection("stringing_applications").findOne(
      {
        _id: new ObjectId(appId),
        userId,
        $or: [{ rentalId: new ObjectId(id) }, { rentalId: id }],
      },
      {
        projection: {
          stringDetails: 1,
          collectionMethod: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          userConfirmedAt: 1,
          totalPrice: 1,
          shippingInfo: 1,
          desiredDateTime: 1,
          rentalId: 1,
          userId: 1,
          cancelRequest: 1,
        },
      },
    );
    if (app) {
      const applicationStatus = nullableTrim((app as any).status) ?? "접수완료";
      const applicationCancelRequestStatus = nullableTrim((app as any)?.cancelRequest?.status);
      const hasActiveStringingApplication = isApplicationEligibleForLinkedStage({
        status: applicationStatus,
        cancelRequestStatus: applicationCancelRequestStatus,
      });

      if (!hasActiveStringingApplication) {
        applicationHistorySummary = {
          id: appId,
          status: applicationStatus,
          cancelRequestStatus: applicationCancelRequestStatus,
          createdAt: toNullableIsoString((app as any).createdAt),
          updatedAt: toNullableIsoString((app as any).updatedAt),
        };
      } else {
        activeStringingApplicationId = appId;
        const lines = getApplicationLines((app as any).stringDetails);
        const tensionSummary = getTensionSummary(lines);
        const preferredDate = String((app as any)?.stringDetails?.preferredDate ?? "").trim();
        const preferredTime = String((app as any)?.stringDetails?.preferredTime ?? "").trim();
        const stringNames = Array.from(
          new Set(lines.map((line: any) => String(line?.stringName ?? "").trim()).filter(Boolean)),
        );
        applicationSummary = {
          status: applicationStatus,
          lineCount: lines.length,
          stringNames,
          tensionSummary,
          receptionLabel: getReceptionLabel((app as any).collectionMethod),
          reservationLabel:
            preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
        };

        const collectionMethodRaw = String(
          (app as any)?.collectionMethod ?? (app as any)?.shippingInfo?.collectionMethod ?? "",
        ).trim();
        const collectionMethod =
          collectionMethodRaw === "SHOP_VISIT" || collectionMethodRaw === "visit"
            ? "visit"
            : collectionMethodRaw === "COURIER_VISIT" || collectionMethodRaw === "courier_pickup"
              ? "courier_pickup"
              : collectionMethodRaw === "SELF_SEND" || collectionMethodRaw === "self_ship"
                ? "self_ship"
                : collectionMethodRaw;
        const selfShip = (app as any)?.shippingInfo?.selfShip ?? null;
        const normalizedLines = lines.map((line: any, index: number) => ({
          id: nullableTrim(line?.id) ?? String(index),
          racketType: nullableTrim(line?.racketType),
          racketLabel: nullableTrim(line?.racketLabel) ?? nullableTrim(line?.racketType),
          stringName: nullableTrim(line?.stringName),
          tensionMain: nullableTrim(line?.tensionMain),
          tensionCross: nullableTrim(line?.tensionCross),
          note: nullableTrim(line?.note),
        }));
        stringingApplication = {
          id: appId,
          rentalId: (app as any)?.rentalId ? String((app as any).rentalId) : null,
          status: applicationStatus,
          createdAt: toNullableIsoString((app as any)?.createdAt),
          updatedAt: toNullableIsoString((app as any)?.updatedAt),
          userConfirmedAt: toNullableIsoString((app as any)?.userConfirmedAt),
          desiredDateTime: toNullableIsoString((app as any)?.desiredDateTime),
          collectionMethod: collectionMethod || null,
          receptionLabel: getReceptionLabel(collectionMethod),
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null,
          reservationLabel:
            preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
          requirements: nullableTrim((app as any)?.stringDetails?.requirements),
          lineCount: lines.length,
          stringNames,
          tensionSummary,
          totalPrice: toNullableFiniteNumber((app as any)?.totalPrice),
          lines: normalizedLines,
          needsInboundTracking: false,
          shippingInfo: {
            collectionMethod: collectionMethod || null,
            deliveryRequest: nullableTrim((app as any)?.shippingInfo?.deliveryRequest),
            selfShip: selfShip
              ? {
                  courier: nullableTrim(selfShip.courier),
                  trackingNo: nullableTrim(selfShip.trackingNo),
                  shippedAt: toNullableIsoString(selfShip.shippedAt),
                  note: nullableTrim(selfShip.note),
                }
              : null,
          },
        };
      }
    }
  }

  const racketImageUrl =
    doc.racketId && ObjectId.isValid(String(doc.racketId))
      ? pickUsedRacketImage(
          await db
            .collection("used_rackets")
            .findOne(
              { _id: new ObjectId(String(doc.racketId)) },
              { projection: { images: 1, image: 1, thumbnail: 1, thumbnailUrl: 1 } },
            ),
        )
      : null;

  const paymentInfo = (
    (doc as any)?.paymentInfo && typeof (doc as any).paymentInfo === "object"
      ? (doc as any).paymentInfo
      : {}
  ) as Record<string, unknown>;
  const legacyPayment =
    (doc as any)?.payment && typeof (doc as any).payment === "object"
      ? ((doc as any).payment as Record<string, unknown>)
      : {};
  const paymentRawSummary =
    paymentInfo.rawSummary && typeof paymentInfo.rawSummary === "object"
      ? (paymentInfo.rawSummary as Record<string, unknown>)
      : {};
  const paymentRawEasyPay =
    paymentRawSummary.easyPay && typeof paymentRawSummary.easyPay === "object"
      ? (paymentRawSummary.easyPay as Record<string, unknown>)
      : {};

  const paymentStatus = resolveRawPaymentStatus(doc, paymentInfo);
  const paymentMethod = resolvePaymentMethod(doc, paymentInfo, legacyPayment);
  const paymentProvider = resolvePaymentProvider(doc, paymentInfo);
  const amountSource =
    (doc as any)?.amount && typeof (doc as any).amount === "object" ? (doc as any).amount : {};
  const fee = toNullableFiniteNumber(amountSource.fee);
  const deposit = toNullableFiniteNumber(amountSource.deposit);
  const stringPrice = toNullableFiniteNumber(amountSource.stringPrice);
  const stringingFee = toNullableFiniteNumber(amountSource.stringingFee);
  const explicitTotal = toNullableFiniteNumber(amountSource.total);
  const totalAmount =
    explicitTotal ??
    (fee !== null && deposit !== null
      ? fee + deposit + (stringPrice ?? 0) + (stringingFee ?? 0)
      : null);
  const amount = { fee, deposit, stringPrice, stringingFee, total: totalAmount };
  const paymentStatusLabel = getCustomerTransactionPaymentStatusLabel({
    paymentStatus,
    paymentMethod,
    paymentProvider,
    totalPrice: totalAmount,
  });

  // 응답 평탄화
  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    imageUrl: racketImageUrl,
    racketImageUrl,
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === "string" ? doc.status.toLowerCase() : doc.status, // pending | paid | out | returned
    amount,
    totalAmount,
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null, // 출고 시각
    dueAt: doc.dueAt ?? null, // 반납 예정
    returnedAt: doc.returnedAt ?? null, // 반납 완료
    depositRefundedAt: doc.depositRefundedAt ?? null, // 보증금 환불 시각
    paymentStatus,
    paymentStatusLabel,
    paymentMethod,
    paymentProvider,
    paymentEasyPayProvider: nullableTrim(paymentInfo.easyPayProvider ?? paymentRawEasyPay.provider),
    paymentCardDisplayName: nullableTrim(paymentInfo.cardDisplayName),
    paymentCardCompany: nullableTrim(paymentInfo.cardCompany),
    paymentCardLabel: nullableTrim(paymentInfo.cardLabel),
    paymentBank: nullableTrim(paymentInfo.bank ?? legacyPayment.bank),
    paymentApprovedAt: toNullableIsoString(paymentInfo.approvedAt),
    // 스트링 교체 신청서 연결 정보 (대여 기반 신청 시 저장됨)
    isStringServiceApplied: !!(doc as any).isStringServiceApplied,
    // ObjectId로 저장된 경우를 대비해 string으로 정규화
    stringingApplicationId: appId,
    activeStringingApplicationId,
    hasActiveStringingApplication: Boolean(activeStringingApplicationId),
    applicationSummary,
    stringingApplication,
    applicationHistorySummary,

    /**
     * 교체 서비스 포함 여부(레거시/예외 케이스 보강)
     * - 신청서 ID가 비어있는 데이터가 있을 수 있으므로 boolean도 같이 내려준다.
     * - 상세 화면에서 "교체 신청하기" CTA 노출 여부 판단에 사용
     */
    withStringService:
      Boolean((doc as any)?.stringing?.requested) ||
      Boolean((doc as any)?.isStringServiceApplied) ||
      Boolean((doc as any)?.stringingApplicationId),

    shipping: {
      // 운송장/배송 정보
      shippingMethod: doc.shipping?.shippingMethod ?? null,
      outbound: doc.shipping?.outbound ?? null,
      return: doc.shipping?.return ?? null,
    },
    cancelRequest: doc.cancelRequest ?? null,
  });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  // 인증
  const at = (await cookies()).get("accessToken")?.value;
  if (!at) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let payload: any;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sub = String(payload?.sub ?? "");
  if (!sub || !ObjectId.isValid(sub))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = new ObjectId(sub);

  // 파라미터
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "Bad Request" }, { status: 400 });

  // 본인 소유 대여건 조회
  const db = (await clientPromise).db();
  const rentals = db.collection("rental_orders");
  const doc = await rentals.findOne({
    _id: new ObjectId(id),
    userId: userId, // 소유자 검증(중요)
  });
  if (!doc) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const current = (doc as any).status ?? "pending";

  // 멱등: 이미 취소 상태면 200 그대로
  if (current === "canceled") {
    return NextResponse.json({
      id,
      status: "canceled",
      message: "이미 취소된 대여건입니다.",
    });
  }

  // 전이 가능 여부 + created 상태에서만 허용
  if (!canTransitIdempotent(current, "canceled") || current !== "pending") {
    return NextResponse.json(
      { message: "현재 상태에서는 취소할 수 없습니다.", status: current },
      { status: 409 },
    );
  }

  // 상태 전이 수행
  const now = new Date().toISOString();
  await rentals.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "canceled", canceledAt: now } },
  );

  // 라켓 예약/가용성 되돌리기 로직이 있다면 여기서 처리
  // const rackets = db.collection('used_rackets');
  // await rackets.updateOne({ _id: doc.racketId }, { $set: { reserved: false } });

  return NextResponse.json({ id, status: "canceled" });
}
