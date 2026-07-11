import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";
import { ObjectId } from "mongodb";

const root = new URL("../", import.meta.url);

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
    mkdtempSync(join(tmpdir(), "review-surface-")),
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

const oid = (hex) => new ObjectId(hex.padStart(24, "0"));

function makeDb(fixtures) {
  const calls = { find: [], aggregate: [] };
  return {
    calls,
    collection(name) {
      return {
        find(filter, options) {
          calls.find.push({ collection: name, filter, options });
          return { toArray: async () => fixtures[name] ?? [] };
        },
        aggregate(pipeline) {
          calls.aggregate.push({ collection: name, pipeline });
          return { toArray: async () => fixtures[name] ?? [] };
        },
      };
    },
  };
}

function findCall(db, collection) {
  return db.calls.find.find((call) => call.collection === collection);
}

test("상품 신청서 레거시 stringTypes/meta 필드를 target match 전에 조회한다", async () => {
  const productP = oid("1");
  const applicationA = oid("2");
  const applicationB = oid("3");
  const db = makeDb({ stringing_applications: [{ _id: applicationA }, { _id: applicationB }] });
  const match = await surface.buildPublicReviewSurfaceTargetMatch(db, {
    type: "product",
    id: String(productP),
  });
  const appFind = findCall(db, "stringing_applications");
  assert.ok(appFind.filter.$or.some((cond) => cond["stringDetails.stringTypes"]));
  assert.ok(appFind.filter.$or.some((cond) => cond["meta.stringProductId"]));
  assert.deepEqual(
    match.$or.some((cond) =>
      cond.serviceApplicationId?.$in?.some((id) => String(id) === String(applicationA)),
    ),
    true,
  );
  assert.deepEqual(
    match.$or.some((cond) =>
      cond.applicationId?.$in?.some((id) => String(id) === String(applicationB)),
    ),
    true,
  );
});

test("canonical 신청서 collector는 stringTypes/meta를 수집하고 custom을 제외한다", () => {
  const productP = String(oid("4"));
  const productQ = String(oid("5"));
  const ids = targetServer.collectStringProductIdsFromApplication({
    stringDetails: { stringTypes: [productP, "custom", productP] },
    meta: { stringProductId: productQ },
  });
  assert.deepEqual(ids, [productP, productQ]);
});

test("라켓 주문/부모 신청서 관계는 item type 검증 후 최종 match에 반영한다", async () => {
  const racketR = oid("6");
  const orderA = oid("7");
  const orderB = oid("8");
  const orderC = oid("9");
  const rentalA = oid("10");
  const applicationC = oid("11");
  const applicationD = oid("12");
  const db = makeDb({
    orders: [
      { _id: orderA, items: [{ racketId: racketR }] },
      { _id: orderB, items: [{ kind: "used_racket", productId: racketR }] },
      { _id: orderC, items: [{ kind: "product", productId: racketR }] },
    ],
    rental_orders: [{ _id: rentalA, racketId: racketR }],
    stringing_applications: [
      { _id: applicationC, orderId: orderA },
      { _id: applicationD, rentalId: rentalA },
    ],
  });
  const match = await surface.buildPublicReviewSurfaceTargetMatch(db, {
    type: "racket",
    id: String(racketR),
  });
  const orderFind = findCall(db, "orders");
  const appFind = findCall(db, "stringing_applications");
  assert.ok(orderFind.filter.$or.some((cond) => cond["items.racketId"]));
  assert.ok(orderFind.filter.$or.some((cond) => cond["items.productId"]));
  assert.deepEqual(targetServer.collectOrderRacketIds({ items: [{ racketId: racketR }] }), [
    String(racketR),
  ]);
  assert.deepEqual(
    targetServer.collectOrderRacketIds({ items: [{ kind: "used_racket", productId: racketR }] }),
    [String(racketR)],
  );
  assert.deepEqual(
    targetServer.collectOrderRacketIds({ items: [{ kind: "product", productId: racketR }] }),
    [],
  );
  assert.ok(appFind.filter.$or.some((cond) => cond.orderId));
  assert.ok(appFind.filter.$or.some((cond) => cond.rentalId));
  assert.ok(
    match.$or.some((cond) =>
      cond.serviceApplicationId?.$in?.some((id) => String(id) === String(applicationC)),
    ),
  );
  assert.ok(
    match.$or.some((cond) =>
      cond.applicationId?.$in?.some((id) => String(id) === String(applicationD)),
    ),
  );
  const orderRelation = match.$or.find((cond) => cond.$and?.some((part) => part.orderId));
  assert.ok(orderRelation);
  assert.ok(
    orderRelation.$and.some((part) =>
      part.$or?.some((c) => c.reviewContext === "product_stringing"),
    ),
  );
  assert.equal(
    match.$or.some((cond) => cond.orderId),
    false,
  );
});

