import {
  getReviewContextLabel,
  normalizeReviewContext,
  type ReviewContext,
} from "@/lib/reviews/review-target";
import { ObjectId, type Db } from "mongodb";

export type PublicReviewSurfaceTarget =
  | { type: "product"; id: string }
  | { type: "racket"; id: string };
export type PublicReviewSummary = { average: number; count: number };
export type PublicReviewSurfaceItem = {
  _id: string;
  user: string | null;
  userName?: string | null;
  rating: number;
  date: string | null;
  createdAt?: string | Date | null;
  content: string | null;
  photos: string[];
  status: "visible" | "hidden";
  masked: boolean;
  ownedByMe: boolean;
  adminView?: boolean;
  reviewType?: string | null;
  reviewContext?: ReviewContext | null;
  contextLabel: string;
  productId?: string | null;
  racketId?: string | null;
  rentalId?: string | null;
  serviceApplicationId?: string | null;
  relatedProductIds?: string[];
  relatedRacketIds?: string[];
  productName?: string | null;
  productImage?: string | null;
  serviceTargetName?: string | null;
  rentalTargetName?: string | null;
};
export type PublicReviewSurfacePayload = {
  items: PublicReviewSurfaceItem[];
  summary: PublicReviewSummary;
};

type IdValue = string | ObjectId;

export function idCandidates(value: string): IdValue[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return ObjectId.isValid(trimmed) ? [new ObjectId(trimmed), trimmed] : [trimmed];
}

function stringIds(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const str = String(value ?? "").trim();
    if (!str || seen.has(str)) continue;
    seen.add(str);
    out.push(str);
  }
  return out;
}

