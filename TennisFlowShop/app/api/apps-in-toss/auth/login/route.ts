import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { decryptTossUserName } from "@/lib/apps-in-toss/server/crypto";
import {
  claimAuthorizationCode,
  completeAuthorizationCodeClaim,
  findOrCreateAppsInTossUser,
} from "@/lib/apps-in-toss/server/identity";
import { TossApiError } from "@/lib/apps-in-toss/server/http";
import {
  exchangeAuthorizationCode,
  getTossLoginUser,
  normalizeTossUserKey,
} from "@/lib/apps-in-toss/server/login-client";
import { createAppsSession } from "@/lib/apps-in-toss/server/session";
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforcePublicAuthRateLimit,
  getClientIp,
} from "@/lib/auth/publicAuthRateLimit";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const CORS_OPTIONS = {
  methods: ["POST", "OPTIONS"],
  headers: ["Content-Type", "Accept"],
} as const;

const LoginBodySchema = z.object({
  authorizationCode: z.string().trim().min(1).max(4096),
  referrer: z.enum(["DEFAULT", "SANDBOX"]),
}).strict();

function response(origin: string | null, body: unknown, status: number) {
  const result = NextResponse.json(body, { status });
  result.headers.set("Cache-Control", "no-store");
  return applyAppsInTossCors(result, origin, CORS_OPTIONS);
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);
  return createAppsInTossPreflightResponse(origin, CORS_OPTIONS);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);

  try {
    const db = await getDb();
    const rateLimited = await enforcePublicAuthRateLimit({
      db,
      routeId: "apps_in_toss_login",
      scope: "ip",
      value: getClientIp(request),
      policy: AUTH_RATE_LIMIT_POLICIES.apps_in_toss_login.ip,
    });
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", "no-store");
      return applyAppsInTossCors(rateLimited, origin, CORS_OPTIONS);
    }

    const parsed = LoginBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return response(origin, { success: false, message: "요청 본문이 올바르지 않습니다." }, 400);

    const codeHash = await claimAuthorizationCode(db, parsed.data.authorizationCode);
    const tossTokens = await exchangeAuthorizationCode(parsed.data);
    const tossUser = await getTossLoginUser(tossTokens.accessToken);
    const normalizedUserKey = normalizeTossUserKey(tossUser.userKey);
    const name = decryptTossUserName(tossUser.name);
    const { identity, user } = await findOrCreateAppsInTossUser(db, normalizedUserKey, name);
    const appsSession = await createAppsSession(db, user._id, identity._id);
    await completeAuthorizationCodeClaim(db, codeHash);

    return response(origin, {
      success: true,
      sessionToken: appsSession.sessionToken,
      expiresAt: appsSession.expiresAt.toISOString(),
      user: { id: user._id.toString(), name: user.name },
    }, 200);
  } catch (error) {
    if (error instanceof TossApiError && error.kind === "invalid_grant") {
      return response(origin, {
        success: false,
        code: "INVALID_AUTHORIZATION_CODE",
        message: "인가 코드가 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.",
      }, 400);
    }
    const status = error instanceof Error && error.name === "AppsInTossAuthorizationCodeReplayError" ? 409
      : error instanceof Error && (error.name === "AppsInTossUserUnavailableError" || error.name === "AppsInTossSessionError") ? 403
      : 500;
    const message = status === 409 ? "이미 사용된 인가 코드입니다. 새로 로그인해 주세요."
      : status === 403 ? "로그인할 수 없는 사용자입니다."
      : "Apps in Toss 로그인을 처리하지 못했습니다.";
    return response(origin, { success: false, message }, status);
  }
}
