import { ADMIN_CSRF_COOKIE_KEY } from "@/lib/admin/adminCsrf";
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforcePublicAuthRateLimit,
  getClientIp,
} from "@/lib/auth/publicAuthRateLimit";
import { ACCESS_TOKEN_EXPIRES_IN, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN, REFRESH_TOKEN_SECRET } from "@/lib/constants";
import { baseCookie } from "@/lib/cookieOptions";
import { getDb } from "@/lib/mongodb";
import {
  buildPortfolioDemoPhone,
  capPortfolioDemoTokenMaxAge,
  cleanupExpiredPortfolioDemoInteractions,
  createPortfolioDemoInteractionMeta,
  isPortfolioDemo,
} from "@/lib/portfolio-demo/interactive.server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!isPortfolioDemo()) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const db = await getDb();
  const ipRateLimited = await enforcePublicAuthRateLimit({
    db,
    routeId: "portfolio_demo_session",
    scope: "ip",
    value: getClientIp(req),
    policy: AUTH_RATE_LIMIT_POLICIES.portfolio_demo_session.ip,
  });
  if (ipRateLimited) return ipRateLimited;

  await cleanupExpiredPortfolioDemoInteractions(db);
  const demoSessionId = crypto.randomUUID();
  const suffix = demoSessionId.replace(/-/g, "").slice(0, 16);
  const meta = createPortfolioDemoInteractionMeta(demoSessionId);
  const user = {
    name: "데모 체험 사용자",
    email: `portfolio-demo-${suffix}@example.com`,
    phone: buildPortfolioDemoPhone(demoSessionId),
    role: "user" as const,
    isDeleted: false,
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...meta,
  };
  const inserted = await db.collection("users").insertOne(user);
  const sub = inserted.insertedId.toString();
  const accessMaxAge = capPortfolioDemoTokenMaxAge(ACCESS_TOKEN_EXPIRES_IN);
  const refreshMaxAge = capPortfolioDemoTokenMaxAge(REFRESH_TOKEN_EXPIRES_IN);
  const accessToken = jwt.sign({ sub, email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: accessMaxAge });
  const refreshToken = jwt.sign({ sub }, REFRESH_TOKEN_SECRET, { expiresIn: refreshMaxAge });
  const response = NextResponse.json({ success: true, userId: sub });
  response.cookies.set("accessToken", accessToken, { ...baseCookie, maxAge: accessMaxAge });
  response.cookies.set("refreshToken", refreshToken, { ...baseCookie, maxAge: refreshMaxAge });
  response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
  return response;
}
