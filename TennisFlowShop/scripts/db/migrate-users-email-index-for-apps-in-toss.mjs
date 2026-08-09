#!/usr/bin/env node
import { MongoClient } from "mongodb";
import {
  INDEX_KEY,
  INDEX_NAME,
  TARGET_PARTIAL_FILTER,
  collectUsersEmailAudit,
  printUsersEmailAudit,
} from "./audit-users-email-index-for-apps-in-toss.mjs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("[users email index migration] MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

const client = new MongoClient(uri);

function captureLegacyIndex(index) {
  return {
    name: index.name,
    key: { ...index.key },
    unique: index.unique,
    ...(Object.hasOwn(index, "sparse") ? { sparse: index.sparse } : {}),
  };
}

function sameLegacyIndex(left, right) {
  return (
    left.name === right.name &&
    JSON.stringify(left.key) === JSON.stringify(right.key) &&
    left.unique === right.unique &&
    left.sparse === right.sparse
  );
}

function safeErrorSummary(error) {
  if (!(error instanceof Error)) return "알 수 없는 오류";
  const code = "code" in error ? ` (code=${String(error.code)})` : "";
  return `${error.name}${code}`;
}

async function main() {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  const initialAudit = await collectUsersEmailAudit(db);
  printUsersEmailAudit(initialAudit);
  if (initialAudit.status === "ALREADY_MIGRATED") {
    console.log("[users email index migration] 이미 목표 인덱스이므로 변경하지 않습니다.");
    return;
  }
  if (initialAudit.status !== "SAFE_TO_MIGRATE") {
    throw new Error(`사전 audit이 migration을 허용하지 않습니다: ${initialAudit.status}`);
  }
  const legacyIndex = captureLegacyIndex(initialAudit.emailIndex);

  // audit 이후 데이터/index 변경 가능성을 줄이기 위해 drop 직전에 전체 검증을 다시 수행한다.
  const finalAudit = await collectUsersEmailAudit(db);
  if (finalAudit.status !== "SAFE_TO_MIGRATE") {
    throw new Error(`drop 직전 재검증이 실패했습니다: ${finalAudit.status}`);
  }
  const finalLegacyIndex = captureLegacyIndex(finalAudit.emailIndex);
  if (!sameLegacyIndex(legacyIndex, finalLegacyIndex)) {
    throw new Error("drop 직전 legacy index가 사전 audit 결과와 달라졌습니다.");
  }

  await users.dropIndex(legacyIndex.name);
  try {
    await users.createIndex(INDEX_KEY, {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: TARGET_PARTIAL_FILTER,
    });
  } catch (error) {
    // 목표 생성 실패 시 기존 보호 수준을 가능한 즉시 복원한다. 문서 데이터는 수정하지 않는다.
    try {
      await users.createIndex(legacyIndex.key, {
        name: legacyIndex.name,
        unique: legacyIndex.unique,
        ...(Object.hasOwn(legacyIndex, "sparse") ? { sparse: legacyIndex.sparse } : {}),
      });
    } catch (restoreError) {
      throw new Error(
        `목표 index 생성 실패: ${safeErrorSummary(error)}; legacy index 복구도 실패: ${safeErrorSummary(restoreError)}`,
      );
    }
    throw new Error(
      `목표 index 생성 실패: ${safeErrorSummary(error)}; legacy index는 원래 상태로 복구했습니다.`,
    );
  }

  const verified = await collectUsersEmailAudit(db);
  if (verified.status !== "ALREADY_MIGRATED") {
    throw new Error(`생성 후 인덱스 재검증이 실패했습니다: ${verified.status}`);
  }
  console.log("[users email index migration] 목표 partial unique index 생성 및 재검증 완료");
}

main()
  .catch((error) => {
    console.error(
      "[users email index migration] 실패:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => client.close());