test("legacy context fallback은 통합/대여/단독 서비스 후기를 구분한다", () => {
  assert.equal(
    surface.inferPublicReviewContext({
      orderId: oid("7"),
      serviceApplicationId: oid("11"),
      reviewContext: null,
    }),
    "product_stringing",
  );
  assert.equal(
    surface.inferPublicReviewContext({
      rentalId: oid("10"),
      serviceApplicationId: oid("12"),
      reviewContext: null,
    }),
    "rental_stringing",
  );
  assert.equal(
    surface.inferPublicReviewContext({
      serviceApplicationId: oid("13"),
      service: "stringing",
      orderId: null,
      rentalId: null,
    }),
    "standalone_stringing",
  );
});

test("getPublicReviewSurface는 facet summary와 items를 분리하고 hidden을 권한별 마스킹한다", async () => {
  const viewer = oid("14");
  const other = oid("15");
  const items = Array.from({ length: 10 }, (_, i) => ({
    _id: oid(String(20 + i)),
    userId: other,
    rating: 5,
    status: "visible",
    createdAt: new Date(),
    content: `c${i}`,
    photos: [],
  }));
  items[0] = { ...items[0], status: "hidden", content: "secret", photos: ["p"] };
  const db = makeDb({
    stringing_applications: [],
    reviews: [{ items, summary: [{ count: 15, average: 4.2 }] }],
  });
  const result = await surface.getPublicReviewSurface(db, {
    target: { type: "product", id: String(oid("16")) },
    viewerUserId: viewer,
    limit: 10,
  });
  assert.equal(result.items.length, 10);
  assert.equal(result.summary.count, 15);
  assert.equal(result.summary.average, 4.2);
  assert.equal(result.items[0].content, null);
  assert.deepEqual(result.items[0].photos, []);
  assert.equal(result.items[0].masked, true);
  const ownDb = makeDb({
    stringing_applications: [],
    reviews: [{ items: [{ ...items[0], userId: viewer }], summary: [] }],
  });
  assert.equal(
    (
      await surface.getPublicReviewSurface(ownDb, {
        target: { type: "product", id: String(oid("16")) },
        viewerUserId: viewer,
      })
    ).items[0].masked,
    false,
  );
  const adminDb = makeDb({
    stringing_applications: [],
    reviews: [{ items: [items[0]], summary: [] }],
  });
  assert.equal(
    (
      await surface.getPublicReviewSurface(adminDb, {
        target: { type: "product", id: String(oid("16")) },
        viewerIsAdmin: true,
      })
    ).items[0].masked,
    false,
  );
});

test("aggregate pipeline은 target match → facet items status/sort/limit 및 summary visible/group 순서다", async () => {
  const db = makeDb({ stringing_applications: [], reviews: [{ items: [], summary: [] }] });
  await surface.getPublicReviewSurface(db, { target: { type: "product", id: String(oid("17")) } });
  const pipeline = db.calls.aggregate[0].pipeline;
  assert.deepEqual(pipeline[0].$match.isDeleted, { $ne: true });
  assert.ok(pipeline[0].$match.$or);
  const facet = pipeline[1].$facet;
  assert.deepEqual(facet.items[0], { $match: { status: { $in: ["visible", "hidden"] } } });
  assert.deepEqual(facet.items[1], { $sort: { createdAt: -1, _id: -1 } });
  assert.deepEqual(facet.items[2], { $limit: 10 });
  assert.deepEqual(facet.summary[0], { $match: { status: "visible" } });
  assert.deepEqual(facet.summary[1], {
    $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
  });
});
