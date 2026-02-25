import { NextResponse } from 'next/server';
import type { Db } from 'mongodb';
import { logInfo } from '@/lib/logger';
import type { AdminEndpointCostPolicy } from '@/lib/admin/adminEndpointCostPolicy';

const RATE_LIMIT_COLLECTION = 'admin_rate_limit_windows';

type RateLimitWindowDoc = {
  _id: string;
  endpointKey: string;
  category: string;
  costGrade: string;
  adminId: string;
  ip: string;
  windowStart: Date;
  windowEnd: Date;
  count: number;
  createdAt: Date;
  updatedAt: Date;
};

function resolveClientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  const xRealIp = req.headers.get('x-real-ip')?.trim();
  if (xRealIp) return xRealIp;
  return 'unknown-ip';
}

function build429Response(policy: AdminEndpointCostPolicy, retryAfterSec: number) {
  const res = NextResponse.json(
    {
      ok: false,
      error: {
        code: 'rate_limited',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      },
    },
    { status: 429 },
  );

  res.headers.set('Retry-After', String(retryAfterSec));
  res.headers.set('X-RateLimit-Limit', String(policy.maxRequests));
  return res;
}

export async function enforceAdminRateLimit(req: Request, db: Db, adminId: string, policy: AdminEndpointCostPolicy) {
  const now = Date.now();
  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const windowEnd = windowStart + policy.windowMs;
  const ip = resolveClientIp(req);
  const key = `${policy.endpointKey}:${adminId}:${ip}:${windowStart}`;

  const result = await db.collection<RateLimitWindowDoc>(RATE_LIMIT_COLLECTION).findOneAndUpdate(
    { _id: key },
    {
      $setOnInsert: {
        endpointKey: policy.endpointKey,
        category: policy.category,
        costGrade: policy.costGrade,
        adminId,
        ip,
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
        createdAt: new Date(now),
      },
      $inc: { count: 1 },
      $set: { updatedAt: new Date(now) },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const count = Number(result?.count ?? 1);
  const remaining = Math.max(policy.maxRequests - count, 0);
  const retryAfterSec = Math.max(1, Math.ceil((windowEnd - now) / 1000));

  if (count > policy.maxRequests) {
    logInfo({
      msg: 'admin.rate_limit.exceeded',
      path: new URL(req.url).pathname,
      method: (req as any).method ?? null,
      status: 429,
      userId: adminId,
      extra: {
        endpointKey: policy.endpointKey,
        category: policy.category,
        ip,
        count,
        limit: policy.maxRequests,
        windowStart,
        windowEnd,
        retryAfterSec,
      },
    });
    return build429Response(policy, retryAfterSec);
  }

  // 운영 대시보드에서 소진 임계치를 볼 수 있도록 80% 이상 사용 시점도 이벤트로 남긴다.
  if (count >= Math.ceil(policy.maxRequests * 0.8)) {
    logInfo({
      msg: 'admin.rate_limit.near_limit',
      path: new URL(req.url).pathname,
      method: (req as any).method ?? null,
      userId: adminId,
      extra: {
        endpointKey: policy.endpointKey,
        category: policy.category,
        ip,
        count,
        limit: policy.maxRequests,
        remaining,
      },
    });
  }

  return null;
}
