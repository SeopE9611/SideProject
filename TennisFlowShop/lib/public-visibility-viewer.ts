import "server-only";

import { cookies } from "next/headers";

import { verifyAccessToken } from "@/lib/auth.utils";
import type { VisibilityViewer } from "@/lib/public-visibility";

export async function getVisibilityViewerFromCookies(): Promise<VisibilityViewer> {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return { isAdmin: false };

  try {
    const payload = verifyAccessToken(token);
    return {
      isAdmin:
        typeof payload === "object" &&
        payload !== null &&
        (payload as { role?: unknown }).role === "admin",
    };
  } catch {
    return { isAdmin: false };
  }
}
