import type { Db } from "mongodb";

export type ReviewDuplicateGroup = {
  _id: Record<string, string | null>;
  count: number;
  ids: unknown[];
};

const normalizeId = (input: unknown) => ({
  $convert: { input, to: "string", onError: null, onNull: null },
});

const nonEmpty = (field: string) => ({ $and: [{ $ne: [field, null] }, { $ne: [field, ""] }] });

export function buildReviewDuplicateDiagnosticPipelines() {
  const active = { isDeleted: { $ne: true } };
  return {
    product: [
      { $match: { ...active, productId: { $exists: true }, orderId: { $exists: true } } },
      {
        $project: {
          userId: normalizeId("$userId"),
          productId: normalizeId("$productId"),
          orderId: normalizeId("$orderId"),
        },
      },
      {
        $match: {
          $expr: { $and: [nonEmpty("$userId"), nonEmpty("$productId"), nonEmpty("$orderId")] },
        },
      },
      {
        $group: {
          _id: { userId: "$userId", productId: "$productId", orderId: "$orderId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    rental: [
      { $match: { ...active, rentalId: { $exists: true } } },
      { $project: { userId: normalizeId("$userId"), rentalId: normalizeId("$rentalId") } },
      { $match: { $expr: { $and: [nonEmpty("$userId"), nonEmpty("$rentalId")] } } },
      {
        $group: {
          _id: { userId: "$userId", rentalId: "$rentalId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    service: [
      { $match: active },
      {
        $project: {
          userId: normalizeId("$userId"),
          serviceApplicationId: normalizeId({
            $ifNull: ["$serviceApplicationId", "$applicationId"],
          }),
        },
      },
      { $match: { $expr: { $and: [nonEmpty("$userId"), nonEmpty("$serviceApplicationId")] } } },
      {
        $group: {
          _id: { userId: "$userId", serviceApplicationId: "$serviceApplicationId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  };
}

export async function inspectActiveReviewDuplicates(db: Db) {
  const pipelines = buildReviewDuplicateDiagnosticPipelines();
  const [productGroups, rentalGroups, serviceGroups] = await Promise.all([
    db.collection("reviews").aggregate<ReviewDuplicateGroup>(pipelines.product).toArray(),
    db.collection("reviews").aggregate<ReviewDuplicateGroup>(pipelines.rental).toArray(),
    db.collection("reviews").aggregate<ReviewDuplicateGroup>(pipelines.service).toArray(),
  ]);
  return {
    productGroups,
    rentalGroups,
    serviceGroups,
    totalGroups: productGroups.length + rentalGroups.length + serviceGroups.length,
  };
}
