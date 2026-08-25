export const adminRoles = ["admin"] as const;
export type AdminRole = (typeof adminRoles)[number];

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
