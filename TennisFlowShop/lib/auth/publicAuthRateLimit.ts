import { createHash } from "crypto";

import { NextResponse } from "next/server";
import type { Db } from "mongodb";

import { getDb } from "@/lib/mongodb";

const AUTH_RATE_LIMIT_COLLECTION = "auth_rate_limit_windows";
const TOO_MANY_REQUESTS_MESSAGE = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

export type PublicAuthRouteId = "login" | "register" | "oauth_complete";

type PublicAuthRateLimitPolicy = {
  limit: number;
  windowSec: number;
};

type RoutePolicy = {
  ip: PublicAuthRateLimitPolicy;
  identifier?: PublicAuthRateLimitPolicy;
};

export const AUTH_RATE_LIMIT_POLICIES: Record<PublicAuthRouteId, RoutePolicy> = {
  login: {
    ip: { limit: 10, windowSec: 60 * 10 },
    identifier: { limit: 5, windowSec: 60 * 10 },
  },
  register: {
    ip: { limit: 5, windowSec: 60 * 30 },
    identifier: { limit: 3, windowSec: 60 * 30 },
  },
  oauth_complete: {
    ip: { limit: 10, windowSec: 60 * 10 },
    identifier: { limit: 5, windowSec: 60 * 10 },
  },
};

type RateLimitScope = "ip" | "email" | "token";

type EnforcePublicAuthRateLimitInput = {
  routeId: PublicAuthRouteId;
  scope: RateLimitScope;
  value: string;
  policy: PublicAuthRateLimitPolicy;
  db?: Db;
};

type AuthRateLimitWindowDoc = {
  _id: string;
  routeId: PublicAuthRouteId;
  key: string;
  scope: RateLimitScope;
  windowStart: Date;
  expireAt: Date;
  count: number;
  createdAt: Date;
  updatedAt: Date;
};

function buildTooManyRequestsResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      ok: false,
      error: "too_many_requests",
      message: TOO_MANY_REQUESTS_MESSAGE,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown-ip";
}

export function normalizeRateLimitIdentifier(scope: Extract<RateLimitScope, "email" | "token">, value: string) {
  const trimmed = value.trim();
  if (scope === "email") return trimmed.toLowerCase();
  return trimmed;
}

function hashKeyValue(raw: string) {
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function buildScopeKey(scope: RateLimitScope, value: string) {
  if (scope === "ip") return `ip:${value || "unknown-ip"}`;
  return `${scope}:h:${hashKeyValue(value)}`;
}

export async function enforcePublicAuthRateLimit({
  routeId,
  scope,
  value,
  policy,
  db,
}: EnforcePublicAuthRateLimitInput) {
  const targetDb = db ?? (await getDb());
  const nowMs = Date.now();
  const windowMs = policy.windowSec * 1000;
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowEndMs = windowStartMs + windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));

  const key = buildScopeKey(scope, value);
  const docId = `${routeId}:${key}:${windowStartMs}`;
  const now = new Date(nowMs);

  const result = await targetDb
    .collection<AuthRateLimitWindowDoc>(AUTH_RATE_LIMIT_COLLECTION)
    .findOneAndUpdate(
      { _id: docId },
      {
        $setOnInsert: {
          routeId,
          key,
          scope,
          windowStart: new Date(windowStartMs),
          expireAt: new Date(windowEndMs + windowMs),
          createdAt: now,
        },
        $inc: { count: 1 },
        $set: { updatedAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );

  const count = Number(result?.count ?? 0);
  if (count > policy.limit) {
    return buildTooManyRequestsResponse(retryAfterSec);
  }

  return null;
}
