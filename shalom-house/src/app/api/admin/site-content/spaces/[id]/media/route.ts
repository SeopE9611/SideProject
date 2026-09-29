import { ObjectId } from "mongodb";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import {
  getAdminFacilitySpace,
  removeAdminFacilitySpaceMedia,
  setAdminFacilitySpaceMedia,
} from "@/features/facility-spaces/facility-space.admin-repository";
import {
  FACILITY_SPACE_MEDIA_REQUEST_MAX_BYTES,
  validateFacilitySpaceImage,
  validateFacilitySpaceMediaMetadata,
  validateFacilitySpaceMediaRemoveInput,
} from "@/features/facility-spaces/facility-space.media-validation";
import {
  downloadPrivateFacilitySpaceImage,
  removePrivateFacilitySpaceImage,
  uploadPrivateFacilitySpaceImage,
} from "@/features/facility-spaces/facility-space.storage";

export const runtime = "nodejs";
const JSON_MAX_BYTES = 16 * 1024;
const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validId = (id: string) => ObjectId.isValid(id) && new ObjectId(id).toHexString() === id.toLowerCase();
const errorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";
const resultStatus = (reason: string) => reason === "not_found" || reason === "media_not_found" ? 404
  : reason === "edit_conflict" ? 409 : 503;

async function cleanup(id: string, bucket: string, objectPath: string, message: string) {
  try {
    await removePrivateFacilitySpaceImage(id, bucket, objectPath);
  } catch (error) {
    console.error(message, { facilitySpaceId: id, objectPath, errorName: errorName(error) });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeCurrentAdmin("site_content.manage");
  if (!authorization.ok) return json({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
  if (!validId(id)) return json({ ok: false, error: "not_found" }, 404);
  try {
    const space = await getAdminFacilitySpace(id);
    if (!space?.media) return json({ ok: false, error: "not_found" }, 404);
    const blob = await downloadPrivateFacilitySpaceImage(id, space.media.bucket, space.media.objectPath);
    return new Response(await blob.arrayBuffer(), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return json({ ok: false, error: "unavailable" }, 503);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  const authorization = await authorizeCurrentAdmin("site_content.manage");
  if (!authorization.ok) return json({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
  if (!validId(id)) return json({ ok: false, error: "not_found" }, 404);
  if (Number(request.headers.get("content-length") || 0) > FACILITY_SPACE_MEDIA_REQUEST_MAX_BYTES)
    return json({ ok: false, error: "payload_too_large" }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  try {
    if ((await request.clone().arrayBuffer()).byteLength > FACILITY_SPACE_MEDIA_REQUEST_MAX_BYTES)
      return json({ ok: false, error: "payload_too_large" }, 413);
    const form = await request.formData();
    const metadata = validateFacilitySpaceMediaMetadata({
      expectedUpdatedAt: form.get("expectedUpdatedAt"),
      altText: form.get("altText"),
      originalFileName: form.get("originalFileName"),
      contentSafetyConfirmed: form.get("contentSafetyConfirmed") === "true",
    });
    const image = await validateFacilitySpaceImage(form.get("image"));
    if (!metadata.ok || !image.ok)
      return json({ ok: false, error: "validation", ...(!image.ok ? { fieldErrors: { image: image.error } } : {}) }, 400);
    const mediaId = new ObjectId().toHexString();
    const objectPath = `shalom-house/facility-spaces/${id}/images/${mediaId}.webp`;
    const uploaded = await uploadPrivateFacilitySpaceImage(id, objectPath, image.value.buffer);
    let result;
    try {
      result = await setAdminFacilitySpaceMedia({
        id,
        expectedUpdatedAt: metadata.value.expectedUpdatedAt,
        actor: authorization.admin,
        media: { ...uploaded, mimeType: "image/webp", byteSize: image.value.byteSize, width: image.value.width,
          height: image.value.height, altText: metadata.value.altText,
          originalFileName: metadata.value.originalFileName, sha256: image.value.sha256 },
      });
    } catch (error) {
      await cleanup(id, uploaded.bucket, uploaded.objectPath, "생활공간 새 사진 보상 삭제 실패");
      throw error;
    }
    if (!result.ok) {
      await cleanup(id, uploaded.bucket, uploaded.objectPath, "생활공간 새 사진 보상 삭제 실패");
      return json({ ok: false, error: result.reason }, resultStatus(result.reason));
    }
    if (result.previousMedia)
      await cleanup(id, result.previousMedia.bucket, result.previousMedia.objectPath, "생활공간 이전 사진 삭제 실패");
    return json({ ok: true, updatedAt: result.updatedAt, mediaUrl: `/api/admin/site-content/spaces/${id}/media` }, 200);
  } catch (error) {
    console.error("생활공간 사진 저장 실패", { facilitySpaceId: id, errorName: errorName(error) });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  const authorization = await authorizeCurrentAdmin("site_content.manage");
  if (!authorization.ok) return json({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
  if (!validId(id)) return json({ ok: false, error: "not_found" }, 404);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > JSON_MAX_BYTES)
    return json({ ok: false, error: "payload_too_large" }, 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > JSON_MAX_BYTES)
    return json({ ok: false, error: "payload_too_large" }, 413);
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const validation = validateFacilitySpaceMediaRemoveInput(raw);
  if (!validation.ok) return json({ ok: false, error: "validation" }, 400);
  try {
    const result = await removeAdminFacilitySpaceMedia({ id, expectedUpdatedAt: validation.value.expectedUpdatedAt,
      actor: authorization.admin });
    if (!result.ok) return json({ ok: false, error: result.reason }, resultStatus(result.reason));
    if (result.previousMedia)
      await cleanup(id, result.previousMedia.bucket, result.previousMedia.objectPath, "생활공간 이전 사진 삭제 실패");
    return json({ ok: true, updatedAt: result.updatedAt }, 200);
  } catch (error) {
    console.error("생활공간 사진 삭제 실패", { facilitySpaceId: id, errorName: errorName(error) });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
