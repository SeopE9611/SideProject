import assert from "node:assert/strict";
import test from "node:test";
import { compileTsModule } from "./helpers/compile-ts-module.mjs";

const input = compileTsModule("lib/reviews/review-input-policy.ts");
const guards = compileTsModule("lib/reviews/review-api-guards.ts");
const photo = compileTsModule("lib/reviews/review-photo-storage.server.ts", {
  "server-only": {},
  "@/lib/supabase-admin": { supabaseAdmin: {} },
});
const publicSurface = compileTsModule("lib/reviews/public-review-surface.server.ts", {
  "@/lib/reviews/review-target": { getReviewContextLabel: () => "", inferReviewContext: () => "product" },
  mongodb: { ObjectId: { isValid: () => false } },
  "./review-target.server": { collectOrderRacketIds: () => [] },
});

test("후기 입력 정책은 운영 validator로 별점, 내용, 사진 경계를 검증한다", () => {
  assert.equal(input.validateReviewInput({ rating: 0, content: "12345", photos: [] }).reason, "invalidRating");
  assert.equal(input.validateReviewInput({ rating: 4.5, content: "12345", photos: [] }).reason, "invalidRating");
  assert.equal(input.validateReviewInput({ rating: 5, content: "1234", photos: [] }).reason, "contentTooShort");
  assert.equal(input.validateReviewInput({ rating: 5, content: "a".repeat(1001), photos: [] }).reason, "contentTooLong");
  assert.equal(input.validateReviewInput({ rating: 5, content: "12345", photos: ["1", 2] }).reason, "invalidPhotos");
  assert.equal(input.validateReviewInput({ rating: 5, content: "12345", photos: ["1", "2"] }).ok, true);
});

test("후기 수정 입력 정책은 전달된 필드만 유지하고 잘못된 값을 거부한다", () => {
  assert.deepEqual(input.validateReviewPatchInput({}), { ok: true, value: {} });
  assert.deepEqual(input.validateReviewPatchInput({ rating: 4 }), { ok: true, value: { rating: 4 } });
  assert.equal(input.validateReviewPatchInput({ rating: null }).reason, "invalidRating");
  assert.equal(input.validateReviewPatchInput({ content: null }).reason, "contentTooShort");
  assert.equal(input.validateReviewPatchInput({ photos: null }).reason, "invalidPhotos");
});

test("공개 후기 predicate와 사진 URL whitelist는 운영 helper 결과를 반환한다", () => {
  assert.deepEqual(publicSurface.buildPublicReviewMatch(), {
    isDeleted: { $ne: true }, deletedAt: null, status: "visible", moderationStatus: { $ne: "hidden" },
  });
  assert.deepEqual(publicSurface.buildPublicReviewMatch(true), {
    isDeleted: { $ne: true }, deletedAt: null, moderationStatus: { $ne: "hidden" },
  });
  const valid = "https://cwzpxxahtayoyqqskmnt.supabase.co/storage/v1/object/public/tennis-images/reviews/a.jpg";
  assert.equal(photo.isAllowedReviewPhotoUrl(valid), true);
  assert.equal(photo.isAllowedReviewPhotoUrl("https://example.com/storage/v1/object/public/tennis-images/reviews/a.jpg"), false);
  assert.equal(photo.isAllowedReviewPhotoUrl("https://cwzpxxahtayoyqqskmnt.supabase.co/storage/v1/object/public/tennis-images/other/a.jpg"), false);
});

test("helpful, cursor, 중복 및 잘못된 요청 body 방어는 순수 helper 결과를 반환한다", () => {
  assert.equal(guards.getHelpfulReviewBlockReason({ status: "visible", moderationStatus: "hidden" }, "viewer"), "reviewNotVisible");
  assert.equal(guards.getHelpfulReviewBlockReason({ status: "visible", moderationStatus: "visible", userId: "viewer" }, "viewer"), "ownReview");
  assert.equal(guards.getHelpfulReviewBlockReason({ status: "visible", moderationStatus: "visible", userId: "author" }, "viewer"), null);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: "2026-01-01T00:00:00.000Z" }, "latest", (id) => id === "id"), true);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: new Date("2026-01-01T00:00:00.000Z") }, "latest", () => true), true);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: "invalid-date" }, "latest", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: new Date("invalid-date") }, "latest", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: 123 }, "latest", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", createdAt: null }, "latest", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", helpfulCount: 3 }, "helpful", () => true), true);
  assert.equal(guards.isValidReviewCursor({ id: "id", helpfulCount: Number.NaN }, "helpful", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", helpfulCount: "3" }, "helpful", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id", rating: 5 }, "rating", () => true), true);
  assert.equal(guards.isValidReviewCursor({ id: "id", rating: Infinity }, "rating", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "id" }, "rating", () => true), false);
  assert.equal(guards.isValidReviewCursor([], "rating", () => true), false);
  assert.equal(guards.isValidReviewCursor({ id: "invalid-id", createdAt: "2026-01-01T00:00:00.000Z" }, "latest", () => false), false);
  assert.equal(guards.isDuplicateReviewError({ code: 11000 }), true);
  assert.equal(guards.isDuplicateReviewError({ code: 1 }), false);
  assert.equal(guards.isPlainReviewRequestBody({ rating: 5 }), true);
  assert.equal(guards.isPlainReviewRequestBody([]), false);
  assert.equal(guards.isPlainReviewRequestBody(null), false);
});
