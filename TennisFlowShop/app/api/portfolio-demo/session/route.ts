import { ADMIN_CSRF_COOKIE_KEY } from "@/lib/admin/adminCsrf";
import { ACCESS_TOKEN_EXPIRES_IN, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN, REFRESH_TOKEN_SECRET } from "@/lib/constants";
import { baseCookie } from "@/lib/cookieOptions";
import { getDb } from "@/lib/mongodb";
import { cleanupExpiredPortfolioDemoInteractions, createPortfolioDemoInteractionMeta, isPortfolioDemo } from "@/lib/portfolio-demo/interactive.server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isPortfolioDemo()) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const db = await getDb();
  await cleanupExpiredPortfolioDemoInteractions(db);
  const demoSessionId = crypto.randomUUID();
  const suffix = demoSessionId.replace(/-/g, "").slice(0, 16);
  const meta = createPortfolioDemoInteractionMeta(demoSessionId);
  const user = {
    name: "데모 체험 사용자",
    email: `portfolio-demo-${suffix}@example.com`,
    phone: `010-0000-${suffix.slice(0, 4)}`,
    role: "user" as const,
    isDeleted: false,
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...meta,
  };
  const inserted = await db.collection("users").insertOne(user);
  const sub = inserted.insertedId.toString();
  const accessToken = jwt.sign({ sub, email: user.email, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  const response = NextResponse.json({ success: true, userId: sub });
  response.cookies.set("accessToken", accessToken, { ...baseCookie, maxAge: ACCESS_TOKEN_EXPIRES_IN });
  response.cookies.set("refreshToken", refreshToken, { ...baseCookie, maxAge: REFRESH_TOKEN_EXPIRES_IN });
  response.cookies.set(ADMIN_CSRF_COOKIE_KEY, "", { ...baseCookie, httpOnly: false, maxAge: 0 });
  return response;
}
