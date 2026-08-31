import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { createAdminNewsDraft } from "@/features/news/news.admin-repository";
import { validateAdminNewsDraftInput } from "@/features/news/news.admin-validation";

export const runtime = "nodejs";

const MAX_ADMIN_NEWS_REQUEST_BYTES = 64 * 1024;
const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function payloadTooLargeResponse(): Response {
  return jsonResponse(
    {
      ok: false,
      error: "payload_too_large",
      message: "작성 내용이 허용된 크기를 초과했습니다.",
    },
    413,
  );
}

function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;

  return contentType.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse(
      { ok: false, error: "forbidden", message: "요청을 처리할 수 없습니다." },
      403,
    );
  }

  try {
    const authorization = await authorizeCurrentAdmin("content.create");
    if (!authorization.ok) {
      return jsonResponse(
        { ok: false, error: authorization.reason },
        authorization.reason === "unauthorized" ? 401 : 403,
      );
    }
    const admin = authorization.admin;


    if (!isJsonContentType(request)) {
      return jsonResponse(
        {
          ok: false,
          error: "unsupported_media_type",
          message: "JSON 형식으로 작성 내용을 보내 주세요.",
        },
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
      return jsonResponse(
        {
          ok: false,
          error: "invalid_json",
          message: "작성 내용을 확인해 주세요.",
        },
        400,
      );
    }

    const validation = validateAdminNewsDraftInput(input);
    if (!validation.ok) {
      return jsonResponse(
        { ok: false, error: "validation", fieldErrors: validation.fieldErrors },
        400,
      );
    }

    const result = await createAdminNewsDraft(validation.value, admin);
    if (!result.ok) {
      return jsonResponse(
        {
          ok: false,
          error: "slug_conflict",
          fieldErrors: { slug: "이미 사용 중인 슬러그입니다." },
        },
        409,
      );
    }

    return jsonResponse(
      {
        ok: true,
        id: result.id,
        slug: result.slug,
        redirectTo: "/admin/news?created=1",
      },
      201,
    );
  } catch (error) {
    console.error("관리자 뉴스 초안 저장 실패", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse(
      {
        ok: false,
        error: "unavailable",
        message: "현재 게시물을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      503,
    );
  }
}
