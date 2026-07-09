export type ReviewContext =
  | "product"
  | "product_stringing"
  | "standalone_stringing"
  | "rental"
  | "rental_stringing";

export type ReviewWriteTarget = {
  reviewContext?: ReviewContext | null;
  orderId?: string | null;
  productId?: string | null;
  applicationId?: string | null;
  serviceApplicationId?: string | null;
  rentalId?: string | null;
};

const REVIEW_CONTEXT_LABELS: Record<ReviewContext, string> = {
  product: "상품 후기",
  product_stringing: "스트링·교체서비스 후기",
  standalone_stringing: "교체서비스 후기",
  rental: "대여 후기",
  rental_stringing: "대여·스트링 교체 후기",
};

export function normalizeReviewContext(value: unknown): ReviewContext | null {
  const v = String(value ?? "").trim();
  return v in REVIEW_CONTEXT_LABELS ? (v as ReviewContext) : null;
}

export function getReviewContextLabel(context: unknown) {
  const normalized = normalizeReviewContext(context) ?? "product";
  return REVIEW_CONTEXT_LABELS[normalized];
}

export function isIntegratedReviewContext(context: unknown) {
  return ["product_stringing", "rental_stringing"].includes(String(context ?? ""));
}

export function getReviewCtaLabel(target: ReviewWriteTarget) {
  return `${getReviewContextLabel(target.reviewContext)} 작성`;
}

export function buildReviewWriteHref(target: ReviewWriteTarget) {
  const params = new URLSearchParams();
  const context = normalizeReviewContext(target.reviewContext);
  if (context) params.set("reviewContext", context);
  if (target.orderId) params.set("orderId", String(target.orderId));
  if (target.productId) params.set("productId", String(target.productId));
  const appId = target.applicationId ?? target.serviceApplicationId;
  if (appId) params.set("applicationId", String(appId));
  if (target.rentalId) params.set("rentalId", String(target.rentalId));
  if (context === "standalone_stringing" && !params.has("service")) params.set("service", "stringing");
  return `/reviews/write?${params.toString()}`;
}
