import "server-only";

import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "@/lib/constants";
import { isPortfolioDemo } from "@/lib/portfolio-demo/interactive.server";

export const PORTFOLIO_DEMO_ADMIN_SEED_KEY = "portfolio-demo-admin";

export type PortfolioDemoTourContext = JwtPayload & {
  sub: string;
  portfolioDemoTour: true;
  demoCustomerSub: string;
  demoSessionId: string;
  demoExpiresAt: string;
};

export function getPortfolioDemoTourContext(payload: JwtPayload): PortfolioDemoTourContext | null {
  if (
    payload.portfolioDemoTour !== true ||
    typeof payload.sub !== "string" ||
    typeof payload.demoCustomerSub !== "string" ||
    typeof payload.demoSessionId !== "string" ||
    typeof payload.demoExpiresAt !== "string" ||
    !payload.demoCustomerSub ||
    !payload.demoSessionId ||
    !Number.isFinite(new Date(payload.demoExpiresAt).getTime())
  ) {
    return null;
  }
  return payload as PortfolioDemoTourContext;
}

export function portfolioDemoExpiryMatches(left: unknown, right: string): boolean {
  const leftTime = left instanceof Date ? left.getTime() : new Date(left as string | number).getTime();
  return Number.isFinite(leftTime) && leftTime === new Date(right).getTime();
}

export async function isPortfolioDemoTourSession(): Promise<boolean> {
  if (!isPortfolioDemo()) return false;
  const jar = await cookies();
  const accessToken = jar.get("accessToken")?.value;
  const refreshToken = jar.get("refreshToken")?.value;
  if (!accessToken || !refreshToken) return false;
  try {
    const access = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as JwtPayload;
    const refresh = getPortfolioDemoTourContext(
      jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as JwtPayload,
    );
    return access.portfolioDemoTour === true && !!refresh && access.sub === refresh.sub;
  } catch {
    return false;
  }
}
