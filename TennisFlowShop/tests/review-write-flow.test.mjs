import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "review-write-"));
for (const name of ["review-target", "review-write"]) {
  const src = fs.readFileSync(new URL(`../lib/reviews/${name}.ts`, import.meta.url), "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  fs.writeFileSync(path.join(tmp, `${name}.js`), out);
}

const { buildReviewWriteHref } = await import(path.join(tmp, "review-target.js"));
const {
  buildReviewSubmissionPayload,
  canonicalHrefForTarget,
  getRequiredTargetError,
  getReviewDestination,
} = await import(path.join(tmp, "review-write.js"));

const id = (n) => String(n).padStart(24, "0");
const form = { rating: 5, content: "좋아요", photos: ["https://example.com/a.jpg"] };
const base = (reviewContext, extra = {}) => ({
  targetKey: `target:${reviewContext}`,
  subjectType: reviewContext.includes("rental")
    ? "rental"
    : reviewContext.includes("standalone")
      ? "application"
      : "order",
  subjectId: id(900),
  reviewContext,
  contextLabel: reviewContext,
  eligible: true,
  reviewed: false,
  applicationIds: [],
  relatedProductIds: [],
  relatedRacketIds: [],
  ...extra,
});

function assertNoNullish(payload) {
  for (const [key, value] of Object.entries(payload)) {
    assert.notEqual(value, undefined, `${key} should not be undefined`);
    assert.notEqual(value, null, `${key} should not be null`);
    assert.notEqual(value, "", `${key} should not be blank`);
  }
}

test("일반 상품 후기는 상품 payload와 상품 후기 탭 CTA를 만든다", () => {
  const target = base("product", { orderId: id(1), primaryProductId: id(2) });
  assert.equal(getRequiredTargetError(target), null);
  const payload = buildReviewSubmissionPayload(target, form);
  assert.equal(payload.productId, id(2));
  assert.equal(payload.orderId, id(1));
  assert.equal("serviceApplicationId" in payload, false);
  assert.equal("rentalId" in payload, false);
  assert.deepEqual(getReviewDestination(target), {
    href: `/products/${id(2)}?tab=reviews`,
    label: "상품 후기 보기",
  });
});

test("상품+교체서비스 후기는 서비스 신청서 payload를 포함하고 상품 후기 탭으로 이동한다", () => {
  const target = base("product_stringing", {
    orderId: id(3),
    primaryProductId: id(4),
    primaryApplicationId: id(5),
    applicationIds: [id(5)],
  });
  assert.equal(getRequiredTargetError(target), null);
  const payload = buildReviewSubmissionPayload(target, form);
  assert.equal(payload.productId, id(4));
  assert.equal(payload.orderId, id(3));
  assert.equal(payload.serviceApplicationId, id(5));
  assert.deepEqual(getReviewDestination(target), {
    href: `/products/${id(4)}?tab=reviews`,
    label: "상품 후기 보기",
  });
});

test("단독 교체서비스 후기는 stringing payload와 후기 관리 CTA를 만든다", () => {
  const target = base("standalone_stringing", {
    primaryApplicationId: id(6),
    applicationIds: [id(6)],
  });
  assert.equal(getRequiredTargetError(target), null);
  const payload = buildReviewSubmissionPayload(target, form);
  assert.equal(payload.service, "stringing");
  assert.equal(payload.serviceApplicationId, id(6));
  assert.equal("productId" in payload, false);
  assert.equal("orderId" in payload, false);
  assert.equal("rentalId" in payload, false);
  assert.deepEqual(getReviewDestination(target), {
    href: "/mypage?tab=reviews",
    label: "후기 관리로 이동",
  });
});

test("일반 대여 후기는 rentalId payload와 후기 관리 이동을 만든다", () => {
  const target = base("rental", { rentalId: id(7) });
  assert.equal(getRequiredTargetError(target), null);
  const payload = buildReviewSubmissionPayload(target, form);
  assert.equal(payload.rentalId, id(7));
  assert.equal("serviceApplicationId" in payload, false);
  assert.deepEqual(getReviewDestination(target), {
    href: "/mypage?tab=reviews",
    label: "후기 관리로 이동",
  });
});

test("대여+교체서비스 후기는 rentalId와 serviceApplicationId payload를 만든다", () => {
  const target = base("rental_stringing", {
    rentalId: id(8),
    primaryApplicationId: id(9),
    applicationIds: [id(9)],
  });
  assert.equal(getRequiredTargetError(target), null);
  const payload = buildReviewSubmissionPayload(target, form);
  assert.equal(payload.rentalId, id(8));
  assert.equal(payload.serviceApplicationId, id(9));
  assert.deepEqual(getReviewDestination(target), {
    href: "/mypage?tab=reviews",
    label: "후기 관리로 이동",
  });
});

test("context별 필수 ID가 누락되면 오류 문구를 반환한다", () => {
  const missing = [
    base("product", { orderId: id(1) }),
    base("product", { primaryProductId: id(2) }),
    base("product_stringing", { orderId: id(3) }),
    base("product_stringing", { primaryProductId: id(4) }),
    base("standalone_stringing"),
    base("rental"),
    base("rental_stringing"),
  ];
  for (const target of missing) assert.equal(typeof getRequiredTargetError(target), "string");
});

test("payload에서 undefined/null/빈 문자열 ID를 제거한다", () => {
  const target = base("rental_stringing", { rentalId: id(10), primaryApplicationId: "" });
  const payload = buildReviewSubmissionPayload(target, {
    rating: 4,
    content: "괜찮아요",
    photos: [],
  });
  assertNoNullish(payload);
  assert.equal("serviceApplicationId" in payload, false);
});

test("canonicalHrefForTarget은 buildReviewWriteHref 규격을 유지한다", () => {
  const target = base("standalone_stringing", {
    primaryApplicationId: id(11),
    applicationIds: [id(11)],
  });
  assert.equal(
    canonicalHrefForTarget(target),
    buildReviewWriteHref({ reviewContext: "standalone_stringing", applicationId: id(11) }),
  );
  assert.equal(
    canonicalHrefForTarget(target),
    `/reviews/write?reviewContext=standalone_stringing&applicationId=${id(11)}&service=stringing`,
  );
});
