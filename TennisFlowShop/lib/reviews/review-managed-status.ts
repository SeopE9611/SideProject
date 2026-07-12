export type ReviewVisibilityStatus = "visible" | "hidden";

type ReviewManagedStatusInput = {
  status?: string | null;
  moderationStatus?: string | null;
  ownedByMe?: boolean | null;
};

export function getReviewManagedVisibilityStatus(
  review: ReviewManagedStatusInput,
  isAdmin: boolean,
): {
  isAdminModeration: boolean;
  managedStatus: ReviewVisibilityStatus;
  nextStatus: ReviewVisibilityStatus;
} {
  const isAdminModeration = isAdmin && !review.ownedByMe;
  const managedStatus: ReviewVisibilityStatus = isAdminModeration
    ? review.moderationStatus === "hidden"
      ? "hidden"
      : "visible"
    : review.status === "hidden"
      ? "hidden"
      : "visible";
  const nextStatus: ReviewVisibilityStatus = managedStatus === "visible" ? "hidden" : "visible";

  return {
    isAdminModeration,
    managedStatus,
    nextStatus,
  };
}
