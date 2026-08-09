import "server-only";

import { ObjectId, type ClientSession, type Db } from "mongodb";

import { APPS_IN_TOSS_APP_NAME } from "./config";
import { sha256Hex } from "./crypto";

const CLAIM_TTL_MS = 10 * 60 * 1000;

type IdentityDocument = {
  _id: ObjectId;
  appName: string;
  userKey: string;
  userId: ObjectId;
  status: "active";
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
};

type UserDocument = {
  _id: ObjectId;
  name?: unknown;
  isDeleted?: boolean;
  isSuspended?: boolean;
};

export class AppsInTossAuthorizationCodeReplayError extends Error {
  constructor() {
    super("이미 사용된 인가 코드입니다. 새로 로그인해 주세요.");
    this.name = "AppsInTossAuthorizationCodeReplayError";
  }
}

export class AppsInTossUserUnavailableError extends Error {
  constructor() {
    super("로그인할 수 없는 사용자입니다.");
    this.name = "AppsInTossUserUnavailableError";
  }
}

export async function loadActiveAppsInTossUserKey(db: Db, identityId: ObjectId, userId: ObjectId) {
  const identity = await db.collection<Pick<IdentityDocument, "userKey">>("apps_in_toss_identities").findOne(
    { _id: identityId, userId, appName: APPS_IN_TOSS_APP_NAME, status: "active" },
    { projection: { userKey: 1 } },
  );
  if (!identity?.userKey) throw new AppsInTossUserUnavailableError();
  return identity.userKey;
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function hashAuthorizationCode(authorizationCode: string) {
  return sha256Hex(authorizationCode);
}

export async function claimAuthorizationCode(db: Db, authorizationCode: string) {
  const now = new Date();
  try {
    await db.collection("apps_in_toss_auth_code_claims").insertOne({
      codeHash: hashAuthorizationCode(authorizationCode),
      status: "processing",
      createdAt: now,
      expiresAt: new Date(now.getTime() + CLAIM_TTL_MS),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppsInTossAuthorizationCodeReplayError();
    throw error;
  }
  return hashAuthorizationCode(authorizationCode);
}

export async function completeAuthorizationCodeClaim(db: Db, codeHash: string) {
  await db.collection("apps_in_toss_auth_code_claims").updateOne(
    { codeHash, status: "processing" },
    { $set: { status: "completed" } },
  );
}

async function loadAvailableIdentityUser(db: Db, identity: IdentityDocument, session?: ClientSession) {
  const user = await db.collection<UserDocument>("users").findOne(
    { _id: identity.userId },
    session ? { session } : undefined,
  );
  if (!user || user.isDeleted === true || user.isSuspended === true || identity.status !== "active") {
    throw new AppsInTossUserUnavailableError();
  }
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (!name) throw new AppsInTossUserUnavailableError();
  return { identity, user: { _id: user._id, name } };
}

export async function findOrCreateAppsInTossUser(db: Db, userKey: string, decryptedName: string) {
  const identities = db.collection<IdentityDocument>("apps_in_toss_identities");
  const now = new Date();
  const mongoSession = db.client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const existing = await identities.findOne(
        { appName: APPS_IN_TOSS_APP_NAME, userKey },
        { session: mongoSession },
      );
      if (existing) {
        const available = await loadAvailableIdentityUser(db, existing, mongoSession);
        await identities.updateOne(
          { _id: existing._id },
          { $set: { updatedAt: now, lastLoginAt: now } },
          { session: mongoSession },
        );
        await db.collection("users").updateOne(
          { _id: existing.userId },
          { $set: { updatedAt: now, lastLoginAt: now } },
          { session: mongoSession },
        );
        return available;
      }

      const insertedUser = await db.collection("users").insertOne(
        {
          name: decryptedName,
          isDeleted: false,
          isSuspended: false,
          pointsBalance: 0,
          pointsDebt: 0,
          role: "user",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        },
        { session: mongoSession },
      );
      const identityId = new ObjectId();
      await identities.insertOne(
        {
          _id: identityId,
          appName: APPS_IN_TOSS_APP_NAME,
          userKey,
          userId: insertedUser.insertedId,
          status: "active",
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        },
        { session: mongoSession },
      );
      return {
        identity: {
          _id: identityId,
          appName: APPS_IN_TOSS_APP_NAME,
          userKey,
          userId: insertedUser.insertedId,
          status: "active" as const,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        },
        user: { _id: insertedUser.insertedId, name: decryptedName },
      };
    });
    if (!result) throw new AppsInTossUserUnavailableError();
    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const identity = await identities.findOne({ appName: APPS_IN_TOSS_APP_NAME, userKey });
      if (identity) return loadAvailableIdentityUser(db, identity);
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
}
