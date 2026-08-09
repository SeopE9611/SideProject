#!/usr/bin/env node
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { MongoClient } from "mongodb";

export const INDEX_NAME = "offline_customers_linkedUserId_unique";
export const INDEX_KEY = { linkedUserId: 1 };
export const TARGET_PARTIAL_FILTER = { linkedUserId: { $type: "objectId" } };

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isTargetIndex(index) {
  return (
    index?.name === INDEX_NAME &&
    stableStringify(index.key) === stableStringify(INDEX_KEY) &&
    index.unique === true &&
    index.sparse !== true &&
    stableStringify(index.partialFilterExpression) === stableStringify(TARGET_PARTIAL_FILTER)
  );
}

function fingerprint(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

export async function collectOfflineCustomerLinkedUserAudit(db) {
  const customers = db.collection("offline_customers");
  const [countsResult, duplicateGroups, indexes] = await Promise.all([
    customers
      .aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            missing: [
              { $match: { linkedUserId: { $exists: false } } },
              { $count: "count" },
            ],
            null: [
              { $match: { linkedUserId: null } },
              { $match: { linkedUserId: { $exists: true } } },
              { $count: "count" },
            ],
            objectId: [
              { $match: { linkedUserId: { $type: "objectId" } } },
              { $count: "count" },
            ],
            other: [
              {
                $match: {
                  linkedUserId: { $exists: true, $ne: null, $not: { $type: "objectId" } },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ])
      .next(),
    customers
      .aggregate([
        { $match: { linkedUserId: { $type: "objectId" } } },
        { $group: { _id: "$linkedUserId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    customers.listIndexes().toArray(),
  ]);

  const count = (key) => countsResult?.[key]?.[0]?.count ?? 0;
  const counts = {
    total: count("total"),
    missing: count("missing"),
    null: count("null"),
    objectId: count("objectId"),
    other: count("other"),
  };
  const namedIndexes = indexes.filter((index) => index.name === INDEX_NAME);
  const namedIndex = namedIndexes[0];
  const indexState =
    namedIndexes.length === 0
      ? "absent"
      : namedIndexes.length === 1 && isTargetIndex(namedIndex)
        ? "target"
        : "unexpected";
  const duplicates = duplicateGroups.map(({ _id, count: duplicateCount }) => ({
    fingerprint: fingerprint(_id),
    count: duplicateCount,
  }));

  let status = "SAFE_TO_MIGRATE";
  if (indexState === "unexpected") status = "BLOCKED_UNEXPECTED_INDEX_STATE";
  else if (duplicates.length > 0) status = "BLOCKED_DUPLICATE_LINKED_USER_ID";
  else if (counts.other > 0) status = "BLOCKED_INVALID_LINKED_USER_ID_DATA";
  else if (indexState === "target") status = "ALREADY_MIGRATED";

  return { counts, duplicates, namedIndex, indexState, status };
}

function safeIndexView(index) {
  return {
    name: index?.name,
    key: index?.key,
    unique: index?.unique === true,
    sparse: index?.sparse === true,
    partialFilterExpression: index?.partialFilterExpression ?? null,
  };
}

export function printOfflineCustomerLinkedUserAudit(audit) {
  console.log("[offline customer linked user audit] 문서 타입 통계", audit.counts);
  console.log("[offline customer linked user audit] ObjectId 중복", audit.duplicates);
  console.log(
    `[offline customer linked user audit] ${INDEX_NAME}`,
    safeIndexView(audit.namedIndex),
  );
  console.log(`[offline customer linked user audit] RESULT=${audit.status}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "tennis_academy";
  if (!uri) throw new Error("MONGODB_URI 환경 변수가 필요합니다.");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const audit = await collectOfflineCustomerLinkedUserAudit(client.db(dbName));
    printOfflineCustomerLinkedUserAudit(audit);
    if (!["SAFE_TO_MIGRATE", "ALREADY_MIGRATED"].includes(audit.status)) process.exitCode = 2;
  } finally {
    await client.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      "[offline customer linked user audit] 실패:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
