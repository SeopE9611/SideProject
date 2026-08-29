import { isValidProgramSlug } from "./program.types";

export const ADMIN_PROGRAM_CATEGORY_MAX_LENGTH = 40;
export const ADMIN_PROGRAM_TITLE_MAX_LENGTH = 100;
export const ADMIN_PROGRAM_SLUG_MAX_LENGTH = 80;
export const ADMIN_PROGRAM_SUMMARY_MAX_LENGTH = 300;
export const ADMIN_PROGRAM_BODY_MAX_LENGTH = 10_000;
export const ADMIN_PROGRAM_BODY_MAX_PARAGRAPHS = 50;
export const ADMIN_PROGRAM_BODY_PARAGRAPH_MAX_LENGTH = 2_000;
export const ADMIN_PROGRAM_PURPOSE_MAX_LENGTH = 500;
export const ADMIN_PROGRAM_OPERATION_STATUS_MAX_LENGTH = 60;
export const ADMIN_PROGRAM_SORT_ORDER_MIN = 0;
export const ADMIN_PROGRAM_SORT_ORDER_MAX = 9999;

export type AdminProgramDraftInput = {
  category: string;
  slug: string;
  title: string;
  summary: string;
  purpose: string;
  body: string;
  operationStatusLabel: string;
  sortOrder: string | number;
  contentSafetyConfirmed: boolean;
};

export type AdminProgramDraftUpdateInput = AdminProgramDraftInput & {
  expectedUpdatedAt: unknown;
};

export type AdminProgramReviewRequestInput = {
  expectedUpdatedAt: unknown;
  reviewReadinessConfirmed: unknown;
};

export type AdminProgramPublishInput = {
  expectedUpdatedAt: unknown;
  publicationConfirmed: unknown;
};

export type ValidatedAdminProgramPublish = {
  expectedUpdatedAt: Date;
};

export type AdminProgramPublishFieldErrors = {
  publicationConfirmed?: string;
};

export type AdminProgramPublishValidationResult =
  | { ok: true; value: ValidatedAdminProgramPublish }
  | {
      ok: false;
      fieldErrors: AdminProgramPublishFieldErrors;
      formError?: "invalid_version";
    };

export const adminProgramPublicationActions = ["unpublish", "archive"] as const;

export type AdminProgramPublicationAction =
  (typeof adminProgramPublicationActions)[number];

export type AdminProgramPublicationStateInput = {
  expectedUpdatedAt: unknown;
  action: unknown;
  transitionConfirmed: unknown;
};

export type ValidatedAdminProgramPublicationState = {
  expectedUpdatedAt: Date;
  action: AdminProgramPublicationAction;
};

export type AdminProgramPublicationStateFieldErrors = {
  action?: string;
  transitionConfirmed?: string;
};

export type AdminProgramPublicationStateValidationResult =
  | { ok: true; value: ValidatedAdminProgramPublicationState }
  | {
      ok: false;
      fieldErrors: AdminProgramPublicationStateFieldErrors;
      formError?: "invalid_version";
    };

export const adminProgramReviewDecisions = ["approve", "reject"] as const;

export type AdminProgramReviewDecision =
  (typeof adminProgramReviewDecisions)[number];

export type AdminProgramReviewDecisionInput = {
  expectedUpdatedAt: unknown;
  decision: unknown;
  decisionConfirmed: unknown;
};

export type ValidatedAdminProgramReviewDecision = {
  expectedUpdatedAt: Date;
  decision: AdminProgramReviewDecision;
};

export type AdminProgramReviewDecisionFieldErrors = {
  decision?: string;
  decisionConfirmed?: string;
};

export type AdminProgramReviewDecisionValidationResult =
  | { ok: true; value: ValidatedAdminProgramReviewDecision }
  | {
      ok: false;
      fieldErrors: AdminProgramReviewDecisionFieldErrors;
      formError?: "invalid_version";
    };

export type ValidatedAdminProgramDraft = {
  category: string;
  slug: string;
  title: string;
  summary: string;
  purpose: string;
  body: readonly string[];
  operationStatusLabel: string | null;
  sortOrder: number;
};