function flattenIdCandidates(values: unknown[]): IdValue[] {
  const seen = new Set<string>();
  const out: IdValue[] = [];
  for (const value of stringIds(values)) {
    for (const candidate of idCandidates(value)) {
      const key = `${candidate instanceof ObjectId ? "oid" : "str"}:${String(candidate)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
    }
  }
  return out;
}

function compactOr(conditions: Array<Record<string, unknown> | null | undefined>) {
  return conditions.filter(Boolean) as Record<string, unknown>[];
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value) return value.slice(0, 10);
  return null;
}

function normalizeIdsField(value: unknown): string[] {
  return Array.isArray(value) ? stringIds(value) : [];
}

function fallbackReviewContext(row: any): ReviewContext {
  const normalized = normalizeReviewContext(row?.reviewContext);
  if (normalized) return normalized;
  if (row?.rentalId || row?.reviewType === "rental") return "rental";
  if (row?.service === "stringing") return "standalone_stringing";
  return "product";
}

async function findProductApplicationIds(db: Db, productIdCandidates: IdValue[]) {
  if (!productIdCandidates.length) return [];
  const productMatch = { $in: productIdCandidates };
  const rows = await db
    .collection("stringing_applications")
    .find(
      {
        $or: [
          { "stringDetails.stringItems.productId": productMatch },
          { "stringDetails.stringItems.stringProductId": productMatch },
          { "stringDetails.racketLines.stringProductId": productMatch },
          { "stringDetails.racketLines.productId": productMatch },
          { "stringDetails.lines.productId": productMatch },
          { "stringDetails.lines.stringProductId": productMatch },
          { "stringItems.productId": productMatch },
          { "stringItems.stringProductId": productMatch },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  return stringIds(rows.map((row) => row._id));
}

async function findRacketRentalIds(db: Db, racketIdCandidates: IdValue[]) {
  if (!racketIdCandidates.length) return [];
  const rows = await db
    .collection("rental_orders")
    .find(
      {
        $or: [
          { racketId: { $in: racketIdCandidates } },
          { "racket._id": { $in: racketIdCandidates } },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  return stringIds(rows.map((row) => row._id));
}

async function findRacketApplicationIds(db: Db, racketIdCandidates: IdValue[]) {
  if (!racketIdCandidates.length) return [];
  const racketMatch = { $in: racketIdCandidates };
  const rows = await db
    .collection("stringing_applications")
    .find(
      {
        $or: [
          { racketId: racketMatch },
          { "racket._id": racketMatch },
          { "stringDetails.lines.racketId": racketMatch },
          { "stringDetails.racketLines.racketId": racketMatch },
          { "stringDetails.lines.racket._id": racketMatch },
          { "stringDetails.racketLines.racket._id": racketMatch },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  return stringIds(rows.map((row) => row._id));
}

export async function buildPublicReviewSurfaceTargetMatch(
  db: Db,
  target: PublicReviewSurfaceTarget,
) {
  const targetCandidates = idCandidates(target.id);
  if (!targetCandidates.length) return null;

  if (target.type === "product") {
    const appIds = await findProductApplicationIds(db, targetCandidates);
    const appCandidates = flattenIdCandidates(appIds);
    const $or = compactOr([
      { productId: { $in: targetCandidates } },
      { relatedProductIds: { $in: targetCandidates } },
      appCandidates.length ? { serviceApplicationId: { $in: appCandidates } } : null,
      appCandidates.length ? { applicationId: { $in: appCandidates } } : null,
    ]);
    return $or.length ? { $or } : null;
  }

  const rentalIds = await findRacketRentalIds(db, targetCandidates);
  const appIds = await findRacketApplicationIds(db, targetCandidates);
  const rentalCandidates = flattenIdCandidates(rentalIds);
  const appCandidates = flattenIdCandidates(appIds);
  const $or = compactOr([
    { productId: { $in: targetCandidates } },
    { racketId: { $in: targetCandidates } },
    { relatedRacketIds: { $in: targetCandidates } },
    rentalCandidates.length ? { rentalId: { $in: rentalCandidates } } : null,
    appCandidates.length ? { serviceApplicationId: { $in: appCandidates } } : null,
    appCandidates.length ? { applicationId: { $in: appCandidates } } : null,
  ]);
  return $or.length ? { $or } : null;
}

export async function getPublicReviewSurface(
  db: Db,
  params: {
    target: PublicReviewSurfaceTarget;
    viewerUserId?: ObjectId | null;
    viewerIsAdmin?: boolean;
    limit?: number;
  },
): Promise<PublicReviewSurfacePayload> {
  const limit = Math.max(1, Math.min(50, Math.trunc(Number(params.limit ?? 10) || 10)));
  const targetMatch = await buildPublicReviewSurfaceTargetMatch(db, params.target);
  if (!targetMatch) return { items: [], summary: { average: 0, count: 0 } };

  const viewerUserId = params.viewerUserId ?? null;
  const viewerIsAdmin = params.viewerIsAdmin === true;
  const [result] = await db
    .collection("reviews")
    .aggregate([
      { $match: { isDeleted: { $ne: true }, ...targetMatch } },
      {
        $facet: {
          items: [
            { $match: { status: { $in: ["visible", "hidden"] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                userId: 1,
                userName: 1,
                rating: 1,
                createdAt: 1,
                content: 1,
                photos: 1,
                status: 1,
                reviewType: 1,
                reviewContext: 1,
                contextLabel: 1,
                productId: 1,
                racketId: 1,
                rentalId: 1,
                serviceApplicationId: 1,
                applicationId: 1,
                relatedProductIds: 1,
                relatedRacketIds: 1,
                productName: 1,
                productImage: 1,
                serviceTargetName: 1,
                rentalTargetName: 1,
                service: 1,
              },
            },
          ],
          summary: [
            { $match: { status: "visible" } },
            { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
          ],
        },
      },
    ])
    .toArray();

  const summaryRow = result?.summary?.[0];
  const items = (Array.isArray(result?.items) ? result.items : []).map((row: any) => {
    const ownedByMe = Boolean(
      viewerUserId && row?.userId && String(row.userId) === String(viewerUserId),
    );
    const masked = row?.status === "hidden" && !ownedByMe && !viewerIsAdmin;
    const reviewContext = fallbackReviewContext(row);
    return {
      _id: String(row._id),
      user: masked ? null : (row.userName ?? null),
      userName: masked ? null : (row.userName ?? null),
      rating: Number(row.rating ?? 0),
      date: normalizeDate(row.createdAt),
      createdAt: row.createdAt ?? null,
      content: masked ? null : (row.content ?? null),
      photos: masked ? [] : Array.isArray(row.photos) ? row.photos : [],
      status: row.status === "hidden" ? "hidden" : "visible",
      masked,
      ownedByMe,
      adminView: viewerIsAdmin,
      reviewType: row.reviewType ?? null,
      reviewContext,
      contextLabel: row.contextLabel || getReviewContextLabel(reviewContext),
      productId: row.productId ? String(row.productId) : null,
      racketId: row.racketId ? String(row.racketId) : null,
      rentalId: row.rentalId ? String(row.rentalId) : null,
      serviceApplicationId: row.serviceApplicationId
        ? String(row.serviceApplicationId)
        : row.applicationId
          ? String(row.applicationId)
          : null,
      relatedProductIds: normalizeIdsField(row.relatedProductIds),
      relatedRacketIds: normalizeIdsField(row.relatedRacketIds),
      productName: row.productName ?? null,
      productImage: row.productImage ?? null,
      serviceTargetName: row.serviceTargetName ?? null,
      rentalTargetName: row.rentalTargetName ?? null,
    } satisfies PublicReviewSurfaceItem;
  });

  return {
    items,
    summary: {
      average: summaryRow?.average ? Number(Number(summaryRow.average).toFixed(2)) : 0,
      count: Number(summaryRow?.count ?? 0),
    },
  };
}
