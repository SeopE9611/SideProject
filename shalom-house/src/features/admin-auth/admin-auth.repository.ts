import { type Filter, ObjectId } from "mongodb";

import { getMongoDatabase } from "@/lib/mongodb";

import { isAdminRole, type AdminRole, type AdminUserStatus } from "./admin-auth.types";

export const ADMIN_USERS_COLLECTION_NAME = "admin_users";
export const ADMIN_SESSIONS_COLLECTION_NAME = "admin_sessions";
export const ADMIN_LOGIN_ATTEMPTS_COLLECTION_NAME = "admin_login_attempts";
export const ADMIN_SESSION_IDLE_TIMEOUT_SECONDS = 60 * 30;

export type AdminUserDocument = {
  _id: ObjectId;
  email: string;
  normalizedEmail: string;
  displayName: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminUserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type AdminSessionDocument = {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt?: Date;
  revokedAt: Date | null;
};

export type AdminLoginAttemptDocument = {
  _id: ObjectId;
  keyHash: string;
  failedCount: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
  expiresAt: Date;
  updatedAt: Date;
};

export async function findActiveAdminByNormalizedEmail(normalizedEmail: string): Promise<AdminUserDocument | null> {
  const database = await getMongoDatabase();
  const admin = await database.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({
    normalizedEmail,
    status: "active",
  });
  return admin && isAdminRole(admin.role) ? admin : null;
}

export async function updateAdminLastLoginAt(userId: ObjectId, now: Date) {
  const database = await getMongoDatabase();
  await database
    .collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME)
    .updateOne({ _id: userId }, { $set: { lastLoginAt: now, updatedAt: now } });
}

export async function createAdminSession(input: {
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}) {
  const database = await getMongoDatabase();
  await database.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).insertOne({
    _id: new ObjectId(),
    ...input,
    lastActivityAt: input.createdAt,
    revokedAt: null,
  });
}

export async function findActiveAdminBySessionHash(tokenHash: string, now: Date): Promise<AdminUserDocument | null> {
  const database = await getMongoDatabase();
  const sessionFilter: Filter<AdminSessionDocument> = {
    tokenHash,
    expiresAt: { $gt: now },
    lastActivityAt: { $type: "date", $gt: new Date(now.getTime() - ADMIN_SESSION_IDLE_TIMEOUT_SECONDS * 1000) },
    $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
  };
  const session = await database.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).findOne(sessionFilter);
  if (!session) return null;

  const admin = await database.collection<AdminUserDocument>(ADMIN_USERS_COLLECTION_NAME).findOne({
    _id: session.userId,
    status: "active",
  });
  if (!admin || !isAdminRole(admin.role)) return null;

  // 관리자 조회 중 만료·폐기될 수 있으므로 갱신 시점의 DB 시각으로 다시 판정한다.
  const activity = await database.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).updateOne(
    {
      ...sessionFilter,
      _id: session._id,
      $expr: {
        $and: [
          { $gt: ["$expiresAt", "$$NOW"] },
          { $gt: ["$lastActivityAt", { $subtract: ["$$NOW", ADMIN_SESSION_IDLE_TIMEOUT_SECONDS * 1000] }] },
        ],
      },
    },
    [{ $set: { lastActivityAt: { $max: ["$lastActivityAt", "$$NOW"] } } }],
  );
  return activity.matchedCount === 1 ? admin : null;
}

export async function revokeAdminSession(tokenHash: string, now: Date) {
  const database = await getMongoDatabase();
  await database.collection<AdminSessionDocument>(ADMIN_SESSIONS_COLLECTION_NAME).updateOne(
    {
      tokenHash,
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    },
    { $set: { revokedAt: now } },
  );
}

export async function getLoginAttempt(keyHash: string): Promise<AdminLoginAttemptDocument | null> {
  const database = await getMongoDatabase();
  return database.collection<AdminLoginAttemptDocument>(ADMIN_LOGIN_ATTEMPTS_COLLECTION_NAME).findOne({ keyHash });
}

export async function saveLoginAttempt(input: {
  keyHash: string;
  now: Date;
  windowMilliseconds: number;
  blockMilliseconds: number;
  failureLimit: number;
}): Promise<void> {
  const database = await getMongoDatabase();
  const windowStartCutoff = new Date(input.now.getTime() - input.windowMilliseconds);
  const blockedUntil = new Date(input.now.getTime() + input.blockMilliseconds);
  const expiresAt = new Date(blockedUntil.getTime() + input.windowMilliseconds);
  const startsNewWindow = {
    $or: [{ $eq: [{ $type: "$windowStartedAt" }, "missing"] }, { $lt: ["$windowStartedAt", windowStartCutoff] }],
  };

  await database.collection<AdminLoginAttemptDocument>(ADMIN_LOGIN_ATTEMPTS_COLLECTION_NAME).updateOne(
    { keyHash: input.keyHash },
    [
      {
        $set: {
          keyHash: input.keyHash,
          windowStartedAt: {
            $cond: [startsNewWindow, input.now, "$windowStartedAt"],
          },
          failedCount: {
            $cond: [startsNewWindow, 1, { $add: [{ $ifNull: ["$failedCount", 0] }, 1] }],
          },
          blockedUntil: {
            $cond: [startsNewWindow, null, { $ifNull: ["$blockedUntil", null] }],
          },
          updatedAt: input.now,
          expiresAt,
        },
      },
      {
        $set: {
          blockedUntil: {
            $cond: [{ $gte: ["$failedCount", input.failureLimit] }, blockedUntil, { $ifNull: ["$blockedUntil", null] }],
          },
        },
      },
    ],
    { upsert: true },
  );
}

export async function clearLoginAttempt(keyHash: string): Promise<void> {
  const database = await getMongoDatabase();
  await database.collection<AdminLoginAttemptDocument>(ADMIN_LOGIN_ATTEMPTS_COLLECTION_NAME).deleteOne({ keyHash });
}
