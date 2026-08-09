import {
  applyAppsInTossCors,
  createAppsInTossPreflightResponse,
  isAppsInTossAllowedOrigin,
} from "@/lib/apps-in-toss";
import { authenticateAppsSession, revokeAppsSession } from "@/lib/apps-in-toss/server/session";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_OPTIONS = {
  methods: ["POST", "OPTIONS"],
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

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAppsInTossAllowedOrigin(origin)) return response(origin, { success: false, message: "허용되지 않은 Origin입니다." }, 403);
  try {
    const db = await getDb();
    const authenticated = await authenticateAppsSession(db, request.headers.get("authorization"));
    await revokeAppsSession(db, authenticated.session._id);
    return response(origin, { success: true }, 200);
  } catch {
    return response(origin, { success: false, message: "인증이 필요합니다." }, 401);
  }
}
