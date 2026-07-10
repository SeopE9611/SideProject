import { ObjectId } from "mongodb";
import {
  buildReviewTargetKey,
  dedupeStringIds,
  getReviewContextLabel,
  type CanonicalReviewTarget,
  type ReviewContext,
  type ReviewSubjectType,
  type ReviewTargetBundle,
} from "./review-target";
import { hasStringingApplicationLink } from "./review-policy";

const oid = (v: unknown) => (v && ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
const toId = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v));
const idCandidates = (v: unknown) => {
  const s = toId(v);
  const o = oid(v);
  return o && s ? [o, s] : s ? [s] : [];
};
const activeApplicationFilter = { status: { $nin: ["draft", "취소", "cancelled", "canceled"] } };
const byCreatedAsc = (a: any, b: any) => {
  const at = new Date(a?.createdAt ?? 0).getTime();
  const bt = new Date(b?.createdAt ?? 0).getTime();
  if (at !== bt) return at - bt;
  return String(a?._id ?? "").localeCompare(String(b?._id ?? ""));
};

function objectIds(ids: string[]) {
  return ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
}

function makeBundle(subjectType: ReviewSubjectType, subjectId: string, targets: CanonicalReviewTarget[]): ReviewTargetBundle {
  const reviewed = targets.filter((target) => target.reviewed).length;
  return {
    subjectType,
    subjectId,
    targets,
    counts: { total: targets.length, reviewed, remaining: Math.max(targets.length - reviewed, 0) },
    allReviewed: targets.length > 0 && reviewed === targets.length,
    nextTarget: targets.find((target) => !target.reviewed && target.eligible) ?? null,
  };
}

function makeTarget(params: Omit<CanonicalReviewTarget, "targetKey" | "contextLabel"> & { targetKey?: string; contextLabel?: string }) {
  const targetKey = params.targetKey ?? buildReviewTargetKey({
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    reviewContext: params.reviewContext,
    productId: params.primaryProductId,
  });
  return {
    ...params,
    targetKey,
    contextLabel: params.contextLabel ?? getReviewContextLabel(params.reviewContext),
    applicationIds: dedupeStringIds(params.applicationIds ?? []),
    relatedProductIds: dedupeStringIds(params.relatedProductIds ?? []),
    relatedRacketIds: dedupeStringIds(params.relatedRacketIds ?? []),
  } satisfies CanonicalReviewTarget;
}

export function collectOrderProductIds(order: any) {
  return dedupeStringIds((Array.isArray(order?.items) ? order.items : []).map((it: any) => it?.productId).filter(Boolean));
}

export function collectOrderStringProductIds(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return dedupeStringIds(
    items
      .filter((it: any) => [it?.kind, it?.category, it?.productType, it?.type].some((v) => String(v ?? "").toLowerCase().includes("string") || String(v ?? "").includes("스트링")))
      .map((it: any) => it?.productId)
      .filter(Boolean),
  );
}

export function collectOrderRacketIds(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return dedupeStringIds(
    items
      .filter((it: any) => [it?.kind, it?.category, it?.productType, it?.type].some((v) => ["racket", "used_racket"].includes(String(v ?? "").toLowerCase()) || String(v ?? "").includes("라켓")))
      .map((it: any) => it?.racketId ?? it?.productId)
      .filter(Boolean),
  );
}

export function collectStringProductIdsFromApplication(app: any) {
  const lines = [
    ...(Array.isArray(app?.stringDetails?.lines) ? app.stringDetails.lines : []),
    ...(Array.isArray(app?.stringDetails?.stringItems) ? app.stringDetails.stringItems : []),
    ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines : []),
    ...(Array.isArray(app?.stringItems) ? app.stringItems : []),
  ];
  return dedupeStringIds(lines.flatMap((x: any) => [x?.productId, x?.stringProductId, x?.stringId, x?.product?._id]).filter(Boolean));
}

export function collectRacketIdsFromApplication(app: any) {
  const lines = [
    ...(Array.isArray(app?.stringDetails?.lines) ? app.stringDetails.lines : []),
    ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines : []),
  ];
  return dedupeStringIds([app?.racketId, app?.racket?._id, ...lines.flatMap((x: any) => [x?.racketId, x?.racket?._id])].filter(Boolean));
}

export function collectRentalRacketIds(rental: any) {
  return dedupeStringIds([rental?.racketId, rental?.racket?._id].filter(Boolean));
}

export async function findLinkedStringingApplicationsForOrder(db: any, order: any) {
  const ors: any[] = [];
  const direct = oid(order?.stringingApplicationId);
  if (direct) ors.push({ _id: direct });
  if (order?._id) ors.push({ orderId: { $in: idCandidates(order._id) } });
  if (!ors.length) return [];
  return db.collection("stringing_applications").find({ $or: ors, ...activeApplicationFilter }).sort({ createdAt: 1, _id: 1 }).toArray();
}

export async function findLinkedStringingApplicationForOrder(db: any, order: any) {
  return (await findLinkedStringingApplicationsForOrder(db, order))[0] ?? null;
}

