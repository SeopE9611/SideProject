import { getJson } from "./http";

export type AppsActivity = {
  id: string; orderId: string; createdAt: string | null; productName: string; color: string; gauge: string;
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
