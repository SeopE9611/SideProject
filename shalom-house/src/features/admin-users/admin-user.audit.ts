import type{ObjectId}from"mongodb";import type{AdminRole,AdminUserStatus}from"@/features/admin-auth/admin-auth.types";
export const adminUserAuditActions=["created","profile_updated","role_changed","disabled","reactivated","sessions_revoked"]as const;export type AdminUserAuditAction=typeof adminUserAuditActions[number];
export const adminUserAuditChangedFields=["email","displayName","role","status","sessions"]as const;export type AdminUserAuditChangedField=typeof adminUserAuditChangedFields[number];
export type AdminUserAuditSnapshot={email:string;displayName:string;role:AdminRole;status:AdminUserStatus};
export type MongoAdminUserAuditEvent={_id:ObjectId;schemaVersion:1;adminUserId:ObjectId;action:AdminUserAuditAction;actor:{adminId:ObjectId;displayName:string;role:AdminRole};occurredAt:Date;fromVersionAt:Date|null;toVersionAt:Date;before:AdminUserAuditSnapshot|null;after:AdminUserAuditSnapshot;changedFields:AdminUserAuditChangedField[]};
export const adminUserAuditActionLabels:Record<AdminUserAuditAction,string>={created:"계정 생성",profile_updated:"표시 이름 수정",role_changed:"역할 변경",disabled:"계정 비활성화",reactivated:"계정 재활성화",sessions_revoked:"전체 세션 해제"};
export const adminUserAuditFieldLabels:Record<AdminUserAuditChangedField,string>={email:"이메일",displayName:"표시 이름",role:"역할",status:"상태",sessions:"로그인 세션"};
