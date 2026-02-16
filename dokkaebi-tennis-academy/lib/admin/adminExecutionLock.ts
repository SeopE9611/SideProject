import type { Db } from 'mongodb';
import { logInfo } from '@/lib/logger';

const LOCK_COLLECTION = 'admin_execution_locks';

type AdminExecutionLockDoc = {
  _id: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  meta?: Record<string, unknown>;
};

type AcquireLockParams = {
  db: Db;
  lockKey: string;
  owner: string;
  ttlMs: number;
  meta?: Record<string, unknown>;
};

export async function acquireAdminExecutionLock(params: AcquireLockParams) {
  const { db, lockKey, owner, ttlMs, meta } = params;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  const coll = db.collection<AdminExecutionLockDoc>(LOCK_COLLECTION);
  const existing = await coll.findOne({ _id: lockKey });

  if (!existing) {
    try {
      await coll.insertOne({ _id: lockKey, owner, createdAt: now, updatedAt: now, expiresAt, meta: meta ?? {} });
      logInfo({ msg: 'admin.execution_lock.acquired', userId: owner, extra: { lockKey, ttlMs, mode: 'insert' } });
      return { ok: true as const, expiresAt };
    } catch {
      // 동시 요청 경쟁으로 insert가 실패하면 아래 갱신 경로에서 재시도
    }
  }

  const takeover = await coll.findOneAndUpdate(
    {
      _id: lockKey,
      expiresAt: { $lte: now },
    },
    {
      $set: {
        owner,
        updatedAt: now,
        expiresAt,
        meta: meta ?? {},
      },
      $setOnInsert: { createdAt: now },
    },
    { returnDocument: 'after' },
  );

  if (takeover) {
    logInfo({ msg: 'admin.execution_lock.acquired', userId: owner, extra: { lockKey, ttlMs, mode: 'takeover' } });
    return { ok: true as const, expiresAt };
  }

  logInfo({ msg: 'admin.execution_lock.blocked', userId: owner, extra: { lockKey, holder: existing?.owner ?? null, holderExpiresAt: existing?.expiresAt ?? null } });
  return { ok: false as const };
}

export async function releaseAdminExecutionLock(db: Db, lockKey: string, owner: string) {
  await db.collection<AdminExecutionLockDoc>(LOCK_COLLECTION).deleteOne({ _id: lockKey, owner });
  logInfo({ msg: 'admin.execution_lock.released', userId: owner, extra: { lockKey } });
}
