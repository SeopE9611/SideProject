import { NextResponse } from "next/server";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { ADMIN_SESSION_COOKIE_NAME, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { revokeAdminUserSessions } from "@/features/admin-users/admin-user.admin-repository";
import { validateRevokeAdminUserSessions } from "@/features/admin-users/admin-user.validation";
export const runtime = "nodejs";
const j = (b: unknown, s: number) => NextResponse.json(b, { status: s, headers: { "Cache-Control": "no-store" } });
export async function DELETE(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) return j({ ok: false, error: "validation" }, 400);
  if (!isSameOriginRequest(r)) return j({ ok: false, error: "forbidden" }, 403);
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) return j({ ok: false, error: a.reason }, a.reason === "unauthorized" ? 401 : 403);
  if (r.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    return j({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(r.headers.get("content-length")) > 16384) return j({ ok: false, error: "payload_too_large" }, 413);
  const t = await r.text();
  if (new TextEncoder().encode(t).length > 16384) return j({ ok: false, error: "payload_too_large" }, 413);
  let raw;
  try {
    raw = JSON.parse(t);
  } catch {
    return j({ ok: false, error: "invalid_json" }, 400);
  }
  const v = validateRevokeAdminUserSessions(raw);
  if (!v.ok) return j({ ok: false, error: "validation", fieldErrors: v.fieldErrors }, 400);
  try {
    const x = await revokeAdminUserSessions({ id, ...v.value, actor: a.admin });
    if (!x.ok)
      return j(
        { ok: false, error: x.reason },
        x.reason === "not_found" ? 404 : x.reason === "invalid_document" ? 503 : 409,
      );
    const redirectTo = x.selfRevoked ? "/admin/login?sessionRevoked=1" : `/admin/admin-users/${id}?sessionsRevoked=1`;
    const response = j(
      { ok: true, selfRevoked: x.selfRevoked, revokedSessionCount: x.revokedSessionCount, redirectTo },
      200,
    );
    if (x.selfRevoked)
      response.cookies.set({
        name: ADMIN_SESSION_COOKIE_NAME,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    return response;
  } catch (e) {
    console.error("관리자 계정 관리 실패", {
      targetAdminUserId: id,
      actorAdminUserId: a.admin.id,
      operation: "revoke_sessions",
      errorName: e instanceof Error ? e.name : "UnknownError",
    });
    return j({ ok: false, error: "unavailable" }, 503);
  }
}
