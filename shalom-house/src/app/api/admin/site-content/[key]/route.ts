import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { saveAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { isSiteContentKey } from "@/features/site-content/site-content.types";
import { validateSiteContentSaveInput } from "@/features/site-content/site-content.validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ key: string }> };
const maximumBytes = 64 * 1024;
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
const response = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });

export async function PUT(request: Request, context: Context) {
  if (!isSameOriginRequest(request)) return response({ ok: false, error: "forbidden" }, 403);
  const { key } = await context.params;
  if (!isSiteContentKey(key)) return response({ ok: false, error: "not_found" }, 404);
  try {
    const authorization = await authorizeCurrentAdmin("site_content.manage");
    if (!authorization.ok) return response({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return response({ ok: false, error: "unsupported_media_type" }, 415);
    const length = request.headers.get("content-length");
    if (length && Number.parseInt(length, 10) > maximumBytes) return response({ ok: false, error: "payload_too_large" }, 413);
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBytes) return response({ ok: false, error: "payload_too_large" }, 413);
    let json: unknown;
    try { json = JSON.parse(body); } catch { return response({ ok: false, error: "invalid_json" }, 400); }
    const validation = validateSiteContentSaveInput(key, json);
    if (!validation.ok) return response({ ok: false, error: validation.formError ?? "validation", fieldErrors: validation.fieldErrors }, 400);
    const result = await saveAdminSiteContent({ key, content: validation.value.content, expectedUpdatedAt: validation.value.expectedUpdatedAt, actor: authorization.admin });
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : result.reason === "edit_conflict" ? 409 : 503;
      return response({ ok: false, error: result.reason }, status);
    }
    return response({ ok: true, redirectTo: `/admin/site-content/${key}?saved=1` }, 200);
  } catch (error) {
    console.error("공식 콘텐츠 저장 실패", { siteContentKey: key, errorName: error instanceof Error ? error.name : "UnknownError" });
    return response({ ok: false, error: "unavailable" }, 503);
  }
}
