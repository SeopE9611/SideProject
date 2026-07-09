import { ObjectId } from "mongodb";
import { getReviewContextLabel, type ReviewContext } from "./review-target";
import { hasStringingApplicationLink } from "./review-policy";

const oid = (v: unknown) => (v && ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
const idCandidates = (v: unknown) => {
  const s = v ? String(v) : "";
  const o = oid(v);
  return o ? [o, s] : s ? [s] : [];
};

export function collectStringProductIdsFromApplication(app: any) {
  const raw = [
    ...(Array.isArray(app?.stringDetails?.stringItems) ? app.stringDetails.stringItems.map((x: any) => x?.productId) : []),
    ...(Array.isArray(app?.stringDetails?.racketLines) ? app.stringDetails.racketLines.map((x: any) => x?.stringProductId) : []),
    ...(Array.isArray(app?.stringItems) ? app.stringItems.map((x: any) => x?.productId) : []),
  ];
  const seen = new Set<string>();
  return raw.filter((v) => {
    if (!v || !ObjectId.isValid(String(v)) || seen.has(String(v))) return false;
    seen.add(String(v));
    return true;
  }).map((v) => new ObjectId(String(v)));
}

export async function findLinkedStringingApplicationForOrder(db: any, order: any) {
  const direct = oid(order?.stringingApplicationId);
  if (direct) {
    const app = await db.collection("stringing_applications").findOne({ _id: direct });
    if (app) return app;
  }
  if (!order?._id) return null;
  return db.collection("stringing_applications").findOne({ orderId: { $in: idCandidates(order._id) } });
}

export async function findLinkedStringingApplicationForRental(db: any, rental: any) {
  const direct = oid(rental?.stringingApplicationId);
  if (direct) {
    const app = await db.collection("stringing_applications").findOne({ _id: direct });
    if (app) return app;
  }
  if (!rental?._id) return null;
  return db.collection("stringing_applications").findOne({ rentalId: { $in: idCandidates(rental._id) } });
}

const firstOrderProductId = (order: any, optionalProductId?: string | null) => {
  if (optionalProductId && ObjectId.isValid(optionalProductId)) return optionalProductId;
  const item = (Array.isArray(order?.items) ? order.items : []).find((it: any) => it?.productId && ObjectId.isValid(String(it.productId)));
  return item?.productId ? String(item.productId) : null;
};

export async function resolveOrderReviewTarget(db: any, userId: ObjectId, orderId: string, optionalProductId?: string | null) {
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId), userId });
  if (!order) return null;
  const app = await findLinkedStringingApplicationForOrder(db, order);
  const reviewContext: ReviewContext = hasStringingApplicationLink(order) || app ? "product_stringing" : "product";
  const productId = firstOrderProductId(order, optionalProductId);
  const related = app ? collectStringProductIdsFromApplication(app) : [];
  if (productId && ObjectId.isValid(productId) && !related.some((p) => String(p) === productId)) related.unshift(new ObjectId(productId));
  return { order, application: app, reviewContext, contextLabel: getReviewContextLabel(reviewContext), productId, serviceApplicationId: app?._id ? String(app._id) : null, relatedProductIds: related };
}

export async function resolveStringingApplicationReviewTarget(db: any, userId: ObjectId, applicationId: string) {
  const app = await db.collection("stringing_applications").findOne({ _id: new ObjectId(applicationId), userId });
  if (!app) return null;
  const reviewContext: ReviewContext = app.orderId ? "product_stringing" : app.rentalId ? "rental_stringing" : "standalone_stringing";
  return { application: app, reviewContext, contextLabel: getReviewContextLabel(reviewContext), relatedProductIds: collectStringProductIdsFromApplication(app), orderId: app.orderId ? String(app.orderId) : null, rentalId: app.rentalId ? String(app.rentalId) : null };
}

export async function resolveRentalReviewTarget(db: any, userId: ObjectId, rentalId: string) {
  const rental = await db.collection("rental_orders").findOne({ _id: new ObjectId(rentalId), userId });
  if (!rental) return null;
  const app = await findLinkedStringingApplicationForRental(db, rental);
  const reviewContext: ReviewContext = rental?.stringingApplicationId || rental?.withStringService || rental?.shippingInfo?.withStringService || app ? "rental_stringing" : "rental";
  return { rental, application: app, reviewContext, contextLabel: getReviewContextLabel(reviewContext), serviceApplicationId: app?._id ? String(app._id) : null, relatedProductIds: app ? collectStringProductIdsFromApplication(app) : [] };
}