export async function findLinkedStringingApplicationsForRental(db: any, rental: any) {
  const ors: any[] = [];
  const direct = oid(rental?.stringingApplicationId);
  if (direct) ors.push({ _id: direct });
  if (rental?._id) ors.push({ rentalId: { $in: idCandidates(rental._id) } });
  if (!ors.length) return [];
  return db.collection("stringing_applications").find({ $or: ors, ...activeApplicationFilter }).sort({ createdAt: 1, _id: 1 }).toArray();
}

export async function findLinkedStringingApplicationForRental(db: any, rental: any) {
  return (await findLinkedStringingApplicationsForRental(db, rental))[0] ?? null;
}

async function resolveReviewed(db: any, userId: ObjectId, target: CanonicalReviewTarget) {
  const orderIds = target.orderId ? idCandidates(target.orderId) : [];
  const rentalIds = target.rentalId ? idCandidates(target.rentalId) : [];
  const appIds = target.applicationIds.flatMap(idCandidates);
  const productId = target.primaryProductId;
  const or: any[] = [];
  if (target.reviewContext === "product" && orderIds.length && productId) {
    or.push({ orderId: { $in: orderIds }, productId: { $in: idCandidates(productId) } });
  } else if (target.reviewContext === "product_stringing") {
    if (orderIds.length) or.push({ orderId: { $in: orderIds }, reviewContext: "product_stringing" });
    if (appIds.length) or.push({ serviceApplicationId: { $in: appIds } });
  } else if (target.reviewContext === "standalone_stringing") {
    if (appIds.length) or.push({ serviceApplicationId: { $in: appIds } }, { applicationId: { $in: appIds } });
  } else if (target.reviewContext === "rental" || target.reviewContext === "rental_stringing") {
    if (rentalIds.length) or.push({ rentalId: { $in: rentalIds } });
  }
  if (!or.length) return { reviewed: false, reviewId: null };
  const review = await db.collection("reviews").findOne({ userId, isDeleted: { $ne: true }, $or: or }, { projection: { _id: 1 } });
  return { reviewed: Boolean(review), reviewId: review?._id ? String(review._id) : null };
}

export async function resolveOrderReviewTargetBundle(db: any, userId: ObjectId, orderId: string): Promise<ReviewTargetBundle | null> {
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId), userId });
  if (!order) return null;
  const applications = (await findLinkedStringingApplicationsForOrder(db, order)).sort(byCreatedAsc);
  const subjectId = String(order._id);
  const isService = hasStringingApplicationLink(order) || applications.length > 0;
  const targets: CanonicalReviewTarget[] = [];
  if (isService) {
    const applicationIds = applications.map((app: any) => String(app._id));
    const appProductIds = applications.flatMap(collectStringProductIdsFromApplication);
    const orderProductIds = collectOrderProductIds(order);
    const orderStringIds = collectOrderStringProductIds(order);
    const racketIds = dedupeStringIds([...collectOrderRacketIds(order), ...applications.flatMap(collectRacketIdsFromApplication)]);
    const primaryProductId = appProductIds[0] ?? orderStringIds[0] ?? orderProductIds[0] ?? null;
    const base = makeTarget({
      subjectType: "order", subjectId, reviewContext: "product_stringing", eligible: true, reviewed: false,
      orderId: subjectId, rentalId: null, applicationIds,
      relatedProductIds: [...orderProductIds, ...appProductIds], relatedRacketIds: racketIds,
      primaryProductId, primaryApplicationId: applicationIds[0] ?? null, primaryRacketId: racketIds[0] ?? null,
      targetKey: buildReviewTargetKey({ subjectType: "order", subjectId, reviewContext: "product_stringing" }),
    });
    const status = await resolveReviewed(db, userId, base);
    targets.push({ ...base, ...status });
  } else {
    for (const productId of collectOrderProductIds(order)) {
      const base = makeTarget({
        subjectType: "order", subjectId, reviewContext: "product", eligible: true, reviewed: false,
        orderId: subjectId, rentalId: null, applicationIds: [], relatedProductIds: [productId], relatedRacketIds: [], primaryProductId: productId,
      });
      const status = await resolveReviewed(db, userId, base);
      targets.push({ ...base, ...status });
    }
  }
  return makeBundle("order", subjectId, targets);
}

export async function resolveRentalReviewTargetBundle(db: any, userId: ObjectId, rentalId: string): Promise<ReviewTargetBundle | null> {
  const rental = await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId), userId });
  if (!rental) return null;
  const applications = (await findLinkedStringingApplicationsForRental(db, rental)).sort(byCreatedAsc);
  const subjectId = String(rental._id);
  const racketIds = dedupeStringIds([...collectRentalRacketIds(rental), ...applications.flatMap(collectRacketIdsFromApplication)]);
  const applicationIds = applications.map((app: any) => String(app._id));
  const productIds = applications.flatMap(collectStringProductIdsFromApplication);
  const reviewContext: ReviewContext = applications.length || rental?.stringingApplicationId || rental?.stringing?.requested ? "rental_stringing" : "rental";
  const base = makeTarget({
    subjectType: "rental", subjectId, reviewContext, eligible: true, reviewed: false,
    orderId: null, rentalId: subjectId, applicationIds, relatedProductIds: productIds, relatedRacketIds: racketIds,
    primaryProductId: productIds[0] ?? null, primaryApplicationId: applicationIds[0] ?? null, primaryRacketId: racketIds[0] ?? null,
    targetKey: buildReviewTargetKey({ subjectType: "rental", subjectId, reviewContext }),
  });
  const status = await resolveReviewed(db, userId, base);
  return makeBundle("rental", subjectId, [{ ...base, ...status }]);
}

