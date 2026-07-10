import { ObjectId } from "mongodb";
import {
  buildReviewTargetKey,
  dedupeStringIds,
  getReviewContextLabel,
  sortStringIdsDeterministically,
  type CanonicalReviewTarget,
  type ReviewContext,
  type ReviewSubjectType,
  type ReviewTargetBundle,
} from "./review-target";
import { getStandaloneStringingIneligibleReason, hasStringingApplicationLink, isOrderReviewEligible, isRentalReviewEligible, isStandaloneStringingReviewEligible, isStringingReviewBlockedStatus } from "./review-policy";

export type ReviewResolutionLoadContext = {
  applicationsByOrderId: Map<string, any[]>;
  applicationsByRentalId: Map<string, any[]>;
  applicationById: Map<string, any>;
  reviewsByOrderId: Map<string, any[]>;
  reviewsByRentalId: Map<string, any[]>;
  reviewsByApplicationId: Map<string, any[]>;
  productsById: Map<string, any>;
  racketsById: Map<string, any>;
  parentOrderByApplicationId: Map<string, any>;
  parentRentalByApplicationId: Map<string, any>;
};

const oid = (v: unknown) => (v && ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
const toId = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v));
const idCandidates = (v: unknown) => {
  const s = toId(v);
  const o = oid(v);
  return o && s ? [o, s] : s ? [s] : [];
};
const byCreatedAsc = (a: any, b: any) => {
  const at = new Date(a?.createdAt ?? 0).getTime();
  const bt = new Date(b?.createdAt ?? 0).getTime();
  if (at !== bt) return at - bt;
  return String(a?._id ?? "").localeCompare(String(b?._id ?? ""));
};
const pushMap = (map: Map<string, any[]>, key: unknown, value: any) => {
  const id = toId(key);
  if (!id) return;
  const bucket = map.get(id) ?? [];
  bucket.push(value);
  map.set(id, bucket);
};
const mapById = (docs: any[]) => new Map(docs.map((doc) => [String(doc._id), doc]));

function objectIds(ids: string[]) {
  return ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
}

export function makeBundle(subjectType: ReviewSubjectType, subjectId: string, targets: CanonicalReviewTarget[]): ReviewTargetBundle {
  const eligibleTargets = targets.filter((target) => target.eligible);
  const reviewedEligibleTargets = eligibleTargets.filter((target) => target.reviewed);
  const remainingTargets = eligibleTargets.filter((target) => !target.reviewed);
  return {
    subjectType,
    subjectId,
    targets,
    counts: { total: eligibleTargets.length, reviewed: reviewedEligibleTargets.length, remaining: remainingTargets.length },
    allReviewed: eligibleTargets.length === 0 || remainingTargets.length === 0,
    nextTarget: remainingTargets[0] ?? null,
  };
}

function imageOf(doc: any) {
  return doc?.imageUrl ?? doc?.thumbnailUrl ?? doc?.thumbnail ?? doc?.image ?? (Array.isArray(doc?.images) ? doc.images[0] : null) ?? null;
}
function nameOf(doc: any, fallback: string | null = null) {
  return doc?.name ?? doc?.title ?? doc?.productName ?? doc?.modelName ?? fallback;
}
function optionFromOrderItem(item: any) {
  return [item?.optionLabel, item?.optionName, item?.gauge, item?.color].filter(Boolean).join(" / ") || null;
}
function serviceOption(app: any) {
  const lines = [
    ...(Array.isArray(app?.stringDetails?.lines) ? app.stringDetails.lines : []),
    ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines : []),
  ];
  const tension = lines.map((line: any) => line?.tension ?? line?.tensionLabel).filter(Boolean)[0];
  return [lines.length ? `라켓 ${lines.length}개` : null, tension].filter(Boolean).join(" / ") || null;
}
function rentalPeriod(rental: any) {
  const start = rental?.startDate ?? rental?.rentalStartDate;
  const end = rental?.endDate ?? rental?.rentalEndDate;
  return [start, end].filter(Boolean).map((v) => new Date(v).toISOString().slice(0, 10)).join(" ~ ") || null;
}

