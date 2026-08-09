import "server-only";

import { randomBytes } from "node:crypto";
import type { Db, ObjectId } from "mongodb";

import { APPS_IN_TOSS_APP_NAME } from "./config";
import { sha256Hex } from "./crypto";

const APPS_SESSION_TTL_MS = 60 * 60 * 1000;

type AppsSessionDocument = {
  _id: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  identityId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};

export class AppsInTossSessionError extends Error {
  constructor() {
    super("유효한 Apps in Toss 세션이 필요합니다.");
    this.name = "AppsInTossSessionError";
  }
}

export function parseAppsBearerToken(authorizationHeader: string | null) {
  const match = authorizationHeader?.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  if (!match?.[1]) throw new AppsInTossSessionError();
  return match[1];
}

export function hashAppsSessionToken(rawToken: string) {
  return sha256Hex(rawToken);
}

export async function createAppsSession(db: Db, userId: ObjectId, identityId: ObjectId) {
  const sessionToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + APPS_SESSION_TTL_MS);
  await db.collection("apps_in_toss_sessions").insertOne({
    tokenHash: hashAppsSessionToken(sessionToken),
    userId,
    identityId,
    createdAt: now,
    expiresAt,
    lastSeenAt: now,
    revokedAt: null,
  });
  return { sessionToken, expiresAt };
}

export async function authenticateAppsSession(db: Db, authorizationHeader: string | null) {
  const rawToken = parseAppsBearerToken(authorizationHeader);
  const now = new Date();
  const session = await db.collection<AppsSessionDocument>("apps_in_toss_sessions").findOne({
    tokenHash: hashAppsSessionToken(rawToken),
    revokedAt: null,
    expiresAt: { $gt: now },
  });
  if (!session) throw new AppsInTossSessionError();

  const [user, identity] = await Promise.all([
    db.collection("users").findOne({ _id: session.userId }),
    db.collection("apps_in_toss_identities").findOne({
      _id: session.identityId,
      userId: session.userId,
      appName: APPS_IN_TOSS_APP_NAME,
      status: "active",
    }),
  ]);
  if (!user || !identity || user.isDeleted === true || user.isSuspended === true) {
    throw new AppsInTossSessionError();
  }
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (!name) throw new AppsInTossSessionError();
  return { session, user: { _id: user._id, name } };
}

export async function revokeAppsSession(db: Db, sessionId: ObjectId) {
  await db.collection("apps_in_toss_sessions").updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
