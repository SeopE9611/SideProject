import "server-only";

import { ObjectId, type Db, type Document, type Filter } from "mongodb";
import { getPublicReviewSummary } from "./public-review-surface.server";
import { dedupeStringIds, inferReviewContext } from "./review-target";
import {
  collectOrderRacketIds,
  collectRacketIdsFromApplication,
  collectRentalRacketIds,
  collectStringProductIdsFromApplication,
} from "./review-target.server";

export type ReviewSummaryCache = { average: number; count: number };
export type AffectedReviewTargets = { productIds: string[]; racketIds: string[] };

type ReviewLike = Record<string, unknown>;
type MixedIdDocument = Document & { _id: ObjectId | string };

type ReviewSummaryCacheDependencies = {
  getPublicReviewSummary: typeof getPublicReviewSummary;
};

const defaultDependencies: ReviewSummaryCacheDependencies = { getPublicReviewSummary };

function toId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function idCandidates(value: unknown): Array<ObjectId | string> {
  const id = toId(value);
  if (!id) return [];
  return ObjectId.isValid(id) ? [new ObjectId(id), id] : [id];
}

function buildMixedIdFilter(value: unknown): Filter<MixedIdDocument> | null {
  const candidates = idCandidates(value);
  if (!candidates.length) return null;
  return { _id: { $in: candidates } };
}

function mixedIdCollection(db: Db, name: string) {
  return db.collection<MixedIdDocument>(name);
}

function pushIds(target: string[], values: unknown) {
  const arr = Array.isArray(values) ? values : [values];
  for (const value of arr) {
    const id = toId(value);
    if (id) target.push(id);
  }
}

async function existsById(db: Db, collection: string, value: unknown) {
  const filter = buildMixedIdFilter(value);
  if (!filter) return false;
  return Boolean(
    await mixedIdCollection(db, collection).findOne(filter, { projection: { _id: 1 } }),
  );
}

async function findById(db: Db, collection: string, value: unknown, projection: Record<string, 1>) {
  const filter = buildMixedIdFilter(value);
  if (!filter) return null;
  return mixedIdCollection(db, collection).findOne(filter, { projection });
}

export async function resolveAffectedReviewTargets(
  db: Db,
  review: ReviewLike,
): Promise<AffectedReviewTargets> {
  const productIds: string[] = [];
  const racketIds: string[] = [];

  if (review.productId) {
    if (await existsById(db, "products", review.productId)) pushIds(productIds, review.productId);
    if (await existsById(db, "used_rackets", review.productId))
      pushIds(racketIds, review.productId);
  }
  pushIds(productIds, review.relatedProductIds);
  pushIds(racketIds, review.relatedRacketIds);
  pushIds(racketIds, review.racketId);

  const applicationId = review.serviceApplicationId ?? review.applicationId;
  if (applicationId) {
    const app = await findById(db, "stringing_applications", applicationId, {
      _id: 1,
      orderId: 1,
      rentalId: 1,
      racketId: 1,
      racket: 1,
      stringDetails: 1,
      stringItems: 1,
      meta: 1,
    });
    if (app) {
      pushIds(productIds, collectStringProductIdsFromApplication(app));
      pushIds(racketIds, collectRacketIdsFromApplication(app));
      if (app.rentalId) {
        const rental = await findById(db, "rental_orders", app.rentalId, {
          _id: 1,
          racketId: 1,
          racket: 1,
        });
        if (rental) pushIds(racketIds, collectRentalRacketIds(rental));
      }
      if (app.orderId) {
        const order = await findById(db, "orders", app.orderId, { _id: 1, items: 1 });
        if (order) pushIds(racketIds, collectOrderRacketIds(order));
      }
    }
  }

  if (review.rentalId) {
    const rental = await findById(db, "rental_orders", review.rentalId, {
      _id: 1,
      racketId: 1,
      racket: 1,
    });
    if (rental) pushIds(racketIds, collectRentalRacketIds(rental));
  }

  const context = inferReviewContext(review);
  const isProductStringing =
    context === "product_stringing" ||
    review.reviewType === "service" ||
    review.service === "stringing";
  if (isProductStringing && review.orderId) {
    const order = await findById(db, "orders", review.orderId, { _id: 1, items: 1 });
    if (order) pushIds(racketIds, collectOrderRacketIds(order));
  }

  return { productIds: dedupeStringIds(productIds), racketIds: dedupeStringIds(racketIds) };
}

async function updateProductCache(
  db: Db,
  productId: string,
  dependencies: ReviewSummaryCacheDependencies,
) {
  const summary = await dependencies.getPublicReviewSummary(db, { type: "product", id: productId });
  const average = Number(Number(summary.average || 0).toFixed(2));
  const filter = buildMixedIdFilter(productId);
  if (!filter) return 0;
  const result = await mixedIdCollection(db, "products").updateOne(filter, {
    $set: {
      ratingAvg: average,
      ratingAverage: average,
      ratingCount: Math.max(0, Number(summary.count) || 0),
      reviewSummaryUpdatedAt: new Date(),
    },
  });
  return result.modifiedCount;
}

async function updateRacketCache(
  db: Db,
  racketId: string,
  dependencies: ReviewSummaryCacheDependencies,
) {
  const summary = await dependencies.getPublicReviewSummary(db, { type: "racket", id: racketId });
  const average = Number(Number(summary.average || 0).toFixed(2));
  const count = Math.max(0, Number(summary.count) || 0);
  const filter = buildMixedIdFilter(racketId);
  if (!filter) return 0;
  const result = await mixedIdCollection(db, "used_rackets").updateOne(filter, {
    $set: {
      ratingAvg: average,
      ratingAverage: average,
      ratingCount: count,
      reviewCount: count,
      reviewSummaryUpdatedAt: new Date(),
    },
  });
  return result.modifiedCount;
}

export async function refreshReviewSummaryCachesForTargets(
  db: Db,
  targets: AffectedReviewTargets,
  dependencies = defaultDependencies,
) {
  let productsUpdated = 0;
  let racketsUpdated = 0;
  for (const productId of dedupeStringIds(targets.productIds))
    productsUpdated += await updateProductCache(db, productId, dependencies);
  for (const racketId of dedupeStringIds(targets.racketIds))
    racketsUpdated += await updateRacketCache(db, racketId, dependencies);
  return { productsUpdated, racketsUpdated };
}

export async function refreshReviewSummaryCachesForReview(
  db: Db,
  review: ReviewLike,
  dependencies = defaultDependencies,
) {
  return refreshReviewSummaryCachesForTargets(
    db,
    await resolveAffectedReviewTargets(db, review),
    dependencies,
  );
}

export async function refreshReviewSummaryCachesForReviewSafely(
  db: Db,
  review: ReviewLike,
  logContext = "review summary cache",
  dependencies = defaultDependencies,
) {
  try {
    await refreshReviewSummaryCachesForReview(db, review, dependencies);
  } catch (error) {
    console.error(`[reviews] failed to refresh summary cache (${logContext})`, error);
  }
}
