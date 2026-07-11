#!/usr/bin/env node
import { MongoClient } from "mongodb";

const HELP = new Set(["--help", "-h"]);
if (process.argv.some((arg) => HELP.has(arg))) {
  console.log(`읽기 전용 후기 중복 진단

사용법:
  pnpm db:check-review-duplicates

환경변수:
  MONGODB_URI      MongoDB 연결 문자열 (필수)
  MONGODB_DB       DB 이름 (기본값: tennis_academy)

Exit code:
  0  중복 없음
  2  중복 발견
  1  연결 또는 실행 오류

주의:
  이 스크립트는 reviews 컬렉션을 읽기만 하며 update/delete/merge를 수행하지 않습니다.`);
  process.exit(0);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[check-review-duplicates] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

const diagnostics = [
  {
    name: "rental",
    match: { rentalId: { $exists: true, $ne: null }, isDeleted: false },
    groupId: { userId: "$userId", rentalId: "$rentalId" },
  },
  {
    name: "product",
    match: {
      productId: { $exists: true, $ne: null },
      orderId: { $exists: true, $ne: null },
      isDeleted: false,
    },
    groupId: { userId: "$userId", productId: "$productId", orderId: "$orderId" },
  },
  {
    name: "standalone_service",
    match: { serviceApplicationId: { $exists: true, $ne: null }, isDeleted: false },
    groupId: { userId: "$userId", serviceApplicationId: "$serviceApplicationId" },
  },
];

function stringifyId(value) {
  if (value == null) return null;
  if (typeof value === "object" && typeof value.toString === "function") return value.toString();
  return String(value);
}

async function findDuplicates(db, spec) {
  return db
    .collection("reviews")
    .aggregate([
      { $match: spec.match },
      {
        $group: {
          _id: spec.groupId,
          count: { $sum: 1 },
          reviews: {
            $push: {
              _id: "$_id",
              createdAt: "$createdAt",
              status: "$status",
              reviewContext: "$reviewContext",
            },
          },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

let client;
try {
  client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  let totalGroups = 0;

  for (const spec of diagnostics) {
    const groups = await findDuplicates(db, spec);
    totalGroups += groups.length;
    console.log(`\n[${spec.name}] duplicate groups: ${groups.length}`);
    for (const group of groups) {
      console.log(JSON.stringify({
        key: Object.fromEntries(Object.entries(group._id).map(([key, value]) => [key, stringifyId(value)])),
        reviewIds: group.reviews.map((review) => stringifyId(review._id)),
        reviews: group.reviews.map((review) => ({
          id: stringifyId(review._id),
          createdAt: review.createdAt ?? null,
          status: review.status ?? null,
          reviewContext: review.reviewContext ?? null,
        })),
      }));
    }
  }

  if (totalGroups > 0) {
    console.error(`\n[check-review-duplicates] 중복 group ${totalGroups}개를 발견했습니다.`);
    process.exit(2);
  }

  console.log("\n[check-review-duplicates] 중복 group이 없습니다.");
  process.exit(0);
} catch (error) {
  console.error("[check-review-duplicates] 실행 오류", error);
  process.exit(1);
} finally {
  if (client) await client.close().catch(() => undefined);
}
