import { ObjectId } from "mongodb";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { updateAdminInquiry } from "@/features/inquiries/inquiry.admin-repository";
import { validateAdminInquiryUpdate } from "@/features/inquiries/inquiry.validation";
export const runtime = "nodejs";
const maximumBytes = 16 * 1024;
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id.toLowerCase())
    return json({ ok: false, error: "not_found" }, 404);
  try {
    const auth = await authorizeCurrentAdmin("inquiries.manage");
    if (!auth.ok) return json({ ok: false, error: auth.reason }, auth.reason === "unauthorized" ? 401 : 403);
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
      return json({ ok: false, error: "unsupported_media_type" }, 415);
    const length = request.headers.get("content-length");
    if (length && Number.parseInt(length, 10) > maximumBytes)
      return json({ ok: false, error: "payload_too_large" }, 413);
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maximumBytes)
      return json({ ok: false, error: "payload_too_large" }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    const validation = validateAdminInquiryUpdate(body);
    if (!validation.ok) return json({ ok: false, error: "validation", fieldErrors: validation.fieldErrors }, 400);
    const result = await updateAdminInquiry({ id, ...validation.value, actor: auth.admin });
    if (!result.ok)
      return json(
        { ok: false, error: result.reason },
        result.reason === "not_found" ? 404 : result.reason === "invalid_document" ? 503 : 409,
      );
    return json({ ok: true, redirectTo: `/admin/inquiries/${id}?updated=1` }, 200);
  } catch (error) {
    console.error("문의 수정 실패", { inquiryId: id, errorName: error instanceof Error ? error.name : "UnknownError" });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
