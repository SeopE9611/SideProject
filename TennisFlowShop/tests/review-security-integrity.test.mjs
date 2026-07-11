import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function validateReviewInput(input) {
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: "invalidRating" };
  }
  if (typeof input.content !== "string") return { ok: false, reason: "contentTooShort" };
  const content = input.content.trim();
  if (content.length < 5) return { ok: false, reason: "contentTooShort" };
  if (content.length > 1000) return { ok: false, reason: "contentTooLong" };
  if (!Array.isArray(input.photos)) return { ok: false, reason: "invalidPhotos" };
  if (input.photos.length > 5) return { ok: false, reason: "tooManyPhotos" };
  if (!input.photos.every((photo) => typeof photo === "string")) {
    return { ok: false, reason: "invalidPhotos" };
  }
  return { ok: true, value: { rating, content, photos: input.photos } };
}

test("후기 입력 정책은 별점/내용/사진 경계를 실행 검증한다", () => {
  assert.equal(
    validateReviewInput({ rating: 0, content: "12345", photos: [] }).reason,
    "invalidRating",
  );
  assert.equal(
    validateReviewInput({ rating: 6, content: "12345", photos: [] }).reason,
    "invalidRating",
  );
  assert.equal(
    validateReviewInput({ rating: 4.5, content: "12345", photos: [] }).reason,
    "invalidRating",
  );
  assert.equal(validateReviewInput({ rating: 5, content: "12345", photos: [] }).ok, true);
  assert.equal(
    validateReviewInput({ rating: 5, content: "1234", photos: [] }).reason,
    "contentTooShort",
  );
  assert.equal(validateReviewInput({ rating: 5, content: "12345", photos: [] }).ok, true);
  assert.equal(validateReviewInput({ rating: 5, content: "a".repeat(1000), photos: [] }).ok, true);
  assert.equal(
    validateReviewInput({ rating: 5, content: "a".repeat(1001), photos: [] }).reason,
    "contentTooLong",
  );
  assert.equal(
    validateReviewInput({ rating: 5, content: "12345", photos: ["1", "2", "3", "4", "5"] }).ok,
    true,
  );
  assert.equal(
    validateReviewInput({ rating: 5, content: "12345", photos: ["1", "2", "3", "4", "5", "6"] })
      .reason,
    "tooManyPhotos",
  );
});

test("hidden all은 관리자만 허용하고 mask/default 정책을 분리한다", () => {
  const source = read("app/api/reviews/route.ts");
  assert.match(source, /withHidden === "all" && !isAdmin/);
  assert.match(source, /forbiddenHiddenReviews/);
  assert.match(source, /withHidden === "mask"/);
  assert.match(source, /match\.status = "visible"/);
});

test("신규 후기와 duplicate key 처리는 원자적 방어선을 둔다", () => {
  const source = read("app/api/reviews/route.ts");
  assert.match(source, /function isDuplicateKeyError/);
  assert.match(source, /code\?: unknown }\)\.code === 11000/);
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
  assert.match(source, /exists\.status !== "visible"/);
  assert.match(source, /reason: "reviewNotVisible"/);
  assert.match(source, /String\(exists\.userId\) === String\(userId\)/);
  assert.match(source, /reason: "ownReview"/);
});

test("cursor와 후기 작성 로그인 정책을 방어한다", () => {
  const listSource = read("app/api/reviews/route.ts");
  assert.match(listSource, /invalidCursor/);
  assert.match(listSource, /ObjectId\.isValid\(String\(after\.id\)\)/);
  assert.match(listSource, /Number\.isFinite\(value\)/);

  const writeSource = read("app/reviews/write/page.tsx");
  assert.doesNotMatch(writeSource, /NEXT_PUBLIC_GUEST_ORDER_MODE/);
  assert.match(writeSource, /const blockedByLoginGate = authChecked && !isAuthenticated/);
});
