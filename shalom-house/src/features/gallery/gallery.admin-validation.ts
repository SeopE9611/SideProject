import "server-only";
import { createHash } from "node:crypto";
import {
  isGalleryConsentStatus,
  isGallerySubjectPresence,
  isValidGallerySlug,
  type GalleryConsentStatus,
  type GallerySubjectPresence,
} from "./gallery.types";

export const ADMIN_GALLERY_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const ADMIN_GALLERY_IMAGE_MAX_DIMENSION = 4096;
export const ADMIN_GALLERY_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
export const ADMIN_GALLERY_SLUG_MAX_LENGTH = 80;
export const ADMIN_GALLERY_TITLE_MAX_LENGTH = 100;
export const ADMIN_GALLERY_CATEGORY_MAX_LENGTH = 40;
export const ADMIN_GALLERY_DESCRIPTION_MAX_LENGTH = 500;
export const ADMIN_GALLERY_ALT_TEXT_MAX_LENGTH = 300;
export const ADMIN_GALLERY_CONSENT_REFERENCE_MAX_LENGTH = 80;
export const ADMIN_GALLERY_ORIGINAL_FILE_NAME_MAX_LENGTH = 120;
export type ValidatedAdminGalleryDraft = {
  slug: string;
  title: string;
  category: string;
  description: string;
  altText: string;
  activityDate: string;
  subjectPresence: GallerySubjectPresence;
  consentStatus: GalleryConsentStatus;
  consentCheckedOn: string | null;
  consentReferenceCode: string | null;
  displayStartOn: string | null;
  displayEndOn: string | null;
};
export type AdminGalleryFieldErrors = Partial<
  Record<
    keyof ValidatedAdminGalleryDraft | "contentSafetyConfirmed" | "image",
    string
  >