function relatedItem(params: { type: "product" | "racket" | "string" | "service" | "rental"; id?: string | null; doc?: any; optionLabel?: string | null; fallbackName?: string | null }) {
  return { type: params.type, id: params.id ?? (params.doc?._id ? String(params.doc._id) : null), name: nameOf(params.doc, params.fallbackName), imageUrl: imageOf(params.doc), optionLabel: params.optionLabel ?? null };
}
function dedupeRelatedItems(items: NonNullable<CanonicalReviewTarget["relatedItems"]>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.id ?? item.name ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeTarget(params: Omit<CanonicalReviewTarget, "targetKey" | "contextLabel"> & { targetKey?: string; contextLabel?: string }) {
  const targetKey = params.targetKey ?? buildReviewTargetKey({ subjectType: params.subjectType, subjectId: params.subjectId, reviewContext: params.reviewContext, productId: params.primaryProductId });
  return { ...params, targetKey, contextLabel: params.contextLabel ?? getReviewContextLabel(params.reviewContext), applicationIds: dedupeStringIds(params.applicationIds ?? []), relatedProductIds: dedupeStringIds(params.relatedProductIds ?? []), relatedRacketIds: dedupeStringIds(params.relatedRacketIds ?? []) } satisfies CanonicalReviewTarget;
}

export function collectOrderProductIds(order: any) {
  return dedupeStringIds((Array.isArray(order?.items) ? order.items : []).map((it: any) => it?.productId).filter(Boolean));
}
export function collectOrderStringProductIds(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return dedupeStringIds(items.filter((it: any) => [it?.kind, it?.category, it?.productType, it?.type].some((v) => String(v ?? "").toLowerCase().includes("string") || String(v ?? "").includes("스트링"))).map((it: any) => it?.productId).filter(Boolean));
}
export function collectOrderRacketIds(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return dedupeStringIds(items.filter((it: any) => [it?.kind, it?.category, it?.productType, it?.type].some((v) => ["racket", "used_racket"].includes(String(v ?? "").toLowerCase()) || String(v ?? "").includes("라켓"))).map((it: any) => it?.racketId ?? it?.productId).filter(Boolean));
}
export function collectStringProductIdsFromApplication(app: any) {
  const lines = [...(Array.isArray(app?.stringDetails?.lines) ? app.stringDetails.lines : []), ...(Array.isArray(app?.stringDetails?.stringItems) ? app.stringDetails.stringItems : []), ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines : []), ...(Array.isArray(app?.stringItems) ? app.stringItems : [])];
  return dedupeStringIds(lines.flatMap((x: any) => [x?.productId, x?.stringProductId, x?.stringId, x?.product?._id]).filter(Boolean));
}
export function collectRacketIdsFromApplication(app: any) {
  const lines = [...(Array.isArray(app?.stringDetails?.lines) ? app.stringDetails.lines : []), ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines : [])];
  return dedupeStringIds([app?.racketId, app?.racket?._id, ...lines.flatMap((x: any) => [x?.racketId, x?.racket?._id])].filter(Boolean));
}
export function collectRentalRacketIds(rental: any) {
  return dedupeStringIds([rental?.racketId, rental?.racket?._id].filter(Boolean));
}

function validApps(apps: any[]) {
  return apps.filter((app) => !isStringingReviewBlockedStatus(app?.status)).sort(byCreatedAsc);
}

export function matchReviewToCanonicalTarget(review: any, target: CanonicalReviewTarget) {
  const orderIds = target.orderId ? new Set(idCandidates(target.orderId).map(String)) : new Set<string>();
  const rentalIds = target.rentalId ? new Set(idCandidates(target.rentalId).map(String)) : new Set<string>();
  const appIds = new Set(target.applicationIds.flatMap(idCandidates).map(String));
  const productIds = target.primaryProductId ? new Set(idCandidates(target.primaryProductId).map(String)) : new Set<string>();
  if (target.reviewContext === "product") return orderIds.has(String(review?.orderId)) && productIds.has(String(review?.productId));
  if (target.reviewContext === "product_stringing") return (orderIds.has(String(review?.orderId)) && review?.reviewContext === "product_stringing") || appIds.has(String(review?.serviceApplicationId)) || appIds.has(String(review?.applicationId));
  if (target.reviewContext === "standalone_stringing") return appIds.has(String(review?.serviceApplicationId)) || appIds.has(String(review?.applicationId));
  if (target.reviewContext === "rental" || target.reviewContext === "rental_stringing") return rentalIds.has(String(review?.rentalId));
  return false;
}
export function resolveReviewedFromLoadedReviews(target: CanonicalReviewTarget, loadedReviews: any[]) {
  const review = loadedReviews.find((row) => matchReviewToCanonicalTarget(row, target));
  return { reviewed: Boolean(review), reviewId: review?._id ? String(review._id) : null };
}

