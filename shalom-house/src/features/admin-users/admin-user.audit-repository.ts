import { ObjectId, type ClientSession, type Db } from "mongodb";
import { isAdminRole, adminUserStatuses } from "@/features/admin-auth/admin-auth.types";
import type { AdminAuditHistoryItem } from "@/features/admin-audit/admin-audit.types";
import { isValidAdminDisplayName, isValidAdminEmail } from "./admin-user.validation";
import { adminUserAuditActions, adminUserAuditChangedFields, adminUserAuditActionLabels, adminUserAuditChangedFieldLabels, type MongoAdminUserAuditEvent } from "./admin-user.audit";

export const ADMIN_USER_AUDIT_EVENTS_COLLECTION_NAME = "admin_user_audit_events";
const date = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());
const snapshot = (v: any) => v && isValidAdminEmail(v.email) && isValidAdminDisplayName(v.displayName) && isAdminRole(v.role) && adminUserStatuses.includes(v.status);
export function isValidAdminUserAuditEvent(v: unknown): v is MongoAdminUserAuditEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as MongoAdminUserAuditEvent;
  return e._id instanceof ObjectId && e.adminUserId instanceof ObjectId && e.schemaVersion === 1 && adminUserAuditActions.includes(e.action) && e.actor?.adminId instanceof ObjectId && isValidAdminDisplayName(e.actor.displayName) && isAdminRole(e.actor.role) && date(e.occurredAt) && (e.fromVersionAt === null || date(e.fromVersionAt)) && date(e.toVersionAt) && e.occurredAt.getTime() === e.toVersionAt.getTime() && (e.before === null || snapshot(e.before)) && snapshot(e.after) && Array.isArray(e.changedFields) && new Set(e.changedFields).size === e.changedFields.length && e.changedFields.every((field) => adminUserAuditChangedFields.includes(field));
}
export async function insertAdminUserAuditEvent(db: Db, event: MongoAdminUserAuditEvent, session: ClientSession) {
  if (!isValidAdminUserAuditEvent(event)) throw new TypeError("관리자 계정 감사 이벤트가 올바르지 않습니다.");
  await db.collection<MongoAdminUserAuditEvent>(ADMIN_USER_AUDIT_EVENTS_COLLECTION_NAME).insertOne(event, { session });
}
export async function listAdminUserAuditEvents(db: Db, adminUserId: ObjectId): Promise<AdminAuditHistoryItem[]> {
  const rows = await db.collection<MongoAdminUserAuditEvent>(ADMIN_USER_AUDIT_EVENTS_COLLECTION_NAME).find({ adminUserId }).sort({ occurredAt: -1, _id: -1 }).limit(50).toArray();
  return rows.filter(isValidAdminUserAuditEvent).map((e) => ({ id: e._id.toHexString(), actionLabel: adminUserAuditActionLabels[e.action], actorDisplayName: e.actor.displayName, occurredAt: e.occurredAt.toISOString(), changedFieldLabels: e.changedFields.map((field) => adminUserAuditChangedFieldLabels[field]) }));
}
