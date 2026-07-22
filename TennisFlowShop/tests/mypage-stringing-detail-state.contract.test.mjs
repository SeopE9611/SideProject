import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const handlers = read("app/features/stringing-applications/api/handlers.ts");
const client = read(
  "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
);

test("마이페이지 교체서비스 상세는 연결 거래 상태와 결제 상태를 분리한다", () => {
  assert.match(handlers, /linkedOrderSummary/);
  assert.match(handlers, /linkedRentalSummary/);
  assert.match(handlers, /primaryLinkedSource/);
  assert.match(handlers, /status:\s*1,[\s\S]*amount:\s*1/);
  assert.match(handlers, /totalPrice:\s*1,[\s\S]*totalAmount:\s*1/);
  assert.match(
    handlers,
    /explicitOrderSource[\s\S]*explicitRentalSource[\s\S]*primaryLinkedSource/,
  );
  assert.doesNotMatch(handlers, /\(paymentSourceRaw\.startsWith\("order:"\) \|\| app\.orderId\)/);
  assert.match(handlers, /getCustomerTransactionPaymentStatusLabel/);
  assert.match(handlers, /totalPrice:\s*toNullableFiniteNumber\(app\.totalPrice\)/);
  assert.doesNotMatch(handlers, /app\.totalPrice \?\? 0/);

  for (const helper of [
    "getCustomerApplicationStatusLabel",
    "getCustomerOrderStatusLabel",
    "getCustomerRentalStatusLabel",
    "getCustomerTransactionPaymentStatusLabel",
    "getApplicationStatusBadgeSpec",
    "getOrderStatusBadgeSpec",
    "getRentalStatusBadgeSpec",
    "getPaymentStatusBadgeSpec",
  ]) {
    assert.match(client, new RegExp(helper));
  }

  assert.doesNotMatch(client, /getPaymentStatusBadgeSpec\(linkedPaymentContextLabel\)/);
  assert.doesNotMatch(client, /getPaymentStatusBadgeSpec\(paymentHeaderBadgeLabel\)/);
  assert.match(client, /const paymentStatusLabel/);
  assert.match(client, /const paymentContextLabel/);
  assert.match(client, /교체서비스 진행 상태:/);
  assert.match(client, /결제 상태:/);
  assert.match(client, /linkedOrderStatusLabel/);
  assert.match(client, /linkedRentalStatusLabel/);
  assert.doesNotMatch(client, /\?\? "결제대기"/);
  assert.doesNotMatch(client, /\?\? "무통장입금"/);
  assert.match(client, /금액 확인 중/);
  assert.match(client, /primaryLinkedSource === null[\s\S]*isBankTransferMethod/);
  assert.match(client, /LinkedDocsCard/);
  assert.match(client, /ApplicationStatusSelect/);
  assert.match(client, /PaymentEditForm/);
});
