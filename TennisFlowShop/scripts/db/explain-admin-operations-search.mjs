#!/usr/bin/env node
import { ObjectId, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error(
    "[explain-admin-operations-search] MONGODB_URI 환경 변수가 필요합니다.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const qArg = args.find((arg) => !arg.startsWith("--")) ?? "";
const q = String(qArg).trim().toLowerCase();
const fetchLimitArg = args.find((arg) => arg.startsWith("--fetch-limit="));
const fetchLimitRaw = Number(fetchLimitArg?.split("=")[1] ?? 200);
const fetchLimit = Number.isFinite(fetchLimitRaw)
  ? Math.max(1, Math.min(5000, Math.trunc(fetchLimitRaw)))
  : 200;

if (!q) {
  console.error(
    "[explain-admin-operations-search] 사용법: node scripts/db/explain-admin-operations-search.mjs <query> [--fetch-limit=200]",
  );
  process.exit(1);
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchRegex(value) {
  return new RegExp(escapeRegex(value), "i");
}

function buildPrefixRegex(value) {
  return new RegExp(`^${escapeRegex(value)}`, "i");
}

function buildIdCandidates(value) {
  const candidates = [value];
  if (ObjectId.isValid(value)) candidates.push(new ObjectId(value));
  return candidates;
}

function collectStages(plan, out = []) {
  if (!plan || typeof plan !== "object") return out;

  if (Array.isArray(plan)) {
    for (const item of plan) collectStages(item, out);
    return out;
  }

  const stage = plan.stage || plan.queryPlan?.stage || null;
  if (stage) {
    out.push({
      stage,
      indexName: plan.indexName ?? plan.queryPlan?.indexName ?? null,
      keyPattern: plan.keyPattern ?? plan.queryPlan?.keyPattern ?? null,
    });
  }

  const nestedKeys = [
    "inputStage",
    "inputStages",
    "children",
    "shards",
    "winningPlan",
    "queryPlan",
    "executionStages",
    "thenStage",
    "elseStage",
    "outerStage",
    "innerStage",
  ];

  for (const key of nestedKeys) {
    if (key in plan) collectStages(plan[key], out);
  }

  return out;
}

function summarizeExplain(explainDoc) {
  const queryPlanner = explainDoc?.queryPlanner ?? null;
  const executionStats = explainDoc?.executionStats ?? null;
  const winningPlan = queryPlanner?.winningPlan ?? null;

  const stages = collectStages(winningPlan);
  const ixStages = stages.filter((s) => s.stage === "IXSCAN");

  return {
    winningStages: stages.map((stage) => stage.stage),
    indexUsed: ixStages.length > 0,
    indexHints: ixStages.map((stage) => ({
      indexName: stage.indexName,
      keyPattern: stage.keyPattern,
    })),
    keysExamined: executionStats?.totalKeysExamined ?? null,
    docsExamined: executionStats?.totalDocsExamined ?? null,
    nReturned: executionStats?.nReturned ?? null,
  };
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printQuery(label, query) {
  console.log(`- ${label}: ${JSON.stringify(query)}`);
}

async function run() {
  const qRegex = buildSearchRegex(q);
  const qPrefixRegex = buildPrefixRegex(q);
  const idCandidates = buildIdCandidates(q);

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);

    printSection("admin operations search explain");
    console.log(`query=${q}`);
    console.log(`db=${dbName}`);
    console.log(`fetchLimit=${fetchLimit}`);

    const matchedUsers = await db
      .collection("users")
      .find({ $or: [{ name: qRegex }, { email: qRegex }] })
      .project({ _id: 1 })
      .limit(fetchLimit)
      .toArray();

    const rentalUserIdCandidates = matchedUsers
      .map((user) => String(user?._id ?? ""))
      .filter(Boolean)
      .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));

    const appQuery = {
      status: { $ne: "draft" },
      $or: [
        { _id: { $in: idCandidates } },
        { stringingApplicationId: { $in: idCandidates } },
        { orderId: { $in: idCandidates } },
        { rentalId: { $in: idCandidates } },
        { stringingApplicationId: qPrefixRegex },
        { orderId: qPrefixRegex },
        { rentalId: qPrefixRegex },
        { "customer.name": qRegex },
        { "customer.email": qRegex },
        { "userSnapshot.name": qRegex },
        { "userSnapshot.email": qRegex },
        { guestName: qRegex },
        { guestEmail: qRegex },
        { paymentSource: qPrefixRegex },
      ],
    };

    const orderQuery = {
      $or: [
        { _id: { $in: idCandidates } },
        { stringingApplicationId: { $in: idCandidates } },
        { stringingApplicationId: qPrefixRegex },
        { "customer.name": qRegex },
        { "customer.email": qRegex },
        { "userSnapshot.name": qRegex },
        { "userSnapshot.email": qRegex },
        { "guestInfo.name": qRegex },
        { "guestInfo.email": qRegex },
        { "items.title": qRegex },
        { "items.productName": qRegex },
        { "items.name": qRegex },
      ],
    };

    const rentalQuery = {
      $or: [
        { _id: { $in: idCandidates } },
        { stringingApplicationId: { $in: idCandidates } },
        { userId: { $in: idCandidates } },
        { stringingApplicationId: qPrefixRegex },
        { userId: qPrefixRegex },
        ...(rentalUserIdCandidates.length > 0
          ? [{ userId: { $in: rentalUserIdCandidates } }]
          : []),
        { "guest.name": qRegex },
        { "guest.email": qRegex },
        { brand: qRegex },
        { model: qRegex },
      ],
    };

    const checks = [
      {
        label: "users prelookup(name/email contains)",
        collection: "users",
        query: { $or: [{ name: qRegex }, { email: qRegex }] },
        sort: null,
      },
      {
        label: "orders candidate query",
        collection: "orders",
        query: orderQuery,
        sort: { createdAt: -1 },
      },
      {
        label: "rental_orders candidate query",
        collection: "rental_orders",
        query: rentalQuery,
        sort: { createdAt: -1 },
      },
      {
        label: "stringing_applications candidate query",
        collection: "stringing_applications",
        query: appQuery,
        sort: { createdAt: -1 },
      },
    ];

    for (const check of checks) {
      printSection(check.label);
      printQuery(`${check.collection}.find`, check.query);

      let cursor = db.collection(check.collection).find(check.query).limit(fetchLimit);
      if (check.sort) cursor = cursor.sort(check.sort);

      const explain = await cursor.explain("executionStats");
      const summary = summarizeExplain(explain);

      console.log(`- winningStages: ${summary.winningStages.join(" -> ") || "(none)"}`);
      console.log(`- indexUsed: ${summary.indexUsed ? "YES" : "NO"}`);
      if (summary.indexHints.length > 0) {
        for (const hint of summary.indexHints) {
          console.log(
            `  - IXSCAN index=${hint.indexName ?? "(unknown)"} keyPattern=${JSON.stringify(hint.keyPattern ?? {})}`,
          );
        }
      }
      console.log(`- keysExamined: ${String(summary.keysExamined)}`);
      console.log(`- docsExamined: ${String(summary.docsExamined)}`);
      console.log(`- nReturned: ${String(summary.nReturned)}`);

      if (!summary.indexUsed && (summary.docsExamined ?? 0) > 0) {
        console.log(
          "- hint: COLLSCAN 가능성이 있으니 query 패턴(contains/prefix/exact)과 인덱스 정합성을 재검토하세요.",
        );
      }
      if (
        summary.indexUsed &&
        typeof summary.docsExamined === "number" &&
        typeof summary.nReturned === "number" &&
        summary.docsExamined > summary.nReturned * 100
      ) {
        console.log(
          "- hint: 인덱스를 타더라도 선택도가 낮을 수 있습니다. prefix/exact 분리 또는 대상 필드 우선순위를 점검하세요.",
        );
      }
    }
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("[explain-admin-operations-search] failed", error);
  process.exit(1);
});
