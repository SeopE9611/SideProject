import { ObjectId } from "mongodb";
import { type AdminUserDocument } from "@/features/admin-auth/admin-auth.repository";
import {
  adminUserStatuses,
  isAdminRole,
  type AdminRole,
  type AdminUserStatus,
} from "@/features/admin-auth/admin-auth.types";
import { isValidAdminPasswordHash } from "@/features/admin-auth/password";

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => key in value);
const date = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const controls = /[\u0000-\u001f\u007f]/;
const html = /<\/?[A-Za-z][^>]*>/;

export const validEmail = (value: unknown): value is string =>
  typeof value === "string" &&
  value === value.trim() &&
  value.length >= 3 &&
  value.length <= 254 &&
  !controls.test(value) &&
  !/[\s]/.test(value) &&
  value.indexOf("@") > 0 &&
  value.indexOf("@") < value.length - 1;
export const validName = (value: unknown): value is string =>
  typeof value === "string" &&
  value === value.trim() &&
  value.length >= 2 &&
  value.length <= 50 &&
  !controls.test(value) &&
  !html.test(value);
const isAdminUserStatus = (value: unknown): value is AdminUserStatus =>
  adminUserStatuses.some((status) => status === value);

export function isValidStoredAdminUser(value: unknown): value is AdminUserDocument {
  if (
    !object(value) ||
    !(value._id instanceof ObjectId) ||
    !validEmail(value.email) ||
    value.normalizedEmail !== value.email.toLowerCase() ||
    !validName(value.displayName) ||
    !isValidAdminPasswordHash(value.passwordHash) ||
    !isAdminRole(value.role) ||
    !isAdminUserStatus(value.status) ||
    !date(value.createdAt) ||
    !date(value.updatedAt) ||
    value.updatedAt < value.createdAt
  )
    return false;
  return (
    value.lastLoginAt === null ||
    (date(value.lastLoginAt) && value.lastLoginAt >= value.createdAt && value.lastLoginAt <= value.updatedAt)
  );
}

export type CreateValue = { email: string; displayName: string; role: AdminRole; password: string };
export function validateCreateAdminUser(
  value: unknown,
): { ok: true; value: CreateValue } | { ok: false; fieldErrors: Record<string, string> } {
  if (!object(value) || !exact(value, ["user", "createConfirmed"]) || !object(value.user))
    return { ok: false, fieldErrors: { form: "입력 형식이 올바르지 않습니다." } };
  if (!exact(value.user, ["email", "displayName", "role", "password", "passwordConfirmation"]))
    return { ok: false, fieldErrors: { form: "입력 형식이 올바르지 않습니다." } };
  const errors: Record<string, string> = {};
  const email = typeof value.user.email === "string" ? value.user.email.trim() : "";
  const displayName = typeof value.user.displayName === "string" ? value.user.displayName.trim() : "";
  if (!validEmail(email)) errors.email = "올바른 이메일을 입력해 주세요.";
  if (!validName(displayName)) errors.displayName = "표시 이름은 2~50자의 한 줄 평문이어야 합니다.";
  if (!isAdminRole(value.user.role)) errors.role = "역할을 선택해 주세요.";
  if (typeof value.user.password !== "string" || value.user.password.length < 12 || value.user.password.length > 128)
    errors.password = "비밀번호는 12~128자여야 합니다.";
  if (value.user.password !== value.user.passwordConfirmation)
    errors.passwordConfirmation = "비밀번호가 일치하지 않습니다.";
  if (value.createConfirmed !== true) errors.createConfirmed = "계정 생성 확인이 필요합니다.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: { email, displayName, role: value.user.role as AdminRole, password: value.user.password as string },
  };
}

const canonicalIso = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};
export function validateUpdateAdminUser(value: unknown) {
  if (!object(value) || !exact(value, ["expectedUpdatedAt", "user", "updateConfirmed"]) || !object(value.user))
    return { ok: false as const, fieldErrors: { form: "입력 형식이 올바르지 않습니다." } };
  if (!exact(value.user, ["displayName", "role", "status"]))
    return { ok: false as const, fieldErrors: { form: "입력 형식이 올바르지 않습니다." } };
  const errors: Record<string, string> = {};
  const displayName = typeof value.user.displayName === "string" ? value.user.displayName.trim() : "";
  if (!canonicalIso(value.expectedUpdatedAt)) errors.expectedUpdatedAt = "수정 기준 시각을 확인할 수 없습니다.";
  if (!validName(displayName)) errors.displayName = "표시 이름은 2~50자의 한 줄 평문이어야 합니다.";
  if (!isAdminRole(value.user.role)) errors.role = "역할을 선택해 주세요.";
  if (!isAdminUserStatus(value.user.status)) errors.status = "상태를 선택해 주세요.";
  if (value.updateConfirmed !== true) errors.updateConfirmed = "변경 내용 확인이 필요합니다.";
  if (Object.keys(errors).length) return { ok: false as const, fieldErrors: errors };
  return {
    ok: true as const,
    value: {
      expectedUpdatedAt: new Date(value.expectedUpdatedAt as string),
      displayName,
      role: value.user.role as AdminRole,
      status: value.user.status as AdminUserStatus,
    },
  };
}
export function validateRevokeAdminUserSessions(value: unknown) {
  if (!object(value) || !exact(value, ["expectedUpdatedAt", "revokeConfirmed"]))
    return { ok: false as const, fieldErrors: { form: "입력 형식이 올바르지 않습니다." } };
  const errors: Record<string, string> = {};
  if (!canonicalIso(value.expectedUpdatedAt)) errors.expectedUpdatedAt = "수정 기준 시각을 확인할 수 없습니다.";
  if (value.revokeConfirmed !== true) errors.revokeConfirmed = "전체 세션 해제 확인이 필요합니다.";
  if (Object.keys(errors).length) return { ok: false as const, fieldErrors: errors };
  return { ok: true as const, value: { expectedUpdatedAt: new Date(value.expectedUpdatedAt as string) } };
}
