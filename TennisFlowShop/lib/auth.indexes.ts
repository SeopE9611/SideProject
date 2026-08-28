import type { Db, IndexDirection } from "mongodb";
import { hasMatchingIndex } from "@/lib/indexes.utils";

type Keys = Record<string, IndexDirection>;

type IndexSpec = {
  readonly keys: Keys;
  readonly options?: Record<string, unknown>;
  readonly name: string;
};

const LOGIN_SESSION_RETENTION_SECONDS = 60 * 60 * 24 * 90;

const AUTH_INDEX_SPECS: Readonly<Record<string, readonly IndexSpec[]>> = {
  // login-me의 userKey(number)는 양의 safe integer 검증 후 String(userKey)로 저장한다.
  apps_in_toss_identities: [
    {
      name: "apps_in_toss_identities_appName_userKey_unique",
      keys: { appName: 1, userKey: 1 },
      options: { unique: true },
    },
    {
      name: "apps_in_toss_identities_userId_idx",
      keys: { userId: 1 },
    },
  ],
  apps_in_toss_sessions: [
    {
      name: "apps_in_toss_sessions_tokenHash_unique",
      keys: { tokenHash: 1 },
      options: { unique: true },
    },
    {
      name: "apps_in_toss_sessions_userId_revokedAt_idx",
      keys: { userId: 1, revokedAt: 1 },
    },
    {
      name: "apps_in_toss_sessions_expiresAt_ttl",
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  apps_in_toss_auth_code_claims: [
    {
      name: "apps_in_toss_auth_code_claims_codeHash_unique",
      keys: { codeHash: 1 },
      options: { unique: true },
    },
    {
      name: "apps_in_toss_auth_code_claims_expiresAt_ttl",
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  oauth_pending_signups: [
    {
      name: "ttl_oauth_pending_expiresAt",
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  user_sessions: [
    {
      name: "user_sessions_user_at_desc",
      keys: { userId: 1, at: -1 },
    },
    {
      name: "user_sessions_at_ttl",
      keys: { at: 1 },
      options: { expireAfterSeconds: LOGIN_SESSION_RETENTION_SECONDS },
    },
  ],
  withdrawal_feedback: [
    {
      name: "withdrawal_feedback_expiresAt_ttl",
      keys: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
  ],
  auth_rate_limit_windows: [
    {
      name: "ttl_auth_rate_limit_expireAt",
      keys: { expireAt: 1 },
      options: { expireAfterSeconds: 0 },
    },
    {
      name: "auth_rate_limit_lookup_route_key_window_desc",
      keys: { routeId: 1, key: 1, windowStart: -1 },
    },
  ],
};

async function ensureCollectionIndexes(
  db: Db,
  collectionName: string,
  specs: readonly IndexSpec[],
) {
  const col = db.collection(collectionName);
  const existing = await col
    .listIndexes()
    .toArray()
    .catch(() => [] as any[]);

  for (const spec of specs) {
    if (hasMatchingIndex(existing as any[], spec)) continue;

    await col.createIndex(spec.keys, {
      name: spec.name,
      ...(spec.options ?? {}),
    });
  }
}

export async function ensureAuthIndexes(db: Db) {
  for (const [collectionName, specs] of Object.entries(AUTH_INDEX_SPECS)) {
    await ensureCollectionIndexes(db, collectionName, specs);
  }
}

export { AUTH_INDEX_SPECS };
