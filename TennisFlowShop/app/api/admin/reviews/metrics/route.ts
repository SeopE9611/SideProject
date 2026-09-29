import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { buildResolvedReviewContextExpression } from "@/lib/reviews/review-context.server";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const agg = await db
    .collection("reviews")
    .aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $addFields: { resolvedReviewContext: buildResolvedReviewContextExpression() } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avg: { $avg: "$rating" },
          five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          product: { $sum: { $cond: [{ $eq: ["$resolvedReviewContext", "product"] }, 1, 0] } },
          product_stringing: {
            $sum: { $cond: [{ $eq: ["$resolvedReviewContext", "product_stringing"] }, 1, 0] },
          },
          standalone_stringing: {
            $sum: { $cond: [{ $eq: ["$resolvedReviewContext", "standalone_stringing"] }, 1, 0] },
          },
          rental: { $sum: { $cond: [{ $eq: ["$resolvedReviewContext", "rental"] }, 1, 0] } },
          rental_stringing: {
            $sum: { $cond: [{ $eq: ["$resolvedReviewContext", "rental_stringing"] }, 1, 0] },
          },
        },
      },
    ])
    .next();

  const byContext = {
    product: agg?.product ?? 0,
    product_stringing: agg?.product_stringing ?? 0,
    standalone_stringing: agg?.standalone_stringing ?? 0,
    rental: agg?.rental ?? 0,
    rental_stringing: agg?.rental_stringing ?? 0,
  };

  return NextResponse.json({
    total: agg?.total ?? 0,
    avg: agg?.avg ?? 0,
    five: agg?.five ?? 0,
    byContext,
    byCategory: {
      product: byContext.product + byContext.product_stringing,
      stringing: byContext.standalone_stringing,
      rental: byContext.rental + byContext.rental_stringing,
    },
  });
}
