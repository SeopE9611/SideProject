import type { ReviewContext } from "./review-target";

export const REVIEW_CONTEXT_VALUES: ReviewContext[] = [
  "product",
  "product_stringing",
  "standalone_stringing",
  "rental",
  "rental_stringing",
];

function fieldHasValue(path: string) {
  return {
    $let: {
      vars: { value: path, valueType: { $type: path } },
      in: {
        $switch: {
          branches: [
            { case: { $in: ["$$valueType", ["missing", "null"]] }, then: false },
            {
              case: { $eq: ["$$valueType", "string"] },
              then: { $gt: [{ $strLenCP: { $trim: { input: "$$value" } } }, 0] },
            },
          ],
          default: true,
        },
      },
    },
  };
}

export function buildResolvedReviewContextExpression() {
  const hasRentalRelation = {
    $or: [fieldHasValue("$rentalId"), { $eq: ["$reviewType", "rental"] }],
  };
  const hasOrderRelation = fieldHasValue("$orderId");
  const hasServiceRelation = {
    $or: [
      fieldHasValue("$serviceApplicationId"),
      fieldHasValue("$applicationId"),
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
  if (category === "product")
    return { $in: ["$resolvedReviewContext", ["product", "product_stringing"]] };
  if (category === "rental")
    return { $in: ["$resolvedReviewContext", ["rental", "rental_stringing"]] };
  return { $eq: ["$resolvedReviewContext", "standalone_stringing"] };
}
