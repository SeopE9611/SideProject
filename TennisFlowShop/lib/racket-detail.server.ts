import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";

type UsedRacketDoc = { _id: ObjectId | string } & Record<string, unknown>;
type ReviewAggRow = {
  _id: ObjectId;
  userName: string | null;
  rating: number;
  createdAt?: Date;
  content: string | null;
  status: "visible" | "hidden";
  photos: unknown[];
  masked: boolean;
  ownedByMe: boolean;
};

type ReviewSummaryAggRow = {
  avg?: number;
  count?: number;
};

export type RacketActiveCountPayload = {
  ok: boolean;
  count: number;
  quantity: number;
  available: number;
};

export async function getRacketDetailPayload(
  id: string,
  currentUserId?: ObjectId | null,
) {
  const db = (await clientPromise).db();
  const col = db.collection<UsedRacketDoc>("used_rackets");

  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
  const doc = await col.findOne(filter);

  if (!doc) return null;

  const objId = ObjectId.isValid(id) ? new ObjectId(id) : null;

  const reviews: ReviewAggRow[] = objId
    ? await db
        .collection("reviews")
        .aggregate<ReviewAggRow>([
          {
            $match: {
              productId: objId,
              status: { $in: ["visible", "hidden"] },
              isDeleted: { $ne: true },
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              rating: 1,
              createdAt: 1,
              status: 1,
              helpfulCount: 1,
              userId: 1,
              userName: {
                $cond: [{ $eq: ["$status", "hidden"] }, null, "$userName"],
              },
              content: {
                $cond: [{ $eq: ["$status", "hidden"] }, null, "$content"],
              },
              photos: {
                $cond: [
                  { $eq: ["$status", "hidden"] },
                  [],
                  { $ifNull: ["$photos", []] },
                ],
              },
              masked: { $eq: ["$status", "hidden"] },
            },
          },
          ...(currentUserId
            ? [
                {
                  $addFields: {
                    ownedByMe: { $eq: ["$userId", currentUserId] },
                  },
                },
              ]
            : [{ $addFields: { ownedByMe: false } }]),
          { $project: { userId: 0 } },
        ])
        .toArray()
    : [];

  const agg: ReviewSummaryAggRow[] = objId
    ? await db
        .collection("reviews")
        .aggregate<ReviewSummaryAggRow>([
          {
            $match: {
              productId: objId,
              status: "visible",
              isDeleted: { $ne: true },
            },
          },
          {
            $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } },
          },
        ])
        .toArray()
    : [];

  return {
    ...doc,
    id: String(doc._id),
    shippingFee: normalizeItemShippingFee((doc as Record<string, unknown>).shippingFee),
    _id: undefined,
    reviews: (reviews ?? []).map((r) => ({
      _id: r._id,
      user: r.userName,
      rating: r.rating,
      date: r.createdAt?.toISOString?.().slice(0, 10) ?? null,
      content: r.content,
      status: r.status,
      photos: r.photos,
      masked: r.masked,
      ownedByMe: r.ownedByMe,
    })),
    reviewSummary: {
      average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
      count: agg[0]?.count ?? 0,
    },
  };
}

export async function getRacketActiveCountPayload(
  racketId: string,
): Promise<RacketActiveCountPayload> {
  if (!ObjectId.isValid(racketId)) {
    return { ok: false, count: 0, quantity: 1, available: 0 };
  }

  const db = (await clientPromise).db();

  const count = await db.collection("rental_orders").countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ["paid", "out"] },
  });

  const projUsed = { projection: { quantity: 1, status: 1 } } as const;
  const projRackets = { projection: { quantity: 1 } } as const;
  const used = await db
    .collection("used_rackets")
    .findOne({ _id: new ObjectId(racketId) }, projUsed);
  const rack =
    used ??
    (await db
      .collection("rackets")
      .findOne({ _id: new ObjectId(racketId) }, projRackets));

  const rawQty = Number(rack?.quantity ?? 1);
  const baseQty = used
    ? !Number.isFinite(rawQty) || rawQty <= 1
      ? used.status === "available"
        ? 1
        : 0
      : rawQty
    : rawQty;

  const available = Math.max(0, baseQty - count);

  return { ok: true, count, quantity: baseQty, available };
}
