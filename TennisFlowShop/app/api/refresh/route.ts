import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt, { type JwtPayload } from "jsonwebtoken";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "@/lib/constants";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { baseCookie } from "@/lib/cookieOptions";
import { ADMIN_CSRF_COOKIE_KEY } from "@/lib/admin/adminCsrf";
import { isAdminRole } from "@/lib/admin/roles";
import {
  getPortfolioDemoRemainingSessionSeconds,
  isPortfolioDemo,
} from "@/lib/portfolio-demo/interactive.server";
import {
  getPortfolioDemoTourContext,
  portfolioDemoExpiryMatches,
  PORTFOLIO_DEMO_ADMIN_SEED_KEY,
} from "@/lib/portfolio-demo/tour.server";

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("accessToken", "", { ...baseCookie, maxAge: 0 });
  response.cookies.set("refreshToken", "", { ...baseCookie, maxAge: 0 });
  response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
  return response;
}

function demoSessionFailure() {
  return clearAuthCookies(NextResponse.json({
    code: "PORTFOLIO_DEMO_SESSION_EXPIRED",
    message: "데모 체험 세션이 만료되었습니다. 다시 데모 체험을 시작해주세요.",
  }, { status: 401 }));
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  if (!refreshToken) return NextResponse.json({ error: "Refresh Token 없음" }, { status: 401 });

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as JwtPayload;
  } catch {
    return NextResponse.json({ error: "Refresh Token 만료 또는 변조됨" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db();

  // Tour marker가 있는 토큰은 어떤 검증 실패에서도 일반 관리자 refresh로 폴백하지 않는다.
  if (decoded.portfolioDemoTour === true) {
    const context = getPortfolioDemoTourContext(decoded);
    if (!isPortfolioDemo() || !context || !ObjectId.isValid(context.sub) || !ObjectId.isValid(context.demoCustomerSub)) {
      return demoSessionFailure();
    }
    const [admin, customer] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(context.sub) }),
      db.collection("users").findOne({ _id: new ObjectId(context.demoCustomerSub) }),
    ]);
    const remainingSeconds = getPortfolioDemoRemainingSessionSeconds(customer?.demoExpiresAt);
    if (
      !admin || admin.demoSeedKey !== PORTFOLIO_DEMO_ADMIN_SEED_KEY || admin.isDemoData !== true ||
      !isAdminRole(admin.role) || admin.isDeleted === true || admin.isSuspended === true ||
      !customer || customer.role !== "user" || customer.isDemoInteraction !== true ||
      customer.demoSessionId !== context.demoSessionId ||
      !portfolioDemoExpiryMatches(customer.demoExpiresAt, context.demoExpiresAt) ||
      customer.isDeleted === true || customer.isSuspended === true || remainingSeconds <= 0
    ) return demoSessionFailure();

    const accessMaxAge = Math.min(ACCESS_TOKEN_EXPIRES_IN, remainingSeconds);
    const refreshMaxAge = Math.min(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds);
    const newAccessToken = jwt.sign({ sub: admin._id.toString(), email: admin.email, role: admin.role, portfolioDemoTour: true }, ACCESS_TOKEN_SECRET, { expiresIn: accessMaxAge });
    const newRefreshToken = jwt.sign({
      sub: admin._id.toString(),
      portfolioDemoTour: true,
      demoCustomerSub: context.demoCustomerSub,
      demoSessionId: context.demoSessionId,
      demoExpiresAt: context.demoExpiresAt,
    }, REFRESH_TOKEN_SECRET, { expiresIn: refreshMaxAge });
    const response = NextResponse.json({ success: true });
    response.cookies.set("accessToken", newAccessToken, { ...baseCookie, maxAge: accessMaxAge });
    response.cookies.set("refreshToken", newRefreshToken, { ...baseCookie, maxAge: refreshMaxAge });
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""), { ...baseCookie, httpOnly: false, maxAge: refreshMaxAge });
    return response;
  }

  if (typeof decoded.sub !== "string" || !ObjectId.isValid(decoded.sub)) {
    return clearAuthCookies(NextResponse.json({ error: "Invalid Refresh Token" }, { status: 403 }));
  }
  const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.sub) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.isDeleted) return clearAuthCookies(NextResponse.json({ message: "unauthorized" }, { status: 401 }));
  if (user.isSuspended) {
    const response = NextResponse.json({ message: "suspended" }, { status: 403 });
    response.cookies.set("accessToken", "", { ...baseCookie, maxAge: 0 });
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
    return response;
  }

  let accessMaxAge = ACCESS_TOKEN_EXPIRES_IN;
  let refreshMaxAge = REFRESH_TOKEN_EXPIRES_IN;
  if (user.isDemoInteraction === true) {
    const remainingSeconds = getPortfolioDemoRemainingSessionSeconds(user.demoExpiresAt);
    if (remainingSeconds <= 0) return demoSessionFailure();
    accessMaxAge = Math.min(ACCESS_TOKEN_EXPIRES_IN, remainingSeconds);
    refreshMaxAge = Math.min(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds);
  }

  const newAccessToken = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: accessMaxAge });
  const newRefreshToken = jwt.sign({ sub: decoded.sub }, REFRESH_TOKEN_SECRET, { expiresIn: refreshMaxAge });
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set("accessToken", newAccessToken, { ...baseCookie, maxAge: accessMaxAge });
  response.cookies.set("refreshToken", newRefreshToken, { ...baseCookie, maxAge: refreshMaxAge });
  if (isAdminRole(user.role)) {
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""), { ...baseCookie, httpOnly: false, maxAge: refreshMaxAge });
  } else {
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
  }
  return response;
}
