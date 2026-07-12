import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertSourceOrder(source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert.notEqual(firstIndex, -1, `missing source token: ${first}`);
  assert.notEqual(secondIndex, -1, `missing source token: ${second}`);
  assert.ok(firstIndex < secondIndex, `${first} must appear before ${second}`);
}

function blockReason(target) {
  if (!target) return "notFound";
  if (target.reviewed) return "already";
  if (!target.eligible) return target.ineligibleReason ?? "notConfirmed";
  return null;
}

test("GET/POST 공통 canonical target 차단 순서: reviewed를 eligible보다 먼저 처리한다", () => {
  assert.equal(blockReason({ eligible: true, reviewed: true }), "already");
  assert.equal(
    blockReason({ eligible: false, reviewed: true, ineligibleReason: "coveredByIntegratedReview" }),
    "already",
  );
  assert.equal(
    blockReason({ eligible: false, reviewed: false, ineligibleReason: "notCompleted" }),
    "notCompleted",
  );
  assert.equal(
    blockReason({ eligible: false, reviewed: false, ineligibleReason: null }),
    "notConfirmed",
  );
  assert.equal(blockReason({ eligible: true, reviewed: false }), null);
  assert.equal(blockReason(null), "notFound");
});

test("후기 API 정책 계약: GET applicationId와 POST 등록이 같은 canonical 차단 helper를 사용한다", () => {
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const postRoute = read("app/api/reviews/route.ts");
  const policy = read("lib/reviews/review-policy.ts");

  assert.ok(policy.includes("export function getReviewSubmissionBlockReason"));
  assert.ok(
    policy.indexOf('if (target.reviewed) return "already"') <
      policy.indexOf("if (!target.eligible)"),
  );
  assert.ok(eligibility.includes("const blockReason = getReviewSubmissionBlockReason(target)"));
  assert.ok(eligibility.includes('blockReason === "coveredByIntegratedReview"'));
  assert.ok(eligibility.includes("const nextTarget = params.eligible ? target : null"));
  assert.ok(
    postRoute.includes(
      "const rentalBlockReason = getReviewSubmissionBlockReason(rentalCanonicalTarget)",
    ),
  );
  assert.ok(
    postRoute.includes(
      "const orderBlockReason = getReviewSubmissionBlockReason(orderCanonicalTarget)",
    ),
  );
  assert.ok(
    postRoute.includes("const appBlockReason = getReviewSubmissionBlockReason(appCanonicalTarget)"),
  );
});

test("후기 POST 정책 계약: 로컬 우회 조건 제거 및 공용 eligibility 정책을 사용한다", () => {
  const postRoute = read("app/api/reviews/route.ts");

  assert.ok(postRoute.includes("isOrderReviewEligible(bought)"));
  assert.ok(postRoute.includes("isRentalReviewEligible(rental)"));
  assert.ok(postRoute.includes("isStandaloneStringingReviewEligible(app)"));
  assert.ok(!postRoute.includes("const isRentalReviewConfirmed"));
  assert.ok(!postRoute.includes('String(bought.status ?? "") !== "구매확정"'));
  assert.ok(postRoute.includes('appBlockReason === "coveredByIntegratedReview"'));
  assert.ok(
    postRoute.includes('message: "coveredByIntegratedReview", reason: "coveredByIntegratedReview"'),
  );
  assert.ok(postRoute.includes('db.collection("reviews").findOne(dupFilter)'));
  assert.ok(
    postRoute.includes(
      'db.collection("reviews").findOne({\n      userId,\n      rentalId: { $in: [rentalIdObj, rentalIdStr] }',
    ),
  );
  assert.ok(
    postRoute.includes(
      'db.collection("reviews").findOne({\n      userId,\n      isDeleted: { $ne: true }',
    ),
  );
  assert.ok(postRoute.includes("{ serviceApplicationId: { $in: applicationIdCandidates } }"));
  assert.ok(postRoute.includes("{ applicationId: { $in: applicationIdCandidates } }"));
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
  assert.ok(
    reviewWrite.includes(
      "const reviewDestination = canonicalTarget ? getReviewDestination(canonicalTarget) : null",
    ),
  );
  assert.ok(reviewWrite.includes("router.replace(getReviewDestination(canonicalTarget).href)"));
  assert.ok(
    reviewWrite.includes('router.replace(reviewDestination?.href ?? "/mypage?tab=reviews")'),
  );
  assert.ok(
    !reviewWrite.includes('reviewContext === "product" && canonicalTarget.primaryProductId'),
  );
  assert.ok(reviewWritePolicy.includes('target?.reviewContext === "product_stringing"'));
  assert.ok(
    reviewWritePolicy.includes("`/products/${cleanId(target.primaryProductId)}?tab=reviews`"),
  );

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
  assert.ok(postRoute.includes("orderCanonicalTarget.relatedRacketIds ?? []"));
  assert.ok(postRoute.includes("appTarget?.relatedRacketIds ?? []"));
});

