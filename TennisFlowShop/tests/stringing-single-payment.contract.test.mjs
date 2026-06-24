import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("single 신청은 패키지 미사용 시 보유 스트링 장착비와 일반 결제수단을 유지한다", () => {
  const page = read("app/services/apply/page.tsx");
  const payment = read(
    "app/features/stringing-applications/components/apply-shared/PaymentInfoSection.tsx",
  );
  const submitCore = read("app/features/stringing-applications/api/submit-core.ts");

  assert.match(page, /mode === "single" && !isOrderBased && !isRentalBased/);
  assert.match(page, /CUSTOM_STRING_MOUNTING_FEE \* Math\.max\(1, requiredPassCount\)/);
  assert.match(payment, /value="bank_transfer"/);
  assert.match(payment, /value="nicepay"/);
  assert.match(submitCore, /serviceFeeBeforeRaw[\s\S]*calcStringingTotal\(db, stringTypes\)/);
  assert.match(submitCore, /paymentStatus: standalonePaymentInfo\.status/);
});

test("single 신청 NicePay는 신청서 금액을 검증하고 결제 완료 상태를 기록한다", () => {
  const prepare = read("app/api/payments/nice/stringing/prepare/route.ts");
  const returned = read("app/api/payments/nice/stringing/return/route.ts");

  assert.match(prepare, /application\.paymentMethod !== "nicepay"/);
  assert.match(prepare, /flowType: "stringing_application"/);
  assert.match(returned, /Number\(application\.totalPrice \?\? 0\) !== amount/);
  assert.match(returned, /paymentStatus: "결제완료"/);
  assert.match(returned, /servicePaid: true/);
});
