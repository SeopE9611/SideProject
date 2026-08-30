import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { archiveAdminTransparencyDraft, isValidAdminTransparencyDocumentId } from "@/features/transparency/transparency.admin-repository";
import { validateAdminTransparencyArchiveInput } from "@/features/transparency/transparency.admin-validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
export async function POST(request: Request, { params }: Context) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  const admin = await getCurrentAdmin();
  if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
  const { id } = await params;
  if (!isValidAdminTransparencyDocumentId(id)) return json({ ok: false, error: "not_found" }, 404);
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 16384) return json({ ok: false, error: "payload_too_large" }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const validation = validateAdminTransparencyArchiveInput(body);
  if (!validation.ok) return json({ ok: false, error: "validation" }, 400);
  try {
    const result = await archiveAdminTransparencyDraft({ id, ...validation.value, actor: admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : 409);
    return json({ ok: true, redirectTo: `/admin/transparency/${id}?archived=1` }, 200);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
