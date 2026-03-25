#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[backfill-stringing-payment-context] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

const isApply = process.argv.includes("--apply");
const modeLabel = isApply ? "APPLY" : "DRY-RUN";

function toStringId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString().trim();
  }
  return "";
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExplicitPaymentStatus(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolvePaymentSource(doc) {
  const orderId = toStringId(doc?.orderId);
  if (orderId) return `order:${orderId}`;

  const rentalId = toStringId(doc?.rentalId);
  if (rentalId) return `rental:${rentalId}`;

  return "";
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const col = db.collection("stringing_applications");

    const cursor = col.find(
      {
        $and: [
          {
            $or: [
              { paymentSource: { $exists: false } },
              { paymentSource: null },
              { paymentSource: "" },
            ],
          },
          {
            $or: [{ orderId: { $exists: true } }, { rentalId: { $exists: true } }],
          },
        ],
      },
      {
        projection: {
          _id: 1,
          orderId: 1,
          rentalId: 1,
          paymentSource: 1,
          paymentStatus: 1,
          updatedAt: 1,
        },
      },
    );

    let scanned = 0;
    let candidates = 0;
    let skippedExplicitPaymentStatus = 0;
    let skippedUnresolved = 0;
    let modified = 0;

    for await (const doc of cursor) {
      scanned += 1;
      if (hasValue(doc?.paymentSource)) continue;

      if (hasExplicitPaymentStatus(doc?.paymentStatus)) {
        skippedExplicitPaymentStatus += 1;
        continue;
      }

      const nextPaymentSource = resolvePaymentSource(doc);
      if (!nextPaymentSource) {
        skippedUnresolved += 1;
        continue;
      }

      candidates += 1;

      if (!isApply) {
        console.log(
          `[${modeLabel}] candidate _id=${doc._id.toString()} paymentSource -> ${nextPaymentSource}`,
        );
        continue;
      }

      const result = await col.updateOne(
        { _id: doc._id, $or: [{ paymentSource: { $exists: false } }, { paymentSource: null }, { paymentSource: "" }] },
        {
          $set: {
            paymentSource: nextPaymentSource,
            updatedAt: new Date(),
          },
        },
      );

      if (result.modifiedCount > 0) {
        modified += result.modifiedCount;
        console.log(
          `[${modeLabel}] updated _id=${doc._id.toString()} paymentSource=${nextPaymentSource}`,
        );
      }
    }

    console.log(`\n[${modeLabel}] scan complete`);
    console.log(`[${modeLabel}] scanned=${scanned}`);
    console.log(`[${modeLabel}] candidates=${candidates}`);
    console.log(`[${modeLabel}] skipped_explicit_payment_status=${skippedExplicitPaymentStatus}`);
    console.log(`[${modeLabel}] skipped_unresolved=${skippedUnresolved}`);
    console.log(`[${modeLabel}] modified=${modified}`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("[backfill-stringing-payment-context] failed", error);
  process.exit(1);
});
