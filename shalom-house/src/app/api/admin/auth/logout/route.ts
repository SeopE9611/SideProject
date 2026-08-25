import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE_NAME,
  isSameOriginRequest,
  revokeAdminSessionToken,
} from "@/features/admin-auth/admin-auth.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response("요청을 처리할 수 없습니다.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const sessionToken = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim().split("="))
    .find(([name]) => name === ADMIN_SESSION_COOKIE_NAME)?.[1];

  if (sessionToken) {
    try {
      await revokeAdminSessionToken(decodeURIComponent(sessionToken));
    } catch {
      // DB 처리 결과와 관계없이 브라우저 세션은 제거한다.
    }
  }

  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
