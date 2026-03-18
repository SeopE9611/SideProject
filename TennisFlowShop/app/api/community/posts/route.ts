import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { getDb } from "@/lib/mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { logInfo, reqMeta, startTimer } from "@/lib/logger";
import {
  COMMUNITY_BOARD_TYPES,
  COMMUNITY_CATEGORIES,
} from "@/lib/types/community";
import { API_VERSION } from "@/lib/board.repository";
import { verifyCommunityCsrf } from "@/lib/community/security";
import {
  MAX_COMMUNITY_SEARCH_QUERY_LENGTH,
  buildCommunityListMongoFilter,
  getCommunitySortOption,
  parseCommunityListQuery,
} from "@/lib/community-list-query";
import {
  normalizeSanitizedContent,
  sanitizeHtml,
  validateSanitizedLength,
} from "@/lib/sanitize";
import { validateBoardAssetUrl } from "@/lib/boards-community-url-policy";
import { normalizeMarketMeta } from "@/lib/market";
import {
  getValidCommunityUserObjectIds,
  resolveCommunityDisplayName,
} from "@/lib/community-display-name";
import type {
  AccessTokenPayload,
  CommunityListResponseDto,
  CommunityPostListItemDto,
  CommunityPostMongoDoc,
} from "@/lib/types/api/board-community";

// -------------------------- 유틸: 인증/작성자 이름 ---------------------------

// 로그인된 사용자 정보 가져오기 (없으면 null)
async function getAuthPayload() {
  const jar = await cookies();
  const token = jar.get("accessToken")?.value;
  if (!token) return null;
  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 처리
  let payload: AccessTokenPayload | null = null;
  try {
    payload = verifyAccessToken(token) as AccessTokenPayload | null;
  } catch {
    payload = null;
  }
  const subStr = payload?.sub ? String(payload.sub) : "";
  if (!subStr || !ObjectId.isValid(subStr)) return null;
  return payload ?? null;
}

// ----------------------------- Zod 스키마 ----------------------------------

// 커뮤니티 글 생성 요청 바디 검증 스키마
const createSchema = z.object({
  type: z.enum(COMMUNITY_BOARD_TYPES),

  title: z
    .string()
    .min(1, "제목을 입력해 주세요.")
    .max(200, "제목은 200자 이내로 입력해 주세요."),

  content: z.string().max(5000, "내용은 5000자 이내로 입력해 주세요."),

  // 브랜드 게시판/중고거래 게시판에서만 의미 있음 (그 외 게시판은 null/undefined)
  brand: z
    .string()
    .max(100, "브랜드명은 100자 이내로 입력해 주세요.")
    .optional()
    .nullable(),

  // 자유 게시판 카테고리 (제목 머릿말 용)
  // - 폼에서 아직 값을 안 보내도 기본값 'general' 로 처리
  category: z.enum(COMMUNITY_CATEGORIES).optional().default("general"),

  // 첨부 이미지 URL 리스트 (Supabase 업로더와 호환)
  images: z.array(z.string()).max(10).optional(),

  // 첨부 파일 호환
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        size: z.number().optional(),
      }),
    )
    .optional(),

  // market 전용 메타(상세 스펙)는 런타임에서 normalizeMarketMeta로 정규화/검증
  marketMeta: z.any().optional(),
});

function findFirstInvalidAssetUrl(input: {
  images?: string[];
  attachments?: Array<{ url: string }>;
}) {
  // 1) 이미지 URL 배열 검증: 프론트 업로더가 보내는 순서를 유지한 채 첫 실패 지점을 반환
  if (Array.isArray(input.images)) {
    for (let i = 0; i < input.images.length; i += 1) {
      const validation = validateBoardAssetUrl(input.images[i]);
      if (!validation.ok) {
        return {
          path: ["images", i],
          reason: validation.reason,
          value: input.images[i],
        };
      }
    }
  }

  // 2) 첨부 URL 배열 검증: attachments[n].url 단위로 동일 정책 적용
  if (Array.isArray(input.attachments)) {
    for (let i = 0; i < input.attachments.length; i += 1) {
      const validation = validateBoardAssetUrl(input.attachments[i]?.url);
      if (!validation.ok) {
        return {
          path: ["attachments", i, "url"],
          reason: validation.reason,
          value: input.attachments[i]?.url,
        };
      }
    }
  }

  return null;
}

