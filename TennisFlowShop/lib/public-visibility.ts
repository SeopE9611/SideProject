export const publicProductFilter = {
  isDeleted: { $ne: true },
  isVisible: { $ne: false },
};

export const HIDDEN_RACKET_STATUSES = ["inactive", "비노출"] as const;

export const publicRacketStatusFilter = {
  $or: [
    { status: { $exists: false } },
    { status: { $nin: [...HIDDEN_RACKET_STATUSES] } },
  ],
};

export function isPublicRacketStatus(status: unknown) {
  return !HIDDEN_RACKET_STATUSES.includes(status as any);
}


export type VisibilityViewer = {
  isAdmin?: boolean;
};

export function productVisibilityFilterFor(viewer?: VisibilityViewer) {
  return viewer?.isAdmin
    ? { isDeleted: { $ne: true } }
    : publicProductFilter;
}

export function racketVisibilityFilterFor(
  viewer?: VisibilityViewer,
  options?: { rentOnly?: boolean },
) {
  if (viewer?.isAdmin) {
    if (options?.rentOnly) {
      return {
        $or: [
          { status: { $exists: false } },
          { status: { $ne: "sold" } },
        ],
      };
    }
    return {};
  }

  if (options?.rentOnly) {
    return {
      $or: [
        { status: { $exists: false } },
        { status: { $nin: [...HIDDEN_RACKET_STATUSES, "sold"] } },
      ],
    };
  }

  return publicRacketStatusFilter;
}
