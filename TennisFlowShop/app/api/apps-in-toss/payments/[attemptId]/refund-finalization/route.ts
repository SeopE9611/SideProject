import { applyAppsInTossCors, createAppsInTossPreflightResponse, isAppsInTossAllowedOrigin } from "@/lib/apps-in-toss";
import { AppsInTossConfigurationError } from "@/lib/apps-in-toss/server/config";
import { AppsPaymentRefundError, refundAppsInTossFinalizationFailure } from "@/lib/apps-in-toss/server/payment-refund";
import { authenticateAppsSession, AppsInTossSessionError } from "@/lib/apps-in-toss/server/session";
import { assertAttemptId } from "@/lib/apps-in-toss/server/toss-pay-contract";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const CORS_OPTIONS = { methods: ["POST", "OPTIONS"], headers: ["Content-Type", "Accept", "Authorization"] } as const;
function response(origin: string | null, body: unknown, status: number) { const result = NextResponse.json(body, { status }); result.headers.set("Cache-Control", "no-store"); return applyAppsInTossCors(result, origin, CORS_OPTIONS); }
export function OPTIONS(request: Request) { const origin = request.headers.get("origin"); if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 Origin입니다." }, 403); return createAppsInTossPreflightResponse(origin, CORS_OPTIONS); }
export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, code: "ORIGIN_NOT_ALLOWED", message: "허용되지 않은 Origin입니다." }, 403);
  try {
    const db = await getDb(); const authenticated = await authenticateAppsSession(db, request.headers.get("authorization")); const { attemptId } = await context.params;
    try { assertAttemptId(attemptId); } catch { return response(origin, { success: false, code: "INVALID_REQUEST", message: "결제 시도 식별자가 올바르지 않습니다." }, 400); }
    return response(origin, await refundAppsInTossFinalizationFailure({ db, attemptId, userId: authenticated.user._id, identityId: authenticated.session.identityId }), 200);
  } catch (error) {
    if (error instanceof AppsInTossSessionError) return response(origin, { success: false, code: "AUTH_REQUIRED", message: "인증이 필요합니다." }, 401);
    if (error instanceof AppsInTossConfigurationError) return response(origin, { success: false, code: "PAYMENT_CONFIGURATION_MISSING", message: "결제 서버 설정을 확인해 주세요." }, 503);
    if (error instanceof AppsPaymentRefundError) return response(origin, { success: false, code: error.code, message: error.message }, error.status);
    console.error("[Apps in Toss payment refund 실패]", error instanceof Error ? error.name : "UnknownError");
    return response(origin, { success: false, code: "PAYMENT_REFUND_FAILED", message: "환불 상태를 처리하지 못했습니다." }, 500);
  }
}
