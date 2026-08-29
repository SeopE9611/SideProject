import {
  getCurrentAdmin,
  isSameOriginRequest,
} from "@/features/admin-auth/admin-auth.service";
import { createAdminGalleryDraft } from "@/features/gallery/gallery.admin-repository";
import {
  ADMIN_GALLERY_REQUEST_MAX_BYTES,
  normalizeAdminGalleryOriginalFileName,
  validateAdminGalleryDraftInput,
  validateAdminGalleryImage,
} from "@/features/gallery/gallery.admin-validation";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers });
export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return json({ ok: false, error: "forbidden" }, 403);
  const admin = await getCurrentAdmin();
  if (!admin) return json({ ok: false, error: "unauthorized" }, 401);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > ADMIN_GALLERY_REQUEST_MAX_BYTES)
    return json({ ok: false, error: "payload_too_large" }, 413);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("multipart/form-data;")
  )
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  try {
    const form = await request.formData(),
      image = form.get("image"),
      raw = form.get("metadata");
    if (!(image instanceof File) || typeof raw !== "string")
      return json({ ok: false, error: "validation" }, 400);
    if (
      image.size + new TextEncoder().encode(raw).byteLength >
      ADMIN_GALLERY_REQUEST_MAX_BYTES
    )
      return json({ ok: false, error: "payload_too_large" }, 413);
    let metadata: unknown;
    try {
      metadata = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "invalid_metadata" }, 400);
    }
    const draft = validateAdminGalleryDraftInput(metadata),
      checked = await validateAdminGalleryImage(image);
    if (!draft.ok)
      return json(
        { ok: false, error: "validation", fieldErrors: draft.fieldErrors },
        400,
      );
    if (!checked.ok)
      return json(
        {
          ok: false,
          error: "validation",
          fieldErrors: { image: checked.error },
        },
        400,
      );
    const record = metadata as Record<string, unknown>,
      originalFileName = normalizeAdminGalleryOriginalFileName(
        record.originalFileName,
      );
    if (!originalFileName)
      return json(
        {
          ok: false,
          error: "validation",
          fieldErrors: { image: "원본 파일 정보를 확인할 수 없습니다." },
        },
        400,
      );
    const result = await createAdminGalleryDraft({
      draft: draft.value,
      image: checked.value,
      originalFileName,
      actor: admin,
    });
    if (!result.ok)
      return json(
        {
          ok: false,
          error: result.reason,
          fieldErrors:
            result.reason === "slug_conflict"
              ? { slug: "이미 사용 중인 슬러그입니다." }
              : { image: "이미 등록된 이미지입니다." },
        },
        409,
      );
    return json(
      {
        ok: true,
        id: result.id,
        redirectTo: `/admin/gallery/${result.id}?created=1`,
      },
      201,
    );
  } catch (error) {
    console.error("관리자 활동사진 초안 저장 실패", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
