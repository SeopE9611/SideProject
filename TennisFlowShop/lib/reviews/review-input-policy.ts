export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_CONTENT_MIN_LENGTH = 5;
export const REVIEW_CONTENT_MAX_LENGTH = 1000;
export const REVIEW_MAX_PHOTOS = 5;

export type ReviewInputValidationReason =
  | "invalidRating"
  | "contentTooShort"
  | "contentTooLong"
  | "tooManyPhotos"
  | "invalidPhotos";

export type ReviewInputValidationResult =
  | {
      ok: true;
      value: {
        rating: number;
        content: string;
        photos: string[];
      };
    }
  | {
      ok: false;
      reason: ReviewInputValidationReason;
    };

export type ReviewPatchInputValidationResult =
  | {
      ok: true;
      value: {
        rating?: number;
        content?: string;
        photos?: string[];
      };
    }
  | {
      ok: false;
      reason: ReviewInputValidationReason;
    };

export function validateReviewInput(input: {
  rating: unknown;
  content: unknown;
  photos: unknown;
}): ReviewInputValidationResult {
  if (typeof input.rating !== "number") return { ok: false, reason: "invalidRating" };
  const rating = input.rating;
  if (
    !Number.isFinite(rating) ||
    !Number.isInteger(rating) ||
    rating < REVIEW_RATING_MIN ||
    rating > REVIEW_RATING_MAX
  ) {
    return { ok: false, reason: "invalidRating" };
  }

  if (typeof input.content !== "string") return { ok: false, reason: "contentTooShort" };
  const content = input.content.trim();
  if (content.length < REVIEW_CONTENT_MIN_LENGTH) return { ok: false, reason: "contentTooShort" };
  if (content.length > REVIEW_CONTENT_MAX_LENGTH) return { ok: false, reason: "contentTooLong" };

  if (!Array.isArray(input.photos)) return { ok: false, reason: "invalidPhotos" };
  if (input.photos.length > REVIEW_MAX_PHOTOS) return { ok: false, reason: "tooManyPhotos" };
  if (!input.photos.every((photo) => typeof photo === "string")) {
    return { ok: false, reason: "invalidPhotos" };
  }

  return { ok: true, value: { rating, content, photos: input.photos } };
}

export function validateReviewPatchInput(
  input: Record<string, unknown>,
): ReviewPatchInputValidationResult {
  const value: { rating?: number; content?: string; photos?: string[] } = {};

  if ("rating" in input) {
    if (typeof input.rating !== "number") return { ok: false, reason: "invalidRating" };
    const rating = input.rating;
    if (
      !Number.isFinite(rating) ||
      !Number.isInteger(rating) ||
      rating < REVIEW_RATING_MIN ||
      rating > REVIEW_RATING_MAX
    ) {
      return { ok: false, reason: "invalidRating" };
    }
    value.rating = rating;
  }

  if ("content" in input) {
    if (typeof input.content !== "string") return { ok: false, reason: "contentTooShort" };
    const content = input.content.trim();
    if (content.length < REVIEW_CONTENT_MIN_LENGTH) {
      return { ok: false, reason: "contentTooShort" };
    }
    if (content.length > REVIEW_CONTENT_MAX_LENGTH) {
      return { ok: false, reason: "contentTooLong" };
    }
    value.content = content;
  }

  if ("photos" in input) {
    if (!Array.isArray(input.photos)) return { ok: false, reason: "invalidPhotos" };
    if (input.photos.length > REVIEW_MAX_PHOTOS) return { ok: false, reason: "tooManyPhotos" };
    if (!input.photos.every((photo) => typeof photo === "string")) {
      return { ok: false, reason: "invalidPhotos" };
    }
    value.photos = input.photos;
  }

  return { ok: true, value };
}

export function reviewInputMessage(
  reason: ReviewInputValidationReason,
) {
  switch (reason) {
    case "invalidRating":
      return "별점은 1점부터 5점까지 선택해 주세요.";
    case "contentTooShort":
      return "후기 내용은 5자 이상 입력해 주세요.";
    case "contentTooLong":
      return "후기 내용은 1000자 이하로 입력해 주세요.";
    case "tooManyPhotos":
      return "사진은 최대 5장까지 등록할 수 있습니다.";
    case "invalidPhotos":
      return "사진 형식이 올바르지 않습니다.";
  }
}