function allReviewsForTarget(ctx: ReviewResolutionLoadContext, target: CanonicalReviewTarget) {
  const rows = [
    ...(target.orderId ? (ctx.reviewsByOrderId.get(target.orderId) ?? []) : []),
    ...(target.rentalId ? (ctx.reviewsByRentalId.get(target.rentalId) ?? []) : []),
    ...target.applicationIds.flatMap((id) => ctx.reviewsByApplicationId.get(id) ?? []),
  ];
  return Array.from(new Map(rows.map((r) => [String(r._id), r])).values());
}
function withStatus(ctx: ReviewResolutionLoadContext, target: CanonicalReviewTarget) {
  return { ...target, ...resolveReviewedFromLoadedReviews(target, allReviewsForTarget(ctx, target)) };
}

function buildProductItem(ctx: ReviewResolutionLoadContext, id: string, order?: any, options?: { forceType?: "product" | "string" }) {
  const item = (Array.isArray(order?.items) ? order.items : []).find((it: any) => String(it?.productId) === id);
  const doc = ctx.productsById.get(id) ?? item;
  const inferredType = String(item?.kind ?? item?.type ?? item?.category ?? "").toLowerCase().includes("string") ? "string" : "product";
  return relatedItem({ type: options?.forceType ?? inferredType as "product" | "string", id, doc, optionLabel: optionFromOrderItem(item) });
}
function buildRacketItem(ctx: ReviewResolutionLoadContext, id: string, fallback?: any) {
  return relatedItem({ type: "racket", id, doc: ctx.racketsById.get(id) ?? fallback, optionLabel: null, fallbackName: "라켓" });
}

export function buildOrderReviewTargetBundleFromLoadedData(ctx: ReviewResolutionLoadContext, order: any): ReviewTargetBundle {
  const subjectId = String(order._id);
  const applications = validApps(ctx.applicationsByOrderId.get(subjectId) ?? []);
  const orderReviewEligible = isOrderReviewEligible(order);
  const hasLegacyDirect = hasStringingApplicationLink(order);
  const isService = applications.length > 0 || (hasLegacyDirect && toId(order?.stringingApplicationId) && !isStringingReviewBlockedStatus(ctx.applicationById.get(String(order.stringingApplicationId))?.status));
  const targets: CanonicalReviewTarget[] = [];
  if (isService) {
    const applicationIds = applications.map((app) => String(app._id));
    const appProductIds = applications.flatMap(collectStringProductIdsFromApplication);
    const orderProductIds = collectOrderProductIds(order);
    const orderStringIds = collectOrderStringProductIds(order);
    const racketIds = dedupeStringIds([...collectOrderRacketIds(order), ...applications.flatMap(collectRacketIdsFromApplication)]);
    const primaryProductId = appProductIds[0] ?? orderStringIds[0] ?? orderProductIds[0] ?? null;
    const relatedItems = dedupeRelatedItems([
      ...racketIds.map((id) => buildRacketItem(ctx, id)),
      ...dedupeStringIds([...orderStringIds, ...appProductIds]).map((id) => buildProductItem(ctx, id, order, { forceType: "string" })),
      ...applications.map((app) => relatedItem({ type: "service", id: String(app._id), doc: app, optionLabel: serviceOption(app), fallbackName: "교체서비스" })),
    ]);
    targets.push(withStatus(ctx, makeTarget({ subjectType: "order", subjectId, reviewContext: "product_stringing", eligible: orderReviewEligible, reviewed: false, orderId: subjectId, rentalId: null, applicationIds, relatedProductIds: [...orderProductIds, ...appProductIds], relatedRacketIds: racketIds, primaryProductId, primaryApplicationId: applicationIds[0] ?? null, primaryRacketId: racketIds[0] ?? null, relatedItems, targetKey: buildReviewTargetKey({ subjectType: "order", subjectId, reviewContext: "product_stringing" }) })));
  } else {
    for (const productId of collectOrderProductIds(order)) {
      targets.push(withStatus(ctx, makeTarget({ subjectType: "order", subjectId, reviewContext: "product", eligible: orderReviewEligible, reviewed: false, orderId: subjectId, rentalId: null, applicationIds: [], relatedProductIds: [productId], relatedRacketIds: [], primaryProductId: productId, relatedItems: [buildProductItem(ctx, productId, order)] })));
    }
  }
  return makeBundle("order", subjectId, targets);
}

