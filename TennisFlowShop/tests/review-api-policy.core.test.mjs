import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import { test } from "node:test";
import ts from "typescript";

function compileTs(rel) {
  const source = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "review-api-policy-")), `${rel}.cjs`);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod._compile(outputText, filename);
  return mod.exports;
}

const policy = compileTs("lib/reviews/review-policy.ts");
const input = compileTs("lib/reviews/review-input-policy.ts");
const query = compileTs("lib/reviews/review-query-match.ts");

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
