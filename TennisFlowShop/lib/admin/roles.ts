export type UserRole = "user" | "admin" | "superadmin";

export function isAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === "superadmin";
}

export function normalizeUserRole(role?: string | null): UserRole {
  if (role === "admin" || role === "superadmin") return role;
  return "user";
}

export function getUserRoleLabel(role?: string | null): string {
  if (role === "superadmin") return "최고 관리자";
  if (role === "admin") return "관리자";
  return "일반";
}
