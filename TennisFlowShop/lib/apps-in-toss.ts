import { NextResponse } from "next/server";

const APPS_IN_TOSS_ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dokkaebitennis.private-apps.tossmini.com",
  "https://dokkaebitennis.apps.tossmini.com",
]);

export function isAppsInTossAllowedOrigin(
  origin: string | null,
): origin is string {
  return Boolean(origin && APPS_IN_TOSS_ALLOWED_ORIGINS.has(origin));
}

export function applyAppsInTossCors(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  if (!isAppsInTossAllowedOrigin(origin)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  response.headers.set("Vary", "Origin");

  return response;
}

export function createAppsInTossPreflightResponse(
  origin: string | null,
): NextResponse {
  const response = new NextResponse(null, {
    status: 204,
  });

  return applyAppsInTossCors(response, origin);
}
