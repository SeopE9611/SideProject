import { isStringingCompletedStatus } from "@/lib/status/flow-status";

export type RentalStringingLike = {
  isStringServiceApplied?: boolean | null;
  stringingApplicationId?: unknown;
  stringing?: { requested?: boolean | null } | null;
  linkedStringingApplication?: unknown;
};

export function hasRentalStringingService(rental?: RentalStringingLike | null) {
  return Boolean(
    rental?.isStringServiceApplied ||
    rental?.stringingApplicationId ||
    rental?.stringing?.requested ||
    rental?.linkedStringingApplication,
  );
}

export function isRentalStringingComplete(status?: string | null) {
  return isStringingCompletedStatus(status);
}
