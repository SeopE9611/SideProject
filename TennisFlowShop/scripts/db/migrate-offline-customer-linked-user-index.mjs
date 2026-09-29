#!/usr/bin/env node
import { MongoClient } from "mongodb";
import {
  INDEX_KEY,
  INDEX_NAME,
  TARGET_PARTIAL_FILTER,
  collectOfflineCustomerLinkedUserAudit,
  printOfflineCustomerLinkedUserAudit,
} from "./audit-offline-customer-linked-user-index.mjs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error(
    "[offline customer linked user index migration] MONGODB_URI 환경 변수가 필요합니다.",
  );
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db(dbName);
  const customers = db.collection("offline_customers");

  const initialAudit = await collectOfflineCustomerLinkedUserAudit(db);
  printOfflineCustomerLinkedUserAudit(initialAudit);
  if (initialAudit.status === "ALREADY_MIGRATED") {
    console.log(
      "[offline customer linked user index migration] 이미 목표 인덱스이므로 변경하지 않습니다.",
    );
    return;
  }
  if (initialAudit.status !== "SAFE_TO_MIGRATE") {
    throw new Error(`사전 audit이 migration을 허용하지 않습니다: ${initialAudit.status}`);
  }

  const finalAudit = await collectOfflineCustomerLinkedUserAudit(db);
  if (finalAudit.status !== "SAFE_TO_MIGRATE") {
    throw new Error(`create 직전 재검증이 실패했습니다: ${finalAudit.status}`);
  }

  await customers.createIndex(INDEX_KEY, {
    name: INDEX_NAME,
    unique: true,
    partialFilterExpression: TARGET_PARTIAL_FILTER,
  });

  const verified = await collectOfflineCustomerLinkedUserAudit(db);
  if (verified.status !== "ALREADY_MIGRATED") {
    throw new Error(`생성 후 인덱스 재검증이 실패했습니다: ${verified.status}`);
  }
  console.log(
    "[offline customer linked user index migration] 목표 partial unique index 생성 및 재검증 완료",
  );
}

main()
  .catch((error) => {
    console.error(
      "[offline customer linked user index migration] 실패:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => client.close());
