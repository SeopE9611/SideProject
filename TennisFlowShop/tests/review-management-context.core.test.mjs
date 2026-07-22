import test from "node:test";
import assert from "node:assert/strict";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const target = compileTsModule("lib/reviews/review-target.ts");
const context = compileTsModule("lib/reviews/review-context.server.ts", { "./review-target": target });

test("후기 context는 canonical 및 legacy fixture를 실제 함수로 계산한다", () => {
  const fixtures = [
    [{ reviewContext: "product" }, "product"], [{ reviewContext: "product_stringing" }, "product_stringing"],
    [{ reviewContext: "standalone_stringing" }, "standalone_stringing"], [{ reviewContext: "rental" }, "rental"],
    [{ reviewContext: "rental_stringing" }, "rental_stringing"], [{ rentalId: "r1", serviceApplicationId: "a1" }, "rental_stringing"],
    [{ rentalId: "r1", applicationId: "a1" }, "rental_stringing"], [{ orderId: "o1", serviceApplicationId: "a1" }, "product_stringing"],
    [{ reviewType: "rental" }, "rental"], [{ service: "stringing" }, "standalone_stringing"],
    [{ reviewType: "service" }, "standalone_stringing"], [{ rentalId: "" }, "product"], [{ rentalId: "   " }, "product"], [{} , "product"],
  ];
  for (const [record, expected] of fixtures) assert.equal(target.inferReviewContext(record), expected);
});

test("관리 category와 context label은 다섯 context를 모두 매핑한다", () => {
  const expected = {
    product: ["product", "상품 후기"], product_stringing: ["product", "상품·교체서비스 후기"],
    standalone_stringing: ["stringing", "교체서비스 후기"], rental: ["rental", "대여 후기"],
    rental_stringing: ["rental", "대여·교체서비스 후기"],
  };
  for (const [reviewContext, [category, label]] of Object.entries(expected)) {
    assert.equal(target.getReviewManagementCategory(reviewContext), category);
    assert.equal(target.getReviewContextLabel(reviewContext), label);
  }
});

test("관리 Mongo context expression은 다섯 canonical context와 legacy fallback을 반환한다", () => {
  const expr = context.buildResolvedReviewContextExpression();
  assert.deepEqual(expr.$switch.branches[0].case.$in[1], ["product", "product_stringing", "standalone_stringing", "rental", "rental_stringing"]);
  assert.equal(expr.$switch.branches[1].then, "rental_stringing");
  assert.equal(expr.$switch.branches[2].then, "product_stringing");
  assert.equal(expr.$switch.branches[3].then, "rental");
  assert.equal(expr.$switch.branches[4].then, "standalone_stringing");
  assert.deepEqual(expr.$switch.branches[1].case.$and[0].$or[0].$let.in.$switch.branches[1].then, { $gt: [{ $strLenCP: { $trim: { input: "$$value" } } }, 0] });
  assert.equal(expr.$switch.default, "product");
});
