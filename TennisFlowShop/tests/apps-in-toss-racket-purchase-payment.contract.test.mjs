import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("라켓 구매 prepare는 별도 목적과 두 item snapshot을 고정한다", () => {
  const contract = read("lib/apps-in-toss/server/payment-prepare-contract.ts");
  const prepare = read("lib/apps-in-toss/server/payment-prepare.ts");
  assert.match(contract, /AppsRacketPurchasePrepareRequestSchema/);
  assert.match(contract, /purpose: z\.literal\("racket_purchase"\)/);
  assert.match(prepare, /paymentPurpose: "racket_purchase"/);
  assert.match(prepare, /kind: "racket"/);
  assert.match(prepare, /kind: "product"/);
});

test("라켓 구매 finalization은 같은 transaction에서 두 재고와 주문·신청을 확정한다", () => {
  const source = read("lib/apps-in-toss/server/payment-finalization.ts");
  assert.match(source, /getAppsInTossPaymentPurpose\(initial\) === "racket_purchase"/);
  assert.match(source, /session\.withTransaction/);
  assert.match(source, /collection\("rental_orders"\).*\["paid", "out"\]/s);
  assert.match(source, /collection\("used_rackets"\)\.findOneAndUpdate/);
  assert.match(source, /collection\("products"\)\.updateOne/);
  assert.match(source, /collection\("orders"\)\.insertOne/);
  assert.match(source, /collection\("stringing_applications"\)\.insertOne/);
});

test("라켓 구매 finalization은 일반 공개 라켓·스트링 정책을 transaction write에 적용한다", () => {
  const source = read("lib/apps-in-toss/server/payment-finalization.ts");
  assert.match(source, /racketVisibilityFilterFor\(\{ isAdmin: false \}\)/);
  assert.match(source, /\.\.\.publicRacketFilter/);
  assert.match(source, /\.\.\.publicProductFilter/);
  assert.match(source, /colorInventories: \{ \$elemMatch: \{[^}]*isSoldOut: \{ \$ne: true \}/s);
  assert.match(source, /gaugeInventories: \{ \$elemMatch: \{[^}]*isSoldOut: \{ \$ne: true \}/s);
});

test("기존 discriminator 없는 intent는 stringing service로 해석한다", () => {
  const source = read("lib/apps-in-toss/server/payment-intents.ts");
  assert.match(source, /intent\.paymentPurpose \?\? "stringing_service"/);
});

test("라켓 구매 신청은 방문 span, package 및 Apps 결제 metadata를 기존 의미로 저장한다", () => {
  const source = read("lib/apps-in-toss/server/payment-finalization.ts");
  assert.match(source, /visitSlotCount: intent\.reservationSnapshot!\.slotCount/);
  assert.match(source, /visitDurationMinutes: intent\.reservationSnapshot!\.durationMinutes/);
  assert.match(source, /packageRedeemedAt: safePkg\.applied \? now : null/);
  assert.match(source, /paymentMethod: "package", paymentStatus: "패키지 적용 완료"/);
  assert.match(source, /originalTotal: pricing\.payableAmount, pointsUsed: 0, shippingFee: pricing\.shippingFee, serviceFee: pricing\.serviceFee/);
});
