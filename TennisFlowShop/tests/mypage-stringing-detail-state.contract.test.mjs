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
  assert.match(client, /LinkedDocsCard/);
  assert.match(client, /ApplicationStatusSelect/);
  assert.match(client, /PaymentEditForm/);
});

test("마이페이지 교체서비스 상세는 연결 참조와 단독 신청을 분리한다", () => {
  assert.match(client, /const hasOrderLink = Boolean\(linkedOrderSummary \|\| data\.orderId\)/);
  assert.match(client, /const hasRentalLink = Boolean\(linkedRentalSummary \|\| data\.rentalId\)/);
  assert.match(client, /const hasAnyLinkedReference = hasOrderLink \|\| hasRentalLink/);
  assert.match(
    client,
    /const isStandaloneApplication = primaryLinkedSource === null && !hasAnyLinkedReference/,
  );
  assert.match(
    client,
    /const isResolvedOrderLinkedApplication =[\s\S]*primaryLinkedSource === "order" && Boolean\(linkedOrderSummary\)/,
  );
  assert.match(
    client,
    /const isResolvedRentalLinkedApplication =[\s\S]*primaryLinkedSource === "rental" && Boolean\(linkedRentalSummary\)/,
  );
  assert.match(
    client,
    /const isMissingPrimaryLinkedDocument =[\s\S]*primaryLinkedSource === "order" && !linkedOrderSummary[\s\S]*primaryLinkedSource === "rental" && !linkedRentalSummary/,
  );
  assert.match(
    client,
    /const isUnresolvedLinkedApplication =[\s\S]*isMissingPrimaryLinkedDocument[\s\S]*primaryLinkedSource === null && hasAnyLinkedReference/,
  );
  assert.match(
    client,
    /const isAmbiguousLinkedApplication =[\s\S]*primaryLinkedSource === null && hasOrderLink && hasRentalLink/,
  );
  assert.match(client, /주문·대여 연결 작업/);
  assert.match(client, /연결 거래 확인 중/);
  assert.match(
    client,
    /const isLinkedApplication = hasAnyLinkedReference \|\| primaryLinkedSource !== null/,
  );
});

test("마이페이지 교체서비스 상세는 미해결 연결의 결제와 입금계좌를 확정하지 않는다", () => {
  assert.match(
    client,
    /const paymentStatusLabel =[\s\S]*isResolvedOrderLinkedApplication[\s\S]*isResolvedRentalLinkedApplication[\s\S]*isUnresolvedLinkedApplication[\s\S]*\? "결제 상태 확인 중"[\s\S]*getCustomerTransactionPaymentStatusLabel/,
  );
  assert.match(
    client,
    /const paymentMethodForDisplay =[\s\S]*isResolvedOrderLinkedApplication[\s\S]*linkedOrderSummary\.paymentMethod[\s\S]*isResolvedRentalLinkedApplication[\s\S]*linkedRentalSummary\.paymentMethod[\s\S]*isUnresolvedLinkedApplication[\s\S]*\? null[\s\S]*: applicationPaymentMethod/,
  );
  assert.match(
    client,
    /shouldShowCustomerBankAccount =[\s\S]*isStandaloneApplication[\s\S]*!isUnresolvedLinkedApplication[\s\S]*totalPrice !== null[\s\S]*totalPrice > 0[\s\S]*isBankTransferMethod[\s\S]*paymentStatusLabel === "입금 확인 대기"/,
  );
});

test("마이페이지 교체서비스 상세는 서비스 금액과 실제 거래 결제금액을 분리한다", () => {
  assert.match(client, /const serviceAmount = totalPrice/);
  assert.match(client, /const transactionPaymentAmount = packageApplied/);
  assert.match(client, /isResolvedOrderLinkedApplication[\s\S]*linkedOrderSummary\.totalAmount/);
  assert.match(client, /isResolvedRentalLinkedApplication[\s\S]*linkedRentalSummary\.totalAmount/);
  assert.match(client, /isUnresolvedLinkedApplication[\s\S]*\? null[\s\S]*: totalPrice/);
  assert.match(client, /transactionPaymentAmountLabel =[\s\S]*"패키지 사용"/);
  assert.match(
    client,
    /transactionPaymentAmountLabel =[\s\S]*isUnresolvedLinkedApplication[\s\S]*"연결 결제 확인 중"/,
  );
  assert.match(client, /주문 총 결제금액/);
  assert.match(client, /대여 총 결제금액/);
  assert.match(client, /연결 거래 결제금액/);
  assert.match(client, /서비스 금액[\s\S]*serviceAmount/);
  assert.match(client, /transactionPaymentAmountTitle/);
  assert.match(client, /transactionPaymentAmountLabel/);
});

test("마이페이지 교체서비스 상세는 미해결 연결에서 일반 사용자 액션을 제한한다", () => {
  assert.match(
    client,
    /const isEditableAllowed =[\s\S]*!isRentalLinkedApplication[\s\S]*isAdmin \|\| \(!isUnresolvedLinkedApplication && userEditableStatuses\.includes\(data\.status\)\)/,
  );
  assert.match(
    client,
    /const canShowUserCancelAction =[\s\S]*!isAdmin && !isRentalLinkedApplication && !isUnresolvedLinkedApplication && !isCancelled/,
  );
  assert.match(client, /const canUserRequestCancel =[\s\S]*canShowUserCancelAction/);
  assert.match(client, /const canUserWithdrawCancelRequest = canShowUserCancelAction/);
});

test("마이페이지 교체서비스 상세는 고객 상태 별칭에 맞는 배지 의미를 사용한다", () => {
  assert.match(client, /getCustomerStringingStatusBadgeSpec/);
  assert.match(client, /raw === "승인" \|\| normalized === "approved"/);
  assert.match(client, /raw === "거절" \|\| normalized === "rejected"/);
  assert.match(client, /raw\.includes\("환불"\) \|\| normalized === "refunded"/);
  assert.match(client, /getApplicationStatusBadgeSpec\("작업 대기"\)/);
  assert.match(client, /getApplicationStatusBadgeSpec\("취소"\)/);
  assert.match(
    client,
    /const applicationStatusBadgeSpec = getCustomerStringingStatusBadgeSpec\(data\.status\)/,
  );
});
