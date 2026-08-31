import { getCurrentAdmin } from "./admin-auth.service";
import type { AdminPrincipal, AdminRole } from "./admin-auth.types";

export const adminPermissions = [
  "admin.read",
  "content.create",
  "content.update",
  "content.archive",
  "content.delete",
  "content.restore",
  "content.request_review",
  "content.decide_review",
  "content.publish",
  "content.direct_publish",
  "gallery.withdraw_consent",
  "admin_users.manage",
] as const;

export type AdminPermission = (typeof adminPermissions)[number];

const permissionsByRole: Record<AdminRole, readonly AdminPermission[]> = {
  admin: adminPermissions,
  editor: [
    "admin.read",
    "content.create",
    "content.update",
    "content.archive",
    "content.request_review",
  ],
  reviewer: ["admin.read", "content.decide_review", "gallery.withdraw_consent"],
  publisher: ["admin.read", "content.publish", "gallery.withdraw_consent"],
};

export function hasAdminRolePermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return permissionsByRole[role].some((candidate) => candidate === permission);
}

export function hasAdminPermission(
  admin: Pick<AdminPrincipal, "role">,
  permission: AdminPermission,
): boolean {
  return hasAdminRolePermission(admin.role, permission);
}

export type AdminAuthorizationResult =
  | { ok: true; admin: AdminPrincipal }
  | { ok: false; reason: "unauthorized" | "forbidden" };

export async function authorizeCurrentAdmin(
  permission: AdminPermission,
): Promise<AdminAuthorizationResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, reason: "unauthorized" };
  if (!hasAdminPermission(admin, permission)) return { ok: false, reason: "forbidden" };
  return { ok: true, admin };
}
