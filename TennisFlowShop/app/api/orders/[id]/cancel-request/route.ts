import { orderCancelSnapshot, isOrderCancellationInFlight, OrderCancelConflict } from "@/lib/orders/cancel-write-guard";
import { isStringingCompletedStatus } from "@/lib/status/flow-status";
import { sendAdminOperationalAlert } from "@/lib/admin-alerts/sendAdminOperationalAlert";
import {
  formatOrderPickupLabel,
  formatWon,
  maskPhone,
  previewText,
  truthyField,
} from "@/lib/admin-alerts/formatters";
import { appendAudit } from "@/lib/audit";
import { verifyAccessToken } from "@/lib/auth.utils";
import { RefundAccountSchema } from "@/lib/cancel-request/refund-account";
import { isUserCancelableOrderStatus } from "@/lib/orders/cancel-refund-policy";
import clientPromise from "@/lib/mongodb";
import {
  buildCancelRefundSubject,
  recordCancelRefundSignal,
} from "@/lib/risk/recordCancelRefundSignal";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getPortfolioDemoAdminMutationBlock } from "@/lib/admin/portfolio-demo-readonly.server";
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

/**
 * 주문 취소 "요청" API
 * - 실제 status 를 '취소'로 바꾸지 않고, cancelRequest 필드와 history 만 남긴다.
 * - 운송장(배송정보) 입력 전까지만 요청 가능.
 * - 주문 소유자 또는 관리자만 호출 가능.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return new NextResponse("유효하지 않은 주문 ID입니다.", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection("orders");

    // 주문 조회
    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return new NextResponse("해당 주문을 찾을 수 없습니다.", { status: 404 });
    }

    // 인증/인가 (기존 /api/orders/[id] PATCH 의 패턴과 동일하게 맞춤)
    const jar = await cookies();
    const at = jar.get("accessToken")?.value;
    const rt = jar.get("refreshToken")?.value;

    let user: any = safeVerifyAccessToken(at);

    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {
        // refresh 도 실패하면 아래에서 401 처리
      }
    }

    if (!user?.sub) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    // 관리자 화이트리스트 (기존 로직 재사용)
    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = existing.userId && user.sub === existing.userId.toString();
    const isAdmin = user.role === "admin" || (user.email && adminList.includes(user.email));

    // 비회원 주문(guest)의 경우 관리자만 취소 요청을 넣을 수 있도록 제한
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return new NextResponse("권한이 없습니다.", { status: 403 });
    }

    if (isAdmin) {
      const demoMutationBlock = getPortfolioDemoAdminMutationBlock(req);
      if (demoMutationBlock) return demoMutationBlock;
    }

    if (isOrderCancellationInFlight(existing)) {
      return NextResponse.json({ ok: false, errorCode: "ORDER_CANCEL_CONFLICT", message: "취소 요청 또는 처리가 이미 진행 중입니다." }, { status: 409 });
    }

    // 비즈니스 룰 체크

    if (!isAdmin && !isUserCancelableOrderStatus(existing.status)) {
      return new NextResponse("취소 요청은 대기중 또는 결제완료 상태에서만 가능합니다.", {
        status: 400,
      });
    }

    // 이미 취소된 주문이면 추가 요청 불가
    if (existing.status === "취소" || existing.status === "환불") {
      return new NextResponse("이미 취소되었거나 환불된 주문입니다.", {
        status: 400,
      });
    }

    // 운송장(배송정보)이 이미 입력된 경우 취소 요청 불가
    //     => 우리가 합의한 규칙 A: "운송장 입력 전까지만 취소 요청 가능"
    const invoice = existing.shippingInfo?.invoice;
    const hasTrackingNumber =
      invoice &&
      typeof invoice.trackingNumber === "string" &&
      invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return new NextResponse("이미 배송이 진행 중이어서 취소 요청을 할 수 없습니다.", {
        status: 400,
      });
    }

    // 이미 취소 요청이 들어간 주문인지 검사
    if (existing.cancelRequest && existing.cancelRequest.status === "requested") {
      return new NextResponse("이미 취소 요청이 접수된 주문입니다.", {
        status: 400,
      });
    }

    // 요청 바디 파싱
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

    const normalizedProvider = String(existing.paymentInfo?.provider ?? "")
      .trim()
      .toLowerCase();
    const needsRefundAccount =
      normalizedProvider === "nicepay" ? false : existing.paymentStatus === "결제완료";

    /**
     * 환불 계좌는 "필요한 결제 케이스"에서만 검증/저장한다.
     * - nicepay 결제: 미입력 허용
     * - 결제완료(무통장 등): 입력 필수
     * - 결제대기: 미입력 허용
     */
    const parsedRefundAccount = needsRefundAccount
      ? RefundAccountSchema.safeParse(body.refundAccount ?? null)
      : null;
    if (needsRefundAccount && parsedRefundAccount && !parsedRefundAccount.success) {
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
    const refundAccount =
      needsRefundAccount && parsedRefundAccount?.success ? parsedRefundAccount.data : null;

    // 연결된 스트링 교체 서비스 신청도 함께 취소되도록 요청하는지 여부
    const withStringing: boolean =
      typeof body.withStringing === "boolean" ? body.withStringing : false;

    // 이 주문과 연결된 스트링 교체 서비스 신청 존재 여부 검사
    //    - 이미 작업 중/완료된 신청이 있으면 취소 요청 자체를 막는다.
    //    - 취소 가능 상태의 신청만 있고, withStringing 동의가 없으면
    //      경고용 에러코드만 내려보내고 실제 cancelRequest는 등록하지 않는다.
    const stringingAppsCol = db.collection("stringing_applications");

    const linkedApps = await stringingAppsCol
      .find({
        orderId: { $in: [existing._id, String(existing._id)] }, // ObjectId/string legacy links
        status: { $nin: ["취소", "cancelled", "canceled", "거절"] }, // 이미 취소/거절된 건 제외
      })
      .project({ _id: 1, status: 1, totalPrice: 1, packageApplied: 1, cancelRequest: 1 })
      .toArray();

    if (linkedApps.length > 0) {
      // 작업 중/완료 상태가 하나라도 있으면: 취소 요청 자체를 막는다.
      const inProgressApps = linkedApps.filter((app: any) =>
        ["작업 중", "작업중", "완료"].includes(app.status) || isStringingCompletedStatus(app.status),
      );

      if (inProgressApps.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "STRINGING_IN_PROGRESS",
            message:
              "이미 작업 중이거나 교체가 완료된 교체 서비스 신청이 있어 주문 취소 요청을 할 수 없습니다. 관리자에게 문의해 주세요.",
          },
          { status: 409 },
        );
      }

      //  모두 취소 가능한 상태이고, 아직 withStringing 동의가 없는 경우:
      //     => 먼저 경고용 에러코드만 내려보낸다.
      if (!withStringing) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "STRINGING_APPS_EXIST",
            message:
              "이 주문으로 접수된 교체 서비스 신청이 있습니다. 주문을 취소하면 해당 신청도 함께 취소되도록 요청됩니다.",
            data: {
              count: linkedApps.length,
              applications: linkedApps.map((app: any) => ({
                id: app._id.toString(),
                status: app.status,
                totalPrice: app.totalPrice ?? 0,
                packageApplied: !!app.packageApplied,
              })),
            },
          },
          { status: 409 },
        );
      }

      // withStringing === true 인 경우:
      //     - 여기서는 추가 처리 없이 아래 cancelRequest 로직으로 진행한다.
      //     - 실제 신청 취소/패키지 회차 복원은 관리자 취소 승인 단계에서 처리.
    }

    const now = new Date();

    // cancelRequest 필드 구성
    const cancelRequest = {
      status: "requested" as const,
      reasonCode: reasonCode || "기타",
      reasonText: reasonText || "",
      requestedAt: now,
      ...(refundAccount ? { refundAccount } : {}),
      // processedAt / processedByAdminId 는 승인/거절 시 채움
    };

    // history 엔트리 구성
    const descBase = reasonCode || "사유 미입력";
    const descDetail = reasonText ? ` (${reasonText})` : "";

    const historyEntry = {
      status: "취소요청",
      date: now,
      description: `고객이 주문 취소를 요청했습니다. 사유: ${descBase}${descDetail}${refundAccount ? " · 환불 계좌 정보가 등록되었습니다." : ""}`,
    };

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // Re-read every linked application inside the same transaction. Consent
        // must also cover a newly visible application, not just the earlier list.
        const currentApps = await stringingAppsCol.find({
          orderId: { $in: [existing._id, String(existing._id)] },
          status: { $nin: ["취소", "cancelled", "canceled", "거절"] },
        }, { session }).toArray();
        if (currentApps.length && !withStringing) {
          throw new OrderCancelConflict("연결 신청서가 변경되었습니다. 함께 취소할 신청서를 확인해주세요.");
        }
        for (const app of currentApps) {
          if (["작업 중", "작업중", "완료"].includes(app.status) || isStringingCompletedStatus(app.status) ||
              ["요청", "requested", "승인", "approved"].includes(app.cancelRequest?.status)) {
            throw new OrderCancelConflict("작업 중이거나 취소 처리 중인 연결 신청서가 있습니다.");
          }
        }
        const saved = await orders.updateOne(orderCancelSnapshot(existing), {
          $set: { cancelRequest }, $push: { history: historyEntry },
        } as any, { session });
        if (!saved.matchedCount) throw new OrderCancelConflict();
        for (const app of currentApps) {
          const savedApp = await stringingAppsCol.updateOne({
            _id: app._id, orderId: app.orderId, status: app.status ?? null,
            cancelRequest: app.cancelRequest ?? null,
          }, {
            $set: { cancelRequest: {
              status: "요청", reasonCode: cancelRequest.reasonCode,
              reasonText: cancelRequest.reasonText, requestedAt: now,
              ...(refundAccount ? { refundAccount } : {}),
            } },
            $push: { history: {
              status: "취소요청", date: now,
              description: `주문 취소 요청과 함께 교체 서비스 신청도 취소를 요청했습니다. 사유: ${cancelRequest.reasonCode}${cancelRequest.reasonText ? ` (${cancelRequest.reasonText})` : ""}`,
            } },
          } as any, { session });
          if (!savedApp.matchedCount) throw new OrderCancelConflict();
        }
      });
    } finally {
      await session.endSession();
    }

    await sendAdminOperationalAlert({
      kind: "cancel_requested",
      title: "⚠️ 취소 요청 접수",
      summary: "주문 취소 요청이 접수되었습니다. 관리자 상세에서 확인해 주세요.",
      href: `/admin/orders/${_id.toString()}`,
      dedupeKey: `cancel_requested:order:${_id.toString()}:${now.toISOString()}`,
      priority: "high",
      fields: [
        { name: "대상", value: "주문" },
        { name: "주문번호", value: _id.toString() },
        truthyField(
          "고객명",
          existing.userSnapshot?.name || existing.guestInfo?.name || existing.shippingInfo?.name,
        ),
        truthyField("연락처", maskPhone(existing.shippingInfo?.phone || existing.guestInfo?.phone)),
        { name: "주문 금액", value: formatWon(existing.totalPrice) },
        { name: "결제상태", value: String(existing.paymentStatus ?? "확인 필요") },
        truthyField("결제수단", existing.paymentInfo?.method),
        truthyField(
          "수령/배송 방식",
          formatOrderPickupLabel(
            existing.shippingInfo?.deliveryMethod || existing.shippingInfo?.shippingMethod,
          ),
        ),
        { name: "교체서비스", value: existing.shippingInfo?.withStringService ? "포함" : "미포함" },
        { name: "사유", value: previewText(descDetail || descBase, 100) || descBase },
        { name: "환불계좌", value: needsRefundAccount ? "등록됨" : "미필요/미입력" },
      ].filter(Boolean) as Array<{ name: string; value: string }>,
    });

    const subject = buildCancelRefundSubject({
      userId: existing.userId ? existing.userId.toString() : null,
      orderId: _id.toString(),
    });

    try {
      await appendAudit(
        db,
        {
          type: "order_cancel_request_created",
          actorId: user.sub,
          targetId: _id,
          message: "주문 취소 요청 생성",
          diff: {
            targetType: "order",
            orderId: _id.toString(),
            actorRole: isAdmin ? "admin" : "user",
            reasonCode: cancelRequest.reasonCode ?? null,
            reasonTextPreview: toReasonPreview(cancelRequest.reasonText),
            refundAccountMasked: maskRefundAccount(cancelRequest.refundAccount),
            prevCancelStatus: existing.cancelRequest?.status ?? null,
            nextCancelStatus: cancelRequest.status,
            orderStatus: existing.status ?? null,
            paymentStatus: existing.paymentStatus ?? null,
          },
        },
        req,
      );
    } catch (error) {
      console.error("[orders/cancel-request] appendAudit failed", error);
    }

    await recordCancelRefundSignal(db, {
      eventType: "order_cancel_request_created",
      subjectKey: subject.subjectKey,
      subjectType: subject.subjectType,
      targetType: "order",
      targetId: _id,
      actorRole: isAdmin ? "admin" : "user",
      reasonCode: cancelRequest.reasonCode ?? null,
      status: cancelRequest.status,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrderCancelConflict) {
      return NextResponse.json({ ok: false, errorCode: "ORDER_CANCEL_CONFLICT", message: error.message }, { status: 409 });
    }
    console.error("POST /api/orders/[id]/cancel-request 오류:", error);
    return new NextResponse("서버 오류가 발생했습니다.", { status: 500 });
  }
}
