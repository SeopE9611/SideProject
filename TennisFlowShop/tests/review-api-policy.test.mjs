import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function blockReason(target) {
  if (!target) return "notFound";
  if (target.reviewed) return "already";
  if (!target.eligible) return target.ineligibleReason ?? "notConfirmed";
  return null;
}

test("GET/POST 공통 canonical target 차단 순서: reviewed를 eligible보다 먼저 처리한다", () => {
  assert.equal(blockReason({ eligible: true, reviewed: true }), "already");
  assert.equal(blockReason({ eligible: false, reviewed: true, ineligibleReason: "coveredByIntegratedReview" }), "already");
  assert.equal(blockReason({ eligible: false, reviewed: false, ineligibleReason: "notCompleted" }), "notCompleted");
  assert.equal(blockReason({ eligible: false, reviewed: false, ineligibleReason: null }), "notConfirmed");
  assert.equal(blockReason({ eligible: true, reviewed: false }), null);
  assert.equal(blockReason(null), "notFound");
});

test("후기 API 정책 계약: GET applicationId와 POST 등록이 같은 canonical 차단 helper를 사용한다", () => {
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const postRoute = read("app/api/reviews/route.ts");
  const policy = read("lib/reviews/review-policy.ts");

  assert.ok(policy.includes("export function getReviewSubmissionBlockReason"));
  assert.ok(policy.indexOf('if (target.reviewed) return "already"') < policy.indexOf("if (!target.eligible)"));
  assert.ok(eligibility.includes("const blockReason = getReviewSubmissionBlockReason(target)"));
  assert.ok(eligibility.includes('blockReason === "coveredByIntegratedReview"'));
  assert.ok(eligibility.includes("const nextTarget = params.eligible ? target : null"));
  assert.ok(postRoute.includes("const rentalBlockReason = getReviewSubmissionBlockReason(rentalCanonicalTarget)"));
  assert.ok(postRoute.includes("const orderBlockReason = getReviewSubmissionBlockReason(orderCanonicalTarget)"));
  assert.ok(postRoute.includes("const appBlockReason = getReviewSubmissionBlockReason(appCanonicalTarget)"));
});

test("후기 POST 정책 계약: 로컬 우회 조건 제거 및 공용 eligibility 정책을 사용한다", () => {
  const postRoute = read("app/api/reviews/route.ts");

  assert.ok(postRoute.includes("isOrderReviewEligible(bought)"));
  assert.ok(postRoute.includes("isRentalReviewEligible(rental)"));
  assert.ok(postRoute.includes("isStandaloneStringingReviewEligible(app)"));
  assert.ok(!postRoute.includes("const isRentalReviewConfirmed"));
  assert.ok(!postRoute.includes('String(bought.status ?? "") !== "구매확정"'));
  assert.ok(postRoute.includes('appBlockReason === "coveredByIntegratedReview"'));
  assert.ok(postRoute.includes('message: "coveredByIntegratedReview", reason: "coveredByIntegratedReview"'));
  assert.ok(postRoute.includes('db.collection("reviews").findOne(dupFilter)'));
  assert.ok(postRoute.includes('db.collection("reviews").findOne({\n      userId,\n      rentalId: { $in: [rentalIdObj, rentalIdStr] }'));
  assert.ok(postRoute.includes('db.collection("reviews").findOne({\n      userId,\n      service: "stringing"'));
  assert.ok(postRoute.includes("REVIEW_REWARD_POINTS"));
  assert.ok(postRoute.includes("grantPoints"));
  assert.ok(postRoute.includes('type: "review_reward_product"'));
  assert.ok(postRoute.includes('type: "review_reward_service"'));
});

test("후기 작성 페이지 정책 계약: canonical target 고정과 대상 전환 UI 제거", () => {
  const reviewWrite = read("app/reviews/write/page.tsx");
  const summary = read("components/reviews/ReviewTargetSummary.tsx");
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const reviewWritePolicy = read("lib/reviews/review-write.ts");

  for (const forbidden of [
    "type AppLite",
    "selectedAppId",
    "showAllApps",
    "allApps",
    "serviceSuggestedAppId",
    "shownApps",
    "switchProduct",
    "nextUnreviewed",
    "remainingCount",
    "/api/applications/stringing/list",
    "/api/reviews/mine?limit=50",
    "<select",
    "후기 대상 신청서",
    "전체 보기",
    "이 주문의 다른 상품",
    "리뷰 목록",
    "serviceLinkedOrder",
  ]) {
    assert.ok(!reviewWrite.includes(forbidden), `write page에서 제거되어야 합니다: ${forbidden}`);
  }

  for (const required of [
    "canonicalTarget",
    "ReviewTargetSummary",
    "canonicalHrefForTarget",
    "buildReviewSubmissionPayload",
    "getReviewDestination",
    "getReviewPostFailureState",
    "useUnsavedChangesGuard",
    "useBackNavigationGuard",
    "PhotosUploader",
    "PhotosReorderGrid",
    'fetch("/api/reviews"',
  ]) {
    assert.ok(reviewWrite.includes(required), `write page에 유지/추가되어야 합니다: ${required}`);
  }

  assert.ok(!reviewWrite.includes("function stateFromPostFailure"));
  assert.ok(reviewWrite.includes("getReviewPostFailureState"));
  assert.ok(reviewWritePolicy.includes("export function getReviewPostFailureState"));
  assert.ok(reviewWritePolicy.includes("function getTargetApplicationId"));
  assert.ok(reviewWritePolicy.includes("applicationId: getTargetApplicationId(target)"));

  assert.ok(reviewWrite.includes("eligibility?.nextTarget ?? eligibility?.target ?? null"));
  assert.ok(reviewWrite.includes("const reviewDestination = canonicalTarget ? getReviewDestination(canonicalTarget) : null"));
  assert.ok(reviewWrite.includes("router.replace(getReviewDestination(canonicalTarget).href)"));
  assert.ok(reviewWrite.includes("router.replace(reviewDestination?.href ?? \"/mypage?tab=reviews\")"));
  assert.ok(!reviewWrite.includes("reviewContext === \"product\" && canonicalTarget.primaryProductId"));
  assert.ok(reviewWritePolicy.includes("target?.reviewContext === \"product_stringing\""));
  assert.ok(reviewWritePolicy.includes("`/products/${cleanId(target.primaryProductId)}?tab=reviews`"));

  assert.ok(summary.includes("target.relatedItems"));
  assert.ok(summary.includes("TYPE_LABELS"));
  assert.ok(eligibility.includes("eligibilityPayload"));
  assert.ok(eligibility.includes("target: target ?? null"));
  assert.ok(eligibility.includes("const nextTarget = params.eligible ? target : null"));
});

test("후기 POST 문서는 canonical relatedRacketIds를 저장한다", () => {
  const postRoute = read("app/api/reviews/route.ts");
  assert.ok(postRoute.includes("relatedRacketIds:"));
  assert.ok(postRoute.includes("rentalTarget?.relatedRacketIds"));
  assert.ok(postRoute.includes("orderTarget?.relatedRacketIds ?? []"));
  assert.ok(postRoute.includes("appTarget?.relatedRacketIds ?? []"));
});
