import { getClientAddress, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { createInquiryReference, createPublicInquiry } from "@/features/inquiries/inquiry.repository";
import { validatePublicInquiryInput } from "@/features/inquiries/inquiry.validation";
export const runtime = "nodejs";
const maximumBytes = 16 * 1024;
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  const length = request.headers.get("content-length");
  if (length && Number.parseInt(length, 10) > maximumBytes) return json({ ok: false, error: "payload_too_large" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes)
    return json({ ok: false, error: "payload_too_large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const validation = validatePublicInquiryInput(body);
  if (!validation.ok) return json({ ok: false, error: "validation", fieldErrors: validation.fieldErrors }, 400);
  if (validation.value.website) return json({ ok: true, reference: createInquiryReference() }, 201);
  const result = await createPublicInquiry({ ...validation.value, clientAddress: getClientAddress(request) });
  if (!result.ok) return json({ ok: false, error: result.reason }, result.reason === "rate_limited" ? 429 : 503);
  return json(result, 201);
}
