import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public summary 공통 stage와 캐시용 summary 함수 계약", () => {
  const src = read("lib/reviews/public-review-surface.server.ts");
  assert.match(src, /export function buildPublicReviewSummaryStages\(\)/);
  assert.match(src, /\$match: \{ status: "visible" \}/);
  assert.match(src, /\$avg: "\$rating"/);
  assert.match(src, /count: \{ \$sum: 1 \}/);
  assert.match(src, /export async function getPublicReviewSummary/);
  assert.match(src, /buildPublicReviewSurfaceTargetMatch\(db, target\)/);
  assert.match(src, /isDeleted: \{ \$ne: true \}/);
  assert.match(src, /Number\(Number\(summaryRow\.average\)\.toFixed\(2\)\)/);
  assert.match(src, /summary: buildPublicReviewSummaryStages\(\)/);
});

test("후기 요약 캐시 모듈은 영향 대상과 상품·라켓 저장 필드를 처리한다", () => {
  const src = read("lib/reviews/review-summary-cache.server.ts");
  for (const token of [
    "resolveAffectedReviewTargets",
    "refreshReviewSummaryCachesForTargets",
    "refreshReviewSummaryCachesForReview",
    "refreshReviewSummaryCachesForReviewSafely",
    "collectStringProductIdsFromApplication",
    "collectRacketIdsFromApplication",
    "collectRentalRacketIds",
    "collectOrderRacketIds",
    "inferReviewContext",
    "dedupeStringIds",
  ]) assert.ok(src.includes(token), token);
  assert.match(src, /db\.collection\("products"\)\.updateOne/);
  assert.match(src, /ratingAvg: average, ratingAverage: average, ratingCount/);
  assert.match(src, /db\.collection\("used_rackets"\)\.updateOne/);
  assert.match(src, /ratingAvg: average, ratingAverage: average, ratingCount: count, reviewCount: count/);
  assert.match(src, /reviewSummaryUpdatedAt: new Date\(\)/);
});

test("작성·수정·삭제 route는 공통 캐시 refresh helper를 사용한다", () => {
  const post = read("app/api/reviews/route.ts");
  const user = read("app/api/reviews/[id]/route.ts");
  const admin = read("app/api/admin/reviews/[id]/route.ts");
  assert.ok(!post.includes("function updateProductRatingSummary"));
  assert.ok(!user.includes("function updateProductRatingSummary"));
  assert.ok(!admin.includes("function updateProductRatingSummary"));
  assert.ok((post.match(/refreshReviewSummaryCachesForReviewSafely/g) ?? []).length >= 3);
  assert.match(user, /body\.rating !== undefined \|\| body\.status \|\| body\.visibility/);
  assert.match(admin, /body\.rating !== undefined \|\| body\.status \|\| body\.visibility/);
  assert.match(user, /DELETE \/api\/reviews\/\[id\]/);
  assert.match(admin, /DELETE \/api\/admin\/reviews\/\[id\]/);
});

test("유지보수와 목록 UI/API 계약", () => {
  const maintenance = read("lib/reviews.maintenance.ts");
  assert.match(maintenance, /rebuildPublicReviewSummaryCaches/);
  assert.match(maintenance, /collection\("used_rackets"\)/);
  assert.match(maintenance, /runLimited\(\[\.\.\.productIds\], 6/);
  assert.match(maintenance, /reviewsScanned/);

  const productsApi = read("app/api/products/route.ts");
  assert.match(productsApi, /ratingCount: -1, ratingAvg: -1, _id: -1/);
  assert.ok(!productsApi.includes("collection(\"reviews\")"));

  const racketsApi = read("app/api/rackets/route.ts");
  assert.match(racketsApi, /reviewCount: -1, ratingCount: -1, createdAt: -1, _id: -1/);
  assert.match(racketsApi, /ratingAvg: 1/);

  const productCard = read("app/products/components/ProductCard.tsx");
  const racketCard = read("app/rackets/_components/RacketCard.tsx");
  assert.match(productCard, /prev\.product\.ratingAvg === next\.product\.ratingAvg/);
  assert.match(racketCard, /prev\.racket\.reviewCount === next\.racket\.reviewCount/);
  assert.match(racketCard, /<Star/);
  assert.match(read("app/products/components/FilterableProductList.tsx"), /후기 많은순/);
  assert.match(read("app/rackets/_components/FilterableRacketList.tsx"), /후기 많은순/);
});
