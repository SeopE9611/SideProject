import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const todo = read("lib/mypage/activity-todo.ts");
const summary = read("app/api/mypage/summary/route.ts");
const counts = read("app/api/mypage/activity/counts/route.ts");
const activity = read("app/api/mypage/activity/route.ts");
const flowList = read("app/mypage/tabs/TransactionFlowList.tsx");

test("shared resolver exposes structured confirmation item policy", () => {
  assert.match(todo, /export type MypageTodoReasonCode/);
  assert.match(todo, /export const MYPAGE_TODO_REASON_META/);
  assert.match(todo, /kind: "required"/);
  assert.match(todo, /kind: "optional"/);
  assert.match(todo, /rental_return_shipping_register/);
  assert.doesNotMatch(todo, /rental_return_shipping_edit/);
  assert.match(todo, /resolveApplicationTodoReason/);
  assert.match(todo, /resolveOrderTodoReason/);
  assert.match(todo, /resolveRentalTodoReason/);
  assert.match(todo, /isApplicationTodoActionable[\s\S]*resolveApplicationTodoReason\(app\) !== null/);
  assert.match(todo, /isOrderTodoActionable[\s\S]*resolveOrderTodoReason\(params\) !== null/);
  assert.match(todo, /isRentalTodoActionable[\s\S]*resolveRentalTodoReason\(params\) !== null/);
});

test("rental projections include confirmation item fields", () => {
  for (const source of [summary, counts]) {
    assert.match(source, /collection\("rental_orders"\)[\s\S]*status: 1/);
    assert.match(source, /collection\("rental_orders"\)[\s\S]*userConfirmedAt: 1/);
    assert.match(source, /collection\("rental_orders"\)[\s\S]*dueAt: 1/);
    assert.match(source, /collection\("rental_orders"\)[\s\S]*returnedAt: 1/);
    assert.match(source, /collection\("rental_orders"\)[\s\S]*shipping: 1/);
  }
  assert.match(activity, /collection\("rental_orders"\)[\s\S]*dueAt: 1/);
  assert.match(activity, /collection\("rental_orders"\)[\s\S]*returnedAt: 1/);
});

test("APIs use resolver SSOT and KST date", () => {
  for (const source of [summary, counts, activity]) {
    assert.match(source, /resolve(?:Application|Order|Rental)TodoReason/);
    assert.match(source, /toKstYmd\(\)/);
  }
  assert.match(activity, /scope === "todo"[\s\S]*group\.todoReasonCode !== null/);
  assert.match(summary, /resolveOrderTodoReason\([\s\S]*!== null/);
  assert.match(counts, /resolveRentalTodoReason\([\s\S]*!== null/);
  assert.match(counts, /serviceReviewPending:\s*\(reviewBundlesByApplicationId\.get\(String\(app\._id\)\)\?\.counts\.remaining \?\? 0\) > 0/);
});

test("client uses server reason codes and metadata instead of Korean string keys", () => {
  assert.doesNotMatch(flowList, /const getTodoPrimaryReason/);
  assert.doesNotMatch(flowList, /"반납 운송장 수정 필요"/);
  assert.doesNotMatch(flowList, /todoPrimaryReason === "상품 후기 작성 가능"/);
  assert.doesNotMatch(flowList, /todoPrimaryReason === "상품·교체서비스 후기 작성 가능"/);
  assert.match(flowList, /getMypageTodoReasonMeta/);
  assert.match(flowList, /todoReasonCode/);
  assert.match(flowList, /returnShippingWindowOpen/);
});