test("후기 surface/API 관계 계약: 상품 신청서 필드와 라켓 부모 관계를 공유한다", () => {
  const surface = read("lib/reviews/public-review-surface.server.ts");
  const postRoute = read("app/api/reviews/route.ts");
  const targetServer = read("lib/reviews/review-target.server.ts");

  assert.ok(surface.includes('"stringDetails.stringTypes"'));
  assert.ok(surface.includes('"meta.stringProductId"'));
  assert.ok(postRoute.includes("buildPublicReviewSurfaceTargetMatch"));
  assert.ok(targetServer.includes("directStringTypeIds"));
  assert.ok(targetServer.includes("app?.meta?.stringProductId"));

  assert.ok(surface.includes("findRacketOrderIds"));
  assert.ok(surface.includes("collectOrderRacketIds(row)"));
  assert.ok(surface.includes("orderCandidates"));
  assert.ok(surface.includes("rentalCandidates"));
  assert.ok(surface.includes("applicationCandidates"));
  assert.ok(surface.includes("orderId: { $in: orderIdCandidates }"));
  assert.ok(surface.includes("rentalId: { $in: rentalIdCandidates }"));
  assert.ok(surface.includes('reviewContext: "product_stringing"'));
  assert.ok(!surface.includes("orderCandidates.length ? { orderId: { $in: orderCandidates } }"));
});

test("후기 surface fallback context와 상세 UI 문구 계약", () => {
  const surface = read("lib/reviews/public-review-surface.server.ts");
  const productClient = read("app/products/[id]/ProductDetailClient.tsx");
  const racketClient = read("app/rackets/[id]/_components/RacketDetailClient.tsx");

  assert.ok(surface.includes("inferReviewContext"));
  assert.match(surface, /import\s+\{[\s\S]*inferReviewContext[\s\S]*\}\s+from/);
  assert.match(surface, /return\s+inferReviewContext\(row\)/);
  assert.ok(productClient.includes(">후기<"));
  assert.ok(racketClient.includes("후기"));
  assert.ok(!productClient.includes(">리뷰<"));
  assert.ok(!racketClient.includes(">리뷰<"));
  assert.ok(!productClient.includes("linkedReviewData"));
  assert.ok(!productClient.includes("/api/reviews?type=all&productId"));
  assert.ok(!racketClient.includes(`/reviews/write?productId=${"${racketId}"}`));
  assert.ok(productClient.includes("reviewSummary"));
});

test("후기 PATCH 정책 계약: partial validator와 사진 whitelist를 유지한다", () => {
  const patchRoute = read("app/api/reviews/[id]/route.ts");

  assert.ok(!patchRoute.includes("수정 유지"));
  assert.ok(!patchRoute.includes("rawBody.rating ?? 1"));
  assert.ok(!patchRoute.includes("rawBody.photos ?? []"));
  assert.ok(patchRoute.includes("validateReviewPatchInput(rawBody)"));
  assert.ok(patchRoute.includes('if ("content" in inputValidation.value) body.content'));
  assert.ok(patchRoute.includes('if ("rating" in inputValidation.value) body.rating'));
  assert.ok(patchRoute.includes('if ("photos" in inputValidation.value) body.photos'));
  assert.ok(patchRoute.includes("body.status") && patchRoute.includes("body.visibility"));
  assert.ok(patchRoute.includes("isAllowedHttpUrl"));
  assert.ok(patchRoute.includes('reason: "invalidPhotos"'));
});

