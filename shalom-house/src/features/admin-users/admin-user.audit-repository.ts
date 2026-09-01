import { ObjectId, type ClientSession, type Db } from "mongodb";
import { isAdminRole, adminUserStatuses, type AdminUserStatus } from "@/features/admin-auth/admin-auth.types";
import { validEmail, validName } from "./admin-user.validation";
import {
  adminUserAuditActions,
  adminUserAuditChangedFields,
  type MongoAdminUserAuditEvent,
} from "./admin-user.audit";

export const ADMIN_USER_AUDIT_COLLECTION_NAME = "admin_user_audit_events";
const snapshotKeys = ["email", "displayName", "role", "status"];
const actorKeys = ["adminId", "displayName", "role"];
const eventKeys = [
  "_id",
  "schemaVersion",
  "adminUserId",
  "action",
  "actor",
  "occurredAt",
  "fromVersionAt",
  "toVersionAt",
  "before",
  "after",
  "changedFields",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}
function validDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
function isAdminUserStatus(value: unknown): value is AdminUserStatus {
  return adminUserStatuses.some((status) => status === value);
}
function snapshot(value: unknown) {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, snapshotKeys) &&
    validEmail(value.email) &&
    validName(value.displayName) &&
    isAdminRole(value.role) &&
    isAdminUserStatus(value.status)
  );
}
function actor(value: unknown) {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, actorKeys) &&
    value.adminId instanceof ObjectId &&
    validName(value.displayName) &&
    isAdminRole(value.role)
  );
}
export function isValidAdminUserAuditEvent(value: unknown): value is MongoAdminUserAuditEvent {
  if (!isPlainObject(value) || !hasExactKeys(value, eventKeys)) return false;
  if (!Array.isArray(value.changedFields)) return false;
  return (
    value._id instanceof ObjectId &&
    value.adminUserId instanceof ObjectId &&
    value.schemaVersion === 1 &&
    adminUserAuditActions.some((action) => action === value.action) &&
    actor(value.actor) &&
    validDate(value.occurredAt) &&
    (value.fromVersionAt === null || validDate(value.fromVersionAt)) &&
    validDate(value.toVersionAt) &&
    (value.fromVersionAt === null || value.fromVersionAt.getTime() <= value.toVersionAt.getTime()) &&
    value.occurredAt.getTime() === value.toVersionAt.getTime() &&
    (value.before === null || snapshot(value.before)) &&
    snapshot(value.after) &&
    new Set(value.changedFields).size === value.changedFields.length &&
    value.changedFields.every((field) => adminUserAuditChangedFields.some((allowed) => allowed === field))
  );
}
export function logInvalidAdminUserAuditEvent(value: unknown) {
  console.error({
    auditEventId:
      isPlainObject(value) && value._id instanceof ObjectId ? value._id.toHexString() : "unknown",
    domain: "admin-users",
    errorName: "InvalidAuditEvent",
  });
}
export async function insertAdminUserAuditEvent(db: Db, event: MongoAdminUserAuditEvent, session: ClientSession) {
  if (!isValidAdminUserAuditEvent(event)) throw new Error("InvalidAdminUserAuditEvent");
  await db.collection<MongoAdminUserAuditEvent>(ADMIN_USER_AUDIT_COLLECTION_NAME).insertOne(event, { session });
}
