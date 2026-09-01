import { MongoServerError, ObjectId, type ClientSession } from "mongodb";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import { ADMIN_SESSIONS_COLLECTION_NAME, ADMIN_USERS_COLLECTION_NAME, type AdminSessionDocument, type AdminUserDocument } from "@/features/admin-auth/admin-auth.repository";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { hashAdminPassword } from "@/features/admin-auth/password";
import type { AdminUserDetail, AdminUserListFilters, AdminUserListItem } from "./admin-user.types";
import { isValidStoredAdminUser, type CreateAdminUserValue, type UpdateAdminUserValue } from "./admin-user.validation";
import { insertAdminUserAuditEvent, listAdminUserAuditEvents } from "./admin-user.audit-repository";
import type { AdminUserAuditAction, AdminUserAuditChangedField, AdminUserAuditSnapshot, MongoAdminUserAuditEvent } from "./admin-user.audit";

export const ADMIN_USER_MANAGEMENT_STATE_COLLECTION_NAME = "admin_user_management_state";
type StateDocument = { _id: "active-admin-guard"; version: number; createdAt: Date; updatedAt: Date };
const objectId = (value: string) => /^[0-9a-f]{24}$/.test(value) && new ObjectId(value).toHexString() === value ? new ObjectId(value) : null;
const snapshot = (d: AdminUserDocument): AdminUserAuditSnapshot => ({ email: d.email, displayName: d.displayName, role: d.role, status: d.status });
const actor = (a: AdminPrincipal) => ({ adminId: new ObjectId(a.id), displayName: a.displayName, role: a.role });
const retryable = (error: unknown) => error instanceof MongoServerError && (error.hasErrorLabel("TransientTransactionError") || error.hasErrorLabel("UnknownTransactionCommitResult"));
async function transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  let original: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = await getMongoClient(), session = client.startSession();
    try { return await session.withTransaction(() => work(session), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } }); }
    catch (error) { original ??= error; if (!retryable(error) || attempt === 2) throw original; }
    finally { await session.endSession(); }
  }
  throw original;
}
function event(input: { id: ObjectId; action: AdminUserAuditAction; actor: AdminPrincipal; at: Date; from: Date | null; before: AdminUserDocument | null; after: AdminUserDocument; fields: AdminUserAuditChangedField[] }): MongoAdminUserAuditEvent {
  return { _id: new ObjectId(), schemaVersion: 1, adminUserId: input.id, action: input.action, actor: actor(input.actor), occurredAt: input.at, fromVersionAt: input.from, toVersionAt: input.at, before: input.before ? snapshot(input.before) : null, after: snapshot(input.after), changedFields: input.fields };
}
async function sessionCounts(ids: ObjectId[], now: Date) {
  if (!ids.length) return new Map<string, number>();
  const db = await getMongoDatabase();
  const rows = await db.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).aggregate<{ _id: ObjectId; count: number }>([
    { $match: { userId: { $in: ids }, expiresAt: { $gt: now }, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]).toArray();
  return new Map(rows.map((row) => [row._id.toHexString(), row.count]));
}
const item = (d: AdminUserDocument, counts: Map<string, number>, current: string): AdminUserListItem => ({ id: d._id.toHexString(), email: d.email, displayName: d.displayName, role: d.role, status: d.status, lastLoginAt: d.lastLoginAt?.toISOString() ?? null, updatedAt: d.updatedAt.toISOString(), activeSessionCount: counts.get(d._id.toHexString()) ?? 0, isCurrentUser: d._id.toHexString() === current });
export async function listAdminUsers(input: { page: number; pageSize: number; filters: AdminUserListFilters; currentAdminId: string; now: Date }) {
  const db = await getMongoDatabase();
  const valid = (await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).find().toArray()).filter(isValidStoredAdminUser).filter((d) => (!input.filters.role || d.role === input.filters.role) && (!input.filters.status || d.status === input.filters.status)).sort((a, b) => (a.status === b.status ? a.displayName.localeCompare(b.displayName, "ko") || a._id.toHexString().localeCompare(b._id.toHexString()) : a.status === "active" ? -1 : 1));
  const page = valid.slice((input.page - 1) * input.pageSize, input.page * input.pageSize), counts = await sessionCounts(page.map((d) => d._id), input.now);
  return { total: valid.length, items: page.map((d) => item(d, counts, input.currentAdminId)) };
}
export async function getAdminUserCounts() {
  const db = await getMongoDatabase(), users = (await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).find().toArray()).filter(isValidStoredAdminUser);
  return { total: users.length, active: users.filter((d) => d.status === "active").length, disabled: users.filter((d) => d.status === "disabled").length, activeAdmins: users.filter((d) => d.role === "admin" && d.status === "active").length };
}
export async function getAdminUserDetail(id: string, currentAdminId: string, now: Date) {
  const _id = objectId(id); if (!_id) return { ok: false as const, reason: "not_found" as const };
  const db = await getMongoDatabase(), d = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id });
  if (!d) return { ok: false as const, reason: "not_found" as const };
  if (!isValidStoredAdminUser(d)) return { ok: false as const, reason: "invalid_document" as const };
  const counts = await sessionCounts([_id], now), detail: AdminUserDetail = { ...item(d, counts, currentAdminId), createdAt: d.createdAt.toISOString() };
  return { ok: true as const, user: detail, audit: await listAdminUserAuditEvents(db, _id) };
}
export async function createAdminUser(input: { value: CreateAdminUserValue; actor: AdminPrincipal; now?: Date }) {
  const passwordHash = await hashAdminPassword(input.value.user.password), at = input.now ?? new Date(), _id = new ObjectId();
  const d: AdminUserDocument = { _id, email: input.value.user.email, normalizedEmail: input.value.user.normalizedEmail, displayName: input.value.user.displayName, passwordHash, role: input.value.user.role, status: "active", createdAt: at, updatedAt: at, lastLoginAt: null };
  try { return await transaction(async (session) => { const db = await getMongoDatabase(); await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).insertOne(d, { session }); await insertAdminUserAuditEvent(db, event({ id: _id, action: "created", actor: input.actor, at, from: null, before: null, after: d, fields: ["email", "displayName", "role", "status"] }), session); return { ok: true as const, id: _id.toHexString() }; }); }
  catch (error) { if (error instanceof MongoServerError && error.code === 11000) return { ok: false as const, reason: "email_conflict" as const }; throw error; }
}
export async function updateAdminUser(input: { id: string; value: UpdateAdminUserValue; actor: AdminPrincipal; now?: Date }) {
  const _id = objectId(input.id); if (!_id) return { ok: false as const, reason: "not_found" as const };
  return transaction(async (session) => { const db = await getMongoDatabase(), old = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id }, { session });
    if (!old) return { ok: false as const, reason: "not_found" as const }; if (!isValidStoredAdminUser(old)) return { ok: false as const, reason: "invalid_document" as const }; if (old.updatedAt.getTime() !== input.value.expectedUpdatedAt.getTime()) return { ok: false as const, reason: "edit_conflict" as const };
    const roleChanged = old.role !== input.value.user.role, statusChanged = old.status !== input.value.user.status, nameChanged = old.displayName !== input.value.user.displayName;
    if (!roleChanged && !statusChanged && !nameChanged) return { ok: false as const, reason: "no_change" as const };
    if (_id.toHexString() === input.actor.id && (roleChanged || statusChanged)) return { ok: false as const, reason: "self_role_status_change" as const };
    const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.value.expectedUpdatedAt.getTime() + 1));
    if (roleChanged || statusChanged) { await db.collection<StateDocument>(ADMIN_USER_MANAGEMENT_STATE_COLLECTION_NAME).updateOne({ _id: "active-admin-guard" }, { $inc: { version: 1 }, $set: { updatedAt: at }, $setOnInsert: { createdAt: at } }, { upsert: true, session });
      if (old.role === "admin" && old.status === "active" && (input.value.user.role !== "admin" || input.value.user.status !== "active")) { const candidates = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).find({ role: "admin", status: "active" }, { session }).toArray(); if (candidates.filter(isValidStoredAdminUser).length <= 1) return { ok: false as const, reason: "last_active_admin" as const }; }
    }
    const next: AdminUserDocument = { ...old, ...input.value.user, updatedAt: at }, fields: AdminUserAuditChangedField[] = [...(nameChanged ? ["displayName" as const] : []), ...(roleChanged ? ["role" as const] : []), ...(statusChanged ? ["status" as const] : [])];
    const updated = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).replaceOne({ _id, updatedAt: input.value.expectedUpdatedAt }, next, { session }); if (!updated.matchedCount) return { ok: false as const, reason: "edit_conflict" as const };
    let revokedSessionCount = 0; if (roleChanged || statusChanged) { const revoked = await db.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).updateMany({ userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] }, { $set: { revokedAt: at } }, { session }); revokedSessionCount = revoked.modifiedCount; }
    const action: AdminUserAuditAction = statusChanged ? next.status === "disabled" ? "disabled" : "reactivated" : roleChanged ? "role_changed" : "profile_updated"; await insertAdminUserAuditEvent(db, event({ id: _id, action, actor: input.actor, at, from: old.updatedAt, before: old, after: next, fields }), session); return { ok: true as const, id: input.id, revokedSessionCount, updatedAt: at.toISOString() };
  });
}
export async function revokeAdminUserSessions(input: { id: string; expectedUpdatedAt: Date; actor: AdminPrincipal; now?: Date }) {
  const _id = objectId(input.id); if (!_id) return { ok: false as const, reason: "not_found" as const };
  return transaction(async (session) => { const db = await getMongoDatabase(), old = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({ _id }, { session }); if (!old) return { ok: false as const, reason: "not_found" as const }; if (!isValidStoredAdminUser(old)) return { ok: false as const, reason: "invalid_document" as const }; if (old.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return { ok: false as const, reason: "edit_conflict" as const };
    const sessions = await db.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).countDocuments({ userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] }, { session }); if (!sessions) return { ok: false as const, reason: "no_active_sessions" as const }; const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.expectedUpdatedAt.getTime() + 1)); const updated = await db.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).updateOne({ _id, updatedAt: input.expectedUpdatedAt }, { $set: { updatedAt: at } }, { session }); if (!updated.matchedCount) return { ok: false as const, reason: "edit_conflict" as const }; const revoked = await db.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).updateMany({ userId: _id, $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }] }, { $set: { revokedAt: at } }, { session }); const next = { ...old, updatedAt: at }; await insertAdminUserAuditEvent(db, event({ id: _id, action: "sessions_revoked", actor: input.actor, at, from: old.updatedAt, before: old, after: next, fields: ["sessions"] }), session); return { ok: true as const, id: input.id, revokedSessionCount: revoked.modifiedCount, selfRevoked: input.actor.id === input.id, updatedAt: at.toISOString() }; });
}
