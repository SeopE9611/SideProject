import "server-only";
import { createHash } from "node:crypto";
import {
  isTransparencyCategory,
  isTransparencyFinalDocumentStatus,
  isTransparencyPrivacyReviewStatus,
  type TransparencyCategory,
  type TransparencyFinalDocumentStatus,
  type TransparencyPrivacyReviewStatus,
} from "./transparency.types";
export const ADMIN_TRANSPARENCY_PDF_MAX_BYTES = 3 * 1024 * 1024;
export const ADMIN_TRANSPARENCY_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
export type ValidatedAdminTransparencyDraft = {
  slug: string;
  title: string;
  category: TransparencyCategory;
  periodLabel: string;
  summary: string;
  documentDate: string;
  privacyReviewStatus: TransparencyPrivacyReviewStatus;
  finalDocumentStatus: TransparencyFinalDocumentStatus;
};
export type AdminTransparencyFieldErrors = Partial<Record<keyof ValidatedAdminTransparencyDraft | "document", string>>;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
export function isCanonicalTransparencyDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeAdminTransparencyOriginalFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .replaceAll("\\", "/")
    .split("/")
    .at(-1)
    ?.replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 120)
    .trim();
  return name || null;
}
export function validateAdminTransparencyDraftInput(input: unknown) {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const draft = {
    slug: text(value.slug).toLowerCase(),
    title: text(value.title),
    category: value.category,
    periodLabel: text(value.periodLabel),
    summary: text(value.summary),
    documentDate: text(value.documentDate),
    privacyReviewStatus: value.privacyReviewStatus,
    finalDocumentStatus: value.finalDocumentStatus,
  };
  const errors: AdminTransparencyFieldErrors = {};
  if (!draft.slug || draft.slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug))
    errors.slug = "영문 소문자, 숫자와 하이픈만 사용해 80자 이하로 입력해 주세요.";
  if (!draft.title || draft.title.length > 140) errors.title = "제목을 1자 이상 140자 이하로 입력해 주세요.";
  if (!isTransparencyCategory(draft.category)) errors.category = "분류를 선택해 주세요.";
  if (!draft.periodLabel || draft.periodLabel.length > 80)
    errors.periodLabel = "기준 기간을 1자 이상 80자 이하로 입력해 주세요.";
  if (draft.summary.length > 500) errors.summary = "요약을 500자 이하로 입력해 주세요.";
  if (!isCanonicalTransparencyDate(draft.documentDate)) errors.documentDate = "올바른 문서일을 입력해 주세요.";
  if (!isTransparencyPrivacyReviewStatus(draft.privacyReviewStatus))
    errors.privacyReviewStatus = "개인정보 검토 상태를 선택해 주세요.";
  if (!isTransparencyFinalDocumentStatus(draft.finalDocumentStatus))
    errors.finalDocumentStatus = "최종본 상태를 선택해 주세요.";
  if (Object.keys(errors).length) return { ok: false as const, fieldErrors: errors };
  return { ok: true as const, value: draft as ValidatedAdminTransparencyDraft };
}
export function validateAdminTransparencyDraftUpdateInput(input: unknown) {
  const result = validateAdminTransparencyDraftInput(input);
  const raw = input as Record<string, unknown>;
  const expected = typeof raw?.expectedUpdatedAt === "string" ? new Date(raw.expectedUpdatedAt) : null;
  const valid = expected && !Number.isNaN(expected.getTime()) && expected.toISOString() === raw.expectedUpdatedAt;
  return result.ok && valid
    ? {
        ok: true as const,
        value: { draft: result.value, expectedUpdatedAt: expected },
      }
    : {
        ok: false as const,
        fieldErrors: result.ok ? {} : result.fieldErrors,
        formError: valid ? undefined : "invalid_version",
      };
}
export function validateAdminTransparencyArchiveInput(input: unknown) {
  const raw = input as Record<string, unknown>;
  const expected = typeof raw?.expectedUpdatedAt === "string" ? new Date(raw.expectedUpdatedAt) : null;
  return expected &&
    !Number.isNaN(expected.getTime()) &&
    expected.toISOString() === raw.expectedUpdatedAt &&
    raw.archiveConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt: expected } }
    : { ok: false as const };
}
function transitionVersion(input: unknown): {
  raw: Record<string, unknown>;
  expectedUpdatedAt: Date | null;
} {
  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = typeof raw.expectedUpdatedAt === "string" ? new Date(raw.expectedUpdatedAt) : null;
  return {
    raw,
    expectedUpdatedAt:
      expectedUpdatedAt &&
      !Number.isNaN(expectedUpdatedAt.getTime()) &&
      expectedUpdatedAt.toISOString() === raw.expectedUpdatedAt
        ? expectedUpdatedAt
        : null,
  };
}
export function validateAdminTransparencyReviewInput(input: unknown) {
  const { raw, expectedUpdatedAt } = transitionVersion(input);
  return expectedUpdatedAt && raw.reviewConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt } }
    : { ok: false as const };
}
export function validateAdminTransparencyDecisionInput(input: unknown) {
  const { raw, expectedUpdatedAt } = transitionVersion(input);
  return expectedUpdatedAt && (raw.decision === "approve" || raw.decision === "reject")
    ? {
        ok: true as const,
        value: {
          expectedUpdatedAt,
          decision: raw.decision as "approve" | "reject",
        },
      }
    : { ok: false as const };
}
export function validateAdminTransparencyPublishInput(input: unknown) {
  const { raw, expectedUpdatedAt } = transitionVersion(input);
  return expectedUpdatedAt && raw.publishConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt } }
    : { ok: false as const };
}
export function validateAdminTransparencyPublicationInput(input: unknown) {
  const { raw, expectedUpdatedAt } = transitionVersion(input);
  return expectedUpdatedAt && raw.action === "unpublish"
    ? {
        ok: true as const,
        value: { expectedUpdatedAt, action: "unpublish" as const },
      }
    : { ok: false as const };
}
export async function validateAdminTransparencyPdf(file: File) {
  if (!(file instanceof File)) return { ok: false as const, error: "PDF 파일을 선택해 주세요." };
  if (file.size < 1 || file.size > ADMIN_TRANSPARENCY_PDF_MAX_BYTES)
    return {
      ok: false as const,
      error: "PDF는 1 byte 이상 3MB 이하여야 합니다.",
    };
  if (file.type !== "application/pdf")
    return {
      ok: false as const,
      error: "application/pdf 형식만 업로드할 수 있습니다.",
    };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-")
    return { ok: false as const, error: "올바른 PDF 파일이 아닙니다." };
  return {
    ok: true as const,
    value: {
      buffer,
      byteSize: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    },
  };
}
