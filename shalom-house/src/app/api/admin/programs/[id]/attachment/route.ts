import { ObjectId } from "mongodb";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { findAdminProgramPostById, inspectAdminProgramMediaTarget, isValidAdminProgramId, removeAdminProgramAttachment, setAdminProgramAttachment } from "@/features/programs/program.admin-repository";
import { ADMIN_PROGRAM_ATTACHMENT_REQUEST_MAX_BYTES, validateProgramAttachmentFile, validateProgramAttachmentMetadata, validateProgramMediaRemoveInput } from "@/features/programs/program.media-validation";
import { downloadPrivateProgramAttachment, removePrivateProgramAttachment, uploadPrivateProgramAttachment } from "@/features/programs/program.storage";
export const runtime = "nodejs"; const JSON_MAX = 16 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const disposition = (name: string) => `attachment; filename="program-attachment.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`;
const errorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";
async function cleanupAttachment(programId: string, bucket: string, objectPath: string, message: string) {
  try { await removePrivateProgramAttachment(programId, bucket, objectPath); }
  catch (error) { console.error(message, { programId, errorName: errorName(error) }); }
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!(await getCurrentAdmin())) return json({ ok: false, error: "unauthorized" }, 401);
  if (!isValidAdminProgramId(id)) return json({ ok: false, error: "not_found" }, 404);
  try { const target = await inspectAdminProgramMediaTarget(id);
    if (!target.ok) return json({ ok: false, error: target.reason }, target.reason === "not_found" ? 404 : 503);
    const post = await findAdminProgramPostById(id); if (!post?.attachment) return json({ ok: false, error: "not_found" }, 404);
    const blob = await downloadPrivateProgramAttachment(id, post.attachment.bucket, post.attachment.objectPath);
    return new Response(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disposition(post.attachment.originalFileName),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminProgramId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update"); if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > ADMIN_PROGRAM_ATTACHMENT_REQUEST_MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
  try { if ((await request.clone().arrayBuffer()).byteLength > ADMIN_PROGRAM_ATTACHMENT_REQUEST_MAX_BYTES)
      return json({ ok: false, error: "payload_too_large" }, 413);
    const form = await request.formData(); const metadata = validateProgramAttachmentMetadata({ expectedUpdatedAt: form.get("expectedUpdatedAt"), label: form.get("label"), contentSafetyConfirmed: form.get("contentSafetyConfirmed") === "true" });
    const file = await validateProgramAttachmentFile(form.get("file")); if (!metadata || !file) return json({ ok: false, error: "validation" }, 400);
    const target = await inspectAdminProgramMediaTarget(id);
    if (!target.ok) return json({ ok: false, error: target.reason }, target.reason === "not_found" ? 404 : 503);
    if (!target.editable) return json({ ok: false, error: "not_editable" }, 409);
    const objectPath = `shalom-house/programs/${id}/attachments/${new ObjectId().toHexString()}.pdf`;
    const uploaded = await uploadPrivateProgramAttachment(id, objectPath, file.buffer);
    const attachment = { ...uploaded, originalFileName: file.originalFileName, label: metadata.label, contentType: "application/pdf" as const, byteSize: file.byteSize, storedAt: new Date() };
    let result; try { result = await setAdminProgramAttachment({ id, expectedUpdatedAt: metadata.expectedUpdatedAt, actor: auth.admin, attachment }); }
    catch (error) { await cleanupAttachment(id, uploaded.bucket, uploaded.objectPath, "프로그램 PDF 보상 삭제 실패"); throw error; }
    if (!result.ok) { await cleanupAttachment(id, uploaded.bucket, uploaded.objectPath, "프로그램 PDF 보상 삭제 실패"); return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409); }
    if (result.previousAttachment) await cleanupAttachment(id, result.previousAttachment.bucket, result.previousAttachment.objectPath, "기존 프로그램 PDF 삭제 실패");
    return json({ ok: true, redirectTo: `/admin/programs/${id}?mediaUpdated=1` }, 200);
  } catch (error) { console.error("프로그램 PDF 저장 실패", { programId: id, errorName: errorName(error) }); return json({ ok: false, error: "unavailable" }, 503); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!isValidAdminProgramId(id)) return json({ ok: false, error: "not_found" }, 404);
  const auth = await authorizeCurrentAdmin("content.update"); if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > JSON_MAX) return json({ ok: false, error: "payload_too_large" }, 413);
  let raw: unknown; try { raw = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const value = validateProgramMediaRemoveInput(raw); if (!value) return json({ ok: false, error: "validation" }, 400);
  try { const result = await removeAdminProgramAttachment({ id, expectedUpdatedAt: value.expectedUpdatedAt, actor: auth.admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409);
    if (result.previousAttachment) await cleanupAttachment(id, result.previousAttachment.bucket, result.previousAttachment.objectPath, "기존 프로그램 PDF 삭제 실패");
    return json({ ok: true, redirectTo: `/admin/programs/${id}?mediaUpdated=1` }, 200);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
