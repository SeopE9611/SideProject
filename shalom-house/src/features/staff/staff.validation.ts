import { isStaffPublicationStatus, type StaffProfileInput } from "./staff.types";
export type StaffProfileFieldErrors = Partial<Record<keyof StaffProfileInput | "saveConfirmed" | "expectedUpdatedAt", string>>;
export type StaffProfileSaveInput = { expectedUpdatedAt: Date | null; profile: StaffProfileInput };
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const forbiddenMarkup = /[<>]|(?:^|\s)(?:#{1,6}|[-*+]\s|\[[^\]]*\]\([^)]*\))/;
export function validateStaffProfileInput(input: unknown): { ok: true; value: StaffProfileInput } | { ok: false; fieldErrors: StaffProfileFieldErrors } {
  const value = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const keys = ["role", "responsibility", "name", "showName", "nameDisclosureConfirmed", "nameDisclosureReference", "publicationStatus", "displayOrder"];
  const errors: StaffProfileFieldErrors = {};
  if (!exactKeys(value, keys)) errors.role = "입력 구조가 올바르지 않습니다.";
  const role = typeof value.role === "string" ? value.role.trim() : "";
  const responsibility = typeof value.responsibility === "string" ? value.responsibility.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const reference = typeof value.nameDisclosureReference === "string" ? value.nameDisclosureReference.trim() : "";
  if (!role || role.length > 80 || forbiddenMarkup.test(role)) errors.role = "직책·역할은 서식 없이 1~80자로 입력해 주세요.";
  if (responsibility.length < 10 || responsibility.length > 600 || forbiddenMarkup.test(responsibility)) errors.responsibility = "담당 업무는 서식 없이 10~600자로 입력해 주세요.";
  if (name.length > 80 || forbiddenMarkup.test(name)) errors.name = "직원 이름은 서식 없이 80자 이하로 입력해 주세요.";
  if (typeof value.showName !== "boolean") errors.showName = "이름 공개 여부를 확인해 주세요.";
  if (typeof value.nameDisclosureConfirmed !== "boolean") errors.nameDisclosureConfirmed = "이름 공개 확인 여부를 확인해 주세요.";
  if (reference.length > 120 || forbiddenMarkup.test(reference)) errors.nameDisclosureReference = "확인 근거는 서식 없이 120자 이하로 입력해 주세요.";
  if (value.showName === true && (!name || value.nameDisclosureConfirmed !== true || !reference)) errors.nameDisclosureConfirmed = "이름 공개에는 이름, 공개 확인, 확인 근거가 모두 필요합니다.";
  if (!isStaffPublicationStatus(value.publicationStatus)) errors.publicationStatus = "공개 상태를 선택해 주세요.";
  if (!Number.isInteger(value.displayOrder) || (value.displayOrder as number) < 1 || (value.displayOrder as number) > 999) errors.displayOrder = "표시 순서는 1~999의 정수여야 합니다.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { role, responsibility, name, showName: value.showName as boolean, nameDisclosureConfirmed: value.showName ? value.nameDisclosureConfirmed as boolean : false, nameDisclosureReference: value.showName ? reference : "", publicationStatus: value.publicationStatus as StaffProfileInput["publicationStatus"], displayOrder: value.displayOrder as number } };
}
export function validateStaffProfileSaveInput(input: unknown): { ok: true; value: StaffProfileSaveInput } | { ok: false; fieldErrors: StaffProfileFieldErrors } {
  const value = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const errors: StaffProfileFieldErrors = {};
  if (!exactKeys(value, ["expectedUpdatedAt", "saveConfirmed", "profile"])) errors.saveConfirmed = "입력 구조가 올바르지 않습니다.";
  const profile = validateStaffProfileInput(value.profile);
  let expectedUpdatedAt: Date | null = null;
  if (value.expectedUpdatedAt !== null) { const date = typeof value.expectedUpdatedAt === "string" ? new Date(value.expectedUpdatedAt) : new Date(NaN); if (Number.isNaN(date.getTime()) || date.toISOString() !== value.expectedUpdatedAt) errors.expectedUpdatedAt = "수정 버전이 올바르지 않습니다."; else expectedUpdatedAt = date; }
  if (value.saveConfirmed !== true) errors.saveConfirmed = "저장할 정보와 공개 범위를 확인해 주세요.";
  if (!profile.ok || Object.keys(errors).length) return { ok: false, fieldErrors: { ...(!profile.ok ? profile.fieldErrors : {}), ...errors } };
  return { ok: true, value: { expectedUpdatedAt, profile: profile.value } };
}
