import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const client = read(
  "../app/admin/operations/apps-in-toss-reconciliation/_components/AppsInTossReconciliationClient.tsx",
);
const operations = read("../app/admin/operations/_components/OperationsClient.tsx");

test("UI는 읽기 전용 진단과 Operations 진입점만 제공한다", () => {
  assert.match(client, /목록 새로고침/);
  assert.match(operations, /\/admin\/operations\/apps-in-toss-reconciliation/);
  assert.match(operations, /토스 앱 결제 중 자동 처리 미완료·대사 필요 건 확인/);
  for (const action of [
    "환불 실행",
    "결제 승인",
    "상태 복구",
    "재시도",
    "강제 완료",
    "대사 완료",
    "메모 저장",
  ])
    assert.doesNotMatch(client, new RegExp(action));
});
