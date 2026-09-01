import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { directPublishAdminNewsPost, isValidAdminNewsId } from "@/features/news/news.admin-repository";
import { validateAdminNewsDirectPublishInput } from "@/features/news/news.admin-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };
const MAX_REQUEST_BYTES = 16 * 1024;
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  let contentId = "unknown";
  try {
    const authorization = await authorizeCurrentAdmin("content.direct_publish");
    if (!authorization.ok)
      return json({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
    const { id } = await context.params;
    contentId = id;
    if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
    const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (mediaType !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
    const length = request.headers.get("content-length");
    if (length !== null) {
      const bytes = Number.parseInt(length, 10);
      if (Number.isFinite(bytes) && bytes > MAX_REQUEST_BYTES)
        return json({ ok: false, error: "payload_too_large" }, 413);
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES)
      return json({ ok: false, error: "payload_too_large" }, 413);
    let input: unknown;
    try {
      input = JSON.parse(text) as unknown;
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    const validation = validateAdminNewsDirectPublishInput(input);
    if (!validation.ok) return json({ ok: false, error: "validation", fieldErrors: validation.fieldErrors }, 400);
    const result = await directPublishAdminNewsPost({
      id,
      expectedUpdatedAt: validation.value.expectedUpdatedAt,
      actor: authorization.admin,
    });
    if (!result.ok) {
      if (result.reason === "not_found") return json({ ok: false, error: result.reason }, 404);
      return json({ ok: false, error: result.reason }, 409);
    }
    return json({ ok: true, redirectTo: `/admin/news/${result.id}?directPublished=1` }, 200);
  } catch (error) {
    console.error("관리자 게시물 바로 게시 처리 실패", {
      contentId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
