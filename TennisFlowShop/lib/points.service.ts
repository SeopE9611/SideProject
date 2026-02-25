// 포인트(적립금) "원장" + users.pointsBalance(캐시) 갱신 유틸
// - 1차 단계에서는 주로 조회 API(/api/points/...)에서 사용
// - 2차 단계(관리자 지급/차감), 3~5차(리뷰 적립/결제 적립/결제 사용)에서 재사용

import type { ClientSession, Db, ObjectId } from 'mongodb';
import { ObjectId as OID } from 'mongodb';
import type { PointTransaction, PointTransactionStatus, PointTransactionType } from '@/lib/types/points';

type MongoSessionOptions = { session?: ClientSession };

function isDuplicateKeyError(e: any) {
  return e?.code === 11000 || /E11000 duplicate key/i.test(String(e?.message ?? ''));
}

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

export async function getPointsSummary(db: Db, userId: ObjectId): Promise<{ balance: number; debt: number; available: number }> {
  const users = db.collection('users');
  const u = await users.findOne({ _id: userId as any }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });

  const balanceRaw = (u as any)?.pointsBalance;
  const debtRaw = (u as any)?.pointsDebt;

  const balance = typeof balanceRaw === 'number' && Number.isFinite(balanceRaw) ? Math.trunc(balanceRaw) : 0;
  const debt = typeof debtRaw === 'number' && Number.isFinite(debtRaw) ? Math.trunc(debtRaw) : 0;

  const available = Math.max(0, balance - debt);

  return { balance, debt, available };
}

export async function getPointsState(db: Db, userId: ObjectId): Promise<{ balance: number; debt: number }> {
  const users = db.collection('users');
  const u = await users.findOne({ _id: userId as any }, { projection: { pointsBalance: 1, pointsDebt: 1 } as any });
  const balRaw = (u as any)?.pointsBalance;
  const debtRaw = (u as any)?.pointsDebt;

  const balance = typeof balRaw === 'number' && Number.isFinite(balRaw) ? Math.max(0, Math.trunc(balRaw)) : 0;
  const debt = typeof debtRaw === 'number' && Number.isFinite(debtRaw) ? Math.max(0, Math.trunc(debtRaw)) : 0;

  return { balance, debt };
}

export async function grantPoints(db: Db, params: GrantParams, opts: MongoSessionOptions = {}) {
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
  try {
    await txCol.insertOne(tx, { session: opts.session });
  } catch (e: any) {
    // refKey(+유니크 인덱스) 기반 멱등 호출이면 '이미 반영된 것'으로 간주하고 정상 처리
    if (isDuplicateKeyError(e)) {
      return { transactionId: null, amount, duplicated: true };
    }
    throw e;
  }

  /**
   * 2) 사용자 잔액 캐시 갱신
   * - pointsBalance는 '사용 가능한 포인트'만 유지(절대 음수 금지)
   * - pointsDebt는 '회수해야 하지만 이미 사용되어 잔액이 부족했던 혜택'을 누적(0 이상 정수)
   * - 적립(+)이 들어오면 먼저 debt를 상계하고 남는 금액만 balance로 적립
   */
  const res = await users.updateOne(
    { _id: params.userId as any },
    [
      {
        $set: {
          pointsBalance: { $ifNull: ['$pointsBalance', 0] },
          pointsDebt: { $ifNull: ['$pointsDebt', 0] },
        },
      },
      { $set: { __payDebt: { $min: ['$pointsDebt', amount] } } },
      {
        $set: {
          pointsDebt: { $subtract: ['$pointsDebt', '$__payDebt'] },
          pointsBalance: { $add: ['$pointsBalance', { $subtract: [amount, '$__payDebt'] }] },
          updatedAt: now,
        },
      },
      { $unset: '__payDebt' },
    ] as any,
    { session: opts.session } as any
  );

  if (res.matchedCount === 0) {
    // 사용자 없으면 원장 롤백 시도
    try {
      await txCol.deleteOne({ _id: tx._id } as any, { session: opts.session });
    } catch (e) {
      console.error('[points] rollback failed (user not found)', e);
    }
    throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
  }

  return { transactionId: tx._id.toString(), amount };
}

export async function deductPoints(db: Db, params: DeductParams, opts: MongoSessionOptions = {}) {
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

  await txCol.insertOne(tx, { session: opts.session });

  // 2) 잔액 차감
  // - 기본은 잔액 부족 시 실패
  // - allowNegativeBalance=true(주로 환불/취소 회수)인 경우에도 users.pointsBalance는 음수로 만들지 않고,
  //   부족분은 users.pointsDebt(미정산 차감분)로 누적한다.
  let res: any;

  if (params.allowNegativeBalance) {
    res = await users.updateOne(
      { _id: params.userId as any },
      [
        {
          $set: {
            pointsBalance: { $ifNull: ['$pointsBalance', 0] },
            pointsDebt: { $ifNull: ['$pointsDebt', 0] },
          },
        },
        { $set: { _deductFromBalance: { $min: ['$pointsBalance', amount] } } },
        {
          $set: {
            pointsBalance: { $subtract: ['$pointsBalance', '$_deductFromBalance'] },
            pointsDebt: { $add: ['$pointsDebt', { $subtract: [amount, '$_deductFromBalance'] }] },
            updatedAt: now,
          },
        },
        { $unset: '_deductFromBalance' },
      ] as any,
      { session: opts.session }
    );

    if (res.matchedCount === 0) {
      // 사용자 없음 → 원장 롤백
      try {
        await txCol.deleteOne({ _id: tx._id } as any, { session: opts.session });
      } catch (e) {
        console.error('[points] rollback failed (deduct)', e);
      }
      throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
    }
  } else {
    const filter: any = { _id: params.userId as any };
    // pointsBalance가 없으면 0으로 취급하여 비교
    filter.$expr = {
      $and: [
        { $gte: [{ $ifNull: ['$pointsBalance', 0] }, amount] },
        { $eq: [{ $ifNull: ['$pointsDebt', 0] }, 0] }, // debt가 있으면 포인트 사용 금지
      ],
    };

    res = await users.updateOne(filter, { $inc: { pointsBalance: -amount }, $set: { updatedAt: now } }, { session: opts.session });

    if (res.matchedCount === 0 || res.modifiedCount === 0) {
      // 잔액 부족/사용자 없음 등으로 차감 실패 → 원장 롤백
      try {
        await txCol.deleteOne({ _id: tx._id } as any, { session: opts.session });
      } catch (e) {
        console.error('[points] rollback failed (deduct)', e);
      }

      throw Object.assign(new Error('INSUFFICIENT_POINTS'), { code: 'INSUFFICIENT_POINTS' });
    }
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
