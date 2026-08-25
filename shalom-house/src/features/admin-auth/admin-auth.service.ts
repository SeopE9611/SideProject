import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import {
  clearLoginAttempt,
  createAdminSession,
  findActiveAdminByNormalizedEmail,
  findActiveAdminBySessionHash,
  getLoginAttempt,
  revokeAdminSession,
  saveLoginAttempt,
  updateAdminLastLoginAt,
  type AdminUserDocument,
} from "./admin-auth.repository";
import type { AdminLoginResult, AdminPrincipal } from "./admin-auth.types";
import { verifyAdminPassword } from "./password";

export const ADMIN_SESSION_COOKIE_NAME = "shalom_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const loginWindowMilliseconds = 15 * 60 * 1000;
const loginBlockMilliseconds = 15 * 60 * 1000;
const loginFailureLimit = 5;

// 계정 존재 여부의 시간 차이를 줄이기 위한 테스트 전용 고정 해시와 입력이다.
// 실제 계정에서 가져오지 않았으며 로그인 가능한 비밀번호로 사용하지 않는다.
const timingOnlyDummyPassword = "timing-only-not-a-login-password";
const timingOnlyDummyHash =
  "scrypt$32768$8$1$WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa$U8R2yUXOnUWno8vbbPoWeS8VWluCyYJa6yl3GttMAPT83azEGuSBpD4JkrIsNgBPoLKc_R-uXPJQRWhPDh0Dgw";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toPrincipal(admin: AdminUserDocument): AdminPrincipal {
  return {
    id: admin._id.toString(),
    email: admin.email,
    displayName: admin.displayName,
    role: admin.role,
  };
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function loginAdmin(input: {
  email: string;
  password: string;
  clientAddress: string;
}): Promise<AdminLoginResult> {
  const normalizedEmail = normalizeAdminEmail(input.email);
  if (
    normalizedEmail.length < 1 ||
    normalizedEmail.length > 254 ||
    input.password.length < 1 ||
    input.password.length > 128
  ) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const keyHash = sha256(`${normalizedEmail}\n${input.clientAddress}`);
  const now = new Date();
  const attempt = await getLoginAttempt(keyHash);
  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return { ok: false, reason: "rate_limited" };
  }

  const admin = await findActiveAdminByNormalizedEmail(normalizedEmail);
  const passwordMatches = admin
    ? await verifyAdminPassword(input.password, admin.passwordHash)
    : await verifyAdminPassword(timingOnlyDummyPassword, timingOnlyDummyHash);

  if (!admin || !passwordMatches) {
    await saveLoginAttempt({
      keyHash,
      now,
      windowMilliseconds: loginWindowMilliseconds,
      blockMilliseconds: loginBlockMilliseconds,
      failureLimit: loginFailureLimit,
    });
    return { ok: false, reason: "invalid_credentials" };
  }

  await clearLoginAttempt(keyHash);
  await updateAdminLastLoginAt(admin._id, now);
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  await createAdminSession({
    userId: admin._id,
    tokenHash: sha256(sessionToken),
    createdAt: now,
    expiresAt,
  });

  return { ok: true, admin: toPrincipal(admin), sessionToken, expiresAt };
}

export async function getCurrentAdmin(): Promise<AdminPrincipal | null> {
  const sessionToken = (await cookies()).get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  const admin = await findActiveAdminBySessionHash(sha256(sessionToken), new Date());
  return admin ? toPrincipal(admin) : null;
}

export async function revokeAdminSessionToken(sessionToken: string): Promise<void> {
  await revokeAdminSession(sha256(sessionToken), new Date());
}