export async function resolveApplicationReviewTargetBundle(db: any, userId: ObjectId, applicationId: string): Promise<ReviewTargetBundle | null> {
  const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(applicationId), userId });
  if (!app) return null;
  if (app.orderId) {
    const parent = await resolveOrderReviewTargetBundle(db, userId, String(app.orderId));
    if (parent) return parent;
  }
  if (app.rentalId) {
    const parent = await resolveRentalReviewTargetBundle(db, userId, String(app.rentalId));
    if (parent) return parent;
  }
  const subjectId = String(app._id);
  const productIds = collectStringProductIdsFromApplication(app);
  const racketIds = collectRacketIdsFromApplication(app);
  const base = makeTarget({
    subjectType: "application", subjectId, reviewContext: "standalone_stringing", eligible: true, reviewed: false,
    orderId: null, rentalId: null, applicationIds: [subjectId], relatedProductIds: productIds, relatedRacketIds: racketIds,
    primaryProductId: productIds[0] ?? null, primaryApplicationId: subjectId, primaryRacketId: racketIds[0] ?? null,
  });
  const status = await resolveReviewed(db, userId, base);
  return makeBundle("application", subjectId, [{ ...base, ...status }]);
}

export async function resolveOrderReviewTargetBundlesBatch(db: any, userId: ObjectId, orders: any[]) {
  const result = new Map<string, ReviewTargetBundle>();
  await Promise.all(orders.map(async (order) => {
    const bundle = await resolveOrderReviewTargetBundle(db, userId, String(order._id));
    if (bundle) result.set(String(order._id), bundle);
  }));
  return result;
}

export async function resolveRentalReviewTargetBundlesBatch(db: any, userId: ObjectId, rentals: any[]) {
  const result = new Map<string, ReviewTargetBundle>();
  await Promise.all(rentals.map(async (rental) => {
    const bundle = await resolveRentalReviewTargetBundle(db, userId, String(rental._id));
    if (bundle) result.set(String(rental._id), bundle);
  }));
  return result;
}

export async function resolveOrderReviewTarget(db: any, userId: ObjectId, orderId: string, optionalProductId?: string | null) {
  const bundle = await resolveOrderReviewTargetBundle(db, userId, orderId);
  if (!bundle) return null;
  const target = optionalProductId ? bundle.targets.find((t) => t.primaryProductId === optionalProductId) ?? bundle.nextTarget ?? bundle.targets[0] : bundle.nextTarget ?? bundle.targets[0];
  return target ? {
    order: await db.collection("orders").findOne({ _id: new ObjectId(orderId), userId }),
    application: target.primaryApplicationId ? { _id: new ObjectId(target.primaryApplicationId) } : null,
    reviewContext: target.reviewContext,
    contextLabel: target.contextLabel,
    productId: target.primaryProductId,
    serviceApplicationId: target.primaryApplicationId,
    applicationIds: target.applicationIds,
    relatedProductIds: objectIds(target.relatedProductIds),
    relatedRacketIds: target.relatedRacketIds,
    targetBundle: bundle,
  } : null;
}

export async function resolveStringingApplicationReviewTarget(db: any, userId: ObjectId, applicationId: string) {
  const bundle = await resolveApplicationReviewTargetBundle(db, userId, applicationId);
  const target = bundle?.nextTarget ?? bundle?.targets[0] ?? null;
  if (!target) return null;
  return { application: { _id: new ObjectId(applicationId) }, reviewContext: target.reviewContext, contextLabel: target.contextLabel, relatedProductIds: objectIds(target.relatedProductIds), orderId: target.orderId, rentalId: target.rentalId, targetBundle: bundle, ineligibleReason: target.subjectType !== "application" ? "coveredByIntegratedReview" : null };
}

export async function resolveRentalReviewTarget(db: any, userId: ObjectId, rentalId: string) {
  const bundle = await resolveRentalReviewTargetBundle(db, userId, rentalId);
  const target = bundle?.nextTarget ?? bundle?.targets[0] ?? null;
  if (!target) return null;
  return { rental: await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId), userId }), application: target.primaryApplicationId ? { _id: new ObjectId(target.primaryApplicationId) } : null, reviewContext: target.reviewContext, contextLabel: target.contextLabel, serviceApplicationId: target.primaryApplicationId, relatedProductIds: objectIds(target.relatedProductIds), relatedRacketIds: target.relatedRacketIds, targetBundle: bundle };
}
