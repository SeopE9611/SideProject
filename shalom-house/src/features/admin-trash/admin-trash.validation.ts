export const DELETE_CONFIRMATION = "이 콘텐츠를 휴지통으로 이동하며 공개 중인 경우 즉시 비공개 처리되는 것을 확인했습니다.";
export const RESTORE_CONFIRMATION = "이 콘텐츠를 안전한 초안 상태로 복구하는 것을 확인했습니다.";
export type AdminTrashValidationResult = { ok: true; value: { expectedUpdatedAt: Date } } | { ok: false; fieldErrors: Record<string, string> };
export function validateAdminTrashInput(input: unknown): AdminTrashValidationResult {
  if (!input || typeof input !== "object") return { ok: false, fieldErrors: { form: "요청 내용을 확인해 주세요." } };
  const value = input as Record<string, unknown>, errors: Record<string, string> = {};
  if (value.confirmation !== true) errors.confirmation = "확인 항목에 동의해 주세요.";
  if (typeof value.expectedUpdatedAt !== "string") errors.expectedUpdatedAt = "변경 기준 시각이 필요합니다.";
  else { const date = new Date(value.expectedUpdatedAt); if (Number.isNaN(date.getTime()) || date.toISOString() !== value.expectedUpdatedAt) errors.expectedUpdatedAt = "변경 기준 시각이 올바르지 않습니다."; }
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: { expectedUpdatedAt: new Date(value.expectedUpdatedAt as string) } };
}
