import "server-only";
import { validateServerWebp } from "@/lib/server-webp-validation";

export const FACILITY_SPACE_MEDIA_REQUEST_MAX_BYTES = 4 * 1024 * 1024;
export const FACILITY_SPACE_ALT_TEXT_MAX_LENGTH = 300;
export const FACILITY_SPACE_ORIGINAL_FILE_NAME_MAX_LENGTH = 120;
const forbiddenMarkup = /[<>]|(?:^|\n)\s*(?:#{1,6}\s|(?:[-*+]|\d+[.)])\s)|\[[^\]]*\]\([^)]*\)/;
const forbiddenControlCharacters = /[\u0000-\u001F\u007F]/;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));

function canonicalDate(value: unknown): Date | null {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) && date.toISOString() === value ? date : null;
}

export function normalizeFacilitySpaceOriginalFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const fileName = value.replaceAll("\\", "/").split("/").at(-1)?.replace(/[\u0000-\u001F\u007F]/g, "").trim()
    .slice(0, FACILITY_SPACE_ORIGINAL_FILE_NAME_MAX_LENGTH).trim();
  return fileName || null;
}

export function validateFacilitySpaceMediaMetadata(input: unknown) {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = canonicalDate(value.expectedUpdatedAt);
  const altText = typeof value.altText === "string" ? value.altText.trim() : "";
  const originalFileName = normalizeFacilitySpaceOriginalFileName(value.originalFileName);
  const valid = exactKeys(value, ["expectedUpdatedAt", "altText", "originalFileName", "contentSafetyConfirmed"]);
  return valid && expectedUpdatedAt && altText && altText.length <= FACILITY_SPACE_ALT_TEXT_MAX_LENGTH &&
    !forbiddenMarkup.test(altText) && !forbiddenControlCharacters.test(altText) && originalFileName &&
    value.contentSafetyConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt, altText, originalFileName } }
    : { ok: false as const };
}

export function validateFacilitySpaceMediaRemoveInput(input: unknown) {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const expectedUpdatedAt = canonicalDate(value.expectedUpdatedAt);
  return exactKeys(value, ["expectedUpdatedAt", "removeConfirmed"]) && expectedUpdatedAt && value.removeConfirmed === true
    ? { ok: true as const, value: { expectedUpdatedAt } }
    : { ok: false as const };
}

export async function validateFacilitySpaceImage(file: unknown) {
  if (!(file instanceof File)) return { ok: false as const, error: "3MB 이하 WebP 이미지를 선택해 주세요." };
  const result = await validateServerWebp(file);
  if (result.ok) return result;
  return {
    ok: false as const,
    error: result.reason === "dimensions" ? "이미지 크기를 확인할 수 없거나 허용 범위를 초과했습니다." : "올바른 3MB 이하 WebP 이미지를 선택해 주세요.",
  };
}
