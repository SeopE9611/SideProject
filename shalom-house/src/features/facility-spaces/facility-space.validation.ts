import { isFacilitySpacePublicationStatus, type FacilitySpaceInput } from "./facility-space.types";
export type FacilitySpaceFieldErrors = Partial<
  Record<keyof FacilitySpaceInput | "saveConfirmed" | "expectedUpdatedAt", string>
>;
export type FacilitySpaceSaveInput = { expectedUpdatedAt: Date | null; space: FacilitySpaceInput };
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const forbiddenMarkup = /[<>]|(?:^|\n)\s*(?:#{1,6}\s|(?:[-*+]|\d+[.)])\s)|\[[^\]]*\]\([^)]*\)/;
const forbiddenControlCharacters = /[\u0000-\u0009\u000B-\u001F\u007F]/;
const lineBreakCharacters = /[\r\n]/;
export function validateFacilitySpaceInput(
  input: unknown,
): { ok: true; value: FacilitySpaceInput } | { ok: false; fieldErrors: FacilitySpaceFieldErrors } {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const errors: FacilitySpaceFieldErrors = {};
  if (!exactKeys(value, ["title", "description", "publicationStatus", "displayOrder"]))
    errors.title = "입력 구조가 올바르지 않습니다.";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (
    !title ||
    title.length > 100 ||
    forbiddenMarkup.test(title) ||
    forbiddenControlCharacters.test(title) ||
    lineBreakCharacters.test(title)
  )
    errors.title = "공간명은 서식 없이 1~100자로 입력해 주세요.";
  if (
    description.length < 10 ||
    description.length > 800 ||
    forbiddenMarkup.test(description) ||
    forbiddenControlCharacters.test(description)
  )
    errors.description = "공간 설명은 서식 없이 10~800자로 입력해 주세요.";
  if (!isFacilitySpacePublicationStatus(value.publicationStatus))
    errors.publicationStatus = "공개 상태를 선택해 주세요.";
  if (
    !Number.isInteger(value.displayOrder) ||
    (value.displayOrder as number) < 1 ||
    (value.displayOrder as number) > 999
  )
    errors.displayOrder = "표시 순서는 1~999의 정수여야 합니다.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: {
      title,
      description,
      publicationStatus: value.publicationStatus as FacilitySpaceInput["publicationStatus"],
      displayOrder: value.displayOrder as number,
    },
  };
}
export function validateFacilitySpaceSaveInput(
  input: unknown,
): { ok: true; value: FacilitySpaceSaveInput } | { ok: false; fieldErrors: FacilitySpaceFieldErrors } {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const errors: FacilitySpaceFieldErrors = {};
  if (!exactKeys(value, ["expectedUpdatedAt", "saveConfirmed", "space"]))
    errors.saveConfirmed = "입력 구조가 올바르지 않습니다.";
  const space = validateFacilitySpaceInput(value.space);
  let expectedUpdatedAt: Date | null = null;
  if (value.expectedUpdatedAt !== null) {
    const date = typeof value.expectedUpdatedAt === "string" ? new Date(value.expectedUpdatedAt) : new Date(NaN);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== value.expectedUpdatedAt)
      errors.expectedUpdatedAt = "수정 버전이 올바르지 않습니다.";
    else expectedUpdatedAt = date;
  }
  if (value.saveConfirmed !== true) errors.saveConfirmed = "공개 가능한 내용인지 확인해 주세요.";
  if (!space.ok || Object.keys(errors).length)
    return { ok: false, fieldErrors: { ...(!space.ok ? space.fieldErrors : {}), ...errors } };
  return { ok: true, value: { expectedUpdatedAt, space: space.value } };
}
