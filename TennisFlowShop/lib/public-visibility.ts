import type { Filter } from "mongodb";

type ProductVisibilityDoc = { isDeleted?: boolean; isVisible?: boolean };
type RacketVisibilityDoc = { status?: string; isVisible?: boolean };

export const publicProductFilter: Filter<ProductVisibilityDoc> = {
  isDeleted: { $ne: true },
  isVisible: { $ne: false },
};

export const HIDDEN_RACKET_STATUSES = ["inactive", "비노출"] as const;

export const publicRacketStatusFilter: Filter<RacketVisibilityDoc> = {
  $or: [{ status: { $exists: false } }, { status: { $nin: [...HIDDEN_RACKET_STATUSES] } }],
};

export function isPublicRacketStatus(status: unknown) {
  return !HIDDEN_RACKET_STATUSES.includes(status as any);
}

export type VisibilityViewer = {
  isAdmin?: boolean;
};

export function productVisibilityFilterFor<T extends ProductVisibilityDoc = ProductVisibilityDoc>(
  viewer?: VisibilityViewer,
): Filter<T> {
  return viewer?.isAdmin
    ? ({ isDeleted: { $ne: true } } as Filter<T>)
    : (publicProductFilter as Filter<T>);
}

export function racketVisibilityFilterFor<T extends RacketVisibilityDoc = RacketVisibilityDoc>(
  viewer?: VisibilityViewer,
  options?: { rentOnly?: boolean },
): Filter<T> {
  if (viewer?.isAdmin) {
    if (options?.rentOnly) {
      return {
        $or: [{ status: { $exists: false } }, { status: { $ne: "sold" } }],
      } as Filter<T>;
    }
    return {} as Filter<T>;
  }

  if (options?.rentOnly) {
    return {
      isVisible: { $ne: false },
      $or: [
        { status: { $exists: false } },
        { status: { $nin: [...HIDDEN_RACKET_STATUSES, "sold"] } },
      ],
    } as Filter<T>;
  }

  return {
    isVisible: { $ne: false },
    ...publicRacketStatusFilter,
  } as Filter<T>;
}
