import { isNewsCategory, isPublicNewsReservedSlug, isValidNewsSlug, type NewsCategory } from "./news.types";

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

export type AdminNewsReviewRequestInput = {
  expectedUpdatedAt: unknown;
  reviewReadinessConfirmed: unknown;
};

export type AdminNewsDirectPublishInput = {
  expectedUpdatedAt: unknown;
  publishConfirmed: unknown;
};

export type AdminNewsDirectPublishFieldErrors = {
  expectedUpdatedAt?: string;
  publishConfirmed?: string;
};

export type AdminNewsDirectPublishValidationResult =
  { ok: true; value: { expectedUpdatedAt: Date } } | { ok: false; fieldErrors: AdminNewsDirectPublishFieldErrors };

export type AdminNewsPublishInput = {
  expectedUpdatedAt: unknown;
  publicationConfirmed: unknown;
};

export type ValidatedAdminNewsPublish = {
  expectedUpdatedAt: Date;
};

export type AdminNewsPublishFieldErrors = {
  publicationConfirmed?: string;
};

export type AdminNewsPublishValidationResult =
  | { ok: true; value: ValidatedAdminNewsPublish }
  | {
      ok: false;
      fieldErrors: AdminNewsPublishFieldErrors;
      formError?: "invalid_version";
    };

export const adminNewsPublicationActions = ["unpublish", "archive"] as const;

export type AdminNewsPublicationAction = (typeof adminNewsPublicationActions)[number];

export type AdminNewsPublicationStateInput = {
  expectedUpdatedAt: unknown;
  action: unknown;
  transitionConfirmed: unknown;
};

export type ValidatedAdminNewsPublicationState = {
  expectedUpdatedAt: Date;
  action: AdminNewsPublicationAction;
};

export type AdminNewsPublicationStateFieldErrors = {
  action?: string;
  transitionConfirmed?: string;
};

export type AdminNewsPublicationStateValidationResult =
  | { ok: true; value: ValidatedAdminNewsPublicationState }
  | {
      ok: false;
      fieldErrors: AdminNewsPublicationStateFieldErrors;
      formError?: "invalid_version";
    };

export const adminNewsReviewDecisions = ["approve", "reject"] as const;

export type AdminNewsReviewDecision = (typeof adminNewsReviewDecisions)[number];

export type AdminNewsReviewDecisionInput = {
  expectedUpdatedAt: unknown;
  decision: unknown;
  decisionConfirmed: unknown;
};

export type ValidatedAdminNewsReviewDecision = {
  expectedUpdatedAt: Date;
  decision: AdminNewsReviewDecision;
};

export type AdminNewsReviewDecisionFieldErrors = {
  decision?: string;
  decisionConfirmed?: string;
};

export type AdminNewsReviewDecisionValidationResult =
  | { ok: true; value: ValidatedAdminNewsReviewDecision }
  | {
      ok: false;
      fieldErrors: AdminNewsReviewDecisionFieldErrors;
      formError?: "invalid_version";
    };

export type ValidatedAdminNewsDraft = {
  category: NewsCategory;
  slug: string;
  title: string;
  summary: string;
  body: readonly string[];
};

export type AdminNewsDraftField = "category" | "slug" | "title" | "summary" | "body" | "contentSafetyConfirmed";

export type AdminNewsDraftFieldErrors = Partial<Record<AdminNewsDraftField, string>>;

export type AdminNewsDraftValidationResult =
  { ok: true; value: ValidatedAdminNewsDraft } | { ok: false; fieldErrors: AdminNewsDraftFieldErrors };

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

export type ValidatedAdminNewsReviewRequest = {
  expectedUpdatedAt: Date;
};

export type AdminNewsReviewRequestFieldErrors = {
  reviewReadinessConfirmed?: string;
};

export type AdminNewsReviewRequestValidationResult =
  | { ok: true; value: ValidatedAdminNewsReviewRequest }
  | {
      ok: false;
      fieldErrors: AdminNewsReviewRequestFieldErrors;
      formError?: "invalid_version";
    };

function parseCanonicalIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value ? date : null;
}

export function isAdminNewsReviewDecision(value: unknown): value is AdminNewsReviewDecision {
  return typeof value === "string" && adminNewsReviewDecisions.includes(value as AdminNewsReviewDecision);
}

export function isAdminNewsPublicationAction(value: unknown): value is AdminNewsPublicationAction {
  return typeof value === "string" && adminNewsPublicationActions.includes(value as AdminNewsPublicationAction);
}

export function validateAdminNewsPublicationStateInput(input: unknown): AdminNewsPublicationStateValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminNewsPublicationStateFieldErrors = {};

  if (!isAdminNewsPublicationAction(value.action)) {
    fieldErrors.action = "게시 상태 변경 방법을 선택해 주세요.";
  }
  if (value.transitionConfirmed !== true) {
    fieldErrors.transitionConfirmed = "선택한 상태 변경과 공개 종료 결과를 확인해 주세요.";
  }

  if (!expectedUpdatedAt || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      ...(!expectedUpdatedAt ? { formError: "invalid_version" as const } : {}),
    };
  }

  return {
    ok: true,
    value: {
      expectedUpdatedAt,
      action: value.action as AdminNewsPublicationAction,
    },
  };
}

export function createAdminNewsSummary(body: readonly string[]): string {
  const text = body.join(" ").replace(/\s+/gu, " ").trim();
  // 코드 포인트 단위로 잘라 서로게이트 쌍과 기존 300자(UTF-16) 제한을 보존합니다.
  return Array.from(text).slice(0, 150).join("");
}

