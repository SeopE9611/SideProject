import { Db, ObjectId } from 'mongodb';
import { appendAudit, parseClientMeta } from '@/lib/audit';

type JsonLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export type AdminAuditPayload = {
  type: string;
  actorId?: ObjectId | string | null;
  targetId?: ObjectId | string | null;
  message: string;
  diff?: JsonLike;
};

export type AdminAuditRetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

const DEFAULT_RETRY_POLICY: AdminAuditRetryPolicy = {
  maxRetries: 8,
  baseDelayMs: 30_000,
  maxDelayMs: 60 * 60 * 1000,
};

function resolveRequestId(req?: Request): string | null {
  if (!req) return null;
  const value =
    req.headers.get('x-request-id') ??
    req.headers.get('x-correlation-id') ??
    req.headers.get('cf-ray') ??
    req.headers.get('x-amzn-trace-id');

  if (!value) return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 120) : null;
}

function normalizeObjectId(value?: ObjectId | string | null): ObjectId | string | undefined {
  if (!value) return undefined;
  if (value instanceof ObjectId) return value;
  const raw = String(value).trim();
  if (!raw) return undefined;
  return ObjectId.isValid(raw) ? new ObjectId(raw) : raw;
}

function calcNextRetryAt(retryCount: number, policy: AdminAuditRetryPolicy): Date {
  const exp = Math.max(0, retryCount - 1);
  const delay = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** exp);
  return new Date(Date.now() + delay);
}

async function enqueueAdminAuditRetry(db: Db, req: Request | undefined, payload: AdminAuditPayload, error: unknown, policy: AdminAuditRetryPolicy) {
  const clientMeta = parseClientMeta(req);
  await db.collection('admin_audit_retry_queue').insertOne({
    status: 'queued',
    retryCount: 0,
    maxRetries: policy.maxRetries,
    nextRetryAt: calcNextRetryAt(1, policy),
    lastError: error instanceof Error ? error.message : String(error),
    requestId: resolveRequestId(req),
    payload: {
      type: payload.type,
      actorId: normalizeObjectId(payload.actorId) ?? null,
      targetId: normalizeObjectId(payload.targetId) ?? null,
      message: payload.message,
      diff: payload.diff ?? null,
      ip: clientMeta.ip,
      ua: clientMeta.ua,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * 관리자 감사로그 표준 진입점.
 *
 * 실패해도 본 처리 성공을 가리지 않기 위해 예외를 삼키고,
 * 별도 재시도 큐(admin_audit_retry_queue)에 적재한다.
 */
export async function appendAdminAudit(db: Db, payload: AdminAuditPayload, req?: Request, retryPolicy: Partial<AdminAuditRetryPolicy> = {}) {
  const policy: AdminAuditRetryPolicy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
  const requestId = resolveRequestId(req);

  try {
    await appendAudit(
      db,
      {
        type: payload.type,
        actorId: normalizeObjectId(payload.actorId),
        targetId: normalizeObjectId(payload.targetId),
        message: payload.message,
        diff: payload.diff ?? null,
        requestId,
      },
      req,
    );
  } catch (error) {
    console.error('[appendAdminAudit] write failed. fallback queue enqueue start', error);
    try {
      await enqueueAdminAuditRetry(db, req, payload, error, policy);
      console.error('[appendAdminAudit] fallback queue enqueue done');
    } catch (queueError) {
      console.error('[appendAdminAudit] fallback queue enqueue failed', queueError);
    }
  }
}

export const ADMIN_AUDIT_RETRY_POLICY = DEFAULT_RETRY_POLICY;
