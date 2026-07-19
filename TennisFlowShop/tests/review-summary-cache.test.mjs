import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import { test } from "node:test";
import ts from "typescript";
import { ObjectId } from "mongodb";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function compileTs(rel, stubs = {}) {
  const src = readFileSync(new URL(rel, root), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const filename = join(
    mkdtempSync(join(tmpdir(), "review-summary-")),
    rel.replaceAll("/", "_") + ".cjs",
  );
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  mod._compile(outputText, filename);
  return mod.exports;
}

const target = compileTs("lib/reviews/review-target.ts");
const policyStub = {
  getStandaloneStringingIneligibleReason: () => null,
  hasStringingApplicationLink: () => false,
  isOrderReviewEligible: () => true,
  isRentalReviewEligible: () => true,
  isStandaloneStringingReviewEligible: () => true,
  isStringingReviewBlockedStatus: () => false,
};
const targetServer = compileTs("lib/reviews/review-target.server.ts", {
  "./review-target": target,
  "./review-policy": policyStub,
});
const surface = compileTs("lib/reviews/public-review-surface.server.ts", {
  "@/lib/reviews/review-target": target,
  "./review-target.server": targetServer,
});
const cache = compileTs("lib/reviews/review-summary-cache.server.ts", {
  "server-only": {},
  "./public-review-surface.server": surface,
  "./review-target": target,
  "./review-target.server": targetServer,
});

const oid = (hex) => new ObjectId(hex.padStart(24, "0"));

function matchesId(value, expected) {
  return String(value) === String(expected);
}

function matchesFilter(doc, filter = {}) {
  if (filter._id?.$in) return filter._id.$in.some((id) => matchesId(id, doc._id));
  if (filter.isDeleted?.$ne !== undefined && doc.isDeleted === filter.isDeleted.$ne) return false;
  if (filter.$or) return filter.$or.some((cond) => matchesFilter(doc, cond));
  return Object.entries(filter).every(([key, value]) => {
    if (key === "isDeleted") return true;
    const actual = key.split(".").reduce((acc, part) => acc?.[part], doc);
    if (value?.$in) return value.$in.some((id) => matchesId(id, actual));
    return matchesId(actual, value);
  });
}

function makeDb(fixtures = {}) {
  const calls = { findOne: [], updateOne: [], aggregate: [], find: [] };
  return {
    calls,
    collection(name) {
      const docs = fixtures[name] ?? [];
      return {
        findOne: async (filter, options) => {
          calls.findOne.push({ collection: name, filter, options });
          return docs.find((doc) => matchesFilter(doc, filter)) ?? null;
        },
        updateOne: async (filter, update) => {
          calls.updateOne.push({ collection: name, filter, update });
          return { modifiedCount: docs.some((doc) => matchesFilter(doc, filter)) ? 1 : 0 };
        },
        find: (filter, options) => {
          calls.find.push({ collection: name, filter, options });
          return { toArray: async () => docs.filter((doc) => matchesFilter(doc, filter)) };
        },
        aggregate: (pipeline) => {
          calls.aggregate.push({ collection: name, pipeline });
          return { toArray: async () => fixtures[`${name}:aggregate`] ?? [] };
        },
      };
    },
  };
}

async function targets(review, fixtures) {
  return cache.resolveAffectedReviewTargets(makeDb(fixtures), review);
}

test("public summary stage와 fake aggregate 변환을 실제 운영 함수로 확인한다", async () => {
  assert.deepEqual(surface.buildPublicReviewSummaryStages(), [
    { $match: { status: "visible" } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const db = makeDb({
    products: [{ _id: oid("1") }],
    "reviews:aggregate": [{ average: 4.236, count: "3" }],
  });
  assert.deepEqual(
    await surface.getPublicReviewSummary(db, { type: "product", id: String(oid("1")) }),
    { average: 4.24, count: 3 },
  );
  assert.deepEqual(
    await surface.getPublicReviewSummary(makeDb({ products: [{ _id: oid("2") }] }), {
      type: "product",
      id: String(oid("2")),
    }),
    { average: 0, count: 0 },
  );
  const pipeline = db.calls.aggregate[0].pipeline;
  assert.deepEqual(pipeline[0].$match.isDeleted, { $ne: true });
  assert.deepEqual(pipeline.slice(1), surface.buildPublicReviewSummaryStages());
  assert.match(
    read("lib/reviews/public-review-surface.server.ts"),
    /summary: buildPublicReviewSummaryStages\(\)/,
  );
});

test("영향 대상 수집은 상품·라켓·신청서·부모 주문/대여와 중복 제거를 실행한다", async () => {
  const product = oid("1");
  const racket = oid("2");
  assert.deepEqual(
    await targets({ productId: String(product) }, { products: [{ _id: product }] }),
    { productIds: [String(product)], racketIds: [] },
  );
  assert.deepEqual(
    await targets({ productId: String(racket) }, { used_rackets: [{ _id: racket }] }),
    { productIds: [], racketIds: [String(racket)] },
  );
  assert.deepEqual(
    await targets(
      { productId: String(product) },
      { products: [{ _id: product }], used_rackets: [{ _id: product }] },
    ),
    { productIds: [String(product)], racketIds: [String(product)] },
  );
  assert.deepEqual(
    await targets({ relatedProductIds: ["", "p1", "p1"], relatedRacketIds: ["r1", "", "r1"] }, {}),
    { productIds: ["p1"], racketIds: ["r1"] },
  );

  const appId = oid("3");
  assert.deepEqual(
    await targets(
      { serviceApplicationId: String(appId) },
      {
        stringing_applications: [
          { _id: appId, racketId: racket, stringDetails: { stringTypes: [product] } },
        ],
      },
    ),
    { productIds: [String(product)], racketIds: [String(racket)] },
  );
  assert.deepEqual(
    await targets(
      { applicationId: String(appId) },
      {
        stringing_applications: [
          { _id: appId, racketId: racket, stringDetails: { stringTypes: [product] } },
        ],
      },
    ),
    { productIds: [String(product)], racketIds: [String(racket)] },
  );

  const rentalId = oid("4");
  assert.deepEqual(
    await targets(
      { applicationId: String(appId) },
      {
        stringing_applications: [{ _id: appId, rentalId }],
        rental_orders: [{ _id: rentalId, racketId: racket }],
      },
    ),
    { productIds: [], racketIds: [String(racket)] },
  );
  const orderId = oid("5");
  assert.deepEqual(
    await targets(
      { applicationId: String(appId) },
      {
        stringing_applications: [{ _id: appId, orderId }],
        orders: [
          {
            _id: orderId,
            items: [
              { type: "racket", productId: racket },
              { type: "product", productId: product },
            ],
          },
        ],
      },
    ),
    { productIds: [], racketIds: [String(racket)] },
  );
  assert.deepEqual(
    await targets(
      { rentalId: String(rentalId) },
      { rental_orders: [{ _id: rentalId, racketId: racket }] },
    ),
    { productIds: [], racketIds: [String(racket)] },
  );
  assert.deepEqual(
    await targets(
      { reviewContext: "product_stringing", orderId: String(orderId) },
      {
        orders: [
          {
            _id: orderId,
            items: [
              { type: "racket", productId: racket },
              { type: "product", productId: product },
            ],
          },
        ],
      },
    ),
    { productIds: [], racketIds: [String(racket)] },
  );
  assert.deepEqual(
    await targets(
      { reviewContext: "product", orderId: String(orderId) },
      { orders: [{ _id: orderId, items: [{ type: "racket", productId: racket }] }] },
    ),
    { productIds: [], racketIds: [] },
  );
  assert.deepEqual(
    await targets(
      {
        racketId: String(racket),
        relatedRacketIds: [String(racket)],
        serviceApplicationId: String(appId),
        rentalId: String(rentalId),
      },
      {
        stringing_applications: [{ _id: appId, racketId: racket, rentalId }],
        rental_orders: [{ _id: rentalId, racketId: racket }],
      },
    ),
    { productIds: [], racketIds: [String(racket)] },
  );
});

test("캐시 update payload와 safe wrapper를 실제 운영 함수로 실행한다", async () => {
  const product = oid("10");
  const racket = oid("11");
  const db = makeDb({ products: [{ _id: product }], used_rackets: [{ _id: racket }] });
  const dependencies = {
    getPublicReviewSummary: async (_db, target) =>
      target.type === "product" ? { average: 4.236, count: 2 } : { average: 0, count: 0 },
  };
  assert.deepEqual(
    await cache.refreshReviewSummaryCachesForTargets(
      db,
      { productIds: [String(product)], racketIds: [String(racket)] },
      dependencies,
    ),
    { productsUpdated: 1, racketsUpdated: 1 },
  );
  const productSet = db.calls.updateOne.find((call) => call.collection === "products").update.$set;
  assert.equal(productSet.ratingAvg, 4.24);
  assert.equal(productSet.ratingAverage, 4.24);
  assert.equal(productSet.ratingCount, 2);
  assert.ok(productSet.reviewSummaryUpdatedAt instanceof Date);
  const racketSet = db.calls.updateOne.find((call) => call.collection === "used_rackets").update
    .$set;
  assert.equal(racketSet.ratingAvg, 0);
  assert.equal(racketSet.ratingAverage, 0);
  assert.equal(racketSet.ratingCount, 0);
  assert.equal(racketSet.reviewCount, 0);
  assert.ok(racketSet.reviewSummaryUpdatedAt instanceof Date);

  const oldError = console.error;
  let logged = false;
  console.error = () => {
    logged = true;
  };
  try {
    await cache.refreshReviewSummaryCachesForReviewSafely(
      db,
      { productId: String(product) },
      "test",
      {
        getPublicReviewSummary: async () => {
          throw new Error("boom");
        },
      },
    );
  } finally {
    console.error = oldError;
  }
  assert.equal(logged, true);
});

test("작성·수정·삭제 route는 공통 캐시 refresh helper를 사용한다", () => {
  const post = read("app/api/reviews/route.ts");
  const user = read("app/api/reviews/[id]/route.ts");
  const admin = read("app/api/admin/reviews/[id]/route.ts");
  assert.ok(!post.includes("function updateProductRatingSummary"));
  assert.ok((post.match(/refreshReviewSummaryCachesForReviewSafely/g) ?? []).length >= 3);
  assert.match(user, /body\.rating !== undefined \|\| body\.status \|\| body\.visibility/);
  assert.match(admin, /body\.rating !== undefined \|\| body\.status \|\| body\.visibility/);
});

test("유지보수와 목록 UI/API 및 라켓 카드 색상 계약", () => {
  const maintenance = read("lib/reviews.maintenance.ts");
  assert.match(maintenance, /rebuildPublicReviewSummaryCaches/);
  assert.match(maintenance, /collection\("used_rackets"\)/);
  assert.match(maintenance, /runLimited\(\[\.\.\.productIds\], 6/);
  assert.match(maintenance, /reviewsScanned/);

  const productsApi = read("app/api/products/route.ts");
  assert.match(productsApi, /ratingCount: -1, ratingAvg: -1, _id: -1/);
  assert.ok(!productsApi.includes('collection("reviews")'));

  const racketsApi = read("app/api/rackets/route.ts");
  assert.match(racketsApi, /reviewCount: -1, ratingCount: -1, createdAt: -1, _id: -1/);
  assert.match(racketsApi, /ratingAvg: normalizedRatingAverage/);
  assert.match(racketsApi, /ratingCount: normalizedReviewCount/);
  assert.match(racketsApi, /reviewCount: normalizedReviewCount/);

  const racketCard = read("app/rackets/_components/RacketCard.tsx");
  assert.doesNotMatch(racketCard, /yellow-|amber-|#[0-9A-Fa-f]{3,8}/);
  assert.match(racketCard, /text-warning/);
  assert.match(racketCard, /fill-current|fill-warning/);
  assert.match(racketCard, /prev\.racket\.reviewCount === next\.racket\.reviewCount/);
  assert.match(read("app/products/components/FilterableProductList.tsx"), /후기 많은순/);
  assert.match(read("app/rackets/_components/FilterableRacketList.tsx"), /후기 많은순/);
});
