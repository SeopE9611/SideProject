import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { racketVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import {
  getPublicReviewSurface,
  type PublicReviewSurfacePayload,
} from "@/lib/reviews/public-review-surface.server";

function normalizeRacketMarketing(value: any) {
  return {
    isFeatured: value?.isFeatured === true,
    isNew: value?.isNew === true,
    isSale: value?.isSale === true,
    salePrice: Math.max(0, Number(value?.salePrice ?? 0) || 0),
  };
}

type UsedRacketDoc = { _id: ObjectId | string } & Record<string, unknown>;
export type RacketActiveCountPayload = {
  ok: boolean;
  count: number;
  quantity: number;
  available: number;
};

export async function getRacketDetailPayload(
  id: string,
  viewerParam?: { userId?: ObjectId | null; isAdmin?: boolean },
) {
  const db = (await clientPromise).db();
  const col = db.collection("used_rackets");
  const viewer = await getVisibilityViewerFromCookies();
  const visibilityFilter = racketVisibilityFilterFor(viewer);

  const filter: Record<string, unknown> = ObjectId.isValid(id)
    ? { _id: new ObjectId(id), ...visibilityFilter }
    : { _id: id, ...visibilityFilter };
  const doc = await col.findOne(filter);

  if (!doc) return null;

  let reviewSurface: PublicReviewSurfacePayload = {
    items: [],
    summary: { average: 0, count: 0 },
  };

  try {
    reviewSurface = await getPublicReviewSurface(db, {
      target: { type: "racket", id },
      viewerUserId: viewerParam?.userId ?? null,
      viewerIsAdmin: viewerParam?.isAdmin === true,
      limit: 10,
    });
  } catch (error) {
    console.error("[rackets/[id]] failed to load racket reviews", { racketId: id, error });
  }

  return {
    ...doc,
    id: String(doc._id),
    marketing: normalizeRacketMarketing((doc as Record<string, unknown>).marketing),
    shippingFee: normalizeItemShippingFee((doc as Record<string, unknown>).shippingFee),
    _id: undefined,
    reviews: reviewSurface.items,
    reviewSummary: reviewSurface.summary,
  };
}

export async function getRacketActiveCountPayload(
  racketId: string,
): Promise<RacketActiveCountPayload> {
  if (!ObjectId.isValid(racketId)) {
    return { ok: false, count: 0, quantity: 1, available: 0 };
  }

  const db = (await clientPromise).db();
  const viewer = await getVisibilityViewerFromCookies();

  const count = await db.collection("rental_orders").countDocuments({
    racketId: new ObjectId(racketId),
    status: { $in: ["paid", "out"] },
  });

  const projUsed = { projection: { quantity: 1, status: 1 } } as const;
  const projRackets = { projection: { quantity: 1 } } as const;
  const used = await db
    .collection("used_rackets")
    .findOne({ _id: new ObjectId(racketId), ...racketVisibilityFilterFor(viewer) }, projUsed);
  const rack =
    used ?? (await db.collection("rackets").findOne({ _id: new ObjectId(racketId) }, projRackets));

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
