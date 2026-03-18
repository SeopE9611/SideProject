import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import jwt from "jsonwebtoken";

const jsonError = (status: number, message: string, errorCode?: string) =>
  NextResponse.json(
    {
      ok: false,
      message,
      ...(errorCode ? { errorCode } : {}),
    },
    { status },
  );

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * 주문 취소 "요청 철회" API
 * - 이미 넣어둔 취소 요청(cancelRequest.status === 'requested')을 취소한다.
 * - 실제 주문 status 는 그대로 두고, cancelRequest 상태만 되돌린다.
 * - 운송장(배송정보) 입력 전까지만 철회 가능.
 * - 주문 소유자 또는 관리자만 호출 가능.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return jsonError(400, "유효하지 않은 주문 ID입니다.", "INVALID_ORDER_ID");
    }

    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection("orders");

    const _id = new ObjectId(id);
    const existing: any = await orders.findOne({ _id });

    if (!existing) {
      return jsonError(404, "해당 주문을 찾을 수 없습니다.", "ORDER_NOT_FOUND");
    }

    // ───────── 1) 인증/인가 (cancel-request 라우트와 동일 패턴) ─────────
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
      return jsonError(401, "인증이 필요합니다.", "UNAUTHORIZED");
    }

    const adminList = (process.env.ADMIN_EMAIL_WHITELIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isOwner = existing.userId && user.sub === existing.userId.toString();
    const isAdmin =
      user.role === "admin" || (user.email && adminList.includes(user.email));

    // 비회원 주문(guest)의 경우 관리자만 취소 요청 철회 가능
    if (existing.userId ? !(isOwner || isAdmin) : !isAdmin) {
      return jsonError(403, "권한이 없습니다.", "FORBIDDEN");
    }

    // ───────── 2) 비즈니스 룰 체크 ─────────

    // 2-1) 이미 취소/환불된 주문이면 철회 자체가 의미 없음
    if (existing.status === "취소" || existing.status === "환불") {
      return jsonError(
        400,
        "이미 취소되었거나 환불된 주문입니다.",
        "ALREADY_CLOSED",
      );
    }

    // 2-2) 운송장(배송정보)이 이미 입력된 경우 철회 불가
    //      => 규칙 A: "운송장 입력 전까지만 취소 요청/철회 가능"
    const invoice = existing.shippingInfo?.invoice;
    const hasTrackingNumber =
      invoice &&
      typeof invoice.trackingNumber === "string" &&
      invoice.trackingNumber.trim().length > 0;

    if (hasTrackingNumber) {
      return jsonError(
        400,
        "이미 배송이 진행 중이어서 취소 요청을 철회할 수 없습니다.",
        "SHIPPING_IN_PROGRESS",
      );
    }

    // 2-3) 현재 cancelRequest 상태가 'requested' 인지 확인
    const existingReq: any = existing.cancelRequest || {};
    if (existingReq.status !== "requested") {
      return jsonError(
        409,
        "현재 취소 요청 상태가 아니어서 철회할 수 없습니다.",
        "CANCEL_REQUEST_NOT_REQUESTED",
      );
    }

    const now = new Date();

    // ───────── 3) cancelRequest 필드 업데이트 ─────────
    const updatedCancelRequest = {
      ...existingReq,
      status: "none" as const, // 취소 요청 상태 초기화
      withdrawnAt: now,
      updatedAt: now,
    };

    // ───────── 4) history 엔트리 추가 ─────────
    const historyEntry = {
      status: "취소요청철회",
      date: now,
      description: "고객이 주문 취소 요청을 철회했습니다.",
    };

    // ───────── 5) DB 업데이트 (경합 방어: requested 상태일 때만 업데이트) ─────────
    const result = await orders.updateOne(
      { _id, "cancelRequest.status": "requested" },
      {
        $set: { cancelRequest: updatedCancelRequest, updatedAt: now },
        $push: { history: historyEntry },
      } as any,
    );

    if (result.matchedCount === 0) {
      return jsonError(
        409,
        "이미 상태가 변경되어 취소 요청을 철회할 수 없습니다.",
        "CANCEL_REQUEST_RACE_CONDITION",
      );
    }

    return NextResponse.json({
      ok: true,
      message: "취소 요청이 철회되었습니다.",
      cancelRequest: updatedCancelRequest,
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/cancel-request-withdraw 오류:", error);
    return jsonError(500, "서버 오류가 발생했습니다.", "INTERNAL_SERVER_ERROR");
  }
}
