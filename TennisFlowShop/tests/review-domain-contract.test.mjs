import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function normalizeSource(source) {
  return source.replace(/\s+/g, " ").trim();
}

function assertSourceIncludes(source, expected, message) {
  assert.ok(normalizeSource(source).includes(normalizeSource(expected)), message);
}

test("후기 대상 통합 계약: 서비스 연결 주문/대여는 통합 reviewContext로 처리한다", () => {
  const orderCta = read("components/reviews/OrderReviewCTA.tsx");
  const serviceCta = read("components/reviews/ServiceReviewCTA.tsx");
  const rentalCta = read("components/reviews/RentalReviewCTA.tsx");
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const reviewsRoute = read("app/api/reviews/route.ts");
  const reviewItems = read("app/api/orders/[id]/review-items/route.ts");
  const orderDetail = read("app/mypage/orders/_components/OrderDetailClient.tsx");
  const userOrders = read("app/api/users/me/orders/route.ts");
  const activityRoute = read("app/api/mypage/activity/route.ts");
  const rentalsDetail = read("app/mypage/rentals/_components/RentalsDetailClient.tsx");
  const applicationsClient = read("app/mypage/applications/_components/ApplicationsClient.tsx");
  const transactionFlowList = read("app/mypage/tabs/TransactionFlowList.tsx");
  const publicReviewSurface = read("lib/reviews/public-review-surface.server.ts");

  assert.ok(!orderCta.includes("if (serviceLinkedOrder) return null;"));
  assert.ok(orderCta.includes("product_stringing"));
  assert.ok(serviceCta.includes("coveredByIntegratedReview") && serviceCta.includes("return null"));
  assert.ok(!orderCta.includes("스트링·교체서비스 후기 작성"));
  assert.ok(!rentalCta.includes("대여·스트링 교체 후기 작성"));
  assert.ok(!serviceCta.includes("교체서비스 후기 작성"));
  assert.ok(rentalCta.includes("rental_stringing") && rentalCta.includes("후기 작성"));
  assert.ok(orderDetail.includes("/review-items"));
  assert.ok(orderDetail.includes("buildReviewWriteHref"));
  assert.ok(
    !orderDetail.includes(
      "/reviews/write?service=stringing&applicationId=${reviewableStringingAppId}",
    ),
  );
  assert.ok(
    !orderDetail.includes('import OrderReviewCTA from "@/components/reviews/OrderReviewCTA";'),
  );
  assert.ok(!orderDetail.includes("<OrderReviewCTA"));
  assert.ok(!orderDetail.includes("이 주문은 리뷰를 작성하지 않았습니다."));
  assert.ok(!orderDetail.includes("이 주문은 리뷰를 작성하였습니다."));
  assert.ok(!orderDetail.includes("리뷰 관리로 이동"));
  assert.ok(!orderDetail.includes("/reviews/write?productId="));
  assert.ok(!orderDetail.includes("후기 상세 보기"));
  assert.ok(orderDetail.includes("ctaHref: buildReviewWriteHref({"));
  assert.ok(orderDetail.includes('reviewContext: "product",'));
  assert.ok(orderDetail.includes('label: "스트링·교체서비스 후기를 남겨주세요."'));
  assert.ok(orderDetail.includes("`${firstUnreviewed.name} 후기를 남겨주세요.`"));
  assert.ok(orderDetail.includes("작성한 후기 보기"));
  assert.ok(orderDetail.includes("const hasReviewTargets = reviewsReady && reviewTotal > 0;"));
  assert.ok(orderDetail.includes("const allReviewed = hasReviewTargets && reviewRemaining === 0;"));
  assert.ok(orderDetail.includes("후기 작성 완료"));
  assert.ok(orderDetail.includes('href="/mypage?tab=reviews"'));
  assert.ok(
    orderDetail.includes(
      "!isReviewItemsLoading && reviewTotal !== null && reviewRemaining !== null",
    ),
  );
  assert.ok(userOrders.includes("reviewContext") && userOrders.includes("reviewNextApplicationId"));
  assert.ok(
    activityRoute.includes(
      'nextTarget?.reviewContext ?? targetBundle?.targets[0]?.reviewContext ?? "product"',
    ),
  );
  assert.ok(
    !activityRoute.includes(
      "isConfirmed && !serviceLinkedOrder ? reviewPendingProductIds.length : 0",
    ),
  );
  assert.ok(!rentalsDetail.includes("<ServiceReviewCTA"));
  assert.ok(applicationsClient.includes("isStringService && !isLinkedApplication"));
  assert.ok(
    transactionFlowList.includes("!applicationActionTarget.orderId") &&
      transactionFlowList.includes("!applicationActionTarget.rentalId"),
  );
  assert.ok(eligibility.includes('reviewContext === "product_stringing"'));
  assert.ok(!eligibility.includes('reason: "serviceLinkedOrder"'));
  assert.ok(!reviewsRoute.includes('message: "serviceLinkedOrder"'));
  assert.ok(!reviewItems.includes("status: 403") || !reviewItems.includes("serviceLinkedOrder"));
  assert.ok(
    reviewsRoute.includes("reviewContext") &&
      reviewsRoute.includes("contextLabel") &&
      reviewsRoute.includes("relatedProductIds"),
  );
  assert.ok(
    reviewsRoute.includes("relatedProductIds") && reviewsRoute.includes("__serviceProductIds"),
  );
  assert.ok(reviewsRoute.includes("buildPublicReviewSurfaceTargetMatch"));
  assertSourceIncludes(
    reviewsRoute,
    `const productTargetMatch =
      await buildPublicReviewSurfaceTargetMatch(db, {
        type: "product",
        id: productFilterId!,
      });`,
    "상품 후기 조회는 공개 후기 surface 공통 helper를 사용해야 합니다.",
  );
  assert.ok(publicReviewSurface.includes("{ productId: { $in: targetCandidates } }"));
  assert.ok(publicReviewSurface.includes("{ relatedProductIds: { $in: targetCandidates } }"));
  assert.ok(publicReviewSurface.includes("findProductApplicationIds"));
  assert.ok(publicReviewSurface.includes('"stringDetails.stringItems.productId"'));
  assert.ok(publicReviewSurface.includes('"stringDetails.lines.stringProductId"'));
  assert.ok(publicReviewSurface.includes('"meta.stringProductId"'));
  assert.ok(
    !reviewsRoute.includes('if (row.type === "product") return wanted.has(String(row.productId));'),
  );
});

