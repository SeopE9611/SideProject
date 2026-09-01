import { ObjectId } from "mongodb";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { findAdminNewsPostById, isValidAdminNewsId, removeAdminNewsAttachment, setAdminNewsAttachment } from "@/features/news/news.admin-repository";
import { ADMIN_NEWS_ATTACHMENT_REQUEST_MAX_BYTES, validateNewsAttachmentFile, validateNewsAttachmentMetadata, validateNewsMediaRemoveInput } from "@/features/news/news.media-validation";
import { downloadPrivateNewsAttachment, removePrivateNewsAttachment, uploadPrivateNewsAttachment } from "@/features/news/news.storage";
export const runtime = "nodejs"; const JSON_MAX = 16 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const disposition = (name: string) => `attachment; filename="news-attachment.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`;
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!(await getCurrentAdmin())) return json({ ok: false, error: "unauthorized" }, 401);
  if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
  try { const post = await findAdminNewsPostById(id); if (!post?.attachment) return json({ ok: false, error: "not_found" }, 404);
    const blob = await downloadPrivateNewsAttachment(post.attachment.bucket, post.attachment.objectPath);
    return new Response(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disposition(post.attachment.originalFileName),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update"); if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > ADMIN_NEWS_ATTACHMENT_REQUEST_MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
  try { const post = await findAdminNewsPostById(id); if (!post) return json({ ok: false, error: "not_found" }, 404);
    if (!post.isEditable) return json({ ok: false, error: "not_editable" }, 409);
    const form = await request.formData(); const metadata = validateNewsAttachmentMetadata({ expectedUpdatedAt: form.get("expectedUpdatedAt"), label: form.get("label"), contentSafetyConfirmed: form.get("contentSafetyConfirmed") === "true" });
    const file = await validateNewsAttachmentFile(form.get("file")); if (!metadata || !file) return json({ ok: false, error: "validation" }, 400);
    const objectPath = `shalom-house/news/${id}/attachments/${new ObjectId().toHexString()}.pdf`;
    const uploaded = await uploadPrivateNewsAttachment(objectPath, file.buffer);
    const attachment = { ...uploaded, originalFileName: file.originalFileName, label: metadata.label, contentType: "application/pdf" as const, byteSize: file.byteSize, storedAt: new Date() };
    let result; try { result = await setAdminNewsAttachment({ id, expectedUpdatedAt: metadata.expectedUpdatedAt, actor: auth.admin, attachment }); }
    catch (error) { await removePrivateNewsAttachment(uploaded.bucket, uploaded.objectPath).catch(() => undefined); throw error; }
    if (!result.ok) { await removePrivateNewsAttachment(uploaded.bucket, uploaded.objectPath).catch(() => undefined); return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409); }
    if (result.previousAttachment) removePrivateNewsAttachment(result.previousAttachment.bucket, result.previousAttachment.objectPath)
      .catch((error) => console.error("기존 소식 PDF 삭제 실패", { newsId: id, errorName: error instanceof Error ? error.name : "UnknownError" }));
    return json({ ok: true, redirectTo: `/admin/news/${id}?mediaUpdated=1` }, 200);
  } catch (error) { console.error("소식 PDF 저장 실패", { newsId: id, errorName: error instanceof Error ? error.name : "UnknownError" }); return json({ ok: false, error: "unavailable" }, 503); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminNewsId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update"); if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  let raw: unknown; try { raw = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const value = validateNewsMediaRemoveInput(raw); if (!value) return json({ ok: false, error: "validation" }, 400);
  try { const result = await removeAdminNewsAttachment({ id, expectedUpdatedAt: value.expectedUpdatedAt, actor: auth.admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : 409);
    if (result.previousAttachment) removePrivateNewsAttachment(result.previousAttachment.bucket, result.previousAttachment.objectPath)
      .catch((error) => console.error("기존 소식 PDF 삭제 실패", { newsId: id, errorName: error instanceof Error ? error.name : "UnknownError" }));
    return json({ ok: true, redirectTo: `/admin/news/${id}?mediaUpdated=1` }, 200);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
