import { handlePrivatePdfTransfer } from "@/lib/private-pdf-transfer";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { findAdminProgramPostById, inspectAdminProgramMediaTarget, isValidAdminProgramId, removeAdminProgramAttachment, setAdminProgramAttachment } from "@/features/programs/program.admin-repository";
import { ADMIN_PROGRAM_ATTACHMENT_MAX_BYTES, validateProgramAttachmentFile, validateProgramAttachmentMetadata, validateProgramMediaRemoveInput } from "@/features/programs/program.media-validation";
import { getProgramPrivateBucketName, redirectPrivateProgramAttachment, removePrivateProgramAttachment, uploadPrivateProgramAttachment } from "@/features/programs/program.storage";
export const runtime = "nodejs"; const JSON_MAX = 16 * 1024;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const errorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";
async function cleanupAttachment(programId: string, bucket: string, objectPath: string, message: string) {
  try { await removePrivateProgramAttachment(programId, bucket, objectPath); return true; }
  catch (error) { console.error(message, { programId, objectPath, errorName: errorName(error) }); return false; }
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!(await getCurrentAdmin())) return json({ ok: false, error: "unauthorized" }, 401);
  if (!isValidAdminProgramId(id)) return json({ ok: false, error: "not_found" }, 404);
  try { const target = await inspectAdminProgramMediaTarget(id);
    if (!target.ok) return json({ ok: false, error: target.reason }, target.reason === "not_found" ? 404 : 503);
    const post = await findAdminProgramPostById(id); if (!post?.attachment) return json({ ok: false, error: "not_found" }, 404);
    return await redirectPrivateProgramAttachment(id, post.attachment.bucket, post.attachment.objectPath, post.attachment.originalFileName);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handlePrivatePdfTransfer(request, (await params).id, {
    domain: "programs",
    maxBytes: ADMIN_PROGRAM_ATTACHMENT_MAX_BYTES,
    bucket: getProgramPrivateBucketName,
    find: findAdminProgramPostById,
    validateMetadata: validateProgramAttachmentMetadata,
    validateFile: validateProgramAttachmentFile,
    upload: uploadPrivateProgramAttachment,
    remove: removePrivateProgramAttachment,
    attach: setAdminProgramAttachment,
  });
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
    if (result.previousAttachment && !(await cleanupAttachment(id, result.previousAttachment.bucket, result.previousAttachment.objectPath, "기존 프로그램 PDF 삭제 실패")))
      return json({ ok: false, error: "attachment_cleanup_pending" }, 503);
    return json({ ok: true, redirectTo: `/admin/programs/${id}?mediaUpdated=1` }, 200);
  } catch { return json({ ok: false, error: "unavailable" }, 503); }
}
