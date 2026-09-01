import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { updateAdminUser } from "@/features/admin-users/admin-user.admin-repository";
import { validateUpdateAdminUser } from "@/features/admin-users/admin-user.validation";
export const runtime = "nodejs";
const h = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  j = (b: unknown, s: number) => new Response(JSON.stringify(b), { status: s, headers: h }),
  idOk = (x: string) => /^[0-9a-f]{24}$/.test(x);
export async function PUT(r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idOk(id)) return j({ ok: false, error: "validation" }, 400);
  if (!isSameOriginRequest(r)) return j({ ok: false, error: "forbidden" }, 403);
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) return j({ ok: false, error: a.reason }, a.reason === "unauthorized" ? 401 : 403);
  if (r.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    return j({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(r.headers.get("content-length")) > 32768) return j({ ok: false, error: "payload_too_large" }, 413);
  const t = await r.text();
  if (new TextEncoder().encode(t).length > 32768) return j({ ok: false, error: "payload_too_large" }, 413);
  let raw;
  try {
    raw = JSON.parse(t);
  } catch {
    return j({ ok: false, error: "invalid_json" }, 400);
  }
  const v = validateUpdateAdminUser(raw);
  if (!v.ok) return j({ ok: false, error: "validation", fieldErrors: v.fieldErrors }, 400);
  try {
    const x = await updateAdminUser({ id, ...v.value, actor: a.admin });
    if (!x.ok) {
      const status = x.reason === "not_found" ? 404 : x.reason === "invalid_document" ? 503 : 409;
      return j({ ok: false, error: x.reason }, status);
    }
    return j(
      { ok: true, redirectTo: `/admin/admin-users/${id}?updated=1`, revokedSessionCount: x.revokedSessionCount },
      200,
    );
  } catch (e) {
    console.error("관리자 계정 관리 실패", {
      targetAdminUserId: id,
      actorAdminUserId: a.admin.id,
      operation: "update",
      errorName: e instanceof Error ? e.name : "UnknownError",
    });
    return j({ ok: false, error: "unavailable" }, 503);
  }
}
