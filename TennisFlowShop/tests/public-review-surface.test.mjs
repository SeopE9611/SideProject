import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const surface = read("lib/reviews/public-review-surface.server.ts");

test("공개 후기 surface는 상품/라켓 통합 대상 조건을 DB match로 구성한다", () => {
  assert.ok(surface.includes('target.type === "product"'));
  assert.ok(surface.includes("{ productId: { $in: targetCandidates } }"));
  assert.ok(surface.includes("{ relatedProductIds: { $in: targetCandidates } }"));
  assert.ok(surface.includes("{ serviceApplicationId: { $in: appCandidates } }"));
  assert.ok(surface.includes("{ applicationId: { $in: appCandidates } }"));

  assert.ok(surface.includes("{ racketId: { $in: targetCandidates } }"));
  assert.ok(surface.includes("{ relatedRacketIds: { $in: targetCandidates } }"));
  assert.ok(surface.includes("{ rentalId: { $in: rentalCandidates } }"));
});

test("공개 후기 surface는 ObjectId/string 혼용 후보를 안전하게 만든다", () => {
  assert.ok(surface.includes("export function idCandidates(value: string)"));
  assert.ok(
    surface.includes("ObjectId.isValid(trimmed) ? [new ObjectId(trimmed), trimmed] : [trimmed]"),
  );
  assert.ok(!surface.includes("new ObjectId(trimmed), trimmed] : [new ObjectId"));
});

test("공개 후기 surface는 target match 이후 facet에서 목록과 summary를 같은 base로 계산한다", () => {
  const targetIndex = surface.indexOf(
    "const targetMatch = await buildPublicReviewSurfaceTargetMatch",
  );
  const aggregateIndex = surface.indexOf('collection("reviews")');
  const baseMatchIndex = surface.indexOf(
    "{ $match: { isDeleted: { $ne: true }, ...targetMatch } }",
  );
  const facetIndex = surface.indexOf("$facet");
  const sortIndex = surface.indexOf("{ $sort: { createdAt: -1, _id: -1 } }");
  const limitIndex = surface.indexOf("{ $limit: limit }");
  const summaryIndex = surface.indexOf('{ $match: { status: "visible" } }');

  assert.ok(targetIndex < aggregateIndex);
  assert.ok(baseMatchIndex < facetIndex);
  assert.ok(facetIndex < sortIndex);
  assert.ok(sortIndex < limitIndex);
  assert.ok(summaryIndex > facetIndex);
  assert.ok(surface.includes('{ $match: { status: { $in: ["visible", "hidden"] } } }'));
  assert.ok(
    surface.includes('{ $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }'),
  );
});

test("공개 후기 surface는 숨김 후기를 작성자/관리자 외 사용자에게 마스킹한다", () => {
  assert.ok(surface.includes("const ownedByMe = Boolean("));
  assert.ok(surface.includes("String(row.userId) === String(viewerUserId)"));
  assert.ok(
    surface.includes('const masked = row?.status === "hidden" && !ownedByMe && !viewerIsAdmin'),
  );
  assert.ok(surface.includes("user: masked ? null"));
  assert.ok(surface.includes("content: masked ? null"));
  assert.ok(surface.includes("photos: masked ? []"));
});

test("공개 후기 surface는 context fallback과 label을 보장한다", () => {
  assert.ok(surface.includes('if (row?.rentalId || row?.reviewType === "rental") return "rental"'));
  assert.ok(surface.includes('if (row?.service === "stringing") return "standalone_stringing"'));
  assert.ok(
    surface.includes("contextLabel: row.contextLabel || getReviewContextLabel(reviewContext)"),
  );
});
