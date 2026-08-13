import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const importTs = async (path) => { const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText; return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`); };
const app = read("../TossMiniApp/src/App.tsx");
const payments = read("../TossMiniApp/src/api/payments.ts");
const checkout = read("../TossMiniApp/src/components/AppsPaymentCheckoutPanel.tsx");
const flow = read("../TossMiniApp/src/components/RacketRentalFlow.tsx");
const stepTwo = read("../TossMiniApp/src/components/RacketRentalStepTwo.tsx");
const shipping = read("../TossMiniApp/src/components/StringingApplicationStepTwo.tsx");
const work = read("../TossMiniApp/src/components/StringingApplicationStepThree.tsx");
const confirmation = read("../TossMiniApp/src/components/RacketRentalStepSix.tsx");
const activity = read("app/api/apps-in-toss/me/activity/route.ts");

test("pending 복구가 racket-rental 화면보다 먼저 평가된다", () => assert.ok(app.indexOf("if (pendingPayment)") < app.indexOf("if (isRacketRental")));
test("대여 Step 2는 구매 Step 전체와 구매 수량/빈 변경 함수를 재사용하지 않는다", () => { assert.doesNotMatch(stepTwo, /RacketPurchaseStepOne|구매 수량|onQuantityChange=\{\(\) => \{\}\}/); assert.match(stepTwo, /RacketStringProductPicker/); assert.match(stepTwo, /라켓 대여/); assert.match(stepTwo, /2 \/ 7 · 선택적 스트링/); });
test("대여/구매/교체서비스 배송·작업 단계 문구를 구분한다", () => { for (const value of ["라켓 대여", "4 / 7 · 수령 방법·배송지", "라켓 수령 방법", "대여 라켓을 받을 방법", "라켓 구매", "3 / 6 · 수령 방법·배송지", "2 / 5 · 전달·수령 정보"]) assert.match(shipping, new RegExp(value.replace("/", "\\/"))); for (const value of ["5 / 7 · 장력·작업·방문예약", "4 / 6 · 장력·작업·방문예약", "3 / 5 · 라켓·텐션 정보"]) assert.match(work, new RegExp(value.replace("/", "\\/"))); });
test("대여 eligibility helper를 실제 실행한다", async () => { const { getRacketRentalAvailability: check } = await importTs("../TossMiniApp/src/lib/racket-rental-availability.ts"); const availability = { available: 1 }; const base = { status: "available", rental: { enabled: true, deposit: 0, fee: { d7: 0, d15: 100, d30: 200 } } }; assert.equal(check({ ...base, rental: { ...base.rental, enabled: false } }, availability, 7), "rental_disabled"); assert.equal(check(base, { available: 0 }, 7), "no_inventory"); assert.equal(check({ ...base, rental: { ...base.rental, deposit: -1 } }, availability, 7), "invalid_deposit"); assert.equal(check(base, availability, 7), "available"); assert.equal(check({ ...base, rental: { ...base.rental, fee: { d7: -1 } } }, availability, 7), "invalid_fee"); });
test("allowed-step helper를 실제 실행한다", async () => { const { getAllowedRacketRentalStep: allowed } = await importTs("../TossMiniApp/src/lib/racket-rental-availability.ts"); const valid = { rentalAvailable: true, daysValid: true, stringSelectionValid: true, applicantValid: true, shippingValid: true, workValid: true, refundAccountValid: true }; assert.equal(allowed({ ...valid, daysValid: false }), 1); assert.equal(allowed({ ...valid, stringSelectionValid: false }), 2); assert.equal(allowed({ ...valid, applicantValid: false }), 3); assert.equal(allowed({ ...valid, shippingValid: false }), 4); assert.equal(allowed({ ...valid, workValid: false }), 5); assert.equal(allowed({ ...valid, refundAccountValid: false }), 6); assert.equal(allowed(valid), 7); });
test("최종 확인 수정 단계와 환급계좌 마스킹 계약", () => { assert.match(confirmation, /row\("스트링 선택"[\s\S]*, 2\)/); assert.match(confirmation, /row\("작업정보"[\s\S]*, 5\)/); assert.doesNotMatch(confirmation, /매장 방문 수령\$\{draft\.stringingRequested/); assert.match(confirmation, /repeat\(Math\.max/); });
test("서버와 MiniApp 환급 은행 code/label이 같다", async () => { const server = await importTs("lib/refund-bank-catalog.ts"); const mini = await importTs("../TossMiniApp/src/lib/refund-banks.ts"); assert.deepEqual(mini.REFUND_BANKS.map(([code, label]) => ({ code, label })), server.REFUND_BANK_CATALOG.map(({ code, label }) => ({ code, label }))); });
test("대여 route와 browser history guard를 포함한다", () => { assert.match(flow, /1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7/); assert.match(flow, /popstate/); assert.match(flow, /getAllowedStepForRentalDraft/); assert.match(flow, /replaceState/); });
test("prepare request는 가격 필드를 보내지 않는다", () => { const fn = payments.slice(payments.indexOf("export function prepareRacketRentalPayment")); assert.match(fn, /purpose: "racket_rental"/); for (const forbidden of ["rentalFee", "deposit", "stringPrice", "mountingFee", "serviceFee", "payableAmount", "pointsUsed", "packageDiscount"]) assert.doesNotMatch(fn, new RegExp(`${forbidden}:`)); });
test("checkoutPayment/pending marker와 activity 비노출 계약", () => { assert.match(checkout, /checkoutPayment\(\{ params: \{ payToken \} \}\)/); assert.doesNotMatch(flow, /localStorage|sessionStorage/); const responseShape = activity.slice(activity.indexOf("const rentalActivities")); assert.doesNotMatch(responseShape, /refundAccount/); });
