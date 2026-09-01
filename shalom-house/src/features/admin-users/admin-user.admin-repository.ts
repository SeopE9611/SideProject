import { ObjectId, type ClientSession } from "mongodb";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import {
  ADMIN_SESSIONS_COLLECTION_NAME,
  ADMIN_USERS_COLLECTION_NAME,
  type AdminSessionDocument,
  type AdminUserDocument,
} from "@/features/admin-auth/admin-auth.repository";
import { normalizeAdminEmail } from "@/features/admin-auth/admin-auth.service";
import { hashAdminPassword } from "@/features/admin-auth/password";
import type { AdminPrincipal, AdminRole, AdminUserStatus } from "@/features/admin-auth/admin-auth.types";
import { isValidStoredAdminUser, type CreateValue } from "./admin-user.validation";
import {
  type AdminUserDetail,
  type AdminUserListFilters,
  type AdminUserListItem,
} from "./admin-user.types";
import {
  ADMIN_USER_AUDIT_COLLECTION_NAME,
  insertAdminUserAuditEvent,
  isValidAdminUserAuditEvent,
  logInvalidAdminUserAuditEvent,
} from "./admin-user.audit-repository";
import {
  adminUserAuditActionLabels,
  adminUserAuditFieldLabels,
  type AdminUserAuditAction,
  type AdminUserAuditChangedField,
  type AdminUserAuditSnapshot,
  type MongoAdminUserAuditEvent,
} from "./admin-user.audit";
const state = "admin_user_management_state";
type MongoErrorLabelCarrier = { hasErrorLabel(label: string): boolean };
function hasMongoErrorLabel(error: unknown, label: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "hasErrorLabel" in error &&
    typeof error.hasErrorLabel === "function" &&
    (error as MongoErrorLabelCarrier).hasErrorLabel(label)
  );
}
function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
function isNormalizedEmailDuplicate(error: unknown) {
  if (!isDuplicateKey(error)) return false;
  const record = error as Record<string, unknown>;
  for (const key of ["keyPattern", "keyValue"] as const) {
    const value = record[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "normalizedEmail" in value)
      return true;
  }
  return false;
}
function isActiveAdminGuardDuplicate(error: unknown) {
  if (!isDuplicateKey(error)) return false;
  const record = error as Record<string, unknown>;
  const keyValue = record.keyValue;
  return (
    typeof keyValue === "object" &&
    keyValue !== null &&
    !Array.isArray(keyValue) &&
    "_id" in keyValue &&
    keyValue._id === "active-admin-guard"
  );
}
const snap = (u: AdminUserDocument): AdminUserAuditSnapshot => ({
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  status: u.status,
});
async function transaction<T>(
  work: (s: ClientSession) => Promise<T>,
  retryActiveAdminGuardDuplicate = false,
): Promise<T> {
  const client = await getMongoClient();
  let error: unknown;
  for (let i = 0; i < 3; i++) {
    const s = client.startSession();
    try {
      let value!: T;
      await s.withTransaction(async () => {
        value = await work(s);
      });
      return value;
    } catch (e) {
      error = e;
      if (
        !hasMongoErrorLabel(e, "TransientTransactionError") &&
        !hasMongoErrorLabel(e, "UnknownTransactionCommitResult") &&
        !(retryActiveAdminGuardDuplicate && isActiveAdminGuardDuplicate(e))
      )
        throw e;
    } finally {
      await s.endSession();
    }
  }
  throw error;
}
function audit(
  id: ObjectId,
  action: AdminUserAuditAction,
  actor: AdminPrincipal,
  at: Date,
  before: AdminUserAuditSnapshot | null,
  after: AdminUserAuditSnapshot,
  fields: AdminUserAuditChangedField[],
  from: Date | null,
): MongoAdminUserAuditEvent {
  return {
    _id: new ObjectId(),
    schemaVersion: 1,
    adminUserId: id,
    action,
    actor: { adminId: new ObjectId(actor.id), displayName: actor.displayName, role: actor.role },
    occurredAt: at,
    fromVersionAt: from,
    toVersionAt: at,
    before,
    after,
    changedFields: fields,
  };
}
export async function createAdminUser(input: { user: CreateValue; actor: AdminPrincipal }) {
  const passwordHash = await hashAdminPassword(input.user.password),
    now = new Date(),
    _id = new ObjectId();
  const doc: AdminUserDocument = {
    _id,
    email: input.user.email,
    normalizedEmail: normalizeAdminEmail(input.user.email),
    displayName: input.user.displayName,
    passwordHash,
    role: input.user.role,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  try {
    return await transaction(async (s) => {
      const db = await getMongoDatabase();
      await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).insertOne(doc, { session: s });
      await insertAdminUserAuditEvent(
        db,
        audit(_id, "created", input.actor, now, null, snap(doc), ["email", "displayName", "role", "status"], null),
        s,
      );
      return { ok: true as const, id: _id.toHexString() };
    });
  } catch (e) {
    if (isNormalizedEmailDuplicate(e)) return { ok: false as const, reason: "email_conflict" as const };
    throw e;
  }
}
async function validUsers() {
  const db = await getMongoDatabase();
  return (await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).find({}).toArray()).filter(
    isValidStoredAdminUser,
  );
}
export async function listAdminUsers(input: {
  page: number;
  pageSize: 20;
  filters: AdminUserListFilters;
  currentAdminId: string;
  now: Date;
}) {
  let users = await validUsers();
  if (input.filters.role) users = users.filter((x) => x.role === input.filters.role);
  if (input.filters.status) users = users.filter((x) => x.status === input.filters.status);
  users.sort((a, b) =>
    a.status === b.status
      ? Intl.Collator("ko").compare(a.displayName, b.displayName) ||
        a._id.toHexString().localeCompare(b._id.toHexString())
      : a.status === "active"
        ? -1
        : 1,
  );
  const total = users.length,
    pageUsers = users.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
    ids = pageUsers.map((x) => x._id);
  const db = await getMongoDatabase();
  const counts = ids.length
    ? await db
        .collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME)
        .aggregate<{ _id: ObjectId; count: number }>([
          {
            $match: {
              userId: { $in: ids },
              expiresAt: { $gt: input.now },
              $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
            },
          },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
        .toArray()
    : [];
  const map = new Map(counts.map((x) => [x._id.toHexString(), x.count]));
  return { items: pageUsers.map((x) => item(x, input.currentAdminId, map.get(x._id.toHexString()) ?? 0)), total };
}
function item(x: AdminUserDocument, current: string, count: number): AdminUserListItem {
  return {
    id: x._id.toHexString(),
    email: x.email,
    displayName: x.displayName,
    role: x.role,
    status: x.status,
    lastLoginAt: x.lastLoginAt?.toISOString() ?? null,
    updatedAt: x.updatedAt.toISOString(),
    activeSessionCount: count,
    isCurrentUser: x._id.toHexString() === current,
  };
}
export async function getAdminUserCounts() {
  const u = await validUsers();
  return {
    total: u.length,
    active: u.filter((x) => x.status === "active").length,
    disabled: u.filter((x) => x.status === "disabled").length,
    activeAdmins: u.filter((x) => x.role === "admin" && x.status === "active").length,
  };
}
export async function getAdminUserDetail(
  id: string,
  current: string,
  now = new Date(),
): Promise<AdminUserDetail | null | "invalid_document"> {
  const db = await getMongoDatabase(),
    doc = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  if (!isValidStoredAdminUser(doc)) return "invalid_document";
  const count = await db
    .collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME)
    .countDocuments({
      userId: doc._id,
      expiresAt: { $gt: now },
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    });
  const rows = await db
      .collection(ADMIN_USER_AUDIT_COLLECTION_NAME)
      .find({ adminUserId: doc._id })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(50)
      .toArray();
  const events = rows.filter((event) => {
    const valid = isValidAdminUserAuditEvent(event);
    if (!valid) logInvalidAdminUserAuditEvent(event);
    return valid;
  });
  return {
    ...item(doc, current, count),
    createdAt: doc.createdAt.toISOString(),
    audit: events.map((e) => ({
      id: e._id.toHexString(),
      actionLabel: adminUserAuditActionLabels[e.action],
      actorDisplayName: e.actor.displayName,
      occurredAt: e.occurredAt.toISOString(),
      changedFieldLabels: e.changedFields.map((f) => adminUserAuditFieldLabels[f]),
    })),
  };
}
export async function updateAdminUser(input: {
  id: string;
  expectedUpdatedAt: Date;
  displayName: string;
  role: AdminRole;
  status: AdminUserStatus;
  actor: AdminPrincipal;
  now?: Date;
}) {
  return transaction(async (s) => {
    const db = await getMongoDatabase(),
      _id = new ObjectId(input.id),
      doc = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id }, { session: s });
    if (!doc) return { ok: false as const, reason: "not_found" as const };
    if (!isValidStoredAdminUser(doc)) return { ok: false as const, reason: "invalid_document" as const };
    if (doc.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return { ok: false as const, reason: "edit_conflict" as const };
    const role = doc.role !== input.role,
      status = doc.status !== input.status,
      name = doc.displayName !== input.displayName;
    if (!role && !status && !name) return { ok: false as const, reason: "no_change" as const };
    if (doc._id.toHexString() === input.actor.id && (role || status))
      return { ok: false as const, reason: "self_role_status_change" as const };
    if (role || status) {
      await db
        .collection<{ _id: string; version: number; createdAt: Date; updatedAt: Date }>(state)
        .updateOne(
          { _id: "active-admin-guard" },
          { $inc: { version: 1 }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true, session: s },
        );
      if (doc.role === "admin" && doc.status === "active" && (input.role !== "admin" || input.status !== "active")) {
        const all = (
          await db
            .collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME)
            .find({ role: "admin", status: "active" }, { session: s })
            .toArray()
        ).filter(isValidStoredAdminUser);
        if (all.length <= 1) return { ok: false as const, reason: "last_active_admin" as const };
      }
    }
    const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.expectedUpdatedAt.getTime() + 1));
    const result = await db
      .collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME)
      .updateOne(
        { _id, updatedAt: input.expectedUpdatedAt },
        { $set: { displayName: input.displayName, role: input.role, status: input.status, updatedAt: at } },
        { session: s },
      );
    if (result.matchedCount !== 1 || result.modifiedCount !== 1)
      return { ok: false as const, reason: "edit_conflict" as const };
    let revoked = 0;
    if (role || status) {
      const r = await db
        .collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME)
        .updateMany(
          { userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] },
          { $set: { revokedAt: at } },
          { session: s },
        );
      revoked = r.modifiedCount;
    }
    const after = { ...doc, displayName: input.displayName, role: input.role, status: input.status };
    const fields: AdminUserAuditChangedField[] = [
      ...(name ? ["displayName" as const] : []),
      ...(role ? ["role" as const] : []),
      ...(status ? ["status" as const] : []),
      ...(revoked > 0 ? ["sessions" as const] : []),
    ];
    const action: AdminUserAuditAction = status
      ? input.status === "disabled"
        ? "disabled"
        : "reactivated"
      : role
        ? "role_changed"
        : "profile_updated";
    await insertAdminUserAuditEvent(
      db,
      audit(_id, action, input.actor, at, snap(doc), snap(after), fields, doc.updatedAt),
      s,
    );
    return { ok: true as const, id: input.id, revokedSessionCount: revoked, updatedAt: at.toISOString() };
  }, true);
}
export async function revokeAdminUserSessions(input: {
  id: string;
  expectedUpdatedAt: Date;
  actor: AdminPrincipal;
  now?: Date;
}) {
  return transaction(async (s) => {
    const db = await getMongoDatabase(),
      _id = new ObjectId(input.id),
      doc = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id }, { session: s });
    if (!doc) return { ok: false as const, reason: "not_found" as const };
    if (!isValidStoredAdminUser(doc)) return { ok: false as const, reason: "invalid_document" as const };
    if (doc.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return { ok: false as const, reason: "edit_conflict" as const };
    const count = await db
      .collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME)
      .countDocuments({ userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] }, { session: s });
    if (!count) return { ok: false as const, reason: "no_active_sessions" as const };
    const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.expectedUpdatedAt.getTime() + 1));
    const accountUpdate = await db
      .collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME)
      .updateOne({ _id, updatedAt: input.expectedUpdatedAt }, { $set: { updatedAt: at } }, { session: s });
    if (accountUpdate.matchedCount !== 1 || accountUpdate.modifiedCount !== 1)
      return { ok: false as const, reason: "edit_conflict" as const };
    const r = await db
      .collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME)
      .updateMany(
        { userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] },
        { $set: { revokedAt: at } },
        { session: s },
      );
    await insertAdminUserAuditEvent(
      db,
      audit(_id, "sessions_revoked", input.actor, at, snap(doc), snap(doc), ["sessions"], doc.updatedAt),
      s,
    );
    return {
      ok: true as const,
      id: input.id,
      revokedSessionCount: r.modifiedCount,
      selfRevoked: input.actor.id === input.id,
      updatedAt: at.toISOString(),
    };
  });
}
