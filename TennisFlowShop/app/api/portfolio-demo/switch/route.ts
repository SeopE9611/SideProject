import { ADMIN_CSRF_COOKIE_KEY } from "@/lib/admin/adminCsrf";
import { isAdminRole } from "@/lib/admin/roles";
import {
  AUTH_RATE_LIMIT_POLICIES,
  enforcePublicAuthRateLimit,
  getClientIp,
} from "@/lib/auth/publicAuthRateLimit";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_SECRET,
} from "@/lib/constants";
import { baseCookie } from "@/lib/cookieOptions";
import { getDb } from "@/lib/mongodb";
import {
  getPortfolioDemoRemainingSessionSeconds,
  isPortfolioDemo,
} from "@/lib/portfolio-demo/interactive.server";
import {
  getPortfolioDemoTourContext,
  portfolioDemoExpiryMatches,
  PORTFOLIO_DEMO_ADMIN_SEED_KEY,
} from "@/lib/portfolio-demo/tour.server";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

function error(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function isSameOriginPost(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

function getObjectId(value: unknown): ObjectId | null {
  return typeof value === "string" && ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function setCustomerCookies(
  response: NextResponse,
  user: { _id: ObjectId; email?: unknown; role?: unknown },
  remainingSeconds: number,
) {
  const accessMaxAge = Math.min(ACCESS_TOKEN_EXPIRES_IN, remainingSeconds);
  const refreshMaxAge = Math.min(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds);
  response.cookies.set(
    "accessToken",
    jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, {
      expiresIn: accessMaxAge,
    }),
    { ...baseCookie, maxAge: accessMaxAge },
  );
  response.cookies.set(
    "refreshToken",
    jwt.sign({ sub: user._id.toString() }, REFRESH_TOKEN_SECRET, { expiresIn: refreshMaxAge }),
    { ...baseCookie, maxAge: refreshMaxAge },
  );
  response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
}

export async function POST(req: Request) {
  if (!isPortfolioDemo()) return error("Not Found", 404);
  if (!isSameOriginPost(req)) return error("허용되지 않은 요청입니다.", 403);

  const db = await getDb();
  const limited = await enforcePublicAuthRateLimit({
    db,
    routeId: "portfolio_demo_switch",
    scope: "ip",
    value: getClientIp(req),
    policy: AUTH_RATE_LIMIT_POLICIES.portfolio_demo_switch.ip,
  });
  if (limited) return limited;

  let target: unknown;
  try {
    target = (await req.json())?.target;
  } catch {
    return error("요청 본문이 올바르지 않습니다.", 400);
  }
  if (target !== "admin" && target !== "customer") return error("전환 대상이 올바르지 않습니다.", 400);

  const accessToken = req.headers.get("cookie")?.match(/(?:^|;\s*)accessToken=([^;]+)/)?.[1];
  if (!accessToken) return error("인증이 필요합니다.", 401);
  let access: JwtPayload;
  try {
    access = jwt.verify(decodeURIComponent(accessToken), ACCESS_TOKEN_SECRET) as JwtPayload;
  } catch {
    return error("유효하지 않은 인증입니다.", 401);
  }

  const currentId = getObjectId(access.sub);
  if (!currentId) return error("유효하지 않은 인증입니다.", 401);
  const currentUser = await db.collection("users").findOne({ _id: currentId });
  if (!currentUser || currentUser.isDeleted === true || currentUser.isSuspended === true) {
    return error("전환할 수 없는 계정입니다.", 403);
  }

  if (target === "admin") {
    const remainingSeconds = getPortfolioDemoRemainingSessionSeconds(currentUser.demoExpiresAt);
    if (
      currentUser.role !== "user" ||
      currentUser.isDemoInteraction !== true ||
      typeof currentUser.demoSessionId !== "string" ||
      !currentUser.demoSessionId ||
      remainingSeconds <= 0
    ) return error("관리자 데모로 전환할 수 없습니다.", 403);

    const admin = await db.collection("users").findOne({
      demoSeedKey: PORTFOLIO_DEMO_ADMIN_SEED_KEY,
      isDemoData: true,
    });
    if (!admin || admin.isDeleted === true || admin.isSuspended === true || !isAdminRole(admin.role)) {
      return error("관리자 데모를 사용할 수 없습니다.", 503);
    }

    const accessMaxAge = Math.min(ACCESS_TOKEN_EXPIRES_IN, remainingSeconds);
    const refreshMaxAge = Math.min(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds);
    const context = {
      portfolioDemoTour: true as const,
      demoCustomerSub: currentUser._id.toString(),
      demoSessionId: currentUser.demoSessionId,
      demoExpiresAt: new Date(currentUser.demoExpiresAt).toISOString(),
    };
    const response = NextResponse.json({ success: true });
    response.cookies.set("accessToken", jwt.sign({ sub: admin._id.toString(), email: admin.email, role: admin.role, portfolioDemoTour: true }, ACCESS_TOKEN_SECRET, { expiresIn: accessMaxAge }), { ...baseCookie, maxAge: accessMaxAge });
    response.cookies.set("refreshToken", jwt.sign({ sub: admin._id.toString(), ...context }, REFRESH_TOKEN_SECRET, { expiresIn: refreshMaxAge }), { ...baseCookie, maxAge: refreshMaxAge });
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""), { ...baseCookie, httpOnly: false, maxAge: refreshMaxAge });
    return response;
  }

  const refreshToken = req.headers.get("cookie")?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
  let context = null;
  try {
    context = refreshToken
      ? getPortfolioDemoTourContext(jwt.verify(decodeURIComponent(refreshToken), REFRESH_TOKEN_SECRET) as JwtPayload)
      : null;
  } catch {}
  if (!context || access.portfolioDemoTour !== true || context.sub !== currentUser._id.toString()) {
    return error("고객 데모로 전환할 수 없습니다.", 403);
  }
  if (currentUser.demoSeedKey !== PORTFOLIO_DEMO_ADMIN_SEED_KEY || currentUser.isDemoData !== true || !isAdminRole(currentUser.role)) {
    return error("고객 데모로 전환할 수 없습니다.", 403);
  }
  const customerId = getObjectId(context.demoCustomerSub);
  const customer = customerId ? await db.collection("users").findOne({ _id: customerId }) : null;
  const remainingSeconds = getPortfolioDemoRemainingSessionSeconds(customer?.demoExpiresAt);
  if (!customer || customer.role !== "user" || customer.isDemoInteraction !== true || customer.demoSessionId !== context.demoSessionId || !portfolioDemoExpiryMatches(customer.demoExpiresAt, context.demoExpiresAt) || customer.isDeleted === true || customer.isSuspended === true || remainingSeconds <= 0) {
    return error("고객 데모 세션이 만료되었거나 유효하지 않습니다.", 401);
  }
  const response = NextResponse.json({ success: true });
  setCustomerCookies(response, customer, remainingSeconds);
  return response;
}