export function buildRentalReviewTargetBundleFromLoadedData(ctx: ReviewResolutionLoadContext, rental: any): ReviewTargetBundle {
  const subjectId = String(rental._id);
  const directApplication = toId(rental?.stringingApplicationId) ? ctx.applicationById.get(String(rental.stringingApplicationId)) : null;
  const linkedApps = ctx.applicationsByRentalId.get(subjectId) ?? [];
  const applications = validApps([...linkedApps, ...(directApplication ? [directApplication] : [])]).filter((app) => !app?.rentalId || String(app.rentalId) === subjectId || String(app._id) === String(rental?.stringingApplicationId));
  const rentalReviewEligible = isRentalReviewEligible(rental);
  const racketIds = dedupeStringIds([...collectRentalRacketIds(rental), ...applications.flatMap(collectRacketIdsFromApplication)]);
  const applicationIds = applications.map((app) => String(app._id));
  const productIds = applications.flatMap(collectStringProductIdsFromApplication);
  const reviewContext: ReviewContext = applications.length ? "rental_stringing" : "rental";
  const relatedItems = dedupeRelatedItems([
    relatedItem({ type: "rental", id: subjectId, doc: rental, optionLabel: rentalPeriod(rental), fallbackName: "대여" }),
    ...racketIds.map((id) => buildRacketItem(ctx, id, rental?.racket)),
    ...productIds.map((id) => buildProductItem(ctx, id, undefined, { forceType: "string" })),
    ...applications.map((app) => relatedItem({ type: "service", id: String(app._id), doc: app, optionLabel: serviceOption(app), fallbackName: "교체서비스" })),
  ]);
  const base = makeTarget({ subjectType: "rental", subjectId, reviewContext, eligible: rentalReviewEligible, reviewed: false, orderId: null, rentalId: subjectId, applicationIds, relatedProductIds: productIds, relatedRacketIds: racketIds, primaryProductId: productIds[0] ?? null, primaryApplicationId: applicationIds[0] ?? null, primaryRacketId: racketIds[0] ?? null, relatedItems, targetKey: buildReviewTargetKey({ subjectType: "rental", subjectId, reviewContext }) });
  return makeBundle("rental", subjectId, [withStatus(ctx, base)]);
}

export function buildApplicationReviewTargetBundleFromLoadedData(ctx: ReviewResolutionLoadContext, app: any): ReviewTargetBundle {
  const subjectId = String(app._id);
  const parentOrder = (app.orderId ? ctx.parentOrderByApplicationId.get(subjectId) : null) ?? ctx.parentOrderByApplicationId.get(subjectId);
  const parentRental = (app.rentalId ? ctx.parentRentalByApplicationId.get(subjectId) : null) ?? ctx.parentRentalByApplicationId.get(subjectId);
  if (parentOrder) {
    const parent = buildOrderReviewTargetBundleFromLoadedData(ctx, parentOrder);
    return makeBundle("application", subjectId, parent.targets.map((t) => ({ ...t, subjectType: "application" as const, subjectId, eligible: false, ineligibleReason: "coveredByIntegratedReview", coveredBySubjectType: "order" as const, coveredBySubjectId: String(parentOrder._id), redirectTarget: t })));
  }
  if (parentRental) {
    const parent = buildRentalReviewTargetBundleFromLoadedData(ctx, parentRental);
    return makeBundle("application", subjectId, parent.targets.map((t) => ({ ...t, subjectType: "application" as const, subjectId, eligible: false, ineligibleReason: "coveredByIntegratedReview", coveredBySubjectType: "rental" as const, coveredBySubjectId: String(parentRental._id), redirectTarget: t })));
  }
  const productIds = collectStringProductIdsFromApplication(app);
  const racketIds = collectRacketIdsFromApplication(app);
  const relatedItems = dedupeRelatedItems([...racketIds.map((id) => buildRacketItem(ctx, id)), ...productIds.map((id) => buildProductItem(ctx, id, undefined, { forceType: "string" })), relatedItem({ type: "service", id: subjectId, doc: app, optionLabel: serviceOption(app), fallbackName: "교체서비스" })]);
  const base = makeTarget({ subjectType: "application", subjectId, reviewContext: "standalone_stringing", eligible: isStandaloneStringingReviewEligible(app), reviewed: false, ineligibleReason: getStandaloneStringingIneligibleReason(app), orderId: null, rentalId: null, applicationIds: [subjectId], relatedProductIds: productIds, relatedRacketIds: racketIds, primaryProductId: productIds[0] ?? null, primaryApplicationId: subjectId, primaryRacketId: racketIds[0] ?? null, relatedItems });
  return makeBundle("application", subjectId, [withStatus(ctx, base)]);
}

