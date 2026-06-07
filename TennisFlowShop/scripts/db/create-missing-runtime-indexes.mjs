#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const prefix = "[create-missing-runtime-indexes]";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const unknownArgs = args.filter((arg) => arg !== "--apply");

const indexSpecs = [
  {
    collection: "user_sessions",
    name: "user_sessions_user_at_desc",
    keys: { userId: 1, at: -1 },
    options: {},
  },
  {
    collection: "reviews",
    name: "user_createdAt",
    keys: { userId: 1, createdAt: -1 },
    options: {},
  },
  {
    collection: "board_posts",
    name: "boards_list_compound",
    keys: { type: 1, status: 1, isPinned: -1, createdAt: -1 },
    options: {},
  },
  {
    collection: "oauth_pending_signups",
    name: "ttl_oauth_pending_expiresAt",
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: "admin_locks",
    name: "admin_locks_key_unique",
    keys: { key: 1 },
    options: { unique: true },
  },
  {
    collection: "wishlists",
    name: "wishlist_user_product_unique",
    keys: { userId: 1, productId: 1 },
    options: { unique: true },
  },
  {
    collection: "community_likes",
    name: "community_likes_post_user_unique",
    keys: { postId: 1, userId: 1 },
    options: { unique: true },
  },
  {
    collection: "users",
    name: "users_email_unique",
    keys: { email: 1 },
    options: { unique: true, background: true },
  },
];

function label(spec) {
  return `${spec.collection}.${spec.name}`;
}

function printPlan(mode) {
  console.log(`${prefix} ${mode}`);
  console.log(`${prefix} planned index count: ${indexSpecs.length}`);
  for (const spec of indexSpecs) console.log(`${prefix} ${label(spec)}`);
  console.warn(
    `${prefix} TTL_WARNING oauth_pending_signups.ttl_oauth_pending_expiresAt 생성 후 이미 만료된 pending 문서가 삭제될 수 있습니다.`,
  );
}

function hasMatchingIndex(indexes, spec) {
  const expectedKey = JSON.stringify(spec.keys);
  return indexes.some((index) => {
    if (JSON.stringify(index.key) !== expectedKey) return false;
    if (Boolean(index.unique) !== Boolean(spec.options.unique)) return false;
    return (
      (index.expireAfterSeconds ?? null) ===
      (spec.options.expireAfterSeconds ?? null)
    );
  });
}

function runUniqueConflictAudit() {
  console.log(`${prefix} UNIQUE_CONFLICT_AUDIT_START`);
  const auditPath = fileURLToPath(
    new URL("./audit-unique-index-conflicts.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [auditPath], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.status === 2) {
    console.error(`${prefix} UNIQUE_CONFLICTS_FOUND; no indexes were created.`);
    return 2;
  }
  if (result.status !== 0) {
    console.error(
      `${prefix} UNIQUE_CONFLICT_AUDIT_FAILED; no indexes were created.`,
    );
    return 1;
  }

  console.log(`${prefix} UNIQUE_CONFLICT_AUDIT_PASSED`);
  return 0;
}

async function createIndexes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    for (const spec of indexSpecs) {
      try {
        const collection = db.collection(spec.collection);
        const existing = await collection
          .listIndexes()
          .toArray()
          .catch((error) => {
            if (error?.code === 26 || error?.codeName === "NamespaceNotFound") {
              return [];
            }
            throw error;
          });

        if (hasMatchingIndex(existing, spec)) {
          console.log(`${prefix} ALREADY_EXISTS ${label(spec)}`);
          continue;
        }

        await collection.createIndex(spec.keys, {
          name: spec.name,
          ...spec.options,
        });
        console.log(`${prefix} CREATED ${label(spec)}`);
      } catch {
        console.error(`${prefix} FAILED ${label(spec)}`);
        process.exitCode = 1;
        return;
      }
    }
  } finally {
    await client.close();
  }
}

async function main() {
  if (!uri) {
    console.error(`${prefix} MONGODB_URI 환경 변수가 필요합니다.`);
    process.exitCode = 1;
    return;
  }
  if (unknownArgs.length > 0) {
    console.error(`${prefix} 지원하지 않는 옵션이 있습니다.`);
    process.exitCode = 1;
    return;
  }

  printPlan(apply ? "APPLY" : "DRY_RUN");
  if (!apply) return;

  const auditExitCode = runUniqueConflictAudit();
  if (auditExitCode !== 0) {
    process.exitCode = auditExitCode;
    return;
  }

  await createIndexes();
}

main().catch(() => {
  console.error(`${prefix} FAILED`);
  process.exitCode = 1;
});
