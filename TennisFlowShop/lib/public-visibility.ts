export const publicProductFilter = {
  isDeleted: { $ne: true },
  isVisible: { $ne: false },
} as const;

export const HIDDEN_RACKET_STATUSES = ["inactive", "비노출"] as const;

export const publicRacketStatusFilter = {
  $or: [
    { status: { $exists: false } },
    { status: { $nin: [...HIDDEN_RACKET_STATUSES] } },
  ],
} as const;

export function isPublicRacketStatus(status: unknown) {
  return !HIDDEN_RACKET_STATUSES.includes(status as any);
}
