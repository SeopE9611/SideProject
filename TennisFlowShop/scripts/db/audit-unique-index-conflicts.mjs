#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error(
    "[audit-unique-index-conflicts] MONGODB_URI 환경 변수가 필요합니다.",
  );
  process.exit(1);
}

const client = new MongoClient(uri);

const normalizeNullOrMissing = (field) => ({
  $ifNull: [`$${field}`, null],
});

const duplicateSummaryPipeline = (fields) => [
  {
    $group: {
      _id: Object.fromEntries(
        fields.map((field) => [field, normalizeNullOrMissing(field)]),
      ),
      documentCount: { $sum: 1 },
    },
  },
  { $match: { documentCount: { $gt: 1 } } },
  {
    $group: {
      _id: null,
      duplicateGroups: { $sum: 1 },
      conflictDocuments: { $sum: "$documentCount" },
    },
  },
];

const nullOrMissingDuplicateSummaryPipeline = (fields) => [
  {
    $group: {
      _id: Object.fromEntries(
        fields.map((field) => [field, normalizeNullOrMissing(field)]),
      ),
      documentCount: { $sum: 1 },
      hasNullOrMissing: {
        $max: {
          $cond: [
            {
              $or: fields.map((field) => ({
                $eq: [normalizeNullOrMissing(field), null],
              })),
            },
            1,
            0,
          ],
        },
      },
    },
  },
  { $match: { documentCount: { $gt: 1 }, hasNullOrMissing: 1 } },
  {
    $group: {
      _id: null,
      duplicateGroups: { $sum: 1 },
      conflictDocuments: { $sum: "$documentCount" },
    },
  },
];

const normalizedEmailDuplicateSummaryPipeline = [
  { $match: { email: { $type: "string" } } },
  {
    $group: {
      _id: { $toLower: { $trim: { input: "$email" } } },
      documentCount: { $sum: 1 },
    },
  },
  { $match: { documentCount: { $gt: 1 } } },
  {
    $group: {
      _id: null,
      duplicateGroups: { $sum: 1 },
      conflictDocuments: { $sum: "$documentCount" },
    },
  },
];

async function summarize(collection, pipeline) {
  const [summary] = await collection.aggregate(pipeline).toArray();
  return {
    duplicateGroups: summary?.duplicateGroups ?? 0,
    conflictDocuments: summary?.conflictDocuments ?? 0,
  };
}

function printSummary(label, summary) {
  console.log(
    `[audit-unique-index-conflicts] ${label}: duplicateGroups=${summary.duplicateGroups}, conflictDocuments=${summary.conflictDocuments}`,
  );
}

async function main() {
  await client.connect();
  const db = client.db(dbName);

  const usersEmail = await summarize(
    db.collection("users"),
    duplicateSummaryPipeline(["email"]),
  );
  const usersEmailNullOrMissing = await summarize(
    db.collection("users"),
    nullOrMissingDuplicateSummaryPipeline(["email"]),
  );
  const usersEmailNormalizedReference = await summarize(
    db.collection("users"),
    normalizedEmailDuplicateSummaryPipeline,
  );
  const wishlistsUserProduct = await summarize(
    db.collection("wishlists"),
    duplicateSummaryPipeline(["userId", "productId"]),
  );
  const wishlistsNullOrMissing = await summarize(
    db.collection("wishlists"),
    nullOrMissingDuplicateSummaryPipeline(["userId", "productId"]),
  );
  const communityLikesPostUser = await summarize(
    db.collection("community_likes"),
    duplicateSummaryPipeline(["postId", "userId"]),
  );
  const communityLikesNullOrMissing = await summarize(
    db.collection("community_likes"),
    nullOrMissingDuplicateSummaryPipeline(["postId", "userId"]),
  );
  const adminLocksKey = await summarize(
    db.collection("admin_locks"),
    duplicateSummaryPipeline(["key"]),
  );
  const adminLocksKeyNullOrMissing = await summarize(
    db.collection("admin_locks"),
    nullOrMissingDuplicateSummaryPipeline(["key"]),
  );

  printSummary("users.email duplicate groups", usersEmail);
  printSummary(
    "users.email null/missing conflict candidates",
    usersEmailNullOrMissing,
  );
  printSummary(
    "users.email trim/lowercase reference candidates (not direct index-key conflicts)",
    usersEmailNormalizedReference,
  );
  printSummary(
    "wishlists userId+productId duplicate groups",
    wishlistsUserProduct,
  );
  printSummary(
    "wishlists userId+productId null/missing conflict candidates",
    wishlistsNullOrMissing,
  );
  printSummary(
    "community_likes postId+userId duplicate groups",
    communityLikesPostUser,
  );
  printSummary(
    "community_likes postId+userId null/missing conflict candidates",
    communityLikesNullOrMissing,
  );
  printSummary("admin_locks key duplicate groups", adminLocksKey);
  printSummary(
    "admin_locks key null/missing conflict candidates",
    adminLocksKeyNullOrMissing,
  );

  const directConflictGroupCount =
    usersEmail.duplicateGroups +
    wishlistsUserProduct.duplicateGroups +
    communityLikesPostUser.duplicateGroups +
    adminLocksKey.duplicateGroups;

  if (directConflictGroupCount > 0) {
    console.log(
      `[audit-unique-index-conflicts] UNIQUE_CONFLICTS_FOUND: duplicateGroups=${directConflictGroupCount}`,
    );
    process.exitCode = 2;
    return;
  }

  console.log("[audit-unique-index-conflicts] UNIQUE_CONFLICTS_NONE");
}

main()
  .catch((error) => {
    console.error(
      `[audit-unique-index-conflicts] 스크립트 오류: ${error?.name ?? "UnknownError"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
