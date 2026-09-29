#!/usr/bin/env node
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { MongoClient } from "mongodb";

export const INDEX_NAME = "users_email_unique";
export const LEGACY_INDEX_NAMES = ["email_1", INDEX_NAME];
export const INDEX_KEY = { email: 1 };
export const TARGET_PARTIAL_FILTER = { email: { $type: "string" } };

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

function isNamedEmailIndex(index) {
  return index.name === INDEX_NAME;
}

function isAllowedLegacyIndexName(index) {
  return LEGACY_INDEX_NAMES.includes(index.name);
}

function hasExpectedKey(index) {
  return stableStringify(index.key) === stableStringify(INDEX_KEY);
}

export function classifyEmailIndex(index) {
  if (!index || !hasExpectedKey(index) || index.unique !== true) {
    return "unexpected";
  }
  if (index.sparse !== undefined && index.sparse !== false) return "unexpected";
  if (index.partialFilterExpression === undefined) {
    return isAllowedLegacyIndexName(index) ? "legacy" : "unexpected";
  }
  if (
    isNamedEmailIndex(index) &&
    stableStringify(index.partialFilterExpression) === stableStringify(TARGET_PARTIAL_FILTER)
  ) {
    return "target";
  }
  return "unexpected";
}

export function classifyEmailIndexes(emailIndexes) {
  if (emailIndexes.length !== 1) return { indexState: "unexpected", emailIndex: undefined };
  const emailIndex = emailIndexes[0];
  return { indexState: classifyEmailIndex(emailIndex), emailIndex };
}

function fingerprint(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function summarizeDuplicates(groups) {
  return groups.map(({ _id, count }) => ({ fingerprint: fingerprint(_id), count }));
}

export async function collectUsersEmailAudit(db) {
  const users = db.collection("users");
  const [countsResult, exactDuplicates, lowercaseDuplicates, indexes] = await Promise.all([
    users
      .aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            missing: [{ $match: { email: { $exists: false } } }, { $count: "count" }],
            null: [{ $match: { email: null } }, { $match: { email: { $exists: true } } }, { $count: "count" }],
            strings: [{ $match: { email: { $type: "string" } } }, { $count: "count" }],
            trimmedEmpty: [
              { $match: { email: { $type: "string" } } },
              { $match: { $expr: { $eq: [{ $trim: { input: "$email" } }, ""] } } },
              { $count: "count" },
            ],
            nonEmptyStrings: [
              { $match: { email: { $type: "string" } } },
              { $match: { $expr: { $ne: [{ $trim: { input: "$email" } }, ""] } } },
              { $count: "count" },
            ],
          },
        },
      ])
      .next(),
    users
      .aggregate([
        { $match: { email: { $type: "string" } } },
        { $group: { _id: "$email", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    users
      .aggregate([
        { $match: { email: { $type: "string" } } },
        { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    users.listIndexes().toArray(),
  ]);

  const count = (key) => countsResult?.[key]?.[0]?.count ?? 0;
  const emailIndexes = indexes.filter(
    (index) => isNamedEmailIndex(index) || Object.hasOwn(index.key ?? {}, "email"),
  );
  const { indexState, emailIndex } = classifyEmailIndexes(emailIndexes);
  const counts = {
    total: count("total"),
    missing: count("missing"),
    null: count("null"),
    strings: count("strings"),
    trimmedEmpty: count("trimmedEmpty"),
    nonEmptyStrings: count("nonEmptyStrings"),
  };

  let status = "SAFE_TO_MIGRATE";
  if (indexState === "target") status = "ALREADY_MIGRATED";
  else if (indexState !== "legacy") status = "BLOCKED_UNEXPECTED_INDEX_STATE";
  else if (exactDuplicates.length > 0) status = "BLOCKED_DUPLICATE_EMAIL";
  else if (counts.trimmedEmpty > 0) status = "BLOCKED_INVALID_EMAIL_DATA";

  return {
    counts,
    exactDuplicates: summarizeDuplicates(exactDuplicates),
    lowercaseDuplicates: summarizeDuplicates(lowercaseDuplicates),
    emailIndexes,
    emailIndex,
    indexState,
    status,
  };
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

export function printUsersEmailAudit(audit) {
  console.log("[users email audit] 문서 통계", audit.counts);
  console.log("[users email audit] 동일 email 중복", audit.exactDuplicates);
  console.log("[users email audit] lowercase 기준 중복", audit.lowercaseDuplicates);
  console.log(
    "[users email audit] email 관련 indexes",
    audit.emailIndexes.map(safeIndexView),
  );
  console.log("[users email audit] 판정 대상 index", safeIndexView(audit.emailIndex));
  console.log(`[users email audit] RESULT=${audit.status}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "tennis_academy";
  if (!uri) throw new Error("MONGODB_URI 환경 변수가 필요합니다.");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const audit = await collectUsersEmailAudit(client.db(dbName));
    printUsersEmailAudit(audit);
    if (!["SAFE_TO_MIGRATE", "ALREADY_MIGRATED"].includes(audit.status)) process.exitCode = 2;
  } finally {
    await client.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[users email audit] 실패:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
