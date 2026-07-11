import type { ReviewContext } from "./review-target";

export const REVIEW_CONTEXT_VALUES: ReviewContext[] = [
  "product",
  "product_stringing",
  "standalone_stringing",
  "rental",
  "rental_stringing",
];

function fieldExists(path: string) {
  return { $ne: [{ $ifNull: [path, null] }, null] };
}

export function buildResolvedReviewContextExpression() {
  const hasRentalRelation = {
    $or: [fieldExists("$rentalId"), { $eq: ["$reviewType", "rental"] }],
  };
  const hasOrderRelation = fieldExists("$orderId");
  const hasServiceRelation = {
    $or: [
      fieldExists("$serviceApplicationId"),
      fieldExists("$applicationId"),
      { $eq: ["$service", "stringing"] },
      { $eq: ["$reviewType", "service"] },
    ],
  };

  return {
    $switch: {
      branches: [
        { case: { $in: ["$reviewContext", REVIEW_CONTEXT_VALUES] }, then: "$reviewContext" },
        { case: { $and: [hasRentalRelation, hasServiceRelation] }, then: "rental_stringing" },
        { case: { $and: [hasOrderRelation, hasServiceRelation] }, then: "product_stringing" },
        { case: hasRentalRelation, then: "rental" },
        { case: hasServiceRelation, then: "standalone_stringing" },
      ],
      default: "product",
    },
  };
}

export function contextCategoryMatch(category: "product" | "stringing" | "rental") {
  if (category === "product") return { $in: ["$resolvedReviewContext", ["product", "product_stringing"]] };
  if (category === "rental") return { $in: ["$resolvedReviewContext", ["rental", "rental_stringing"]] };
  return { $eq: ["$resolvedReviewContext", "standalone_stringing"] };
}
