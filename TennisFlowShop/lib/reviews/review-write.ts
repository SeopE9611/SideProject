import type { CanonicalReviewTarget, ReviewWriteTarget } from "./review-target";
import { buildReviewWriteHref } from "./review-target";

export type ReviewSubmissionForm = { rating: number; content: string; photos: string[] };
export type ReviewDestination = { href: string; label: string };

const REVIEW_MANAGEMENT_DESTINATION: ReviewDestination = {
  href: "/mypage?tab=reviews",
  label: "후기 관리로 이동",
};

function cleanId(value: unknown) {
  const id = String(value ?? "").trim();
  return id || null;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export function canonicalHrefForTarget(target: CanonicalReviewTarget) {
  return buildReviewWriteHref({
    reviewContext: target.reviewContext,
    orderId: cleanId(target.orderId),
    rentalId: cleanId(target.rentalId),
    productId: cleanId(target.primaryProductId),
    applicationId: cleanId(target.primaryApplicationId),
  } satisfies ReviewWriteTarget);
}

export function getRequiredTargetError(target: CanonicalReviewTarget | null) {
  if (!target) return "후기 대상을 확인할 수 없습니다.";
  switch (target.reviewContext) {
    case "product":
      return cleanId(target.orderId) && cleanId(target.primaryProductId)
        ? null
        : "상품 후기 대상을 확인할 수 없습니다.";
    case "product_stringing":
      return cleanId(target.orderId) && cleanId(target.primaryProductId)
        ? null
        : "상품·교체서비스 후기 대상을 확인할 수 없습니다.";
    case "standalone_stringing":
      return cleanId(target.primaryApplicationId) || cleanId(target.applicationIds[0])
        ? null
        : "교체서비스 후기 대상을 확인할 수 없습니다.";
    case "rental":
      return cleanId(target.rentalId) ? null : "대여 후기 대상을 확인할 수 없습니다.";
    case "rental_stringing":
      return cleanId(target.rentalId) ? null : "대여·스트링 교체 후기 대상을 확인할 수 없습니다.";
  }
}

export function buildReviewSubmissionPayload(
  target: CanonicalReviewTarget,
  form: ReviewSubmissionForm,
) {
  const payload: Record<string, unknown> = {
    rating: form.rating,
    content: form.content,
    photos: form.photos,
    reviewContext: target.reviewContext,
  };
  switch (target.reviewContext) {
    case "product":
      payload.productId = cleanId(target.primaryProductId);
      payload.orderId = cleanId(target.orderId);
      break;
    case "product_stringing":
      payload.productId = cleanId(target.primaryProductId);
      payload.orderId = cleanId(target.orderId);
      payload.serviceApplicationId = cleanId(target.primaryApplicationId);
      break;
    case "standalone_stringing":
      payload.service = "stringing";
      payload.serviceApplicationId =
        cleanId(target.primaryApplicationId) ?? cleanId(target.applicationIds[0]);
      break;
    case "rental":
      payload.rentalId = cleanId(target.rentalId);
      break;
    case "rental_stringing":
      payload.rentalId = cleanId(target.rentalId);
      payload.serviceApplicationId = cleanId(target.primaryApplicationId);
      break;
  }
  return compactPayload(payload);
}

export function getReviewDestination(target: CanonicalReviewTarget | null): ReviewDestination {
  if (
    (target?.reviewContext === "product" || target?.reviewContext === "product_stringing") &&
    cleanId(target.primaryProductId)
  ) {
    return {
      href: `/products/${cleanId(target.primaryProductId)}?tab=reviews`,
      label: "상품 후기 보기",
    };
  }
  return REVIEW_MANAGEMENT_DESTINATION;
}
