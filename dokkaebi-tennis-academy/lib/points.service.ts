// lib/points.service.ts
//
// 포인트(적립금) "원장" + users.pointsBalance(캐시) 갱신 유틸
// - 1차 단계에서는 주로 조회 API(/api/points/...)에서 사용
// - 2차 단계(관리자 지급/차감), 3~5차(리뷰 적립/결제 적립/결제 사용)에서 재사용

import type { Db, ObjectId } from 'mongodb';
import { ObjectId as OID } from 'mongodb';
import type { PointTransaction, PointTransactionStatus, PointTransactionType } from '@/lib/types/points';

type GrantParams = {
  userId: ObjectId;
  amount: number; // +값
  type: PointTransactionType;
  status?: PointTransactionStatus;
  refKey?: string;
  ref?: PointTransaction['ref'];
  reason?: string;
};

type DeductParams = {
  userId: ObjectId;
  amount: number; // +값(차감량). 실제 트랜잭션 amount는 -로 기록
  type: PointTransactionType;
  status?: PointTransactionStatus;
  refKey?: string;
  ref?: PointTransaction['ref'];
  reason?: string;
  allowNegativeBalance?: boolean;
};

function asSafeInt(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  // 포인트는 원 단위 정수로 관리(소수점 금지)
  return Math.trunc(v);
}

export async function getPointsBalance(db: Db, userId: ObjectId): Promise<number> {
  const users = db.collection('users');
  const u = await users.findOne({ _id: userId as any }, { projection: { pointsBalance: 1 } as any });
  const bal = (u as any)?.pointsBalance;
  return typeof bal === 'number' && Number.isFinite(bal) ? bal : 0;
}

export async function grantPoints(db: Db, params: GrantParams) {
  const now = new Date();
  const amount = asSafeInt(params.amount);
  if (amount <= 0) throw Object.assign(new Error('INVALID_AMOUNT'), { code: 'INVALID_AMOUNT' });

  const txCol = db.collection<PointTransaction>('points_transactions');
  const users = db.collection('users');

  const tx: PointTransaction = {
    _id: new OID(),
    userId: params.userId as any,
    amount,
    type: params.type,
    status: params.status ?? 'confirmed',
    ...(params.refKey ? { refKey: params.refKey } : {}),
    ...(params.ref ? { ref: params.ref } : {}),
    ...(params.reason ? { reason: params.reason } : {}),
    createdAt: now,
  };

  // 1) 원장 기록(중복 지급은 unique index가 차단)
  await txCol.insertOne(tx);

  // 2) 사용자 잔액 캐시 증가
  const res = await users.updateOne({ _id: params.userId as any }, { $inc: { pointsBalance: amount }, $set: { updatedAt: now } });

  if (res.matchedCount === 0) {
    // 사용자 없으면 원장 롤백 시도
    try {
      await txCol.deleteOne({ _id: tx._id } as any);
    } catch (e) {
      console.error('[points] rollback failed (user not found)', e);
    }
    throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
  }

  return { transactionId: tx._id.toString(), amount };
}

export async function deductPoints(db: Db, params: DeductParams) {
  const now = new Date();
  const amount = asSafeInt(params.amount);
  if (amount <= 0) throw Object.assign(new Error('INVALID_AMOUNT'), { code: 'INVALID_AMOUNT' });

  const txCol = db.collection<PointTransaction>('points_transactions');
  const users = db.collection('users');

  // 1) 원장 기록(차감은 amount를 음수로 기록)
  const tx: PointTransaction = {
    _id: new OID(),
    userId: params.userId as any,
    amount: -amount,
    type: params.type,
    status: params.status ?? 'confirmed',
    ...(params.refKey ? { refKey: params.refKey } : {}),
    ...(params.ref ? { ref: params.ref } : {}),
    ...(params.reason ? { reason: params.reason } : {}),
    createdAt: now,
  };

  await txCol.insertOne(tx);

  // 2) 잔액 차감 (기본은 잔액 부족 시 실패)
  const filter: any = { _id: params.userId as any };

  if (!params.allowNegativeBalance) {
    // pointsBalance가 없으면 0으로 취급하여 비교
    filter.$expr = { $gte: [{ $ifNull: ['$pointsBalance', 0] }, amount] };
  }

  const res = await users.updateOne(filter, { $inc: { pointsBalance: -amount }, $set: { updatedAt: now } });

  if (res.matchedCount === 0 || res.modifiedCount === 0) {
    // 잔액 부족/사용자 없음 등으로 차감 실패 → 원장 롤백
    try {
      await txCol.deleteOne({ _id: tx._id } as any);
    } catch (e) {
      console.error('[points] rollback failed (deduct)', e);
    }

    throw Object.assign(new Error('INSUFFICIENT_POINTS'), { code: 'INSUFFICIENT_POINTS' });
  }

  return { transactionId: tx._id.toString(), amount: -amount };
}

export async function listPointTransactions(db: Db, userId: ObjectId, opts: { page: number; limit: number }): Promise<{ total: number; docs: PointTransaction[] }> {
  const page = Number.isFinite(opts.page) && opts.page > 0 ? opts.page : 1;
  const limitRaw = Number.isFinite(opts.limit) ? opts.limit : 20;
  const limit = limitRaw > 0 && limitRaw <= 50 ? limitRaw : 20;
  const skip = (page - 1) * limit;

  const txCol = db.collection<PointTransaction>('points_transactions');
  const filter = { userId: userId as any };

  const total = await txCol.countDocuments(filter as any);
  const docs = await txCol
    .find(filter as any, { projection: { userId: 0 } as any })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return { total, docs };
}
