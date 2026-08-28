#!/usr/bin/env node
import { MongoClient } from "mongodb";

const APPLY_FLAG = "--apply";
const CONFIRMATION = "REMOVE_LEGACY_WITHDRAWAL_FIELDS";
const confirmationFlag = `--confirm=${CONFIRMATION}`;
const args = new Set(process.argv.slice(2));
const shouldApply = args.has(APPLY_FLAG);

if (shouldApply && !args.has(confirmationFlag)) {
  console.error("실제 적용에는 올바른 --confirm 값이 필요합니다.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tennis_academy";

if (!uri) {
  console.error("MONGODB_URI 환경 변수가 필요합니다.");
  process.exit(1);
}

const filter = {
  isDeleted: true,
  $or: [
    { withdrawalReason: { $exists: true } },
    { withdrawalDetail: { $exists: true } },
  ],
};

const client = new MongoClient(uri);

try {
  await client.connect();
  const users = client.db(dbName).collection("users");

  if (!shouldApply) {
    const targetCount = await users.countDocuments(filter);
    console.log("모드: DRY_RUN");
    console.log(`대상 문서 수: ${targetCount}`);
    console.log("실제 변경 없음");
  } else {
    const result = await users.updateMany(filter, {
      $unset: {
        withdrawalReason: "",
        withdrawalDetail: "",
      },
    });
    console.log("모드: APPLY");
    console.log(`matchedCount: ${result.matchedCount}`);
    console.log(`modifiedCount: ${result.modifiedCount}`);
    console.log("완료 여부: 완료");
  }
} catch {
  console.error("과거 탈퇴 사유 필드 정리 작업 중 오류가 발생했습니다.");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}
