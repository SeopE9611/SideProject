import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

test("관리 API/UI와 마이페이지 API/UI가 context 관리 계약을 포함한다", () => {
  const mineApi = readFileSync(new URL("app/api/reviews/mine/route.ts", root), "utf8");
  assert.ok(mineApi.includes("resolvedReviewContext"));
  assert.ok(mineApi.includes("category"));
  assert.ok(mineApi.includes("rentalId"));
  assert.ok(mineApi.includes("orderId"));
  assert.ok(mineApi.includes("serviceApplicationIdResolved"));
  assert.ok(mineApi.includes("relatedProductIds"));
  assert.ok(mineApi.includes("relatedRacketIds"));
  assert.ok(mineApi.indexOf("contextCategoryMatch") < mineApi.indexOf("$limit: limit + 1"));
  assert.ok(mineApi.includes('then: "rental"') && mineApi.includes('then: "stringing"'));

  const mypage = readFileSync(new URL("app/mypage/tabs/ReviewList.tsx", root), "utf8");
  assert.ok(mypage.includes("ReviewContextBadge"));
  assert.ok(!mypage.includes('"product" | "service"'));
  assert.ok(mypage.includes("category: categoryFilter"));
  assert.ok(mypage.includes("거래 상세보기"));
  assert.ok(mypage.includes("후기 수정"));

  const adminApi = readFileSync(new URL("app/api/admin/reviews/route.ts", root), "utf8");
  assert.ok(adminApi.includes("context: z.enum"));
  assert.ok(adminApi.includes("resolvedReviewContext"));
  assert.ok(adminApi.indexOf("resolvedReviewContext") < adminApi.indexOf("$skip"));
  assert.ok(adminApi.includes('$count: "total"'));

  const metrics = readFileSync(new URL("app/api/admin/reviews/metrics/route.ts", root), "utf8");
  assert.ok(metrics.includes("byContext"));
  assert.ok(metrics.includes("byCategory"));

  const detail = readFileSync(new URL("app/api/admin/reviews/[id]/route.ts", root), "utf8");
  assert.ok(detail.includes("shapeAdminReview"));

  const adminUi = readFileSync(
    new URL("app/admin/reviews/_components/AdminReviewListClient.tsx", root),
    "utf8",
  );
  assert.ok(adminUi.includes("ReviewContextBadge"));
  assert.ok(adminUi.includes("전체 상태"));
  assert.ok(adminUi.includes("대여·교체서비스 후기"));
  assert.ok(adminUi.includes("유형별 후기"));
  assert.ok(adminUi.includes("/admin/orders/"));
  assert.ok(adminUi.includes("후기 상세"));
});
