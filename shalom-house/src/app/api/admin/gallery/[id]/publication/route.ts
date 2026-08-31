import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import {
  isValidAdminGalleryItemId,
  changeAdminGalleryPublicationState,
} from "@/features/gallery/gallery.admin-repository";
import { validateAdminGalleryPublicationInput } from "@/features/gallery/gallery.admin-validation";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

const MAX = 16384;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

export async function POST(request: Request, { params }: Context) {
  if (!isSameOriginRequest(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const authorization = await authorizeCurrentAdmin("content.publish");
  if (!authorization.ok) {
    return json(
      { ok: false, error: authorization.reason },
      authorization.reason === "unauthorized" ? 401 : 403,
    );
  }
  const admin = authorization.admin;


  const { id } = await params;

  if (!isValidAdminGalleryItemId(id)) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  if (
    request.headers.get("content-type")?.split(";", 1)[0] !==
    "application/json"
  ) {
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).byteLength > MAX) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const checked = validateAdminGalleryPublicationInput(body);

  if (!checked.ok) {
    return json({ ok: false, error: "validation" }, 400);
  }

  try {
    const result = await changeAdminGalleryPublicationState({
      id,
      ...checked.value,
      actor: admin,
    });

    if (!result.ok) {
      return json(
        { ok: false, error: result.reason },
        result.reason === "not_found" ? 404 : 409,
      );
    }

    return json(
      { ...result, redirectTo: `/admin/gallery/${id}?transition=publication` },
      200,
    );
  } catch (error) {
    console.error("관리자 활동사진 상태 변경 실패", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "unavailable" }, 503);
  }
}
