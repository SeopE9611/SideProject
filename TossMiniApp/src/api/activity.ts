import { getJson } from "./http";

export type AppsActivity = {
  id: string; orderId?: string; rentalId?: string; createdAt: string | null; productName: string; color: string; gauge: string;
  activityType?: "stringing_service" | "racket_purchase" | "racket_rental"; stringName?: string | null; quantity?: number;
  days?: number; rentalFee?: number; deposit?: number; stringingRequested?: boolean;
  collectionMethod: "visit" | "self_ship"; preferredDate: string | null; preferredTime: string | null;
  status: string; paymentStatus: string; amount: number; racketType: string | null;
};

export function getAppsActivity(sessionToken: string, signal?: AbortSignal) {
  return getJson<{ success: true; activities: AppsActivity[] }>(
    "/api/apps-in-toss/me/activity",
    signal,
    { Authorization: `Bearer ${sessionToken}` },
  );
}
