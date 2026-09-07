import "server-only";

import type { Db, Filter } from "mongodb";

export const PORTFOLIO_DEMO_INTERACTION_TTL_MS = 24 * 60 * 60 * 1000;

export function isPortfolioDemo(): boolean {
  return process.env.PORTFOLIO_DEMO_MODE === "true";
}

export function createPortfolioDemoInteractionMeta(
  demoSessionId?: string,
  now = new Date(),
) {
  return {
    isDemoInteraction: true as const,
    demoExpiresAt: new Date(now.getTime() + PORTFOLIO_DEMO_INTERACTION_TTL_MS),
    ...(demoSessionId ? { demoSessionId } : {}),
  };
}

export function shouldPreservePortfolioDemoInventory(): boolean {
  return isPortfolioDemo();
}

export function portfolioDemoCleanupFilter(now = new Date()): Filter<Record<string, unknown>> {
  return {
    isDemoInteraction: true,
    demoExpiresAt: { $lte: now },
    demoSeedKey: { $exists: false },
  };
}

const INTERACTION_COLLECTIONS = [
  "users",
  "orders",
  "stringing_applications",
  "rental_orders",
  "packageOrders",
  "academy_lesson_applications",
] as const;

export async function cleanupExpiredPortfolioDemoInteractions(db: Db, now = new Date()) {
  if (!isPortfolioDemo()) return { deletedCount: 0 };
  const results = await Promise.all(
    INTERACTION_COLLECTIONS.map((name) => db.collection(name).deleteMany(portfolioDemoCleanupFilter(now))),
  );
  return { deletedCount: results.reduce((sum, result) => sum + result.deletedCount, 0) };
}

export function portfolioDemoPaymentDisabledResponse() {
  return Response.json(
    {
      code: "PORTFOLIO_DEMO_PAYMENT_DISABLED",
      message: "포트폴리오 데모에서는 실제 결제를 진행하지 않습니다.",
    },
    { status: 403 },
  );
}
