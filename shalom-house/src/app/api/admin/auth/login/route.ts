import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  getClientAddress,
  isSameOriginRequest,
  loginAdmin,
} from "@/features/admin-auth/admin-auth.service";

export const runtime = "nodejs";

function redirectTo(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response("요청을 처리할 수 없습니다.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      return redirectTo(request, "/admin/login?error=credentials");
    }

    const result = await loginAdmin({
      email,
      password,
      clientAddress: getClientAddress(request),
    });
    if (!result.ok) {
      return redirectTo(
        request,
        result.reason === "rate_limited" ? "/admin/login?error=rate-limit" : "/admin/login?error=credentials",
      );
    }

    const response = redirectTo(request, "/admin");
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: result.sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    console.error("관리자 로그인 처리 실패", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return redirectTo(request, "/admin/login?error=unavailable");
  }
}
