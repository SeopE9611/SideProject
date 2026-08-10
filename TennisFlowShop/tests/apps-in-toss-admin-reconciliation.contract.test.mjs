import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const helper = read("../app/api/admin/apps-in-toss/_lib/reconciliation.ts");
const route = read("../app/api/admin/apps-in-toss/reconciliation/route.ts");
const client = read("../app/admin/operations/apps-in-toss-reconciliation/_components/AppsInTossReconciliationClient.tsx");
const operations = read("../app/admin/operations/_components/OperationsClient.tsx");
const runtimeIndexes = read("../lib/apps-in-toss-payments.indexes.ts");
const ensureIndexes = read("../scripts/db/ensure-runtime-indexes.mjs");
const checkIndexes = read("../scripts/db/check-runtime-indexes.mjs");

test("관리자 API는 인증 뒤 읽기 전용 GET만 제공한다", () => {
  assert.match(route, /export async function GET[\s\S]*requireAdmin\(req\)/);
  assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)/);
  assert.doesNotMatch(route, /toss-pay-client|executeAppsInTossPayment|finalizeAppsInTossPayment|refundAppsInToss/);
});

test("분류기는 6종 우선순위와 5분 stale 정책을 고정한다", () => {
  assert.match(helper, /APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS = 5 \* 60_000/);
  const priority = helper.slice(helper.indexOf("APPS_IN_TOSS_ATTENTION_PRIORITY"), helper.indexOf("const NEXT_ACTION"));
  for (const type of ["state_inconsistent", "reconciliation_required", "compensation_refund_required", "execution_lease_expired", "refund_lease_expired", "finalization_stale"]) assert.match(priority, new RegExp(type));
  assert.match(helper, /state === "finalized" && !hasOrder/);
  assert.match(helper, /state !== "finalized" && hasOrder/);
  assert.match(helper, /state === "paid" && intent\.finalization\?\.failureCode != null && !hasOrder/);
  assert.match(helper, /state === "executing" && \(!intent\.execution\?\.leaseUntil \|\| intent\.execution\.leaseUntil <= now\)/);
  assert.match(helper, /state === "refunding" && \(!intent\.refund\?\.leaseUntil \|\| intent\.refund\.leaseUntil <= now\)/);
  assert.match(helper, /intent\.updatedAt\.getTime\(\) <= now\.getTime\(\) - APPS_IN_TOSS_ADMIN_FINALIZATION_STALE_MS/);
});

test("Mongo 후보 match, facet pagination과 집계를 사용하고 전체 문서 JS scan을 하지 않는다", () => {
  assert.match(route, /\{ \$match: base \}/);
  assert.match(route, /\$facet/);
  assert.match(route, /\$skip: \(page - 1\) \* limit/);
  assert.match(route, /\$limit: limit/);
  assert.match(route, /\$group/);
  assert.doesNotMatch(route, /find\(\{\}\)\.toArray|\.reduce\(/);
});

test("DTO는 snapshot만 명시적으로 직렬화하고 민감정보를 노출하지 않는다", () => {
  assert.match(route, /pricingSnapshot\?\.payableAmount/);
  assert.match(route, /itemSnapshot\) \? row\.itemSnapshot\[0\]/);
  assert.match(route, /maskPhone/);
  assert.match(route, /function maskEmail/);
  const serializer = route.slice(route.indexOf("function serialize"), route.indexOf("function emptySummary"));
  for (const forbidden of ["payToken", "identityId", "orderNo", "refundNo", "transactionId", "approvalTime", "failureMessage"]) assert.doesNotMatch(serializer, new RegExp(forbidden));
  assert.doesNotMatch(route, /collection\(["']products|return intent|\.\.\.row/);
});

test("UI는 읽기 전용 진단과 Operations 진입점만 제공한다", () => {
  assert.match(client, /목록 새로고침/);
  assert.match(operations, /\/admin\/operations\/apps-in-toss-reconciliation/);
  assert.match(operations, /토스 앱 결제 중 자동 처리 미완료·대사 필요 건 확인/);
  for (const action of ["환불 실행", "결제 승인", "상태 복구", "재시도", "강제 완료", "대사 완료", "메모 저장"]) assert.doesNotMatch(client, new RegExp(action));
});

test("신규 인덱스 2개는 runtime spec, ensure, check에 모두 일치한다", () => {
  for (const source of [runtimeIndexes, ensureIndexes, checkIndexes]) {
    assert.match(source, /apps_in_toss_payment_intents_state_updated_desc/);
    assert.match(source, /state: 1, updatedAt: -1/);
    assert.match(source, /apps_in_toss_payment_intents_state_refundLease_idx/);
    assert.match(source, /state: 1, "refund\.leaseUntil": 1/);
  }
});
