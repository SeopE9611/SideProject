import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { createAdminFacilitySpace } from "@/features/facility-spaces/facility-space.admin-repository";
import { validateFacilitySpaceSaveInput } from "@/features/facility-spaces/facility-space.validation";
export const runtime = "nodejs";
const maximumBytes = 32 * 1024;
const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
const response = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers });
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return response({ ok: false, error: "forbidden" }, 403);
  try {
    const authorization = await authorizeCurrentAdmin("site_content.manage");
    if (!authorization.ok)
      return response({ ok: false, error: authorization.reason }, authorization.reason === "unauthorized" ? 401 : 403);
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json")
      return response({ ok: false, error: "unsupported_media_type" }, 415);
    const length = request.headers.get("content-length");
    if (length && Number.parseInt(length, 10) > maximumBytes)
      return response({ ok: false, error: "payload_too_large" }, 413);
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBytes)
      return response({ ok: false, error: "payload_too_large" }, 413);
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return response({ ok: false, error: "invalid_json" }, 400);
    }
    const validation = validateFacilitySpaceSaveInput(json);
    if (!validation.ok || (validation.ok && validation.value.expectedUpdatedAt !== null))
      return response(
        {
          ok: false,
          error: "validation",
          ...(!validation.ok ? { fieldErrors: validation.fieldErrors } : {}),
        },
        400,
      );
    const result = await createAdminFacilitySpace(validation.value.space, authorization.admin);
    if (!result.ok) return response({ ok: false, error: result.reason }, 503);
    return response(
      {
        ok: true,
        redirectTo: `/admin/site-content/spaces/${result.id}?saved=1`,
      },
      201,
    );
  } catch (error) {
    console.error("생활공간 생성 실패", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return response({ ok: false, error: "unavailable" }, 503);
  }
}
