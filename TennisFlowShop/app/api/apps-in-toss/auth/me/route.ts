import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { authenticateAppsSession } from "@/lib/apps-in-toss/server/session";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_OPTIONS = {
  methods: ["GET", "OPTIONS"],
  headers: ["Content-Type", "Accept", "Authorization"],
} as const;

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

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);
  try {
    const authenticated = await authenticateAppsSession(await getDb(), request.headers.get("authorization"));
    return response(origin, {
      success: true,
      user: { id: authenticated.user._id.toString(), name: authenticated.user.name },
    }, 200);
  } catch {
    return response(origin, { success: false, message: "인증이 필요합니다." }, 401);
  }
}
