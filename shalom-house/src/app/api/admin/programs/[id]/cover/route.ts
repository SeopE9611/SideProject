import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { removeAdminProgramCoverImage, setAdminProgramCoverImage, isValidAdminProgramId } from "@/features/programs/program.admin-repository";
import { validateProgramCoverSetInput, validateProgramMediaRemoveInput } from "@/features/programs/program.media-validation";
export const runtime = "nodejs"; const MAX = 16 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function handle(request: Request, id: string, remove: boolean) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminProgramId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update");
  if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  let raw: unknown; try { raw = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const removeValue = remove ? validateProgramMediaRemoveInput(raw) : null;
  const setValue = remove ? null : validateProgramCoverSetInput(raw);
  if (!removeValue && !setValue) return json({ ok: false, error: "validation" }, 400);
  let result;
  try {
    result = removeValue ? await removeAdminProgramCoverImage({ id, expectedUpdatedAt: removeValue.expectedUpdatedAt, actor: auth.admin })
      : await setAdminProgramCoverImage({ id, expectedUpdatedAt: setValue!.expectedUpdatedAt, galleryItemId: setValue!.galleryItemId, actor: auth.admin });
  } catch (error) {
    console.error("프로그램 대표 이미지 저장 실패", { programId: id, errorName: error instanceof Error ? error.name : "UnknownError" });
    return json({ ok: false, error: "unavailable" }, 503);
  }
  if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409);
  return json({ ok: true, redirectTo: `/admin/programs/${id}?mediaUpdated=1` }, 200);
}
export const PUT = (request: Request, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => handle(request, id, false));
export const DELETE = (request: Request, { params }: { params: Promise<{ id: string }> }) => params.then(({ id }) => handle(request, id, true));
