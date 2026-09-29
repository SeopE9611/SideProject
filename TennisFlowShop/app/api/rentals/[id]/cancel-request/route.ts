import { writeRentalHistory } from "@/app/features/rentals/utils/history";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import {
  buildRentalRacketName,
  compactId,
  formatRentalPeriod,
  formatRentalPickupLabel,
  formatWon,
  maskPhone,
  previewText,
  truthyField,
} from "@/lib/admin-alerts/formatters";
import { getRentalAccess, rentalNotAvailable } from "@/app/api/rentals/_lib/rental-access";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import clientPromise from "@/lib/mongodb";
import type { RentalCancelRequestStatus } from "@/lib/types/rental-order";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// 취소 요청 body 최종 유효성(서버 방어)
const toOptionalTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const s = v.trim();
    return s.length ? s : undefined; // 빈 문자열은 "없음"으로 취급
  }
  if (typeof v === "number") {
    const s = String(v).trim();
    return s.length ? s : undefined;
  }
  return undefined;
};

const toTrimmedString = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  return undefined;
};

const CancelRequestBodySchema = z
  .object({
    reasonCode: z.preprocess(toOptionalTrimmedString, z.string().max(30)).optional(),
    reasonText: z.preprocess(toTrimmedString, z.string().max(500)).optional(),
  })
  .passthrough();

/**
 * 대여 취소 "요청" API
 * - 실제 status 를 'canceled'로 바꾸지 않고, cancelRequest 필드와 history 만 남긴다.
 * -  출고 전(status = pending/paid 이면서 출고 운송장 미등록)까지만 취소 요청 가능.
 * - 대여 소유자만 호출 가능.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const db = (await clientPromise).db();
    const access = await getRentalAccess(db, id);
    if (!access.ok) return access.response;
    const { _id } = access;
    const rental: any = access.rental;

    // 2) 비즈니스 룰
    const currentStatus: string = rental.status ?? "pending";

    // 이미 취소된 건에 대한 추가 요청 차단
    if (currentStatus === "canceled" || currentStatus === "cancelled") {
      return NextResponse.json({ ok: false, message: "ALREADY_CANCELED" }, { status: 400 });
    }

    if (rental.depositRefundedAt) {
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "보증금 환급이 완료된 대여는 취소 요청이 불가합니다.",
        },
        { status: 409 },
      );
    }

    // 출고 이후(out/returned)는 취소가 아니라 반납/정산 영역이므로 차단
    if (currentStatus === "out" || currentStatus === "returned") {
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "출고 이후에는 취소 요청이 불가합니다.",
        },
        { status: 409 },
      );
    }

    // 출고 운송장 등록 여부 확인
    const outbound = (rental.shipping as any)?.outbound ?? null;
    const outboundTracking =
      typeof outbound?.trackingNumber === "string" ? outbound.trackingNumber.trim() : "";

    if (outboundTracking) {
      // 출고가 시작된 이후에는 취소 요청 불가
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "출고 운송장이 등록된 이후에는 취소 요청이 불가합니다.",
        },
        { status: 409 },
      );
    }

    // pending / paid 이외 상태는 모두 막기
    if (!(currentStatus === "pending" || currentStatus === "paid")) {
      return NextResponse.json(
        {
          ok: false,
          message: "INVALID_STATE",
          detail: "대여 취소 요청이 불가능한 상태입니다.",
        },
        { status: 409 },
      );
    }
    // 이미 취소 요청이 걸려있으면 중복 요청 차단
    const existingReq = rental.cancelRequest ?? null;
    if (existingReq && existingReq.status === "requested") {
      return NextResponse.json({ ok: false, message: "ALREADY_REQUESTED" }, { status: 400 });
    }

    // 3) body 파싱 (취소 사유)
    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      rawBody = {};
    }

    const parsedBody = CancelRequestBodySchema.safeParse(rawBody);

    // 스키마 실패 시에도 기존처럼 기본값으로 처리(동작/UX 유지)
    const reasonCode = parsedBody.success ? (parsedBody.data.reasonCode ?? "기타") : "기타";
    const reasonText = parsedBody.success ? (parsedBody.data.reasonText ?? "") : "";

    /**
     * 대여는 기존에 top-level refundAccount가 이미 존재할 수 있다.
     * 하지만 취소 요청 시점 스냅샷을 남겨야 하므로,
     * body.refundAccount를 우선하고 없으면 기존 refundAccount를 fallback으로 사용한다.
     */
    const bodyRefundAccount =
      rawBody && typeof rawBody === "object" ? (rawBody as any).refundAccount : undefined;

    const parsedRefundAccount = RefundAccountSchema.safeParse(
      bodyRefundAccount ?? rental.refundAccount ?? null,
    );
    if (!parsedRefundAccount.success) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "INVALID_REFUND_ACCOUNT",
          message: "환불 계좌 정보를 정확히 입력해주세요.",
          detail: "환불 계좌 정보를 정확히 입력해주세요.",
          fieldErrors: parsedRefundAccount.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const refundAccount = parsedRefundAccount.data;

    const now = new Date();

    // 4) cancelRequest 업데이트
    const cancelRequest = {
      status: "requested" as RentalCancelRequestStatus,
      reasonCode,
      reasonText,
      requestedAt: now,
      refundAccount,
    };

    const update = await db.collection("rental_orders").updateOne(
      { ...access.accessFilter, "cancelRequest.status": { $ne: "requested" } },
      {
        $set: {
          cancelRequest,
          updatedAt: now,
        },
      },
    );
    if (!update.matchedCount) return rentalNotAvailable();

    // 5) 이력 기록 (status 자체는 아직 paid 유지)
    await writeRentalHistory(db, _id, {
      action: "cancel-request",
      from: currentStatus,
      to: currentStatus,
      actor: { role: "user" },
      snapshot: { cancelRequest },
    });

    await sendAdminOperationalAlert({
      kind: "rental_cancel_requested",
      title: "⚠️ 대여 취소 요청 접수",
      summary: "라켓 대여 취소 요청이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/rentals/${id}`,
      dedupeKey: `rental_cancel_requested:${id}:${now.toISOString()}`,
      priority: "high",
      fields: [
        { name: "대상", value: "라켓 대여" },
        { name: "대여번호", value: compactId(id) },
        truthyField("고객명", rental.shipping?.name || rental.userSnapshot?.name),
        truthyField("연락처", maskPhone(rental.shipping?.phone)),
        truthyField("라켓", buildRentalRacketName(rental)),
        truthyField("대여 기간", formatRentalPeriod(rental.days)),
        { name: "주문 금액", value: formatWon(rental.amount?.total) },
        { name: "결제상태", value: String(rental.paymentStatus ?? rental.status ?? "확인 필요") },
        truthyField("결제수단", rental.payment?.method),
        truthyField(
          "수령/배송 방식",
          formatRentalPickupLabel(rental.shipping?.shippingMethod || rental.servicePickupMethod),
        ),
        {
          name: "교체서비스",
          value: rental.stringing?.requested || rental.isStringServiceApplied ? "포함" : "미포함",
        },
        { name: "사유", value: previewText(reasonText || reasonCode, 100) || reasonCode },
        { name: "환불계좌", value: refundAccount ? "등록됨" : "미필요/미입력" },
      ].filter(Boolean) as Array<{ name: string; value: string }>,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("rental cancel-request error", e);
    return NextResponse.json({ ok: false, message: "SERVER_ERROR" }, { status: 500 });
  }
}