export async function loadReviewResolutionContext(db: any, userId: ObjectId, params: { orders?: any[]; rentals?: any[]; applications?: any[] }): Promise<ReviewResolutionLoadContext> {
  const orders = params.orders ?? [];
  const rentals = params.rentals ?? [];
  const seedApps = params.applications ?? [];
  const orderIds = dedupeStringIds(orders.map((o) => o?._id).filter(Boolean));
  const rentalIds = dedupeStringIds(rentals.map((r) => r?._id).filter(Boolean));
  const directAppIds = dedupeStringIds([...orders.map((o) => o?.stringingApplicationId), ...rentals.map((r) => r?.stringingApplicationId), ...seedApps.map((a) => a?._id)].filter(Boolean));
  const appOr: any[] = [];
  if (orderIds.length) appOr.push({ orderId: { $in: orderIds.flatMap(idCandidates) } });
  if (rentalIds.length) appOr.push({ rentalId: { $in: rentalIds.flatMap(idCandidates) } });
  if (directAppIds.length) appOr.push({ _id: { $in: directAppIds.map(oid).filter(Boolean) } });
  const loadedApps = appOr.length ? await db.collection("stringing_applications").find({ userId, status: { $ne: "draft" }, $or: appOr }).sort({ createdAt: 1, _id: 1 }).toArray() : [];
  const allApps = Array.from(mapById([...seedApps, ...loadedApps]).values()).sort(byCreatedAsc);
  const applicationById = mapById(allApps);

  const parentOrderIds = dedupeStringIds(allApps.map((a) => a?.orderId).filter(Boolean));
  const parentRentalIds = dedupeStringIds(allApps.map((a) => a?.rentalId).filter(Boolean));
  const missingOrderIds = parentOrderIds.filter((id) => !orders.some((o) => String(o._id) === id));
  const missingRentalIds = parentRentalIds.filter((id) => !rentals.some((r) => String(r._id) === id));
  const [parentOrders, parentRentals, directOrders, directRentals] = await Promise.all([
    missingOrderIds.length ? db.collection("orders").find({ userId, _id: { $in: missingOrderIds.map(oid).filter(Boolean) } }).toArray() : [],
    missingRentalIds.length ? db.collection("rental_orders").find({ userId, _id: { $in: missingRentalIds.map(oid).filter(Boolean) } }).toArray() : [],
    directAppIds.length ? db.collection("orders").find({ userId, stringingApplicationId: { $in: directAppIds.flatMap(idCandidates) } }).toArray() : [],
    directAppIds.length ? db.collection("rental_orders").find({ userId, stringingApplicationId: { $in: directAppIds.flatMap(idCandidates) } }).toArray() : [],
  ]);
  const allOrders = Array.from(mapById([...orders, ...parentOrders, ...directOrders]).values());
  const allRentals = Array.from(mapById([...rentals, ...parentRentals, ...directRentals]).values());

  const applicationsByOrderId = new Map<string, any[]>();
  const applicationsByRentalId = new Map<string, any[]>();
  const parentOrderByApplicationId = new Map<string, any>();
  const parentRentalByApplicationId = new Map<string, any>();
  const orderById = mapById(allOrders);
  const rentalById = mapById(allRentals);
  for (const app of allApps) {
    if (app.orderId) pushMap(applicationsByOrderId, app.orderId, app);
    if (app.rentalId) pushMap(applicationsByRentalId, app.rentalId, app);
    const directOrder = allOrders.find((o) => String(o?.stringingApplicationId) === String(app._id));
    const directRental = allRentals.find((r) => String(r?.stringingApplicationId) === String(app._id));
    const parentOrder = (app.orderId ? orderById.get(String(app.orderId)) : null) ?? directOrder;
    const parentRental = (app.rentalId ? rentalById.get(String(app.rentalId)) : null) ?? directRental;
    if (parentOrder) { parentOrderByApplicationId.set(String(app._id), parentOrder); pushMap(applicationsByOrderId, parentOrder._id, app); }
    if (parentRental) { parentRentalByApplicationId.set(String(app._id), parentRental); pushMap(applicationsByRentalId, parentRental._id, app); }
  }
  for (const map of [applicationsByOrderId, applicationsByRentalId]) for (const [k, v] of map) map.set(k, Array.from(mapById(v).values()).sort(byCreatedAsc));

  const subjectOrderIds = dedupeStringIds(allOrders.map((o) => o._id));
  const subjectRentalIds = dedupeStringIds(allRentals.map((r) => r._id));
  const subjectAppIds = dedupeStringIds(allApps.map((a) => a._id));
  const reviewOr: any[] = [];
  if (subjectOrderIds.length) reviewOr.push({ orderId: { $in: subjectOrderIds.flatMap(idCandidates) } });
  if (subjectRentalIds.length) reviewOr.push({ rentalId: { $in: subjectRentalIds.flatMap(idCandidates) } });
  if (subjectAppIds.length) reviewOr.push({ serviceApplicationId: { $in: subjectAppIds.flatMap(idCandidates) } }, { applicationId: { $in: subjectAppIds.flatMap(idCandidates) } });
  const reviews = reviewOr.length ? await db.collection("reviews").find({ userId, isDeleted: { $ne: true }, $or: reviewOr }).toArray() : [];
  const reviewsByOrderId = new Map<string, any[]>();
  const reviewsByRentalId = new Map<string, any[]>();
  const reviewsByApplicationId = new Map<string, any[]>();
  for (const review of reviews) {
    pushMap(reviewsByOrderId, review.orderId, review);
    pushMap(reviewsByRentalId, review.rentalId, review);
    pushMap(reviewsByApplicationId, review.serviceApplicationId ?? review.applicationId, review);
  }

  const productIds = sortStringIdsDeterministically([...allOrders.flatMap(collectOrderProductIds), ...allApps.flatMap(collectStringProductIdsFromApplication)]);
  const racketIds = sortStringIdsDeterministically([...allOrders.flatMap(collectOrderRacketIds), ...allRentals.flatMap(collectRentalRacketIds), ...allApps.flatMap(collectRacketIdsFromApplication)]);
  const [products, usedRackets, rackets] = await Promise.all([
    productIds.length ? db.collection("products").find({ _id: { $in: productIds.map(oid).filter(Boolean) } }).toArray() : [],
    racketIds.length ? db.collection("used_rackets").find({ _id: { $in: racketIds.map(oid).filter(Boolean) } }).toArray() : [],
    racketIds.length ? db.collection("rackets").find({ _id: { $in: racketIds.map(oid).filter(Boolean) } }).toArray() : [],
  ]);
  return { applicationsByOrderId, applicationsByRentalId, applicationById, reviewsByOrderId, reviewsByRentalId, reviewsByApplicationId, productsById: mapById(products), racketsById: mapById([...rackets, ...usedRackets]), parentOrderByApplicationId, parentRentalByApplicationId };
}

