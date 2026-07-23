import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
function compact(source) {
  return source.replace(/\s+/g, " ");
}

test("패키지권 API는 안전한 인증과 사용자 소유권 조회를 유지한다", () => {
  const route = compact(read("app/api/passes/me/route.ts"));
  assert.ok(route.includes("const user = safeVerifyAccessToken(token)"));
  assert.ok(!route.includes("const user = verifyAccessToken(token)"));
  assert.ok(route.includes('{ error: "Unauthorized" }, { status: 401 }'));
  assert.ok(route.includes('typeof user.sub === "string"'));
  assert.ok(route.includes("ObjectId.isValid(userId)"));
  assert.ok(route.includes('collection("service_passes") .find( { userId: userObjectId }'));
  assert.ok(route.includes('collection("packageOrders") .find( { userId: userObjectId }'));
});

test("패키지권 API DTO는 이용·결제·활성화 상태를 분리한다", () => {
  const route = read("app/api/passes/me/route.ts");
  for (const field of [
    "orderId",
    "orderStatus",
    "usageStatus",
    "usageStatusLabel",
    "paymentStatus",
    "paymentMethod",
    "paymentProvider",
    "paymentTotalAmount",
    "paymentStatusLabel",
    "activationStatus",
    "activationStatusLabel",
    "displayGroup",
  ])
    assert.ok(route.includes(field));
  assert.ok(route.includes("getCustomerTransactionPaymentStatusLabel"));
  assert.ok(route.includes("const packageOrderById = new Map"));
  assert.ok(route.includes('"paymentInfo.easyPayProvider": 1'));
  assert.ok(!route.includes('?? "manual_bank_transfer"'));
  assert.ok(!route.includes('?? "무통장입금"'));
  assert.ok(!route.includes('paymentStatus: "결제대기"'));
});

test("패키지권 API는 null 만료일과 명시적 횟수를 안전하게 계산한다", () => {
  const route = read("app/api/passes/me/route.ts");
  assert.ok(route.includes("function toValidDateOrNull"));
  assert.ok(route.includes("function toNullableFiniteNumber"));
  assert.ok(route.includes("remainingMs !== null && remainingMs >= 0"));
  assert.ok(!route.includes("new Date(p.expiresAt)"));
});

test("실제 패키지권 API는 결제 종료 상태를 내역으로 분류하고 횟수 DTO를 정규화한다", () => {
  const route = read("app/api/passes/me/route.ts");
  assert.ok(route.includes("const payment = paymentFields(order)"));
  assert.ok(route.includes("const paymentStatusToken = paymentToken(payment.paymentStatus)"));
  assert.ok(route.includes("const orderStatusToken = paymentToken(nullableTrim(order?.status))"));
  assert.ok(route.includes("const hasFailedPayment = isFailedPayment(paymentStatusToken)"));
  assert.ok(route.includes("const hasCancelledOrRefundedPayment ="));
  assert.ok(
    route.includes(
      "const hasTerminalPaymentState = hasFailedPayment || hasCancelledOrRefundedPayment",
    ),
  );
  assert.ok(route.includes('displayGroup: hasTerminalPaymentState\n          ? "history"'));
  assert.ok(route.includes("const packageSize = toNullableFiniteNumber(p.packageSize)"));
  assert.ok(route.includes("const usedCount = toNullableFiniteNumber(p.usedCount)"));
  assert.ok(route.includes("const remainingCount = toNullableFiniteNumber(p.remainingCount)"));
  assert.ok(
    route.includes("const packageSize = toNullableFiniteNumber(order.packageInfo?.sessions)"),
  );
  assert.ok(!route.includes("packageSize: p.packageSize"));
  assert.ok(!route.includes("usedCount: p.usedCount"));
  assert.ok(!route.includes("remainingCount: p.remainingCount"));
  assert.ok(!route.includes("packageSize: order.packageInfo?.sessions"));
});

test("패키지권 목록은 모든 그룹과 독립 상태 배지를 표시한다", () => {
  const client = read("app/mypage/tabs/PassList.tsx");
  assert.ok(client.includes('title: "사용 가능한 패키지권"'));
  assert.ok(client.includes('title: "처리 중·일시정지"'));
  assert.ok(client.includes('title: "종료·취소 내역"'));
  assert.ok(client.includes("sections.map"));
  assert.ok(!client.includes("groups.find("));
  assert.ok(client.includes("getPassUsageBadgeSpec"));
  assert.ok(client.includes("getPassActivationBadgeSpec"));
  assert.ok(client.includes("getPaymentStatusBadgeSpec(passItem.paymentStatusLabel)"));
  assert.ok(client.includes("이용권 상태: ${passItem.usageStatusLabel}"));
  assert.ok(client.includes("결제 상태: ${passItem.paymentStatusLabel}"));
  assert.ok(client.includes("활성화 상태: ${passItem.activationStatusLabel}"));
  assert.ok(client.includes('aria-label="만료 임박"'));
  assert.ok(client.includes("recentUsages.slice(-3)"));
  assert.ok(client.includes(" · 복원"));
  assert.ok(client.includes("/mypage?tab=passes") || client.includes("PassList"));
  assert.ok(client.includes("/services/packages/success?packageOrderId="));
  assert.ok(client.includes("/services#service-start"));
  assert.ok(client.includes("PassListSkeleton"));
  assert.ok(client.includes("AsyncState"));
  assert.ok(client.includes("authenticatedSWRFetcher"));
});

test("패키지권 목록은 결제 종료 패스 CTA와 횟수 fallback을 안전하게 처리한다", () => {
  const client = read("app/mypage/tabs/PassList.tsx");
  assert.ok(client.includes("const canStartStringingService ="));
  assert.ok(
    client.includes(
      'passItem.usageStatus === "available" && passItem.displayGroup === "available"',
    ),
  );
  assert.ok(client.includes("const packageSizeTitle ="));
  assert.ok(client.includes("Number.isFinite(passItem.packageSize)"));
  assert.ok(client.includes("? `${passItem.packageSize}회권`"));
  assert.ok(client.includes(': "횟수 확인 중"'));
  assert.ok(!client.includes('"횟수 확인 중"}회권'));
  assert.ok(client.includes("const packageSizeSummary ="));
  assert.ok(client.includes("`패키지 총 ${passItem.packageSize}회`"));
  assert.ok(!client.includes('"횟수 확인 중"}회'));
});
