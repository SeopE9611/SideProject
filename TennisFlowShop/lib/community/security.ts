import { createHash, randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getDb } from '@/lib/mongodb';

export const COMMUNITY_CSRF_HEADER = 'x-community-csrf-token';
export const COMMUNITY_CSRF_COOKIE = 'communityCsrfToken';

type CsrfFailCode =
  | 'csrf_missing_token'
  | 'csrf_token_mismatch'
  | 'csrf_invalid_origin'
  | 'csrf_invalid_referer'
  | 'csrf_invalid_fetch_site';

export type CommunityRateLimitPolicy = {
  routeId: 'community_report' | 'community_like' | 'community_view';
  windowSec: number;
  perUserLimit: number;
  perIpLimit: number;
};

export const COMMUNITY_RATE_LIMIT_POLICIES: Record<CommunityRateLimitPolicy['routeId'], CommunityRateLimitPolicy> = {
  community_report: {
    routeId: 'community_report',
    windowSec: 60,
    perUserLimit: 5,
    perIpLimit: 20,
  },
  community_like: {
    routeId: 'community_like',
    windowSec: 60,
    perUserLimit: 60,
    perIpLimit: 120,
  },
  community_view: {
    routeId: 'community_view',
    windowSec: 60,
    perUserLimit: 120,
    perIpLimit: 240,
  },
};

function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '';

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '';
}

function buildOriginAllowlist(req: NextRequest) {
  const allowlist = new Set<string>();

  const host = req.headers.get('host')?.trim();
  if (host) {
    allowlist.add(`https://${host}`);
    allowlist.add(`http://${host}`);
  }

  for (const origin of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXTAUTH_URL]) {
    if (!origin) continue;
    try {
      allowlist.add(new URL(origin).origin);
    } catch {}
  }

  return allowlist;
}

function failCsrfResponse(code: CsrfFailCode, status = 403) {
  return NextResponse.json(
    {
      ok: false,
      error: code,
      security: {
        code,
        category: 'csrf',
      },
    },
    { status },
  );
}

/**
 * 커뮤니티/게시판 mutating API 공통 CSRF 검증
 * 1) Sec-Fetch-Site 기반 same-site 정책
 * 2) Origin/Referer 검증
 * 3) Double Submit Cookie 토큰 검증
 */
export function verifyCommunityCsrf(req: NextRequest) {
  const fetchSite = (req.headers.get('sec-fetch-site') ?? '').trim().toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return {
      ok: false as const,
      code: 'csrf_invalid_fetch_site' as const,
      response: failCsrfResponse('csrf_invalid_fetch_site'),
    };
  }

  const allowlist = buildOriginAllowlist(req);

  const originRaw = req.headers.get('origin')?.trim() ?? '';
  if (originRaw) {
    try {
      const requestOrigin = new URL(originRaw).origin;
      if (!allowlist.has(requestOrigin)) {
        return {
          ok: false as const,
          code: 'csrf_invalid_origin' as const,
          response: failCsrfResponse('csrf_invalid_origin'),
        };
      }
    } catch {
      return {
        ok: false as const,
        code: 'csrf_invalid_origin' as const,
        response: failCsrfResponse('csrf_invalid_origin'),
      };
    }
  }

  const refererRaw = req.headers.get('referer')?.trim() ?? '';
  if (refererRaw) {
    try {
      const refererOrigin = new URL(refererRaw).origin;
      if (!allowlist.has(refererOrigin)) {
        return {
          ok: false as const,
          code: 'csrf_invalid_referer' as const,
          response: failCsrfResponse('csrf_invalid_referer'),
        };
      }
    } catch {
      return {
        ok: false as const,
        code: 'csrf_invalid_referer' as const,
        response: failCsrfResponse('csrf_invalid_referer'),
      };
    }
  }

  const headerToken = req.headers.get(COMMUNITY_CSRF_HEADER)?.trim() ?? '';
  const cookieToken = req.cookies.get(COMMUNITY_CSRF_COOKIE)?.value?.trim() ?? '';

  if (!headerToken || !cookieToken) {
    const response = failCsrfResponse('csrf_missing_token');
    if (!cookieToken) {
      response.cookies.set(COMMUNITY_CSRF_COOKIE, randomUUID(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return {
      ok: false as const,
      code: 'csrf_missing_token' as const,
      response,
    };
  }

  if (headerToken !== cookieToken) {
    return {
      ok: false as const,
      code: 'csrf_token_mismatch' as const,
      response: failCsrfResponse('csrf_token_mismatch'),
    };
  }

  return { ok: true as const };
}

export function ensureCommunityCsrfCookie(res: NextResponse, req: NextRequest) {
  const existing = req.cookies.get(COMMUNITY_CSRF_COOKIE)?.value?.trim();
  if (existing) return;

  res.cookies.set(COMMUNITY_CSRF_COOKIE, randomUUID(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

function buildRateLimitResponse(policy: CommunityRateLimitPolicy, retryAfterSec: number, scope: 'user' | 'ip') {
  return NextResponse.json(
    {
      ok: false,
      error: 'too_many_requests',
      security: {
        code: 'rate_limited',
        category: 'rate_limit',
        routeId: policy.routeId,
        scope,
        retryAfterSec,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    },
  );
}

async function consumeRateLimitWindow(key: string, policy: CommunityRateLimitPolicy, limit: number) {
  const db = await getDb();
  const col = db.collection('community_rate_limit_windows');

  const now = new Date();
  const windowStartMs = Math.floor(now.getTime() / (policy.windowSec * 1000)) * policy.windowSec * 1000;
  const windowStart = new Date(windowStartMs);

  const result = await col.findOneAndUpdate(
    {
      key,
      routeId: policy.routeId,
      windowStart,
    },
    {
      $setOnInsert: {
        key,
        routeId: policy.routeId,
        windowStart,
        expireAt: new Date(windowStartMs + policy.windowSec * 2000),
      },
      $inc: { count: 1 },
      $set: { updatedAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const count = Number(result?.count ?? 0);
  const windowEndMs = windowStartMs + policy.windowSec * 1000;
  const retryAfterSec = Math.max(1, Math.ceil((windowEndMs - now.getTime()) / 1000));

  return { limited: count > limit, retryAfterSec };
}

export async function enforceCommunityRateLimit(params: {
  req: NextRequest;
  policy: CommunityRateLimitPolicy;
  userId?: string | null;
}) {
  const { req, policy, userId } = params;

  if (userId) {
    const userResult = await consumeRateLimitWindow(`user:${policy.routeId}:${userId}`, policy, policy.perUserLimit);
    if (userResult.limited) {
      return {
        ok: false as const,
        scope: 'user' as const,
        response: buildRateLimitResponse(policy, userResult.retryAfterSec, 'user'),
      };
    }
  }

  const ip = getClientIp(req);
  const ipKeySource = ip || 'unknown';
  const ipHash = createHash('sha256').update(ipKeySource).digest('hex').slice(0, 16);

  const ipResult = await consumeRateLimitWindow(`ip:${policy.routeId}:${ipHash}`, policy, policy.perIpLimit);
  if (ipResult.limited) {
    return {
      ok: false as const,
      scope: 'ip' as const,
      response: buildRateLimitResponse(policy, ipResult.retryAfterSec, 'ip'),
    };
  }

  return { ok: true as const };
}
