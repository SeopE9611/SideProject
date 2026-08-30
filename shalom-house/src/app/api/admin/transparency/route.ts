import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { createAdminTransparencyDraft } from "@/features/transparency/transparency.admin-repository";
import { ADMIN_TRANSPARENCY_REQUEST_MAX_BYTES, normalizeAdminTransparencyOriginalFileName, validateAdminTransparencyDraftInput, validateAdminTransparencyPdf } from "@/features/transparency/transparency.admin-validation";
export const runtime = "nodejs";
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  const admin = await getCurrentAdmin();
  if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > ADMIN_TRANSPARENCY_REQUEST_MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return json({ ok: false, error: "unsupported_media_type" }, 415);
  try {
    const form = await request.formData();
    const document = form.get("document");
    if (!(document instanceof File)) return json({ ok: false, error: "validation", fieldErrors: { document: "PDF 파일을 선택해 주세요." } }, 400);
    let actualBytes = document.size;
    const raw: Record<string, unknown> = {};
    for (const key of ["slug", "title", "category", "periodLabel", "summary", "documentDate", "privacyReviewStatus", "finalDocumentStatus"]) {
      const value = form.get(key);
      raw[key] = value;
      if (typeof value === "string") actualBytes += new TextEncoder().encode(value).byteLength;
    }
    if (actualBytes > ADMIN_TRANSPARENCY_REQUEST_MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
    const draft = validateAdminTransparencyDraftInput(raw);
    if (!draft.ok) return json({ ok: false, error: "validation", fieldErrors: draft.fieldErrors }, 400);
    const pdf = await validateAdminTransparencyPdf(document);
    if (!pdf.ok) return json({ ok: false, error: "validation", fieldErrors: { document: pdf.error } }, 400);
    const originalFileName = normalizeAdminTransparencyOriginalFileName(document.name);
    if (!originalFileName) return json({ ok: false, error: "validation", fieldErrors: { document: "원본 파일명을 확인할 수 없습니다." } }, 400);
    const result = await createAdminTransparencyDraft({ draft: draft.value, pdf: pdf.value, originalFileName, actor: admin });
    if (!result.ok) return json({ ok: false, error: result.reason, fieldErrors: result.reason === "slug_conflict" ? { slug: "이미 사용 중인 슬러그입니다." } : { document: "이미 등록된 PDF입니다." } }, 409);
    return json({ ok: true, id: result.id, redirectTo: `/admin/transparency/${result.id}?created=1` }, 201);
  } catch (error) {
    console.error("관리자 자료공개 초안 저장 실패", { name: error instanceof Error ? error.name : "UnknownError" });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
