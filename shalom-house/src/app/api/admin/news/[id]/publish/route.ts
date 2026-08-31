import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import {
  isValidAdminNewsId,
  publishAdminNews,
} from "@/features/news/news.admin-repository";
import { validateAdminNewsPublishInput } from "@/features/news/news.admin-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_ADMIN_NEWS_REQUEST_BYTES = 64 * 1024;
const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;
  return contentType.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function payloadTooLargeResponse(): Response {
  return jsonResponse(
    { ok: false, error: "payload_too_large", message: "게시 요청 내용이 허용된 크기를 초과했습니다." },
    413,
  );
}

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse(
      { ok: false, error: "forbidden", message: "요청을 처리할 수 없습니다." },
      403,
    );
  }

  try {
    const authorization = await authorizeCurrentAdmin("content.publish");
    if (!authorization.ok) {
      return jsonResponse(
        { ok: false, error: authorization.reason },
        authorization.reason === "unauthorized" ? 401 : 403,
      );
    }
    const admin = authorization.admin;


    const { id } = await context.params;
    if (!isValidAdminNewsId(id)) {
      return jsonResponse(
        { ok: false, error: "not_found", message: "게시물을 찾을 수 없습니다." },
        404,
      );
    }
    if (!isJsonContentType(request)) {
      return jsonResponse(
        { ok: false, error: "unsupported_media_type", message: "JSON 형식으로 게시 요청을 보내 주세요." },
        415,
      );
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength !== null) {
      const declaredBytes = Number.parseInt(contentLength, 10);
      if (Number.isFinite(declaredBytes) && declaredBytes > MAX_ADMIN_NEWS_REQUEST_BYTES) {
        return payloadTooLargeResponse();
      }
    }
    const requestText = await request.text();
    if (new TextEncoder().encode(requestText).byteLength > MAX_ADMIN_NEWS_REQUEST_BYTES) {
      return payloadTooLargeResponse();
    }

    let input: unknown;
    try {
      input = JSON.parse(requestText) as unknown;
    } catch {
      return jsonResponse({ ok: false, error: "invalid_json" }, 400);
    }

    const validation = validateAdminNewsPublishInput(input);
    if (!validation.ok) {
      if (validation.formError === "invalid_version") {
        return jsonResponse(
          { ok: false, error: "invalid_version", message: "게시 기준 시각을 확인할 수 없습니다." },
          400,
        );
      }
      return jsonResponse(
        { ok: false, error: "validation", fieldErrors: validation.fieldErrors },
        400,
      );
    }

    const result = await publishAdminNews({
      id,
      expectedUpdatedAt: validation.value.expectedUpdatedAt,
      actor: admin,
    });
    if (!result.ok) {
      if (result.reason === "not_found") {
        return jsonResponse(
          { ok: false, error: "not_found", message: "게시물을 찾을 수 없습니다." },
          404,
        );
      }
      if (result.reason === "not_publishable") {
        return jsonResponse(
          { ok: false, error: "not_publishable", message: "현재 게시 상태에서는 공개할 수 없습니다." },
          409,
        );
      }
      return jsonResponse(
        { ok: false, error: "edit_conflict", message: "다른 관리자가 이 게시물을 먼저 변경했습니다." },
        409,
      );
    }

    return jsonResponse(
      { ...result, redirectTo: `/admin/news/${result.id}?published=1` },
      200,
    );
  } catch (error) {
    console.error("관리자 뉴스 게시 처리 실패", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(
      { ok: false, error: "unavailable", message: "현재 게시물을 공개할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      503,
    );
  }
}
