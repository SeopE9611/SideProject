import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { isValidAdminTransparencyDocumentId, changeAdminTransparencyPublicationState } from "@/features/transparency/transparency.admin-repository";
import { validateAdminTransparencyPublicationInput } from "@/features/transparency/transparency.admin-validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const MAX = 16 * 1024;
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
export async function POST(request: Request, { params }: Context) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  const admin = await getCurrentAdmin();
  if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
  const { id } = await params;
  if (!isValidAdminTransparencyDocumentId(id)) return json({ ok: false, error: "not_found" }, 404);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const validation = validateAdminTransparencyPublicationInput(body);
  if (!validation.ok) return json({ ok: false, error: "validation" }, 400);
  try {
    const result = await changeAdminTransparencyPublicationState({ id, ...validation.value, actor: admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : 409);
    return json({ ok: true, redirectTo: `/admin/transparency/${id}?unpublished=1` }, 200);
  } catch (error) {
    console.error("관리자 자료공개 상태 전이 실패", { name: error instanceof Error ? error.name : "UnknownError" });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