test("후기 canonical resolver 계약: subject/target/bundle과 호환 export를 유지한다", () => {
  const client = read("lib/reviews/review-target.ts");
  const server = read("lib/reviews/review-target.server.ts");
  assert.ok(client.includes('export type ReviewSubjectType = "order" | "rental" | "application"'));
  assert.ok(client.includes("export type CanonicalReviewTarget"));
  assert.ok(client.includes("subjectType: ReviewSubjectType"));
  assert.ok(client.includes("subjectId: string"));
  assert.ok(client.includes("applicationIds: string[]"));
  assert.ok(client.includes("relatedProductIds: string[]"));
  assert.ok(client.includes("relatedRacketIds: string[]"));
  assert.ok(client.includes("export type ReviewTargetBundle"));
  assert.ok(client.includes("dedupeStringIds"));
  assert.ok(client.includes("buildReviewTargetKey"));
  assert.ok(server.includes("resolveOrderReviewTargetBundle"));
  assert.ok(server.includes("resolveRentalReviewTargetBundle"));
  assert.ok(server.includes("resolveApplicationReviewTargetBundle"));
  assert.ok(server.includes("resolveOrderReviewTargetBundlesBatch"));
  assert.ok(server.includes("resolveRentalReviewTargetBundlesBatch"));
  assert.ok(server.includes("export async function resolveOrderReviewTarget("));
  assert.ok(server.includes("export async function resolveRentalReviewTarget("));
  assert.ok(server.includes("export async function resolveStringingApplicationReviewTarget("));
});

test("후기 canonical resolver 계약: 복수 신청서와 통합 target 정책을 보장한다", () => {
  const server = read("lib/reviews/review-target.server.ts");
  assert.ok(server.includes("findLinkedStringingApplicationsForOrder"));
  assert.ok(server.includes("findLinkedStringingApplicationsForRental"));
  const orderApplicationFinder = server.slice(
    server.indexOf("export async function findLinkedStringingApplicationsForOrder"),
    server.indexOf("export async function findLinkedStringingApplicationForOrder"),
  );
  assert.ok(!orderApplicationFinder.includes(".findOne("));
  assert.ok(server.includes('reviewContext: "product_stringing"'));
  assert.ok(server.includes('reviewContext: "standalone_stringing"'));
  assert.match(
    server,
    /buildReviewTargetKey\(\{\s*subjectType:\s*"order"\s*,\s*subjectId\s*,\s*reviewContext:\s*"product_stringing"\s*,?\s*\}\)/,
  );
  assert.ok(
    server.includes('buildReviewTargetKey({ subjectType: "rental", subjectId, reviewContext })'),
  );
  assert.match(
    server,
    /ineligibleReason:\s*target\.ineligibleReason\s*\?\?\s*\(target\.subjectType\s*!==\s*"application"\s*\?\s*"coveredByIntegratedReview"\s*:\s*null\)/,
  );
  assert.ok(server.includes("collectStringProductIdsFromApplication"));
  assert.ok(server.includes("stringDetails?.lines"));
  assert.ok(server.includes("stringProductId"));
  assert.ok(server.includes("stringId"));
  assert.ok(server.includes("collectOrderRacketIds"));
  assert.ok(server.includes("collectRentalRacketIds"));
});