export type AdminProgramDraftField =
  | "category"
  | "slug"
  | "title"
  | "summary"
  | "purpose"
  | "body"
  | "operationStatusLabel"
  | "sortOrder"
  | "contentSafetyConfirmed";

export type AdminProgramDraftFieldErrors = Partial<
  Record<AdminProgramDraftField, string>
>;

export type AdminProgramDraftValidationResult =
  | { ok: true; value: ValidatedAdminProgramDraft }
  | { ok: false; fieldErrors: AdminProgramDraftFieldErrors };

export type ValidatedAdminProgramDraftUpdate = {
  draft: ValidatedAdminProgramDraft;
  expectedUpdatedAt: Date;
};

export type AdminProgramDraftUpdateValidationResult =
  | { ok: true; value: ValidatedAdminProgramDraftUpdate }
  | {
      ok: false;
      fieldErrors: AdminProgramDraftFieldErrors;
      formError?: "invalid_version";
    };

export type ValidatedAdminProgramReviewRequest = {
  expectedUpdatedAt: Date;
};

export type AdminProgramReviewRequestFieldErrors = {
  reviewReadinessConfirmed?: string;
};

export type AdminProgramReviewRequestValidationResult =
  | { ok: true; value: ValidatedAdminProgramReviewRequest }
  | {
      ok: false;
      fieldErrors: AdminProgramReviewRequestFieldErrors;
      formError?: "invalid_version";
    };

function parseCanonicalIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
    ? date
    : null;
}

export function isAdminProgramReviewDecision(
  value: unknown,
): value is AdminProgramReviewDecision {
  return (
    typeof value === "string" &&
    adminProgramReviewDecisions.includes(value as AdminProgramReviewDecision)
  );
}

export function isAdminProgramPublicationAction(
  value: unknown,
): value is AdminProgramPublicationAction {
  return (
    typeof value === "string" &&
    adminProgramPublicationActions.includes(value as AdminProgramPublicationAction)
  );
}

export function validateAdminProgramPublicationStateInput(
  input: unknown,
): AdminProgramPublicationStateValidationResult {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminProgramPublicationStateFieldErrors = {};

  if (!isAdminProgramPublicationAction(value.action)) {
    fieldErrors.action = "게시 상태 변경 방법을 선택해 주세요.";
  }
  if (value.transitionConfirmed !== true) {
    fieldErrors.transitionConfirmed =
      "선택한 상태 변경과 공개 종료 결과를 확인해 주세요.";
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
      action: value.action as AdminProgramPublicationAction,
    },
  };
}

