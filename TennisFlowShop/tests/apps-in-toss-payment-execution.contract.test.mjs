import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { importFileModule } from "./helpers/import-file-module.mjs";

const root = new URL("..", import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-payment-execution-"));
fs.symlinkSync(new URL("../node_modules", import.meta.url), path.join(tmp, "node_modules"), "dir");
for (const name of ["toss-pay-contract", "payment-execution-policy"]) {
  const source = fs.readFileSync(new URL(`lib/apps-in-toss/server/${name}.ts`, root), "utf8");
  fs.writeFileSync(path.join(tmp, `${name}.cjs`), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText.replace('require("./toss-pay-contract")', 'require("./toss-pay-contract.cjs")'));
}
const policy = await importFileModule(path.join(tmp, "payment-execution-policy.cjs"));
const executionSource = fs.readFileSync(new URL("lib/apps-in-toss/server/payment-execution.ts", root), "utf8");
const configSource = fs.readFileSync(new URL("lib/apps-in-toss/server/config.ts", root), "utf8");
const routeSource = fs.readFileSync(new URL("app/api/apps-in-toss/payments/[attemptId]/execute/route.ts", root), "utf8");

test("sandbox와 기본 비활성 live gate가 DB 조회 및 외부 실행보다 앞선다", () => {
  const orchestration = executionSource.slice(executionSource.indexOf("export async function executeAppsInTossPayment"));
  assert.match(configSource, /mode === "live" && process\.env\[TOSS_PAY_LIVE_EXECUTE_ENABLED_NAME\] === "true"/);
  assert.ok(orchestration.indexOf('mode.mode === "sandbox"') < orchestration.indexOf("findAppsInTossPaymentIntentByAttemptId"));
  assert.ok(orchestration.indexOf("isAppsInTossTossPayLiveExecuteEnabled()") < orchestration.indexOf("findAppsInTossPaymentIntentByAttemptId"));
});

test("execute route는 canonical 식별자만 받고 결제 비밀값을 body로 받지 않는다", () => {
  assert.match(routeSource, /executeAppsInTossPayment\(\{ db, attemptId, userId:/);
  assert.doesNotMatch(routeSource, /request\.json|payToken|orderNo|userKey/);
});

test("승인 완료, 대기, 취소, 기타 상태를 보수적으로 분류한다", () => {
  for (const status of ["PAY_APPROVED", "PAY_COMPLETE"]) assert.equal(policy.classifyTossPayStatus(status), "paid");
  for (const status of ["PAY_STANDBY", "PAY_PROGRESS"]) assert.equal(policy.classifyTossPayStatus(status), "pending");
  assert.equal(policy.classifyTossPayStatus("PAY_CANCEL"), "cancelled");
  for (const status of ["REFUND_SUCCESS", "SETTLEMENT_COMPLETE"]) assert.equal(policy.classifyTossPayStatus(status), "other");
  assert.equal(policy.classifyTossPayStatus("NEW_STATUS"), "unknown");
});

test("SUCCESS도 payToken, orderNo, amount, LIVE가 모두 일치해야 승인한다", () => {
  const canonical = { payToken: "token", orderNo: "order", amount: 1000 };
  const result = { kind: "success", value: { success: { ...canonical, mode: "LIVE" } } };
  assert.equal(policy.matchesCanonicalLivePayment(result, canonical), true);
  for (const mismatch of [{ payToken: "other" }, { orderNo: "other" }, { amount: 999 }, { mode: "TEST" }]) {
    assert.equal(policy.matchesCanonicalLivePayment({ kind: "success", value: { success: { ...result.value.success, ...mismatch } } }, canonical), false);
  }
});

test("중복 실행과 만료 lease는 execute를 재호출하지 않는다", () => {
  assert.match(executionSource, /leaseUntil > new Date\(\).*PAYMENT_EXECUTION_IN_PROGRESS/s);
  assert.match(executionSource, /intent\.state === "executing"[\s\S]*return reconcile/);
  assert.match(executionSource, /execute-payment를 재시도하지 않고 상태만 조회한다/);
  assert.match(executionSource, /state === "paid" \|\| intent\.state === "finalized"[\s\S]*return safeResponse/);
});

test("소유권과 active identity를 서버에서 검증한다", () => {
  assert.match(executionSource, /intent\.userId\.equals\(params\.userId\).*intent\.identityId\.equals\(params\.identityId\)/);
  assert.match(executionSource, /loadActiveAppsInTossUserKey\(params\.db, intent\.identityId, intent\.userId\)/);
});
