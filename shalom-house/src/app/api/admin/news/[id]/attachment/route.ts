import { handlePrivatePdfTransfer } from "@/lib/private-pdf-transfer";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { findAdminNewsPostById, inspectAdminNewsMediaTarget, isValidAdminNewsId, removeAdminNewsAttachment, setAdminNewsAttachment } from "@/features/news/news.admin-repository";
import { ADMIN_NEWS_ATTACHMENT_MAX_BYTES, validateNewsAttachmentFile, validateNewsAttachmentMetadata, validateNewsMediaRemoveInput } from "@/features/news/news.media-validation";
import { getNewsPrivateBucketName, redirectPrivateNewsAttachment, removePrivateNewsAttachment, uploadPrivateNewsAttachment } from "@/features/news/news.storage";
export const runtime = "nodejs"; const JSON_MAX = 16 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const errorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";
async function cleanupAttachment(newsId: string, bucket: string, objectPath: string, message: string) {
  try { await removePrivateNewsAttachment(newsId, bucket, objectPath); return true; }
  catch (error) { console.error(message, { newsId, objectPath, errorName: errorName(error) }); return false; }
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!(await getCurrentAdmin())) return json({ ok: false, error: "unauthorized" }, 401);
  if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
  try { const target = await inspectAdminNewsMediaTarget(id);
    if (!target.ok) return json({ ok: false, error: target.reason }, target.reason === "not_found" ? 404 : 503);
    const post = await findAdminNewsPostById(id); if (!post?.attachment) return json({ ok: false, error: "not_found" }, 404);
    return await redirectPrivateNewsAttachment(id, post.attachment.bucket, post.attachment.objectPath, post.attachment.originalFileName);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlePrivatePdfTransfer(request, (await params).id, {
    domain: "news",
    maxBytes: ADMIN_NEWS_ATTACHMENT_MAX_BYTES,
    bucket: getNewsPrivateBucketName,
    find: findAdminNewsPostById,
    validateMetadata: validateNewsAttachmentMetadata,
    validateFile: validateNewsAttachmentFile,
    upload: uploadPrivateNewsAttachment,
    remove: removePrivateNewsAttachment,
    attach: setAdminNewsAttachment,
  });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update"); if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  let raw: unknown; try { raw = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const value = validateNewsMediaRemoveInput(raw); if (!value) return json({ ok: false, error: "validation" }, 400);
  try { const result = await removeAdminNewsAttachment({ id, expectedUpdatedAt: value.expectedUpdatedAt, actor: auth.admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409);
    if (result.previousAttachment && !(await cleanupAttachment(id, result.previousAttachment.bucket, result.previousAttachment.objectPath, "기존 소식 PDF 삭제 실패")))
      return json({ ok: false, error: "attachment_cleanup_pending" }, 503);
    return json({ ok: true, redirectTo: `/admin/news/${id}?mediaUpdated=1` }, 200);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
