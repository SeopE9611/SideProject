import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("../TossMiniApp/src/App.tsx");
const payments = read("../TossMiniApp/src/api/payments.ts");
const checkout = read("../TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
const flow = read("../TossMiniApp/src/components/RacketRentalFlow.tsx");
const activity = read("app/api/apps-in-toss/me/activity/route.ts");

test("pending 복구가 racket-rental 화면보다 먼저 평가된다", () => assert.ok(app.indexOf("if (pendingPayment)") < app.indexOf("if (isRacketRental")));
test("대여 route와 1~7단계 browser history 계약을 포함한다", () => { assert.match(app, /racket-rental/); assert.match(flow, /1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7/); assert.match(flow, /popstate/); });
test("prepare request는 서버 입력만 전송하고 선택적 스트링 구조를 보존한다", () => { const fn = payments.slice(payments.indexOf("export function prepareRacketRentalPayment")); assert.match(fn, /purpose: "racket_rental"/); assert.match(fn, /requested: false/); assert.match(fn, /refundAccount/); for (const forbidden of ["rentalFee", "deposit", "stringPrice", "mountingFee", "serviceFee", "payableAmount", "pointsUsed", "packageDiscount"]) assert.doesNotMatch(fn, new RegExp(`${forbidden}:`)); });
test("대여 summary와 completion rentalId를 엄격 파싱한다", () => { assert.match(payments, /\[7, 15, 30\]/); assert.match(payments, /stringingRequested/); assert.match(payments, /data\.rentalId/); });
test("checkoutPayment 호출 형태와 pending marker 스키마를 유지한다", () => { assert.match(checkout, /checkoutPayment\(\{ params: \{ payToken \} \}\)/); assert.doesNotMatch(flow, /localStorage|sessionStorage/); });
test("activity rental 응답은 환급계좌를 노출하지 않는다", () => { assert.match(activity, /collection\("rental_orders"\)/); const responseShape = activity.slice(activity.indexOf("const rentalActivities")); assert.doesNotMatch(responseShape, /refundAccount/); });
test("정상 고객 취소와 보증금 자동 환급 UI는 구현하지 않는다", () => { assert.doesNotMatch(flow, /cancelRental|refundDeposit|대여 취소/); });