test("후기 canonical API 계약: 주요 API가 bundle 결과와 기존 응답 필드를 함께 제공한다", () => {
  const reviewItems = read("app/api/orders/[id]/review-items/route.ts");
  const userOrders = read("app/api/users/me/orders/route.ts");
  const activity = read("app/api/mypage/activity/route.ts");
  const counts = read("app/api/mypage/activity/counts/route.ts");
  const summary = read("app/api/mypage/summary/route.ts");
  assert.ok(reviewItems.includes("resolveOrderReviewTargetBundle"));
  assert.ok(reviewItems.includes("targetBundle"));
  assert.ok(reviewItems.includes("nextProductId"));
  assert.ok(reviewItems.includes("nextApplicationId"));
  assert.ok(reviewItems.includes("nextReviewContext"));
  assert.ok(userOrders.includes("resolveOrderReviewTargetBundlesBatch"));
  assert.ok(userOrders.includes("targetBundle?.counts.remaining"));
  assert.ok(userOrders.includes("reviewAllDone"));
  assert.ok(userOrders.includes("reviewNextTargetProductId"));
  assert.ok(activity.includes("resolveOrderReviewTargetBundlesBatch"));
  assert.ok(counts.includes("resolveOrderReviewTargetBundlesBatch"));
  assert.ok(summary.includes("resolveOrderReviewTargetBundlesBatch"));
  assert.ok(
    !userOrders.includes(
      'reviewContext: "product_stringing" },\n            ...(reviewNextApplicationId',
    ),
  );
});

