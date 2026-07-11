export const duplicateDiagnostics = [
  {
    name: "rental",
    match: { rentalId: { $exists: true, $ne: null }, isDeleted: { $ne: true } },
    keyFields: ["userId", "rentalId"],
  },
  {
    name: "product",
    match: {
      productId: { $exists: true, $ne: null },
      orderId: { $exists: true, $ne: null },
      isDeleted: { $ne: true },
    },
    keyFields: ["userId", "productId", "orderId"],
  },
  {
    name: "standalone_service",
    match: { serviceApplicationId: { $exists: true, $ne: null }, isDeleted: { $ne: true } },
    keyFields: ["userId", "serviceApplicationId"],
  },
];

export function normalizedField(fieldName) {
  return {
    $convert: {
      input: `$${fieldName}`,
      to: "string",
      onError: null,
      onNull: null,
    },
  };
}

export function buildDuplicateReviewPipeline(spec) {
  const normalizedEntries = spec.keyFields.map((fieldName) => [
    `__${fieldName}`,
    normalizedField(fieldName),
  ]);
  const normalizedMatch = Object.fromEntries(
    normalizedEntries.map(([fieldName]) => [fieldName, { $ne: null }]),
  );
  const groupId = Object.fromEntries(
    spec.keyFields.map((fieldName) => [fieldName, `$__${fieldName}`]),
  );

  return [
    { $match: spec.match },
    { $set: Object.fromEntries(normalizedEntries) },
    { $match: normalizedMatch },
    {
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        reviews: {
          $push: {
            _id: "$_id",
            createdAt: "$createdAt",
            status: "$status",
            reviewContext: "$reviewContext",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ];
}

export function stringifyId(value) {
  if (value == null) return null;
  if (typeof value === "object" && typeof value.toString === "function") return value.toString();
  return String(value);
}
