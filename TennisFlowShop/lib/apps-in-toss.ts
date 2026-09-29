import { NextResponse } from "next/server";

const APPS_IN_TOSS_ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dokkaebitennis.private-apps.tossmini.com",
  "https://dokkaebitennis.apps.tossmini.com",
]);

type AppsInTossCorsOptions = {
  methods?: readonly string[];
  headers?: readonly string[];
};

const DEFAULT_METHODS = ["GET", "OPTIONS"] as const;

const DEFAULT_HEADERS = ["Content-Type", "Accept"] as const;

export function isAppsInTossAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin && APPS_IN_TOSS_ALLOWED_ORIGINS.has(origin));
}

export function applyAppsInTossCors(
  response: NextResponse,
  origin: string | null,
  options: AppsInTossCorsOptions = {},
): NextResponse {
  if (!isAppsInTossAllowedOrigin(origin)) {
    return response;
  }

  const methods = options.methods ?? DEFAULT_METHODS;

  const headers = options.headers ?? DEFAULT_HEADERS;

  response.headers.set("Access-Control-Allow-Origin", origin);

  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));

  response.headers.set("Access-Control-Allow-Headers", headers.join(", "));

  response.headers.set("Vary", "Origin");

  return response;
}

export function createAppsInTossPreflightResponse(
  origin: string | null,
  options: AppsInTossCorsOptions = {},
): NextResponse {
  const response = new NextResponse(null, {
    status: 204,
  });

  return applyAppsInTossCors(response, origin, options);
}
