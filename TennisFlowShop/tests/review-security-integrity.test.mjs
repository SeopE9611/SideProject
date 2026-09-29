import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("hidden all은 관리자만 허용하고 mask/default 정책을 분리한다", () => {
  const source = read("app/api/reviews/route.ts");
  assert.match(source, /withHidden === "all" && !isAdmin/);
  assert.match(source, /forbiddenHiddenReviews/);
  assert.match(source, /withHidden === "mask"/);
  assert.match(source, /match\.status = "visible"/);
});

test("신규 후기와 duplicate key 처리는 원자적 방어선을 둔다", () => {
  const source = read("app/api/reviews/route.ts");
  const guard = read("lib/reviews/review-api-guards.ts");
  assert.match(source, /isDuplicateReviewError/);
  assert.match(guard, /code\?: unknown }\)\.code === 11000/);
  assert.match(source, /status: 409/);
  assert.ok((source.match(/isDeleted: false/g) ?? []).length >= 3);
});

test("rental unique index는 userId+rentalId active 문서에만 적용된다", () => {
  for (const path of ["lib/reviews.maintenance.ts", "scripts/db/ensure-runtime-indexes.mjs"]) {
    const source = read(path);
    assert.match(source, /user_rental_unique/);
    assert.match(source, /userId: 1, rentalId: 1/);
    assert.match(source, /unique: true/);
    assert.match(source, /rentalId: \{ \$exists: true \}/);
    assert.match(source, /isDeleted: false/);
  }
});

test("상품 상세 CTA는 canonical target 없이는 활성화하지 않는다", () => {
  const source = read("app/products/[id]/ProductDetailReviewData.utils.ts");
  assert.match(
    source,
    /const canonicalTarget = reviewEligibility\?\.nextTarget \?\? reviewEligibility\?\.target \?\? null/,
  );
  assert.match(source, /reviewEligibility\?\.eligible === true/);
  assert.match(source, /canonicalTarget\.eligible === true/);
  assert.match(source, /canonicalTarget\.reviewed === false/);
  assert.doesNotMatch(
    source,
    /reviewEligibility\?\.eligible \|\| reviewEligibility\?\.suggestedApplicationId/,
  );
});

test("교체서비스 related item 이름은 신청서 name을 사용하지 않는다", () => {
  const source = read("lib/reviews/review-target.server.ts");
  assert.match(source, /function serviceRelatedItem/);
  assert.match(source, /name: "교체서비스"/);
  assert.doesNotMatch(source, /type: "service"[\s\S]{0,120}doc: app/);
});

test("helpful은 hidden/본인 후기를 차단한다", () => {
  const source = read("app/api/reviews/[id]/helpful/route.ts");
  const guard = read("lib/reviews/review-api-guards.ts");
  assert.match(source, /getHelpfulReviewBlockReason/);
  assert.match(guard, /reviewNotVisible/);
  assert.match(guard, /ownReview/);
});

test("cursor와 후기 작성 로그인 정책을 방어한다", () => {
  const listSource = read("app/api/reviews/route.ts");
  const guard = read("lib/reviews/review-api-guards.ts");
  assert.match(listSource, /isValidReviewCursor/);
  assert.match(guard, /isValidId\(String\(cursor\.id \?\? ""\)\)/);
  assert.match(guard, /Number\.isFinite\(numericValue\)/);

  const writeSource = read("app/reviews/write/page.tsx");
  assert.doesNotMatch(writeSource, /NEXT_PUBLIC_GUEST_ORDER_MODE/);
  assert.match(writeSource, /const blockedByLoginGate = authChecked && !isAuthenticated/);
});

test("후기 중복 진단은 active 조건과 문자열 정규화 group key를 사용한다", () => {
  const helper = read("scripts/db/review-duplicate-diagnostics.mjs");
  const runner = read("scripts/db/check-review-duplicates.mjs");

  assert.match(helper, /isDeleted: \{ \$ne: true \}/);
  assert.match(helper, /export function normalizedField/);
  assert.match(helper, /to: "string"/);
  assert.match(helper, /onError: null/);
  assert.match(helper, /onNull: null/);
  assert.match(helper, /\{ \$set: Object\.fromEntries\(normalizedEntries\) \}/);
  assert.match(helper, /\{ \$match: normalizedMatch \}/);
  assert.match(helper, /keyFields: \["userId", "rentalId"\]/);
  assert.match(helper, /keyFields: \["userId", "productId", "orderId"\]/);
  assert.match(helper, /keyFields: \["userId", "serviceApplicationId"\]/);
  assert.match(runner, /buildDuplicateReviewPipeline\(spec\)/);
  assert.doesNotMatch(helper, /\$out|\$merge|updateOne|deleteOne|deleteMany/);
  assert.doesNotMatch(runner, /\$out|\$merge|updateOne|deleteOne|deleteMany/);
});
