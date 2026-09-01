export const adminRoles = ["admin", "editor", "reviewer", "publisher"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminRoleLabels: Record<AdminRole, string> = {
  admin: "시스템 관리자",
  editor: "콘텐츠 작성자",
  reviewer: "검토·승인 담당자",
  publisher: "게시 담당자",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoles.some((role) => role === value);
}

export const adminUserStatuses = ["active", "disabled"] as const;
export type AdminUserStatus = (typeof adminUserStatuses)[number];

export type AdminPrincipal = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
};

export type AdminLoginResult =
  | {
      ok: true;
      admin: AdminPrincipal;
      sessionToken: string;
      expiresAt: Date;
    }
  | {
      ok: false;
      reason: "invalid_credentials" | "rate_limited";
    };
