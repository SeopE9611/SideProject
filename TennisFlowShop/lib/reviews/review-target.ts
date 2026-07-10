export type ReviewSubjectType = "order" | "rental" | "application";

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

export type CanonicalReviewTarget = {
  targetKey: string;
  subjectType: ReviewSubjectType;
  subjectId: string;
  reviewContext: ReviewContext;
  contextLabel: string;
  eligible: boolean;
  reviewed: boolean;
  reviewId?: string | null;
  ineligibleReason?: string | null;
  orderId?: string | null;
  rentalId?: string | null;
  applicationIds: string[];
  relatedProductIds: string[];
  relatedRacketIds: string[];
  primaryProductId?: string | null;
  primaryApplicationId?: string | null;
  primaryRacketId?: string | null;
  coveredBySubjectType?: "order" | "rental" | null;
  coveredBySubjectId?: string | null;
  redirectTarget?: CanonicalReviewTarget | null;
  relatedItems?: Array<{
    type: "product" | "racket" | "string" | "service" | "rental";
    id?: string | null;
    name?: string | null;
    imageUrl?: string | null;
    optionLabel?: string | null;
  }>;
};

export type ReviewTargetBundle = {
  subjectType: ReviewSubjectType;
  subjectId: string;
  targets: CanonicalReviewTarget[];
  counts: {
    total: number;
    reviewed: number;
    remaining: number;
  };
  allReviewed: boolean;
  nextTarget: CanonicalReviewTarget | null;
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

export function dedupeStringIds(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const id = String(value ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function sortStringIdsDeterministically(values: unknown[]): string[] {
  return dedupeStringIds(values).sort();
}

export function buildReviewTargetKey(params: {
  subjectType: ReviewSubjectType;
  subjectId: string;
  reviewContext: ReviewContext;
  productId?: string | null;
}) {
  return [params.subjectType, params.subjectId, params.reviewContext, params.productId ?? ""]
    .filter(Boolean)
    .join(":");
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
