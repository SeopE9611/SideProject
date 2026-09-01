import { ObjectId } from "mongodb";
import type { AdminUserDocument } from "@/features/admin-auth/admin-auth.repository";
import { isAdminRole, adminUserStatuses, type AdminRole, type AdminUserStatus } from "@/features/admin-auth/admin-auth.types";
import { normalizeAdminEmail } from "@/features/admin-auth/admin-auth.service";
import { isValidAdminPasswordHash } from "@/features/admin-auth/password";

const forbiddenText = /<[^>]*>|[\u0000-\u001f\u007f]/;
const emailWhitespace = /[\s\u0000-\u001f\u007f]/;
const exact = (value: object, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const validDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
export const isValidAdminDisplayName = (value: unknown): value is string => typeof value === "string" && value === value.trim() && value.length >= 2 && value.length <= 50 && !forbiddenText.test(value);
export const isValidAdminEmail = (value: unknown): value is string => {
  if (typeof value !== "string" || value !== value.trim() || value.length < 3 || value.length > 254 || emailWhitespace.test(value)) return false;
  const at = value.indexOf("@");
  return at > 0 && at === value.lastIndexOf("@") && at < value.length - 1;
};
export function isValidStoredAdminUser(value: unknown): value is AdminUserDocument {
  if (!value || typeof value !== "object") return false;
  const d = value as AdminUserDocument;
  return d._id instanceof ObjectId && isValidAdminEmail(d.email) && typeof d.normalizedEmail === "string" && d.normalizedEmail === d.email.trim().toLowerCase() && isValidAdminDisplayName(d.displayName) && isValidAdminPasswordHash(d.passwordHash) && isAdminRole(d.role) && adminUserStatuses.includes(d.status) && validDate(d.createdAt) && validDate(d.updatedAt) && d.updatedAt >= d.createdAt && (d.lastLoginAt === null || validDate(d.lastLoginAt) && d.lastLoginAt >= d.createdAt && d.lastLoginAt <= d.updatedAt);
}
export type CreateAdminUserValue = { user: { email: string; normalizedEmail: string; displayName: string; role: AdminRole; password: string }; createConfirmed: true };
export type UpdateAdminUserValue = { expectedUpdatedAt: Date; user: { displayName: string; role: AdminRole; status: AdminUserStatus }; updateConfirmed: true };
export type RevokeAdminUserSessionsValue = { expectedUpdatedAt: Date; revokeConfirmed: true };
type Validation<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };
const canonicalDate = (value: unknown): value is string => typeof value === "string" && validDate(new Date(value)) && new Date(value).toISOString() === value;

export function validateCreateAdminUserInput(raw: unknown): Validation<CreateAdminUserValue> {
  const errors: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || !exact(raw, ["user", "createConfirmed"])) return { ok: false, fieldErrors: { form: "요청 형식이 올바르지 않습니다." } };
  const r = raw as Record<string, unknown>, user = r.user;
  if (!user || typeof user !== "object" || !exact(user, ["email", "displayName", "role", "password", "passwordConfirmation"])) return { ok: false, fieldErrors: { user: "계정 정보 형식이 올바르지 않습니다." } };
  const u = user as Record<string, unknown>;
  const email = typeof u.email === "string" ? u.email.trim() : "";
  const displayName = typeof u.displayName === "string" ? u.displayName.trim() : "";
  if (!isValidAdminEmail(email)) errors["user.email"] = "올바른 이메일을 입력해 주세요.";
  if (!isValidAdminDisplayName(displayName)) errors["user.displayName"] = "표시 이름은 2~50자의 한 줄 평문이어야 합니다.";
  if (!isAdminRole(u.role)) errors["user.role"] = "역할을 선택해 주세요.";
  if (typeof u.password !== "string" || u.password.length < 12 || u.password.length > 128) errors["user.password"] = "비밀번호는 12~128자여야 합니다.";
  if (u.password !== u.passwordConfirmation) errors["user.passwordConfirmation"] = "비밀번호 확인이 일치하지 않습니다.";
  if (r.createConfirmed !== true) errors.createConfirmed = "생성 확인이 필요합니다.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { user: { email, normalizedEmail: normalizeAdminEmail(email), displayName, role: u.role as AdminRole, password: u.password as string }, createConfirmed: true } };
}

export function validateUpdateAdminUserInput(raw: unknown): Validation<UpdateAdminUserValue> {
  const errors: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || !exact(raw, ["expectedUpdatedAt", "user", "updateConfirmed"])) return { ok: false, fieldErrors: { form: "요청 형식이 올바르지 않습니다." } };
  const r = raw as Record<string, unknown>, user = r.user;
  if (!user || typeof user !== "object" || !exact(user, ["displayName", "role", "status"])) return { ok: false, fieldErrors: { user: "계정 정보 형식이 올바르지 않습니다." } };
  const u = user as Record<string, unknown>, displayName = typeof u.displayName === "string" ? u.displayName.trim() : "";
  if (!canonicalDate(r.expectedUpdatedAt)) errors.expectedUpdatedAt = "수정 기준 시각이 올바르지 않습니다.";
  if (!isValidAdminDisplayName(displayName)) errors["user.displayName"] = "표시 이름은 2~50자의 한 줄 평문이어야 합니다.";
  if (!isAdminRole(u.role)) errors["user.role"] = "역할이 올바르지 않습니다.";
  if (!adminUserStatuses.includes(u.status as AdminUserStatus)) errors["user.status"] = "상태가 올바르지 않습니다.";
  if (r.updateConfirmed !== true) errors.updateConfirmed = "변경 확인이 필요합니다.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { expectedUpdatedAt: new Date(r.expectedUpdatedAt as string), user: { displayName, role: u.role as AdminRole, status: u.status as AdminUserStatus }, updateConfirmed: true } };
}
export function validateRevokeAdminUserSessionsInput(raw: unknown): Validation<RevokeAdminUserSessionsValue> {
  if (!raw || typeof raw !== "object" || !exact(raw, ["expectedUpdatedAt", "revokeConfirmed"])) return { ok: false, fieldErrors: { form: "요청 형식이 올바르지 않습니다." } };
  const r = raw as Record<string, unknown>, errors: Record<string, string> = {};
  if (!canonicalDate(r.expectedUpdatedAt)) errors.expectedUpdatedAt = "수정 기준 시각이 올바르지 않습니다.";
  if (r.revokeConfirmed !== true) errors.revokeConfirmed = "세션 해제 확인이 필요합니다.";
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, value: { expectedUpdatedAt: new Date(r.expectedUpdatedAt as string), revokeConfirmed: true } };
}
