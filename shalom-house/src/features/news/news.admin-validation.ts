import {
  isNewsCategory,
  isValidNewsSlug,
  type NewsCategory,
} from "./news.types";

export const ADMIN_NEWS_TITLE_MAX_LENGTH = 100;
export const ADMIN_NEWS_SLUG_MAX_LENGTH = 80;
export const ADMIN_NEWS_SUMMARY_MAX_LENGTH = 300;
export const ADMIN_NEWS_BODY_MAX_LENGTH = 10_000;
export const ADMIN_NEWS_BODY_MAX_PARAGRAPHS = 50;
export const ADMIN_NEWS_BODY_PARAGRAPH_MAX_LENGTH = 2_000;

export type AdminNewsDraftInput = {
  category: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  contentSafetyConfirmed: boolean;
};

export type AdminNewsDraftUpdateInput = AdminNewsDraftInput & {
  expectedUpdatedAt: unknown;
};

export type ValidatedAdminNewsDraft = {
  category: NewsCategory;
  slug: string;
  title: string;
  summary: string;
  body: readonly string[];
};

export type AdminNewsDraftField =
  | "category"
  | "slug"
  | "title"
  | "summary"
  | "body"
  | "contentSafetyConfirmed";

export type AdminNewsDraftFieldErrors = Partial<
  Record<AdminNewsDraftField, string>
>;

export type AdminNewsDraftValidationResult =
  | { ok: true; value: ValidatedAdminNewsDraft }
  | { ok: false; fieldErrors: AdminNewsDraftFieldErrors };

export type ValidatedAdminNewsDraftUpdate = {
  draft: ValidatedAdminNewsDraft;
  expectedUpdatedAt: Date;
};

export type AdminNewsDraftUpdateValidationResult =
  | { ok: true; value: ValidatedAdminNewsDraftUpdate }
  | {
      ok: false;
      fieldErrors: AdminNewsDraftFieldErrors;
      formError?: "invalid_version";
    };

export function validateAdminNewsDraftInput(
  input: unknown,
): AdminNewsDraftValidationResult {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const fieldErrors: AdminNewsDraftFieldErrors = {};

  if (!isNewsCategory(value.category)) {
    fieldErrors.category = "소식 분류를 선택해 주세요.";
  }

  const slug = typeof value.slug === "string" ? value.slug.trim().toLowerCase() : "";
  if (!slug) {
    fieldErrors.slug = "슬러그를 입력해 주세요.";
  } else if (slug.length > ADMIN_NEWS_SLUG_MAX_LENGTH) {
    fieldErrors.slug = "슬러그는 80자 이하여야 합니다.";
  } else if (!isValidNewsSlug(slug)) {
    fieldErrors.slug = "슬러그는 영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.";
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) {
    fieldErrors.title = "제목을 입력해 주세요.";
  } else if (title.length > ADMIN_NEWS_TITLE_MAX_LENGTH) {
    fieldErrors.title = "제목은 100자 이하여야 합니다.";
  }

  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  if (!summary) {
    fieldErrors.summary = "요약을 입력해 주세요.";
  } else if (summary.length > ADMIN_NEWS_SUMMARY_MAX_LENGTH) {
    fieldErrors.summary = "요약은 300자 이하여야 합니다.";
  }

  const normalizedBody =
    typeof value.body === "string"
      ? value.body.replace(/\r\n?/g, "\n").trim()
      : "";
  const body = normalizedBody
    ? normalizedBody
        .split(/\n[\t ]*\n+/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)
    : [];
  if (!normalizedBody) {
    fieldErrors.body = "본문을 입력해 주세요.";
  } else if (normalizedBody.length > ADMIN_NEWS_BODY_MAX_LENGTH) {
    fieldErrors.body = "본문은 10,000자 이하여야 합니다.";
  } else if (body.length > ADMIN_NEWS_BODY_MAX_PARAGRAPHS) {
    fieldErrors.body = "본문은 최대 50개 문단까지 작성할 수 있습니다.";
  } else if (
    body.some(
      (paragraph) => paragraph.length > ADMIN_NEWS_BODY_PARAGRAPH_MAX_LENGTH,
    )
  ) {
    fieldErrors.body = "본문의 각 문단은 2,000자 이하여야 합니다.";
  }

  if (value.contentSafetyConfirmed !== true) {
    fieldErrors.contentSafetyConfirmed =
      "개인정보와 공개 금지 정보가 포함되지 않았는지 확인해 주세요.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      category: value.category as NewsCategory,
      slug,
      title,
      summary,
      body,
    },
  };
}

export function validateAdminNewsDraftUpdateInput(
  input: unknown,
): AdminNewsDraftUpdateValidationResult {
  const draftValidation = validateAdminNewsDraftInput(input);
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expectedUpdatedAtValue = value.expectedUpdatedAt;
  const expectedUpdatedAt =
    typeof expectedUpdatedAtValue === "string"
      ? new Date(expectedUpdatedAtValue)
      : null;
  const hasValidVersion =
    expectedUpdatedAt !== null &&
    !Number.isNaN(expectedUpdatedAt.getTime()) &&
    expectedUpdatedAt.toISOString() === expectedUpdatedAtValue;

  if (!draftValidation.ok || !hasValidVersion) {
    return {
      ok: false,
      fieldErrors: draftValidation.ok ? {} : draftValidation.fieldErrors,
      ...(!hasValidVersion ? { formError: "invalid_version" as const } : {}),
    };
  }

  return {
    ok: true,
    value: { draft: draftValidation.value, expectedUpdatedAt },
  };
}