>;
function isCanonicalCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function normalizeAdminGalleryOriginalFileName(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const fileName = value
    .replaceAll("\\", "/")
    .split("/")
    .at(-1)
    ?.replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, ADMIN_GALLERY_ORIGINAL_FILE_NAME_MAX_LENGTH)
    .trim();

  return fileName || null;
}
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export function validateAdminGalleryDraftInput(
  input: unknown,
):
  | { ok: true; value: ValidatedAdminGalleryDraft }
  | { ok: false; fieldErrors: AdminGalleryFieldErrors } {
  const v =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const e: AdminGalleryFieldErrors = {};
  const slug = text(v.slug).toLowerCase(),
    title = text(v.title),
    category = text(v.category),
    description = text(v.description),
    altText = text(v.altText),
    activityDate = text(v.activityDate),
    subjectPresence = v.subjectPresence,
    consentStatus = v.consentStatus,
    checked = text(v.consentCheckedOn),
    reference = text(v.consentReferenceCode),
    start = text(v.displayStartOn),
    end = text(v.displayEndOn);
  if (!slug) e.slug = "슬러그를 입력해 주세요.";
  else if (
    slug.length > ADMIN_GALLERY_SLUG_MAX_LENGTH ||
    !isValidGallerySlug(slug)
  )
    e.slug = "영문 소문자, 숫자와 하이픈만 사용해 80자 이하로 입력해 주세요.";
  if (!title || title.length > ADMIN_GALLERY_TITLE_MAX_LENGTH)
    e.title = "제목을 1자 이상 100자 이하로 입력해 주세요.";
  if (!category || category.length > ADMIN_GALLERY_CATEGORY_MAX_LENGTH)
    e.category = "분류를 1자 이상 40자 이하로 입력해 주세요.";
  if (!description || description.length > ADMIN_GALLERY_DESCRIPTION_MAX_LENGTH)
    e.description = "설명을 1자 이상 500자 이하로 입력해 주세요.";
  if (!altText || altText.length > ADMIN_GALLERY_ALT_TEXT_MAX_LENGTH)
    e.altText = "대체 텍스트를 1자 이상 300자 이하로 입력해 주세요.";
  if (!isCanonicalCalendarDate(activityDate))
    e.activityDate = "올바른 활동일을 입력해 주세요.";
  if (!isGallerySubjectPresence(subjectPresence))
    e.subjectPresence = "사진 속 인물 상태를 선택해 주세요.";
  if (!isGalleryConsentStatus(consentStatus) || consentStatus === "withdrawn")
    e.consentStatus = "초안에서 선택할 수 있는 동의 상태를 선택해 주세요.";
  if (start && !isCanonicalCalendarDate(start))
    e.displayStartOn = "올바른 게시 시작일을 입력해 주세요.";
  if (end && !isCanonicalCalendarDate(end))
    e.displayEndOn = "올바른 게시 종료일을 입력해 주세요.";
  if (start && end && start > end)
    e.displayEndOn = "게시 종료일은 시작일 이후여야 합니다.";
  if (
    reference &&
    (reference.length > ADMIN_GALLERY_CONSENT_REFERENCE_MAX_LENGTH ||
      !/^[A-Za-z0-9_-]+$/.test(reference))
  )
    e.consentReferenceCode =
      "영문, 숫자, 하이픈과 밑줄만 사용해 80자 이하로 입력해 주세요.";
  if (subjectPresence === "identifiable" && consentStatus === "confirmed") {
    if (!isCanonicalCalendarDate(checked))
      e.consentCheckedOn = "동의 확인일을 입력해 주세요.";
    if (!reference) e.consentReferenceCode = "동의 참조 코드를 입력해 주세요.";
  } else if (checked || reference) {
    e.consentCheckedOn = "동의 확인 상태에서만 확인 정보가 필요합니다.";
    e.consentReferenceCode = "동의 확인 상태에서만 참조 코드를 입력해 주세요.";
  }
  if (
    (subjectPresence === "none" || subjectPresence === "non_identifiable") &&
    consentStatus !== "not_required"
  )
    e.consentStatus =
      "식별 가능한 인물이 없으면 별도 동의 불필요를 선택해 주세요.";
  if (
    subjectPresence === "identifiable" &&
    consentStatus !== "pending" &&
    consentStatus !== "confirmed"
  )
    e.consentStatus =
      "식별 가능한 인물은 동의 확인 중 또는 공개 동의 확인이어야 합니다.";
  if (v.contentSafetyConfirmed !== true)
    e.contentSafetyConfirmed = "사진과 입력 내용의 안전 기준을 확인해 주세요.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return {
    ok: true,
    value: {
      slug,
      title,
      category,
      description,
      altText,
      activityDate,
      subjectPresence: subjectPresence as GallerySubjectPresence,
      consentStatus: consentStatus as GalleryConsentStatus,
      consentCheckedOn: checked || null,
      consentReferenceCode: reference || null,
      displayStartOn: start || null,
      displayEndOn: end || null,
    },
  };
}
export function validateAdminGalleryDraftUpdateInput(input: unknown) {
  const result = validateAdminGalleryDraftInput(input);
  const v =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const expected =
    typeof v.expectedUpdatedAt === "string"
      ? new Date(v.expectedUpdatedAt)
      : null;
  const valid =
    expected &&
    !Number.isNaN(expected.getTime()) &&
    expected.toISOString() === v.expectedUpdatedAt;
  return result.ok && valid
    ? {
        ok: true as const,
        value: { draft: result.value, expectedUpdatedAt: expected },
      }
    : {
        ok: false as const,
        fieldErrors: result.ok ? {} : result.fieldErrors,
        formError: valid ? undefined : ("invalid_version" as const),
      };
}
export function validateAdminGalleryArchiveInput(input: unknown) {
  const v =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const date =
    typeof v.expectedUpdatedAt === "string"
      ? new Date(v.expectedUpdatedAt)
      : null;
  return date &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString() === v.expectedUpdatedAt &&
    v.archiveConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt: date } }
    : { ok: false as const };
}
const transition = (input: unknown, extra?: (v: Record<string, unknown>) => boolean) => {
  const v = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const date = typeof v.expectedUpdatedAt === "string" ? new Date(v.expectedUpdatedAt) : null;
  return date && !Number.isNaN(date.getTime()) && date.toISOString() === v.expectedUpdatedAt && (!extra || extra(v)) ? { ok: true as const, value: { expectedUpdatedAt: date } } : { ok: false as const };
};
export const validateAdminGalleryReviewInput = (v: unknown) => transition(v, x => x.reviewConfirmed === true);
export function validateAdminGalleryDecisionInput(v: unknown) { const r = transition(v, x => x.decision === "approve" || x.decision === "reject"); return r.ok ? { ...r, value: { ...r.value, decision: (v as {decision:"approve"|"reject"}).decision } } : r; }
export const validateAdminGalleryPublishInput = (v: unknown) => transition(v, x => x.publishConfirmed === true);
export function validateAdminGalleryPublicationInput(v: unknown) { const r = transition(v, x => x.action === "unpublish"); return r.ok ? { ...r, value: { ...r.value, action: "unpublish" as const } } : r; }
export const validateAdminGalleryConsentWithdrawalInput = (v: unknown) => transition(v, x => x.withdrawalConfirmed === true);
function webpDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  const kind = buffer.toString("ascii", 12, 16);
  if (kind === "VP8X")
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  if (
    kind === "VP8 " &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  )
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  if (kind === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}
export async function validateAdminGalleryImage(file: File) {
  if (
    file.type !== "image/webp" ||
    file.size < 1 ||
    file.size > ADMIN_GALLERY_IMAGE_MAX_BYTES
  )
    return {
      ok: false as const,
      error: "올바른 3MB 이하 WebP 이미지를 선택해 주세요.",
    };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (
    buffer.length !== file.size ||
    buffer.length > ADMIN_GALLERY_IMAGE_MAX_BYTES ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  )
    return {
      ok: false as const,
      error: "WebP 이미지 파일을 확인할 수 없습니다.",
    };
  const dimensions = webpDimensions(buffer);
  if (
    !dimensions ||
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > ADMIN_GALLERY_IMAGE_MAX_DIMENSION ||
    dimensions.height > ADMIN_GALLERY_IMAGE_MAX_DIMENSION
  )
    return {
      ok: false as const,
      error: "이미지 크기를 확인할 수 없거나 허용 범위를 초과했습니다.",
    };
  return {
    ok: true as const,
    value: {
      buffer,
      width: dimensions.width,
      height: dimensions.height,
      byteSize: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    },
  };
}
