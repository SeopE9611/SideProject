import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { importFileModule } from "./helpers/import-file-module.mjs";

const root = new URL("..", import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-in-toss-pay-contract-"));
fs.symlinkSync(
  new URL("../node_modules", import.meta.url),
  path.join(tmp, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);

function loadTypeScriptModule(sourcePath, outputName) {
  const source = fs.readFileSync(new URL(sourcePath, root), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const outputPath = path.join(tmp, outputName);
  fs.writeFileSync(outputPath, output);
  return importFileModule(outputPath);
}

const contract = await loadTypeScriptModule("lib/apps-in-toss/server/toss-pay-contract.ts", "contract.cjs");
const state = await loadTypeScriptModule("lib/apps-in-toss/server/payment-intent-state.ts", "state.cjs");

const validMakePayment = {
  orderNo: "dkt-order_1", productDesc: "string product", cashReceipt: false,
  amount: 10_000, amountTaxFree: 0,
};

test("installment와 현금영수증 거래 옵션을 공식 enum으로만 허용한다", () => {
  for (const installment of ["USE", "NOT_USE"]) {
    assert.equal(contract.parseMakePaymentInput({ ...validMakePayment, installment }).installment, installment);
  }
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, installment: 0 }));
  for (const cashReceiptTradeOption of ["GENERAL", "CULTURE", "PUBLIC_TP"]) {
    assert.equal(contract.parseMakePaymentInput({ ...validMakePayment, cashReceiptTradeOption }).cashReceiptTradeOption, cashReceiptTradeOption);
  }
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, cashReceiptTradeOption: "ETC" }));
});

test("환불 사유의 공식 문자와 55자 제한을 검증한다", () => {
  assert.doesNotThrow(() => contract.assertRefundReason("한글AZ09_-:.^@()[]#/!%?&"));
  for (const unsupported of [" ", "~", "$", "'", "*", ",", ";"]) {
    assert.throws(() => contract.assertRefundReason(`사유${unsupported}`));
  }
  assert.throws(() => contract.assertRefundReason("a".repeat(56)));
});

test("payToken과 orderNo 길이 및 문자 계약을 검증한다", () => {
  assert.equal(contract.parseTossPayToken("opaque-token"), "opaque-token");
  assert.equal(contract.parseTossPayToken(" token "), " token ");
  assert.equal(contract.parseTossPayToken("a".repeat(30)), "a".repeat(30));
  assert.throws(() => contract.parseTossPayToken(""));
  assert.throws(() => contract.parseTossPayToken(" "));
  assert.throws(() => contract.parseTossPayToken("a".repeat(31)));
  assert.equal(contract.isValidTossPayOrderNo("dkt-order_1:ok"), true);
  assert.equal(contract.isValidTossPayOrderNo("invalid/order"), false);
});

test("결제 금액 필드의 7자리 상한과 기존 정수 정책을 검증한다", () => {
  assert.equal(contract.parseMakePaymentInput({ ...validMakePayment, amount: 1 }).amount, 1);
  assert.equal(contract.parseMakePaymentInput({ ...validMakePayment, amount: 9_999_999 }).amount, 9_999_999);
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amount: 10_000_000 }));
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amountTaxFree: 10_000_000 }));
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amountTaxable: 10_000_000 }));
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amountVat: 10_000_000 }));
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amount: 1.5 }));
  assert.throws(() => contract.parseMakePaymentInput({ ...validMakePayment, amount: -1 }));
});

test("execute SUCCESS의 approvalTime은 비어 있지 않은 문자열만 허용한다", () => {
  const response = {
    resultType: "SUCCESS",
    success: {
      mode: "TEST", orderNo: "dkt-order_1", amount: 10_000, approvalTime: "2026-01-02T03:04:05Z",
      stateMsg: "approved", discountedAmount: 0, paidAmount: 10_000, payMethod: "CARD",
      payToken: "opaque-token", transactionId: "transaction-1",
    },
  };
  assert.equal(contract.parseExecutePaymentResponse(response).kind, "success");
  assert.throws(
    () => contract.parseExecutePaymentResponse({ ...response, success: { ...response.success, approvalTime: null } }),
    contract.TossPayContractError,
  );
});

test("sandbox/live isTestPayment 계약이 유지된다", () => {
  const source = fs.readFileSync(new URL("lib/apps-in-toss/server/config.ts", root), "utf8");
  assert.match(source, /mode === "sandbox"\) return \{ mode, isTestPayment: true \}/);
  assert.match(source, /mode === "live"\) return \{ mode, isTestPayment: false \}/);
});

test("로그인과 Toss Pay API host를 고정 상수로 구분한다", () => {
  const configSource = fs.readFileSync(new URL("lib/apps-in-toss/server/config.ts", root), "utf8");
  const httpSource = fs.readFileSync(new URL("lib/apps-in-toss/server/http.ts", root), "utf8");
  assert.match(configSource, /APPS_IN_TOSS_API_HOST = "apps-in-toss-api\.toss\.im"/);
  assert.match(configSource, /APPS_IN_TOSS_TOSS_PAY_API_HOST = "pay-apps-in-toss-api\.toss\.im"/);
  assert.match(httpSource, /requestMtlsJson\(APPS_IN_TOSS_API_HOST, request\)/);
  assert.match(httpSource, /requestMtlsJson\(APPS_IN_TOSS_TOSS_PAY_API_HOST, request\)/);
});

test("정상 상태 전이는 허용하고 비정상 전이는 거부한다", () => {
  assert.doesNotThrow(() => state.assertAppsInTossPaymentIntentTransition("creating", "awaiting_authorization"));
  assert.doesNotThrow(() => state.assertAppsInTossPaymentIntentTransition("paid", "finalized"));
  assert.throws(() => state.assertAppsInTossPaymentIntentTransition("creating", "paid"));
  assert.throws(() => state.assertAppsInTossPaymentIntentTransition("finalized", "refunding"));
});
