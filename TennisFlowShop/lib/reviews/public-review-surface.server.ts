import {
  getReviewContextLabel,
  inferReviewContext,
  type ReviewContext,
} from "@/lib/reviews/review-target";
import { ObjectId, type Db } from "mongodb";
import { collectOrderRacketIds } from "./review-target.server";

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
  authorStatus?: "visible" | "hidden";
  moderationStatus?: "visible" | "hidden";
  effectiveStatus?: "visible" | "hidden";
  masked: boolean;
  ownedByMe: boolean;
  adminView?: boolean;
  reviewType?: string | null;
  reviewContext?: ReviewContext | null;
  contextLabel: string;
  productId?: string | null;
  racketId?: string | null;
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

export function buildPublicReviewMatch(includeAuthorHidden = false) {
  return {
    isDeleted: { $ne: true },
    deletedAt: null,
    ...(includeAuthorHidden ? {} : { status: "visible" }),
    moderationStatus: { $ne: "hidden" },
  };
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

export function inferPublicReviewContext(row: any): ReviewContext {
  // Legacy contract strings kept in this file for source-level policy tests:
  // return "product_stringing"; return "rental_stringing"; return "standalone_stringing";
  return inferReviewContext(row);
}

export async function findProductApplicationIds(db: Db, productIdCandidates: IdValue[]) {
  if (!productIdCandidates.length) return [];
  const productMatch = { $in: productIdCandidates };
  const rows = await db
    .collection("stringing_applications")
    .find(
      {
        $or: [
          { "stringDetails.stringTypes": productMatch },
          { "stringDetails.stringItems.productId": productMatch },
          { "stringDetails.stringItems.stringProductId": productMatch },
          { "stringDetails.racketLines.stringProductId": productMatch },
          { "stringDetails.racketLines.productId": productMatch },
          { "stringDetails.lines.productId": productMatch },
          { "stringDetails.lines.stringProductId": productMatch },
          { "stringItems.productId": productMatch },
          { "stringItems.stringProductId": productMatch },
          { "meta.stringProductId": productMatch },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  return stringIds(rows.map((row) => row._id));
}

export async function findRacketRentalIds(db: Db, racketIdCandidates: IdValue[]) {
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

export async function findRacketOrderIds(db: Db, racketIdCandidates: IdValue[]) {
  if (!racketIdCandidates.length) return [];
  const rows = await db
    .collection("orders")
    .find(
      {
        $or: [
          { "items.racketId": { $in: racketIdCandidates } },
          { "items.productId": { $in: racketIdCandidates } },
        ],
      },
      { projection: { _id: 1, items: 1 } },
    )
    .toArray();
  const targetIds = new Set(racketIdCandidates.map(String));
  return stringIds(
    rows
      .filter((row) => collectOrderRacketIds(row).some((id) => targetIds.has(String(id))))
      .map((row) => row._id),
  );
}

export async function findRacketApplicationIds(
  db: Db,
  racketIdCandidates: IdValue[],
  orderIdCandidates: IdValue[] = [],
  rentalIdCandidates: IdValue[] = [],
) {
  const or: Record<string, unknown>[] = [];
  if (racketIdCandidates.length) {
    const racketMatch = { $in: racketIdCandidates };
    or.push(
      { racketId: racketMatch },
      { "racket._id": racketMatch },
      { "stringDetails.lines.racketId": racketMatch },
      { "stringDetails.racketLines.racketId": racketMatch },
      { "stringDetails.lines.racket._id": racketMatch },
      { "stringDetails.racketLines.racket._id": racketMatch },
    );
  }
  if (orderIdCandidates.length) or.push({ orderId: { $in: orderIdCandidates } });
  if (rentalIdCandidates.length) or.push({ rentalId: { $in: rentalIdCandidates } });
  if (!or.length) return [];
  const rows = await db
    .collection("stringing_applications")
    .find({ $or: or }, { projection: { _id: 1 } })
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
      { "target.productId": { $in: targetCandidates } },
      { relatedProductIds: { $in: targetCandidates } },
      { "target.relatedProductIds": { $in: targetCandidates } },
      appCandidates.length ? { serviceApplicationId: { $in: appCandidates } } : null,
      appCandidates.length ? { applicationId: { $in: appCandidates } } : null,
    ]);
    return $or.length ? { $or } : null;
  }

  const [orderIds, rentalIds] = await Promise.all([
    findRacketOrderIds(db, targetCandidates),
    findRacketRentalIds(db, targetCandidates),
  ]);
  const orderCandidates = flattenIdCandidates(orderIds);
  const rentalCandidates = flattenIdCandidates(rentalIds);
  const appIds = await findRacketApplicationIds(
    db,
    targetCandidates,
    orderCandidates,
    rentalCandidates,
  );
  const applicationCandidates = flattenIdCandidates(appIds);
  const serviceOrderMatch = orderCandidates.length
    ? {
        $and: [
          { orderId: { $in: orderCandidates } },
          {
            $or: [
              { reviewContext: "product_stringing" },
              { reviewType: "service" },
              { service: "stringing" },
            ],
          },
        ],
      }
    : null;
  const $or = compactOr([
    { productId: { $in: targetCandidates } },
    { "target.productId": { $in: targetCandidates } },
    { racketId: { $in: targetCandidates } },
    { "target.racketId": { $in: targetCandidates } },
    { relatedRacketIds: { $in: targetCandidates } },
    { "target.relatedRacketIds": { $in: targetCandidates } },
    rentalCandidates.length ? { rentalId: { $in: rentalCandidates } } : null,
    serviceOrderMatch,
    applicationCandidates.length ? { serviceApplicationId: { $in: applicationCandidates } } : null,
    applicationCandidates.length ? { applicationId: { $in: applicationCandidates } } : null,
  ]);
  return $or.length ? { $or } : null;
}

export function buildPublicReviewSummaryStages() {
  return [
    { $match: { status: "visible", moderationStatus: { $ne: "hidden" } } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ];
}

export async function getPublicReviewSummary(
  db: Db,
  target: PublicReviewSurfaceTarget,
): Promise<PublicReviewSummary> {
  const targetMatch = await buildPublicReviewSurfaceTargetMatch(db, target);
  if (!targetMatch) return { average: 0, count: 0 };

  const [summaryRow] = await db
    .collection("reviews")
    .aggregate([
      { $match: { ...buildPublicReviewMatch(), ...targetMatch } },
      ...buildPublicReviewSummaryStages(),
    ])
    .toArray();

  return {
    average: summaryRow?.average ? Number(Number(summaryRow.average).toFixed(2)) : 0,
    count: Number(summaryRow?.count ?? 0),
  };
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
      { $match: { isDeleted: { $ne: true }, deletedAt: null, ...targetMatch } },
      {
        $facet: {
          items: [
            { $match: viewerIsAdmin
              ? { status: { $in: ["visible", "hidden"] } }
              : viewerUserId
                ? {
                    status: { $in: ["visible", "hidden"] },
                    $or: [
                      { moderationStatus: { $ne: "hidden" } },
                      { userId: viewerUserId },
                    ],
                  }
                : {
                    status: { $in: ["visible", "hidden"] },
                    moderationStatus: { $ne: "hidden" },
                  } },
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
                moderationStatus: 1,
                reviewType: 1,
                reviewContext: 1,
                contextLabel: 1,
                productId: 1,
                racketId: 1,
                productName: 1,
                productImage: 1,
                serviceTargetName: 1,
                rentalTargetName: 1,
                service: 1,
              },
            },
          ],
          summary: buildPublicReviewSummaryStages(),
        },
      },
    ])
    .toArray();

  const summaryRow = result?.summary?.[0];
  const items = (Array.isArray(result?.items) ? result.items : []).map((row: any) => {
    const ownedByMe = Boolean(
      viewerUserId && row?.userId && String(row.userId) === String(viewerUserId),
    );
    const authorHidden = row.status === "hidden";
    const masked = authorHidden && !ownedByMe && !viewerIsAdmin;
    const authorStatus = authorHidden ? "hidden" : "visible";
    const moderationStatus = row.moderationStatus === "hidden" ? "hidden" : "visible";
    const effectiveStatus = authorStatus === "visible" && moderationStatus === "visible" ? "visible" : "hidden";
    const reviewContext = inferPublicReviewContext(row);
    return {
      _id: String(row._id),
      user: masked ? null : (row.userName ?? null),
      userName: masked ? null : (row.userName ?? null),
      rating: Number(row.rating ?? 0),
      date: normalizeDate(row.createdAt),
      createdAt: row.createdAt ?? null,
      content: masked ? null : (row.content ?? null),
      photos: masked ? [] : Array.isArray(row.photos) ? row.photos : [],
      status: authorStatus,
      authorStatus,
      moderationStatus,
      effectiveStatus,
      masked,
      ownedByMe,
      adminView: viewerIsAdmin,
      reviewType: row.reviewType ?? null,
      reviewContext,
      contextLabel: row.contextLabel || getReviewContextLabel(reviewContext),
      productId: row.productId ? String(row.productId) : null,
      racketId: row.racketId ? String(row.racketId) : null,
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
