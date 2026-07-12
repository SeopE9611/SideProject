function objectIdExpr(path: unknown) {
  return {
    $cond: [
      { $eq: [{ $type: path }, "objectId"] },
      path,
      {
        $cond: [
          { $and: [{ $eq: [{ $type: path }, "string"] }, { $regexMatch: { input: path, regex: /^[0-9a-fA-F]{24}$/ } }] },
          { $toObjectId: path },
          null,
        ],
      },
    ],
  };
}

export function buildAdminReviewRelationStages(): Record<string, unknown>[] {
  return [
    {
      $addFields: {
        productIdObj: objectIdExpr("$productId"),
        racketIdObj: objectIdExpr("$racketId"),
        rentalIdObj: objectIdExpr("$rentalId"),
        serviceApplicationIdResolved: { $ifNull: ["$serviceApplicationId", "$applicationId"] },
      },
    },
    { $addFields: { serviceApplicationIdObj: objectIdExpr("$serviceApplicationIdResolved") } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "_user" } },
    { $lookup: { from: "products", localField: "productIdObj", foreignField: "_id", as: "_product" } },
    { $lookup: { from: "used_rackets", localField: "racketIdObj", foreignField: "_id", as: "_racketByRacketId" } },
    { $lookup: { from: "used_rackets", localField: "productIdObj", foreignField: "_id", as: "_racketByProductId" } },
    { $lookup: { from: "rental_orders", localField: "rentalIdObj", foreignField: "_id", as: "_rental" } },
    { $lookup: { from: "stringing_applications", localField: "serviceApplicationIdObj", foreignField: "_id", as: "_application" } },
    { $addFields: { rentalRacketIdObj: objectIdExpr({ $arrayElemAt: ["$_rental.racketId", 0] }) } },
    { $lookup: { from: "used_rackets", localField: "rentalRacketIdObj", foreignField: "_id", as: "_rentalRacket" } },
    {
      $addFields: {
        _racket: {
          $cond: [
            { $gt: [{ $size: "$_racketByRacketId" }, 0] },
            "$_racketByRacketId",
            "$_racketByProductId",
          ],
        },
        resolvedUserEmail: { $ifNull: ["$userEmail", { $arrayElemAt: ["$_user.email", 0] }] },
        resolvedUserName: { $ifNull: [{ $arrayElemAt: ["$_user.name", 0] }, ""] },
        productName: { $ifNull: [{ $arrayElemAt: ["$_product.name", 0] }, { $arrayElemAt: ["$_product.title", 0] }] },
        racketBrand: { $arrayElemAt: ["$_racket.brand", 0] },
        racketModel: { $arrayElemAt: ["$_racket.model", 0] },
        rentalBrand: { $ifNull: [{ $arrayElemAt: ["$_rentalRacket.brand", 0] }, { $arrayElemAt: ["$_rental.brand", 0] }] },
        rentalModel: { $ifNull: [{ $arrayElemAt: ["$_rentalRacket.model", 0] }, { $arrayElemAt: ["$_rental.model", 0] }] },
        stringName: { $arrayElemAt: ["$_application.stringDetails.stringItems.name", 0] },
        content: { $cond: [{ $eq: [{ $type: "$content" }, "string"] }, "$content", ""] },
        createdAt: { $ifNull: ["$createdAt", "$$NOW"] },
        helpfulCount: { $ifNull: ["$helpfulCount", 0] },
        photosPreview: { $slice: [{ $ifNull: ["$photos", []] }, 4] },
        isDeleted: { $toBool: { $ifNull: ["$isDeleted", false] } },
      },
    },
  ];
}
