import "server-only";

import { isPortfolioDemo } from "@/lib/portfolio-demo/interactive.server";
import type { PortfolioDemoTourContext } from "@/lib/portfolio-demo/tour.server";
import type { PortfolioDemoDataKind } from "@/types/portfolio-demo";

type DemoMarker = {
  isDemoData?: unknown;
  demoSeedKey?: unknown;
  isDemoInteraction?: unknown;
  demoSessionId?: unknown;
};

function normalizedId(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && "toString" in value) {
    const result = String(value).trim();
    return result && result !== "[object Object]" ? result : null;
  }
  return null;
}

export function classifyPortfolioDemoData(input: {
  marker: unknown;
  tourContext?: PortfolioDemoTourContext | null;
  ownerId?: unknown;
  portfolioDemo?: boolean;
}): PortfolioDemoDataKind | null {
  if (!(input.portfolioDemo ?? isPortfolioDemo())) return null;
  const marker = (input.marker && typeof input.marker === "object" ? input.marker : {}) as DemoMarker;
  const { tourContext } = input;
  if (marker.isDemoData === true && typeof marker.demoSeedKey === "string" && marker.demoSeedKey.trim()) {
    return "seed";
  }
  if (marker.isDemoInteraction !== true) return null;
  if (tourContext) {
    const documentSessionId = normalizedId(marker.demoSessionId);
    if (documentSessionId && documentSessionId === tourContext.demoSessionId) {
      return "current_interaction";
    }
    if (!documentSessionId && normalizedId(input.ownerId) === tourContext.demoCustomerSub) {
      return "current_interaction";
    }
  }
  return "interaction";
}
