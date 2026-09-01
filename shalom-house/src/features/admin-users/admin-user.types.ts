import type { AdminRole, AdminUserStatus } from "@/features/admin-auth/admin-auth.types";
export type AdminUserListItem={id:string;email:string;displayName:string;role:AdminRole;status:AdminUserStatus;lastLoginAt:string|null;updatedAt:string;activeSessionCount:number;isCurrentUser:boolean};
export type AdminUserDetail=AdminUserListItem&{createdAt:string;audit:import("@/features/admin-audit/admin-audit.types").AdminAuditHistoryItem[]};
export type AdminUserListFilters={role?:AdminRole;status?:AdminUserStatus};
export const ADMIN_USER_PAGE_SIZE=20;
