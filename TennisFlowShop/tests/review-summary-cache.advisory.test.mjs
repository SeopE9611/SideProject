import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("후기 요약 유지보수와 목록 구현 문자열 계약", () => {
  const post = read("app/api/reviews/route.ts");
  assert.ok(!post.includes("function updateProductRatingSummary"));
  assert.ok((post.match(/refreshReviewSummaryCachesForReviewSafely/g) ?? []).length >= 3);

  const maintenance = read("lib/reviews.maintenance.ts");
  assert.match(maintenance, /rebuildPublicReviewSummaryCaches/);
  assert.match(maintenance, /collection\("used_rackets"\)/);
  assert.match(maintenance, /runLimited\(\[\.\.\.productIds\], 6/);
  assert.match(maintenance, /reviewsScanned/);

  const productsApi = read("app/api/products/route.ts");
  assert.match(productsApi, /ratingCount: -1, ratingAvg: -1, _id: -1/);
  assert.ok(!productsApi.includes('collection("reviews")'));
  const racketsApi = read("app/api/rackets/route.ts");
  assert.match(racketsApi, /reviewCount: -1, ratingCount: -1, createdAt: -1, _id: -1/);
  assert.match(racketsApi, /ratingAvg: normalizedRatingAverage/);
  assert.match(racketsApi, /ratingCount: normalizedReviewCount/);
  assert.match(racketsApi, /reviewCount: normalizedReviewCount/);
});

test("후기 요약 UI 문자열과 라켓 카드 표현 계약", () => {
  const racketCard = read("app/rackets/_components/RacketCard.tsx");
  assert.doesNotMatch(racketCard, /yellow-|amber-|#[0-9A-Fa-f]{3,8}/);
  assert.match(racketCard, /text-warning/);
  assert.match(racketCard, /fill-current|fill-warning/);
  assert.match(racketCard, /prev\.racket\.reviewCount === next\.racket\.reviewCount/);
  assert.match(read("app/products/components/FilterableProductList.tsx"), /후기 많은순/);
  assert.match(read("app/rackets/_components/FilterableRacketList.tsx"), /후기 많은순/);
});