test("후기 canonical resolver 계약: 실제 batch, 공통 정책, 호환 필드를 유지한다", () => {
  const server = read("lib/reviews/review-target.server.ts");
  const target = read("lib/reviews/review-target.ts");
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const activity = read("app/api/mypage/activity/route.ts");
  const counts = read("app/api/mypage/activity/counts/route.ts");
  const summary = read("app/api/mypage/summary/route.ts");

  const orderBatch =
    server.match(/export async function resolveOrderReviewTargetBundlesBatch[\s\S]*?\n}/)?.[0] ??
    "";
  assert.ok(
    !orderBatch.includes("resolveOrderReviewTargetBundle("),
    "주문 batch는 단건 resolver를 반복 호출하지 않아야 합니다.",
  );
  assert.ok(server.includes("loadReviewResolutionContext"));
  assert.match(server, /db\s*\.\s*collection\("stringing_applications"\)\s*\.\s*find\(/);
  assert.match(server, /db\s*\.\s*collection\("reviews"\)\s*\.\s*find\(/);
  assert.ok(!server.includes("async function resolveReviewed"));
  assert.ok(server.includes("resolveReviewedFromLoadedReviews"));
  assert.ok(server.includes("matchReviewToCanonicalTarget"));
  assert.ok(server.includes("isStringingReviewBlockedStatus"));
  assert.ok(server.includes("relatedItems"));
  assert.ok(server.includes("coveredBySubjectType"));
  assert.ok(server.includes("coveredBySubjectId"));
  assert.ok(target.includes("coveredBySubjectType"));
  assert.ok(target.includes("redirectTarget"));
  assert.ok(server.includes("export async function resolveOrderReviewTarget"));
  assert.ok(server.includes("export async function resolveRentalReviewTarget"));
  assert.ok(server.includes("export async function resolveStringingApplicationReviewTarget"));

  assert.ok(eligibility.includes("resolveApplicationReviewTargetBundlesBatch"));
  assert.ok(eligibility.includes("target: nextTarget"));
  assert.ok(eligibility.includes("reverseLinkedIds"));
  assert.ok(eligibility.includes("coveredByIntegratedReview"));

  for (const [label, src] of [
    ["activity", activity],
    ["counts", counts],
    ["summary", summary],
  ]) {
    assert.ok(src.includes("resolveOrderReviewTargetBundlesBatch"), `${label}: 주문 bundle 사용`);
    assert.ok(src.includes("resolveRentalReviewTargetBundlesBatch"), `${label}: 대여 bundle 사용`);
    assert.ok(
      src.includes("resolveApplicationReviewTargetBundlesBatch"),
      `${label}: 신청서 bundle 사용`,
    );
  }
});

test("canonical 후기 target resolver 계약: eligibility/count/rental_stringing/activity 중복 조회를 고정한다", () => {
  const server = read("lib/reviews/review-target.server.ts");
  const policy = read("lib/reviews/review-policy.ts");
  const activity = read("app/api/mypage/activity/route.ts");
  const eligibility = read("app/api/reviews/eligibility/route.ts");

  assert.ok(server.includes("const eligibleTargets = targets.filter((target) => target.eligible)"));
  assert.ok(
    server.includes("allReviewed: eligibleTargets.length === 0 || remainingTargets.length === 0"),
  );
  assert.match(
    server,
    /return\s+makeBundle\(\s*"application"\s*,\s*subjectId\s*,\s*parent\.targets\.map\(/,
  );
  assert.ok(server.includes("eligible: false") && server.includes("redirectTarget: t"));
  assert.ok(policy.includes("isStandaloneStringingReviewEligible"));
  assert.ok(
    policy.includes("Boolean(app?.userConfirmedAt)") &&
      policy.includes("isStringingCompletedStatus(app?.status)") &&
      policy.includes("!isStringingReviewBlockedStatus(app?.status)"),
  );
  assert.ok(
    server.includes(
      'const reviewContext: ReviewContext = applications.length ? "rental_stringing" : "rental"',
    ),
  );
  assert.ok(!server.includes('rental?.stringing?.requested ? "rental_stringing"'));
  assert.ok(!activity.includes("serviceReviewCandidateIds"));
  assert.ok(!activity.includes("reviewedServiceApplicationIds"));
  assert.ok(!activity.includes("hasPendingServiceReview"));
  assert.ok(!activity.includes('service: "stringing",\n          serviceApplicationId'));
  assert.ok(server.includes('forceType?: "product" | "string"'));
  assert.ok(server.includes('forceType: "string"'));
  assert.ok(
    server.includes("resolveOrderReviewTarget") &&
      server.includes("resolveRentalReviewTarget") &&
      server.includes("resolveStringingApplicationReviewTarget"),
  );
  for (const field of [
    "eligible",
    "reason",
    "reviewContext",
    "targetType",
    "targetLabel",
    "suggestedOrderId",
    "suggestedProductId",
    "suggestedApplicationId",
    "suggestedRentalId",
    "redirectHref",
    "subjectType",
    "subjectId",
    "target:",
    "nextTarget",
    "coveredBySubjectType",
    "coveredBySubjectId",
  ]) {
    assert.ok(eligibility.includes(field), `eligibility 응답 필드 유지: ${field}`);
  }
});

test("후기 GET/POST canonical 정책 통일 계약: reviewed 우선, 공용 helper, 중복 방어를 유지한다", () => {
  const eligibility = read("app/api/reviews/eligibility/route.ts");
  const reviewsRoute = read("app/api/reviews/route.ts");
  const policy = read("lib/reviews/review-policy.ts");

  assert.ok(policy.includes("export function getReviewSubmissionBlockReason"));
  assert.ok(
    policy.indexOf('if (target.reviewed) return "already"') <
      policy.indexOf("if (!target.eligible)"),
  );
  assert.ok(eligibility.includes("const blockReason = getReviewSubmissionBlockReason(target)"));
  assert.ok(eligibility.includes('blockReason === "coveredByIntegratedReview"'));
  assert.ok(eligibility.includes("const nextTarget = params.eligible ? target : null"));

  assert.ok(reviewsRoute.includes("isOrderReviewEligible(bought)"));
  assert.ok(reviewsRoute.includes("isRentalReviewEligible(rental)"));
  assert.ok(reviewsRoute.includes("isStandaloneStringingReviewEligible(app)"));
  assert.ok(!reviewsRoute.includes("const isRentalReviewConfirmed"));
  assert.ok(!reviewsRoute.includes('String(bought.status ?? "") !== "구매확정"'));
  assert.ok(reviewsRoute.includes('appBlockReason === "coveredByIntegratedReview"'));
  assert.ok(
    reviewsRoute.includes(
      'message: "coveredByIntegratedReview", reason: "coveredByIntegratedReview"',
    ),
  );

  assert.ok(
    reviewsRoute.includes(
      "const rentalBlockReason = getReviewSubmissionBlockReason(rentalCanonicalTarget)",
    ),
  );
  assert.ok(
    reviewsRoute.indexOf(
      "const rentalBlockReason = getReviewSubmissionBlockReason(rentalCanonicalTarget)",
    ) <
      reviewsRoute.indexOf(
        'db.collection("reviews").findOne({\n      userId,\n      rentalId: { $in: [rentalIdObj, rentalIdStr] }',
      ),
  );
  assert.ok(reviewsRoute.includes('db.collection("reviews").findOne(dupFilter)'));
  assert.ok(reviewsRoute.includes("const applicationIdCandidates = [appIdObj, appIdStr]"));
  assert.ok(
    reviewsRoute.includes("{ serviceApplicationId: { $in: applicationIdCandidates } }"),
  );
  assert.ok(reviewsRoute.includes("{ applicationId: { $in: applicationIdCandidates } }"));
  assert.ok(reviewsRoute.includes('service: "stringing"'));

  assert.ok(reviewsRoute.includes("REVIEW_REWARD_POINTS"));
  assert.ok(reviewsRoute.includes("grantPoints"));
  assert.ok(reviewsRoute.includes('type: "review_reward_product"'));
  assert.ok(reviewsRoute.includes('type: "review_reward_service"'));
});

test("상품·라켓 상세 공개 후기 surface 계약", () => {
  const productPage = read("app/products/[id]/page.tsx");
  const racketServer = read("lib/racket-detail.server.ts");
  const productClient = read("app/products/[id]/ProductDetailClient.tsx");
  const racketClient = read("app/rackets/[id]/_components/RacketDetailClient.tsx");
  const productReviews = read("app/products/[id]/useProductDetailReviews.ts");
  const productCard = read("app/products/[id]/ProductReviewCard.tsx");
  const surface = read("lib/reviews/public-review-surface.server.ts");

  assert.ok(productPage.includes("getPublicReviewSurface"));
  assert.ok(racketServer.includes("getPublicReviewSurface"));
  assert.ok(!productPage.includes("$group: { _id: null, avg"));
  assert.ok(!racketServer.includes("productId: objId"));
  assert.ok(productClient.includes("normalizeReviewSummary(product?.reviewSummary)"));
  assert.ok(racketClient.includes("normalizeReviewSummary(racket?.reviewSummary)"));
  assert.ok(!productClient.includes("reviews.reduce"));
  assert.ok(!racketClient.includes("mergedReviews.reduce"));
  assert.ok(productClient.includes("({reviewCount})"));
  assert.ok(racketClient.includes("({reviewCount})"));
  assert.ok(!productReviews.includes("linkedReviewData"));
  assert.ok(!productReviews.includes("/api/reviews?type=all&productId"));
  assert.ok(productCard.includes("ReviewContextBadge"));
  assert.ok(racketClient.includes("ReviewContextBadge"));
  assert.ok(!racketClient.includes("/reviews/write?productId=${racketId}"));
  assert.ok(racketClient.includes("/mypage?tab=orders"));
  assert.ok(surface.includes("$facet"));
});

test("공개 후기 관계 회귀 계약: 레거시 필드/라켓 주문/문구를 유지한다", () => {
  const surface = read("lib/reviews/public-review-surface.server.ts");
  const postRoute = read("app/api/reviews/route.ts");
  const productClient = read("app/products/[id]/ProductDetailClient.tsx");
  const racketClient = read("app/rackets/[id]/_components/RacketDetailClient.tsx");

  assert.ok(surface.includes('"stringDetails.stringTypes"'));
  assert.ok(surface.includes('"meta.stringProductId"'));
  assert.ok(surface.includes("findRacketOrderIds"));
  assert.ok(surface.includes("orderId: { $in: orderIdCandidates }"));
  assert.ok(surface.includes("rentalId: { $in: rentalIdCandidates }"));
  assert.ok(surface.includes('reviewContext: "product_stringing"'));
  assert.ok(surface.includes('return "rental_stringing"'));
  assert.ok(productClient.includes(">후기<"));
  assert.ok(racketClient.includes("후기"));
  assert.ok(!productClient.includes("linkedReviewData"));
  assert.ok(!racketClient.includes(`/reviews/write?productId=${"${racketId}"}`));
  assert.ok(productClient.includes("reviewSummary"));
  assert.ok(postRoute.includes("relatedRacketIds:"));
});