export function validateAdminProgramDraftInput(input: unknown): AdminProgramDraftValidationResult {
  const value = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const fieldErrors: AdminProgramDraftFieldErrors = {};
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim().toLowerCase() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const purpose = typeof value.purpose === "string" ? value.purpose.trim() : "";
  const operationStatusLabel = typeof value.operationStatusLabel === "string" ? value.operationStatusLabel.trim() : "";
  const normalizedBody = typeof value.body === "string" ? value.body.replace(/\r\n?/g, "\n").trim() : "";
  const body = normalizedBody ? normalizedBody.split(/\n[\t ]*\n+/).map(p => p.trim()).filter(Boolean) : [];
  const rawSortOrder = typeof value.sortOrder === "string" && value.sortOrder.trim() !== "" ? Number(value.sortOrder) : value.sortOrder;
  const sortOrder = typeof rawSortOrder === "number" ? rawSortOrder : Number.NaN;
  if (!category) fieldErrors.category = "분류를 입력해 주세요."; else if (category.length > ADMIN_PROGRAM_CATEGORY_MAX_LENGTH) fieldErrors.category = "분류는 40자 이하로 입력해 주세요.";
  if (!slug) fieldErrors.slug = "슬러그를 입력해 주세요."; else if (slug.length > ADMIN_PROGRAM_SLUG_MAX_LENGTH) fieldErrors.slug = "슬러그는 80자 이하여야 합니다."; else if (!isValidProgramSlug(slug)) fieldErrors.slug = "슬러그는 영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.";
  if (!title) fieldErrors.title = "제목을 입력해 주세요."; else if (title.length > ADMIN_PROGRAM_TITLE_MAX_LENGTH) fieldErrors.title = "제목은 100자 이하여야 합니다.";
  if (!summary) fieldErrors.summary = "요약을 입력해 주세요."; else if (summary.length > ADMIN_PROGRAM_SUMMARY_MAX_LENGTH) fieldErrors.summary = "요약은 300자 이하여야 합니다.";
  if (!purpose) fieldErrors.purpose = "프로그램 목적을 입력해 주세요."; else if (purpose.length > ADMIN_PROGRAM_PURPOSE_MAX_LENGTH) fieldErrors.purpose = "프로그램 목적은 500자 이하여야 합니다.";
  if (!normalizedBody) fieldErrors.body = "본문을 입력해 주세요."; else if (normalizedBody.length > ADMIN_PROGRAM_BODY_MAX_LENGTH) fieldErrors.body = "본문은 10,000자 이하여야 합니다."; else if (body.length > ADMIN_PROGRAM_BODY_MAX_PARAGRAPHS) fieldErrors.body = "본문은 최대 50개 문단까지 작성할 수 있습니다."; else if (body.some(p => p.length > ADMIN_PROGRAM_BODY_PARAGRAPH_MAX_LENGTH)) fieldErrors.body = "본문의 각 문단은 2,000자 이하여야 합니다.";
  if (operationStatusLabel.length > ADMIN_PROGRAM_OPERATION_STATUS_MAX_LENGTH) fieldErrors.operationStatusLabel = "운영 상태 문구는 60자 이하로 입력해 주세요.";
  if (!Number.isInteger(sortOrder) || sortOrder < ADMIN_PROGRAM_SORT_ORDER_MIN || sortOrder > ADMIN_PROGRAM_SORT_ORDER_MAX) fieldErrors.sortOrder = "정렬 순서는 0 이상 9999 이하의 정수여야 합니다.";
  if (value.contentSafetyConfirmed !== true) fieldErrors.contentSafetyConfirmed = "개인정보와 공개 금지 정보가 포함되지 않았는지 확인해 주세요.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, value: { category, slug, title, summary, purpose, body, operationStatusLabel: operationStatusLabel || null, sortOrder } };
}

export function validateAdminProgramDraftUpdateInput(
  input: unknown,
): AdminProgramDraftUpdateValidationResult {
  const draftValidation = validateAdminProgramDraftInput(input);
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
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

export function validateAdminProgramReviewRequestInput(
  input: unknown,
): AdminProgramReviewRequestValidationResult {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminProgramReviewRequestFieldErrors = {};

  if (value.reviewReadinessConfirmed !== true) {
    fieldErrors.reviewReadinessConfirmed =
      "프로그램 내용과 개인정보·공개 금지 정보 확인을 완료해 주세요.";
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

export function validateAdminProgramReviewDecisionInput(
  input: unknown,
): AdminProgramReviewDecisionValidationResult {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminProgramReviewDecisionFieldErrors = {};

  if (!isAdminProgramReviewDecision(value.decision)) {
    fieldErrors.decision = "검토 결과를 선택해 주세요.";
  }
  if (value.decisionConfirmed !== true) {
    fieldErrors.decisionConfirmed =
      "선택한 검토 결과와 이후 상태 변화를 확인해 주세요.";
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
      decision: value.decision as AdminProgramReviewDecision,
    },
  };
}

export function validateAdminProgramPublishInput(
  input: unknown,
): AdminProgramPublishValidationResult {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expectedUpdatedAt = parseCanonicalIsoDate(value.expectedUpdatedAt);
  const fieldErrors: AdminProgramPublishFieldErrors = {};

  if (value.publicationConfirmed !== true) {
    fieldErrors.publicationConfirmed =
      "게시 즉시 홈페이지에 공개된다는 점과 개인정보·공개 범위 확인을 완료해 주세요.";
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
