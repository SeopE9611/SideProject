import assert from "node:assert/strict";
import { test } from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const policy = compileTsModule("lib/reviews/review-policy.ts", {
  "@/lib/status/flow-status": {
    isOrderConfirmedStatus: () => false,
    isRentalReturnedStatus: () => false,
    isStringingCompletedStatus: () => false,
  },
});
const input = compileTsModule("lib/reviews/review-input-policy.ts");
const query = compileTsModule("lib/reviews/review-query-match.ts");

test("후기 제출은 reviewed를 eligible보다 먼저 canonical reason으로 차단한다", () => {
  assert.equal(policy.getReviewSubmissionBlockReason({ eligible: false, reviewed: true }), "already");
  assert.equal(
    policy.getReviewSubmissionBlockReason({
      eligible: false, reviewed: false, ineligibleReason: "coveredByIntegratedReview",
    }),
    "coveredByIntegratedReview",
  );
  assert.equal(policy.getReviewSubmissionBlockReason({ eligible: true, reviewed: false }), null);
  assert.equal(policy.getReviewSubmissionBlockReason(null), "notFound");
});

test("후기 요청 body validator는 잘못된 본문과 사진 목록을 거부한다", () => {
  assert.deepEqual(input.validateReviewInput({ rating: 5, content: "충분한 후기 내용", photos: [] }).ok, true);
  assert.deepEqual(input.validateReviewInput({ rating: 0, content: "충분한 후기 내용", photos: [] }), { ok: false, reason: "invalidRating" });
  assert.deepEqual(input.validateReviewInput({ rating: 5, content: "짧음", photos: [] }), { ok: false, reason: "contentTooShort" });
  assert.deepEqual(input.validateReviewInput({ rating: 5, content: "충분한 후기 내용", photos: [1] }), { ok: false, reason: "invalidPhotos" });
});

test("후기 PATCH 입력 validator는 전달된 필드만 정규화하고 잘못된 값을 거부한다", () => {
  assert.deepEqual(input.validateReviewPatchInput({ content: "  충분한 후기 내용  " }), {
    ok: true, value: { content: "충분한 후기 내용" },
  });
  assert.deepEqual(input.validateReviewPatchInput({ rating: 4 }), { ok: true, value: { rating: 4 } });
  assert.deepEqual(input.validateReviewPatchInput({ photos: [] }), { ok: true, value: { photos: [] } });
  assert.equal(input.validateReviewPatchInput({ rating: 0 }).reason, "invalidRating");
  assert.equal(input.validateReviewPatchInput({ photos: [1] }).reason, "invalidPhotos");
});

test("후기 query match는 공개 권한 조건과 target 조건을 $and로 함께 보존한다", () => {
  const match = { $or: [{ moderationStatus: { $ne: "hidden" } }, { userId: "me" }] };
  query.appendMatchCondition(match, { $or: [{ productId: "product-1" }, { relatedProductIds: "product-1" }] });
  assert.deepEqual(match, {
    $and: [
      { $or: [{ moderationStatus: { $ne: "hidden" } }, { userId: "me" }] },
      { $or: [{ productId: "product-1" }, { relatedProductIds: "product-1" }] },
    ],
  });
});
