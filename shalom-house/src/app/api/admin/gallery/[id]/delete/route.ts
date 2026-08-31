import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { softDeleteAdminGalleryItem, isValidAdminGalleryItemId } from "@/features/gallery/gallery.admin-repository";
import { validateAdminTrashInput } from "@/features/admin-trash/admin-trash.validation";
export const runtime = "nodejs";
const MAX_BYTES = 16 * 1024, headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  try {
    const authorization = await authorizeCurrentAdmin("content.delete");
    if (!authorization.ok) return json({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
    const { id } = await context.params;
    if (!isValidAdminGalleryItemId(id)) return json({ ok: false, error: "not_found" }, 404);
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
    const length = request.headers.get("content-length"); if (length !== null && Number(length) > MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
    const body = await request.text(); if (new TextEncoder().encode(body).byteLength > MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
    let parsed: unknown; try { parsed = JSON.parse(body); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
    const validation = validateAdminTrashInput(parsed); if (!validation.ok) return json({ ok: false, error: "validation", fieldErrors: validation.fieldErrors }, 400);
    const result = await softDeleteAdminGalleryItem({ id, expectedUpdatedAt: validation.value.expectedUpdatedAt, actor: authorization.admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : 409);
    return json(result, 200);
  } catch (error) { console.error("관리자 활동사진 delete 실패", { name: error instanceof Error ? error.name : "UnknownError" }); return json({ ok: false, error: "unavailable" }, 503); }
}