// automaticFields는 서버가 확인한 admin 역할과 해당 작성 UI에서만 사용합니다.
// 자동 입력 모드의 빈 slug는 저장소에서 신규 ID 또는 기존 문서 값으로 확정합니다.
export function validateAdminNewsDraftInput(input: unknown, automaticFields = false): AdminNewsDraftValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const fieldErrors: AdminNewsDraftFieldErrors = {};

  if (!isNewsCategory(value.category)) {
    fieldErrors.category = "소식 분류를 선택해 주세요.";
  }

  const slug = !automaticFields && typeof value.slug === "string" ? value.slug.trim().toLowerCase() : "";
  if (!automaticFields && !slug) {
    fieldErrors.slug = "슬러그를 입력해 주세요.";
  } else if (slug.length > ADMIN_NEWS_SLUG_MAX_LENGTH) {
    fieldErrors.slug = "슬러그는 80자 이하여야 합니다.";
  } else if (!automaticFields && !isValidNewsSlug(slug)) {
    fieldErrors.slug = "슬러그는 영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.";
  } else if (isPublicNewsReservedSlug(slug)) {
    fieldErrors.slug = "이 주소는 소식 분류 페이지에서 사용 중입니다. 다른 슬러그를 입력해 주세요.";
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) {
    fieldErrors.title = "제목을 입력해 주세요.";
  } else if (title.length > ADMIN_NEWS_TITLE_MAX_LENGTH) {
    fieldErrors.title = "제목은 100자 이하여야 합니다.";
  }

  const summary = !automaticFields && typeof value.summary === "string" ? value.summary.trim() : "";
  if (!automaticFields && !summary) {
    fieldErrors.summary = "요약을 입력해 주세요.";
  } else if (summary.length > ADMIN_NEWS_SUMMARY_MAX_LENGTH) {
    fieldErrors.summary = "요약은 300자 이하여야 합니다.";
  }

  const normalizedBody = typeof value.body === "string" ? value.body.replace(/\r\n?/g, "\n").trim() : "";
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
  } else if (body.some((paragraph) => paragraph.length > ADMIN_NEWS_BODY_PARAGRAPH_MAX_LENGTH)) {
    fieldErrors.body = "본문의 각 문단은 2,000자 이하여야 합니다.";
  }

  if (value.contentSafetyConfirmed !== true) {
    fieldErrors.contentSafetyConfirmed = "개인정보와 공개 금지 정보가 포함되지 않았는지 확인해 주세요.";
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
      summary: automaticFields ? createAdminNewsSummary(body) : summary,
      body,
    },
  };
}

export function validateAdminNewsDraftUpdateInput(input: unknown, automaticFields = false): AdminNewsDraftUpdateValidationResult {
  const draftValidation = validateAdminNewsDraftInput(input, automaticFields);
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const hasValidVersion = expectedUpdatedAt !== null;

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

export function validateAdminNewsReviewRequestInput(input: unknown): AdminNewsReviewRequestValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminNewsReviewRequestFieldErrors = {};

  if (value.reviewReadinessConfirmed !== true) {
    fieldErrors.reviewReadinessConfirmed = "게시물 내용과 개인정보·공개 금지 정보 확인을 완료해 주세요.";
  }

  if (!expectedUpdatedAt || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      ...(!expectedUpdatedAt ? { formError: "invalid_version" as const } : {}),
    };
  }

  return { ok: true, value: { expectedUpdatedAt } };
}

export function validateAdminNewsReviewDecisionInput(input: unknown): AdminNewsReviewDecisionValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminNewsReviewDecisionFieldErrors = {};

  if (!isAdminNewsReviewDecision(value.decision)) {
    fieldErrors.decision = "검토 결과를 선택해 주세요.";
  }
  if (value.decisionConfirmed !== true) {
    fieldErrors.decisionConfirmed = "선택한 검토 결과와 이후 상태 변화를 확인해 주세요.";
  }

  if (!expectedUpdatedAt || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      ...(!expectedUpdatedAt ? { formError: "invalid_version" as const } : {}),
    };
  }

  return {
    ok: true,
    value: {
      expectedUpdatedAt,
      decision: value.decision as AdminNewsReviewDecision,
    },
  };
}

export function validateAdminNewsPublishInput(input: unknown): AdminNewsPublishValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminNewsPublishFieldErrors = {};

  if (value.publicationConfirmed !== true) {
    fieldErrors.publicationConfirmed = "게시 즉시 홈페이지에 공개된다는 점과 개인정보·공개 범위 확인을 완료해 주세요.";
  }

  if (!expectedUpdatedAt || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      ...(!expectedUpdatedAt ? { formError: "invalid_version" as const } : {}),
    };
  }

  return { ok: true, value: { expectedUpdatedAt } };
}

export function validateAdminNewsDirectPublishInput(input: unknown): AdminNewsDirectPublishValidationResult {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminNewsDirectPublishFieldErrors = {};
  if (!expectedUpdatedAt) fieldErrors.expectedUpdatedAt = "게시 기준 시각을 확인할 수 없습니다.";
  if (value.publishConfirmed !== true) {
    fieldErrors.publishConfirmed = "현재 내용과 공개 가능 여부를 확인해 주세요.";
  }
  if (!expectedUpdatedAt || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { expectedUpdatedAt } };
}