export async function findLinkedStringingApplicationsForOrder(db: any, order: any) {
  const ctx = await loadReviewResolutionContext(db, order?.userId, { orders: [order] });
  return validApps(ctx.applicationsByOrderId.get(String(order._id)) ?? []);
}
export async function findLinkedStringingApplicationForOrder(db: any, order: any) { return (await findLinkedStringingApplicationsForOrder(db, order))[0] ?? null; }
export async function findLinkedStringingApplicationsForRental(db: any, rental: any) {
  const ctx = await loadReviewResolutionContext(db, rental?.userId, { rentals: [rental] });
  return validApps(ctx.applicationsByRentalId.get(String(rental._id)) ?? []);
}
export async function findLinkedStringingApplicationForRental(db: any, rental: any) { return (await findLinkedStringingApplicationsForRental(db, rental))[0] ?? null; }

export async function resolveOrderReviewTargetBundle(db: any, userId: ObjectId, orderId: string): Promise<ReviewTargetBundle | null> {
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId), userId });
  if (!order) return null;
  const ctx = await loadReviewResolutionContext(db, userId, { orders: [order] });
  return buildOrderReviewTargetBundleFromLoadedData(ctx, order);
}
export async function resolveRentalReviewTargetBundle(db: any, userId: ObjectId, rentalId: string): Promise<ReviewTargetBundle | null> {
  const rental = await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId), userId });
  if (!rental) return null;
  const ctx = await loadReviewResolutionContext(db, userId, { rentals: [rental] });
  return buildRentalReviewTargetBundleFromLoadedData(ctx, rental);
}
export async function resolveApplicationReviewTargetBundle(db: any, userId: ObjectId, applicationId: string): Promise<ReviewTargetBundle | null> {
  const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(applicationId), userId });
  if (!app) return null;
  const ctx = await loadReviewResolutionContext(db, userId, { applications: [app] });
  return buildApplicationReviewTargetBundleFromLoadedData(ctx, app);
}
export async function resolveOrderReviewTargetBundlesBatch(db: any, userId: ObjectId, orders: any[]) {
  const ctx = await loadReviewResolutionContext(db, userId, { orders });
  return new Map(orders.map((order) => [String(order._id), buildOrderReviewTargetBundleFromLoadedData(ctx, order)]));
}
export async function resolveRentalReviewTargetBundlesBatch(db: any, userId: ObjectId, rentals: any[]) {
  const ctx = await loadReviewResolutionContext(db, userId, { rentals });
  return new Map(rentals.map((rental) => [String(rental._id), buildRentalReviewTargetBundleFromLoadedData(ctx, rental)]));
}
export async function resolveApplicationReviewTargetBundlesBatch(db: any, userId: ObjectId, applications: any[]) {
  const ctx = await loadReviewResolutionContext(db, userId, { applications });
  return new Map(applications.map((app) => [String(app._id), buildApplicationReviewTargetBundleFromLoadedData(ctx, app)]));
}

