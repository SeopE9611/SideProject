import "server-only";

import { cookies } from "next/headers";
import { ObjectId, type Db } from "mongodb";

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

export async function getVisibilityViewerFromUserId(
  db: Db,
  userId?: string | null,
): Promise<VisibilityViewer> {
  if (!userId || !ObjectId.isValid(userId)) {
    return { isAdmin: false };
  }

  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { role: 1 } },
  );

  return {
    isAdmin: user?.role === "admin",
  };
}