// 커뮤니티 게시글 리스트 조회
export async function GET(req: NextRequest) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const db = await getDb();
  const col = db.collection("community_posts");

  const {
    typeParam,
    brand,
    sort,
    page,
    limit,
    q,
    escapedQ,
    isQueryTooLong,
    authorObjectId,
    searchType,
    category,
    marketFilters,
  } = parseCommunityListQuery(req);

  if (isQueryTooLong) {
    return NextResponse.json(
      {
        ok: false,
        error: "query_too_long",
        message: `검색어는 최대 ${MAX_COMMUNITY_SEARCH_QUERY_LENGTH}자까지 입력할 수 있습니다.`,
      },
      { status: 400 },
    );
  }

  const filter = buildCommunityListMongoFilter({
    typeParam,
    brand,
    category,
    q,
    escapedQ,
    authorObjectId,
    searchType,
    marketFilters,
  });
  const sortOption = getCommunitySortOption(sort);

  const skip = (page - 1) * limit;

  const total = await col.countDocuments(filter);
  const docs = await col
    .find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .toArray();

  const communityDocs = docs as CommunityPostMongoDoc[];
  const userObjectIds = getValidCommunityUserObjectIds(
    communityDocs.map((doc) => doc.userId ?? null),
  );
  const users = userObjectIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: userObjectIds } },
          { projection: { name: 1, nickname: 1 } },
        )
        .toArray()
    : [];
  const userMap = new Map(
    users.map((user) => [
      String(user._id),
      user as { _id: ObjectId; name?: string; nickname?: string },
    ]),
  );

  const items: CommunityPostListItemDto[] = communityDocs.map((d) => {
    const userId = d.userId ? String(d.userId) : null;
    const user = userId ? userMap.get(userId) : undefined;
    const displayName = resolveCommunityDisplayName({
      userName: user?.name,
      userNickname: user?.nickname,
      authorName: d.authorName,
      nickname: d.nickname,
      authorEmail: d.authorEmail,
    });

    return {
      id: String(d._id),
      type: d.type,
      title: d.title,
      content: d.content,
      brand: d.brand ?? null,
      marketMeta: d.marketMeta ?? null,

      category: d.category ?? "general",
      images: Array.isArray(d.images) ? d.images : [],
      attachments: d.attachments ?? [],
      postNo: typeof d.postNo === "number" ? d.postNo : undefined,
      authorName: d.authorName,
      authorEmail: d.authorEmail,

      userId,
      nickname: displayName,
      status: d.status ?? "public",
      views: d.views ?? 0,
      likes: d.likes ?? 0,
      commentsCount: d.commentsCount ?? 0,
      createdAt:
        d.createdAt instanceof Date
          ? d.createdAt.toISOString()
          : String(d.createdAt),
      updatedAt:
        d.updatedAt instanceof Date
          ? d.updatedAt.toISOString()
          : d.updatedAt
            ? String(d.updatedAt)
            : undefined,
    };
  });

  // logInfo({
  //   msg: 'community:list',
  //   status: 200,
  //   durationMs: stop(),
  //   extra: { total, page, limit, sort, type: typeParam, brand },
  //   ...meta,
  // });

  const response: CommunityListResponseDto = {
    ok: true,
    version: API_VERSION,
    items,
    total,
    page,
    limit,
  };
  return NextResponse.json(response, {
    headers: {
      // 목록은 짧게 캐시 (필요 시 조정 가능)
      "Cache-Control":
        "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
      "CDN-Cache-Control":
        "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
      "Vercel-CDN-Cache-Control":
        "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}

// ------------------------------- POST --------------------------------------

/**
 * 커뮤니티 게시글 작성
 * - 현재 버전: 로그인한 회원만 작성 가능
 *   (추후 비회원/닉네임 기반 익명 작성 허용도 확장 가능)
 */
export async function POST(req: NextRequest) {
  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const stop = startTimer();
  const meta = reqMeta(req);

  const payload = await getAuthPayload();
  if (!payload) {
    // logInfo({
    //   msg: 'community:create:unauthorized',
    //   status: 401,
    //   durationMs: stop(),
    //   ...meta,
    // });
    return NextResponse.json(
      { ok: false, version: API_VERSION, error: "unauthorized" },
      { status: 401 },
    );
  }

  // 작성자 ID (추후 getAuthPayload 로직이 바뀌더라도 500으로 터지지 않도록 한 번 더 방어)
  const subStr = payload?.sub ? String(payload.sub) : "";
  if (!subStr || !ObjectId.isValid(subStr)) {
    return NextResponse.json(
      { ok: false, version: API_VERSION, error: "unauthorized" },
      { status: 401 },
    );
  }
  const userId = new ObjectId(subStr);

  // 깨진 JSON이면 throw → 500 방지
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, version: API_VERSION, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    logInfo({
      msg: "community:create:validation_failed",
      status: 400,
      durationMs: stop(),
      extra: { issues: parsed.error.issues },
      ...meta,
    });
    return NextResponse.json(
      {
        ok: false,
        version: API_VERSION,
        error: "validation_error",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const body = parsed.data;

  // 정책 결정: community API는 비허용 URL을 자동 제거하지 않고 요청 자체를 거부한다.
  // - 이유: 클라이언트가 어떤 URL이 차단됐는지 즉시 인지하고 수정할 수 있어야 함
  const invalidAsset = findFirstInvalidAssetUrl(body);
  if (invalidAsset) {
    return NextResponse.json(
      {
        ok: false,
        version: API_VERSION,
        error: "invalid_attachment_url",
        message:
          "허용되지 않은 첨부 URL입니다. HTTPS + 허용 호스트/경로 정책을 확인해 주세요.",
        details: [
          {
            path: invalidAsset.path,
            message: `허용되지 않은 URL(${invalidAsset.reason})`,
            value: invalidAsset.value,
          },
        ],
      },
      { status: 400 },
    );
  }

  const sanitizedContent = normalizeSanitizedContent(
    await sanitizeHtml(body.content),
  );
  const contentLengthValidation = validateSanitizedLength(sanitizedContent, {
    min: 1,
    max: 5000,
  });

  if (contentLengthValidation === "too_short") {
    return NextResponse.json(
      {
        ok: false,
        version: API_VERSION,
        error: "validation_error",
        details: [{ path: ["content"], message: "내용을 입력해 주세요." }],
      },
      { status: 400 },
    );
  }

  if (contentLengthValidation === "too_long") {
    return NextResponse.json(
      {
        ok: false,
        version: API_VERSION,
        error: "validation_error",
        details: [
          { path: ["content"], message: "내용은 5000자 이내로 입력해 주세요." },
        ],
      },
      { status: 400 },
    );
  }

  const db = await getDb();
  const col = db.collection("community_posts");

  type CounterDoc = { _id: string; seq: number };

  const countersCol = db.collection<CounterDoc>("counters");

  // 게시판 내 노출용 번호(postNo): 게시판별 연번
  // - free  : community_free
  // - market: community_market
  // - gear  : community_gear
  let postNo: number | undefined = undefined;

  const counterId =
    body.type === "free"
      ? "community_free"
      : body.type === "market"
        ? "community_market"
        : body.type === "gear"
          ? "community_gear"
          : null;

  if (counterId) {
    const counterDoc = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );

    const seq = counterDoc?.seq;
    postNo = typeof seq === "number" ? seq : 1;
  }
  // market 게시판: 라켓/스트링은 brand 필수, 일반장비는 brand 제거(null)
  if (body.type === "market") {
    const normalizedMarketMeta = normalizeMarketMeta(
      body.category ?? null,
      body.marketMeta,
    );
    const cat = body.category ?? null;
    const b = typeof body.brand === "string" ? body.brand.trim() : "";

    const needBrand = cat === "racket" || cat === "string";

    if (needBrand && !b) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation_error",
          details: [
            {
              path: ["brand"],
              message: "라켓/스트링 글은 브랜드를 필수로 선택해 주세요.",
            },
          ],
        },
        { status: 400 },
      );
    }

    // 일반장비면 저장 brand는 null로 정리
    if (!needBrand) {
      body.brand = null;
    } else {
      body.brand = b;
    }

    if (
      !normalizedMarketMeta ||
      !normalizedMarketMeta.price ||
      normalizedMarketMeta.price <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation_error",
          details: [
            {
              path: ["marketMeta", "price"],
              message: "판매가는 1원 이상이어야 합니다.",
            },
          ],
        },
        { status: 400 },
      );
    }
    if (
      body.category === "racket" &&
      !(normalizedMarketMeta.racketSpec?.modelName ?? "").trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation_error",
          details: [
            {
              path: ["marketMeta", "racketSpec", "modelName"],
              message: "라켓 모델명을 입력해 주세요.",
            },
          ],
        },
        { status: 400 },
      );
    }
    if (
      body.category === "string" &&
      !(normalizedMarketMeta.stringSpec?.modelName ?? "").trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation_error",
          details: [
            {
              path: ["marketMeta", "stringSpec", "modelName"],
              message: "스트링 모델명을 입력해 주세요.",
            },
          ],
        },
        { status: 400 },
      );
    }

    body.marketMeta = normalizedMarketMeta;
  }

  const userDoc = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { name: 1, nickname: 1 } });
  const displayName = resolveCommunityDisplayName({
    userName: userDoc?.name,
    userNickname: userDoc?.nickname,
    authorName: payload?.name,
    nickname: payload?.nickname,
    authorEmail: payload?.email,
  });
  const now = new Date();

  const doc: Omit<CommunityPostMongoDoc, "_id"> = {
    type: body.type,
    title: body.title,
    content: sanitizedContent,

    // 브랜드 게시판/중고거래 게시판이 아닐 때는 항상 null
    brand:
      body.type === "brand" || body.type === "market"
        ? (body.brand ?? null)
        : null,

    // 자유 게시판 카테고리 (제목 머릿말)
    category: body.category ?? "general",
    // market 게시판 전용 구조화 메타 (다른 게시판은 null)
    marketMeta: body.type === "market" ? (body.marketMeta ?? null) : null,

    // 첨부 이미지 URL 배열 (없으면 빈 배열)
    images:
      Array.isArray(body.images) && body.images.length > 0 ? body.images : [],

    // 첨부 파일
    attachments: body.attachments ?? [],

    // 게시판 내 노출용 번호 (자유 게시판만 사용)
    postNo,

    userId,
    authorName: displayName,
    authorEmail: payload?.email,
    nickname: displayName,

    status: "public" as const,
    views: 0,
    likes: 0,
    commentsCount: 0,

    createdAt: now,
    updatedAt: now,
  };

  const r = await col.insertOne(doc);

  // logInfo({
  //   msg: 'community:create:success',
  //   status: 201,
  //   durationMs: stop(),
  //   extra: { id: r.insertedId.toString(), type: body.type },
  //   ...meta,
  // });

  return NextResponse.json(
    { ok: true, version: API_VERSION, id: r.insertedId.toString() },
    { status: 201, headers: { "x-api-legacy": "community/posts" } },
  );
}