export async function resolveOrderReviewTarget(db: any, userId: ObjectId, orderId: string, optionalProductId?: string | null) {
  const bundle = await resolveOrderReviewTargetBundle(db, userId, orderId);
  if (!bundle) return null;
  const target = optionalProductId ? bundle.targets.find((t) => t.primaryProductId === optionalProductId) ?? bundle.nextTarget ?? bundle.targets[0] : bundle.nextTarget ?? bundle.targets[0];
  return target ? { order: await db.collection("orders").findOne({ _id: new ObjectId(orderId), userId }), application: target.primaryApplicationId ? { _id: new ObjectId(target.primaryApplicationId) } : null, reviewContext: target.reviewContext, contextLabel: target.contextLabel, productId: target.primaryProductId, serviceApplicationId: target.primaryApplicationId, applicationIds: target.applicationIds, relatedProductIds: objectIds(target.relatedProductIds), relatedRacketIds: target.relatedRacketIds, targetBundle: bundle } : null;
}
export async function resolveStringingApplicationReviewTarget(db: any, userId: ObjectId, applicationId: string) {
  const bundle = await resolveApplicationReviewTargetBundle(db, userId, applicationId);
  const target = bundle?.nextTarget ?? bundle?.targets[0] ?? null;
  if (!target) return null;
  return { application: { _id: new ObjectId(applicationId) }, reviewContext: target.reviewContext, contextLabel: target.contextLabel, relatedProductIds: objectIds(target.relatedProductIds), orderId: target.orderId ?? target.coveredBySubjectId, rentalId: target.rentalId ?? (target.coveredBySubjectType === "rental" ? target.coveredBySubjectId : null), coveredBySubjectType: target.coveredBySubjectType ?? null, coveredBySubjectId: target.coveredBySubjectId ?? null, targetBundle: bundle, ineligibleReason: target.ineligibleReason ?? (target.subjectType !== "application" ? "coveredByIntegratedReview" : null) };
}
export async function resolveRentalReviewTarget(db: any, userId: ObjectId, rentalId: string) {
  const bundle = await resolveRentalReviewTargetBundle(db, userId, rentalId);
  const target = bundle?.nextTarget ?? bundle?.targets[0] ?? null;
  if (!target) return null;
  return { rental: await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId), userId }), application: target.primaryApplicationId ? { _id: new ObjectId(target.primaryApplicationId) } : null, reviewContext: target.reviewContext, contextLabel: target.contextLabel, serviceApplicationId: target.primaryApplicationId, relatedProductIds: objectIds(target.relatedProductIds), relatedRacketIds: target.relatedRacketIds, targetBundle: bundle };
}
