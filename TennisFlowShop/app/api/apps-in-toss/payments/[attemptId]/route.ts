import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { getOwnedAppsPaymentIntent, AppsPaymentPrepareError } from "@/lib/apps-in-toss/server/payment-prepare";
import { authenticateAppsSession, AppsInTossSessionError } from "@/lib/apps-in-toss/server/session";
import { assertAttemptId } from "@/lib/apps-in-toss/server/toss-pay-contract";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_OPTIONS = { methods: ["GET", "OPTIONS"], headers: ["Content-Type", "Accept", "Authorization"] } as const;

function response(origin: string | null, body: unknown, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return applyAppsInTossCors(result, origin, CORS_OPTIONS);
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 Origin입니다." }, 403);
  return createAppsInTossPreflightResponse(origin, CORS_OPTIONS);
}

export async function GET(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 Origin입니다." }, 403);
  try {
    const db = await getDb();
    const authenticated = await authenticateAppsSession(db, request.headers.get("authorization"));
    const { attemptId } = await context.params;
    try { assertAttemptId(attemptId); } catch { return response(origin, { success: false, code: "INVALID_REQUEST", message: "결제 시도 식별자가 올바르지 않습니다." }, 400); }
    return response(origin, await getOwnedAppsPaymentIntent(db, attemptId, authenticated.user._id, authenticated.session.identityId), 200);
  } catch (error) {
    if (error instanceof AppsInTossSessionError) return response(origin, { success: false, code: "AUTH_REQUIRED", message: "인증이 필요합니다." }, 401);
    if (error instanceof AppsPaymentPrepareError) return response(origin, { success: false, code: error.code, message: error.message }, error.status);
    console.error("[Apps in Toss payment intent 조회 실패]", error);
    return response(origin, { success: false, code: "PAYMENT_PREPARE_FAILED", message: "결제 상태를 조회하지 못했습니다." }, 500);
  }
}