test("후기 POST와 cursor 정책 계약: photos 타입과 cursor 필수 필드를 엄격 검증한다", () => {
  const postRoute = read("app/api/reviews/route.ts");

  assert.ok(postRoute.includes('const photosInput = "photos" in body ? body.photos : []'));
  assert.ok(!postRoute.includes("Array.isArray(body.photos) ? body.photos : []"));
  assert.ok(
    postRoute.includes('if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))'),
  );
  assert.ok(postRoute.includes('ObjectId.isValid(String(parsed.id ?? ""))'));
  assert.ok(postRoute.includes('sort === "latest"'));
  assert.ok(postRoute.includes("parsed.createdAt"));
  assert.ok(postRoute.includes('sort === "helpful" && !isValidCursorNumber(parsed.helpfulCount)'));
  assert.ok(postRoute.includes('sort === "rating" && !isValidCursorNumber(parsed.rating)'));
});

test("CI 계약: test-contract job에서 review-security를 public surface 다음에 실행한다", () => {
  const ci = read("../.github/workflows/ci.yml");
  const packageJson = read("package.json");

  assert.ok(packageJson.includes('"test:review-security"'));
  assert.ok(ci.includes("test-contract:"));
  assert.ok(ci.includes("Test public review surface"));
  assert.ok(ci.includes("Test review security and integrity"));
  assert.ok(ci.includes("pnpm test:review-security"));
  assert.ok(
    ci.indexOf("Test public review surface") < ci.indexOf("Test review security and integrity"),
  );
});

test("후기 POST body 계약: 일반 JSON 객체만 허용하고 검증 이후 필드에 접근한다", () => {
  const postRoute = read("app/api/reviews/route.ts");

  assert.ok(postRoute.includes("function isPlainRequestBody"));
  assert.ok(postRoute.includes("!Array.isArray(value)"));
  assert.ok(postRoute.includes('reason: "invalidBody"'));
  assert.ok(postRoute.includes('message: "잘못된 후기 요청입니다."'));
  assertSourceOrder(
    postRoute,
    "if (!isPlainRequestBody(body))",
    "const bodyOrderId = body.orderId",
  );
  assertSourceOrder(
    postRoute,
    "if (!isPlainRequestBody(body))",
    'const photosInput = "photos" in body ? body.photos : []',
  );
});

test("후기 수정 UI 계약: 사진 업로드 중 저장과 닫기를 차단하고 상태를 초기화한다", () => {
  const productDialog = read("app/products/[id]/ReviewEditDialog.tsx");
  const productClient = read("app/products/[id]/ProductDetailClient.tsx");
  const racketDialog = read("app/rackets/[id]/_components/ReviewEditDialog.tsx");
  const racketClient = read("app/rackets/[id]/_components/RacketDetailClient.tsx");
  const mypage = read("app/mypage/tabs/ReviewList.tsx");

  for (const source of [productDialog, racketDialog, mypage]) {
    assert.ok(source.includes("onUploadingChange"));
    assert.ok(source.includes("uploadingPhotos") || source.includes("uploadingEditPhotos"));
  }
  for (const source of [productDialog, racketDialog]) {
    assert.ok(source.includes("disabled={busy || uploadingPhotos || !isValid}"));
    assert.ok(source.includes("onUploadingPhotosChange"));
  }
  for (const source of [productClient, racketClient, mypage]) {
    assert.ok(source.includes("사진 업로드가 끝난 후 저장해 주세요."));
    assert.ok(source.includes("setUploadingEditPhotos(false)"));
  }
  assert.ok(mypage.includes("disabled={saving || uploadingEditPhotos"));
  assert.ok(productClient.includes("uploadingPhotos={uploadingEditPhotos}"));
  assert.ok(racketClient.includes("uploadingPhotos={uploadingEditPhotos}"));
});
