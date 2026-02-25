// 패키지 패스(횟수권) 발급/차감/복원 유틸
//
// 핵심 포인트
// 1) 컬렉션 제네릭 타입 지정: db.collection<ServicePass>('service_passes')
// 2) $push 시 $each 사용 → 드라이버 타입과의 호환성 ↑
// 3) findOneAndUpdate 반환 타입(v4/v5 차이)에 안전하게 대응:
//    - 어떤 환경은 { value: doc|null } 를, 어떤 환경은 doc|null 을 반환.
//    - => 공통 헬퍼로 updatedDoc 추출.

import type { Db, ObjectId } from 'mongodb';
import { ObjectId as OID } from 'mongodb';
import type { ServicePass, ServicePassConsumption } from '@/lib/types/pass';

// 365일 더하기 유틸
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// findOneAndUpdate 반환값에서 실제 문서를 안전하게 꺼내는 헬퍼
function extractUpdatedDoc<T>(res: any): T | null {
  // v4 스타일: { value: WithId<T> | null }
  if (res && typeof res === 'object' && 'value' in res) {
    return (res.value ?? null) as T | null;
  }
  // v5 스타일: WithId<T> | null
  return (res ?? null) as T | null;
}

/** 주문(결제완료) → 패스 발급(멱등) */
export async function issuePassesForPaidOrder(db: Db, order: any) {
  if (!order?.items?.length) return;

  const passes = db.collection<ServicePass>('service_passes');
  const now = new Date();

  for (let i = 0; i < order.items.length; i++) {
    const it = order.items[i];
    const meta = it?.meta || {};
    if (meta?.kind !== 'service_package') continue;

    const orderId = typeof order._id === 'string' ? new OID(order._id) : order._id;
    const userId = typeof order.userId === 'string' ? new OID(order.userId) : order.userId;

    // 멱등: 같은 orderId + orderItemId 로 이미 발급된 패스가 있으면 스킵
    const existing = await passes.findOne({
      orderId,
      orderItemId: it.id,
    } as any);
    if (existing) continue;

    const packageSize = Number(meta.packageSize || 0);
    if (!packageSize) continue;

    const passDoc: ServicePass = {
      _id: new OID(),
      userId,
      orderId,
      orderItemId: it.id,
      packageSize,
      usedCount: 0,
      remainingCount: packageSize,
      status: 'active',
      purchasedAt: now,
      expiresAt: addDays(now, 365),
      redemptions: [],
      meta: {
        planId: meta.planId,
        planTitle: meta.planTitle,
      },
      createdAt: now,
      updatedAt: now,
    };

    await passes.insertOne(passDoc);
  }
}

/** 활성 패스 1개를 (만료 임박 순) 찾아 반환 */
export async function findOneActivePassForUser(db: Db, userId: ObjectId) {
  const passes = db.collection<ServicePass>('service_passes');
  const now = new Date();

  // findOne({ ... }, { sort }) 대신 find→sort→limit→next()가 타입/호환성 면에서 안전
  return passes
    .find(
      {
        userId,
        status: 'active',
        expiresAt: { $gte: now },
        remainingCount: { $gt: 0 },
      },
      { projection: { redemptions: { $slice: 0 } } } // 불필요한 큰 배열 제외(성능)
    )
    .sort({ expiresAt: 1 })
    .limit(1)
    .next();
}

/** 패스 차감(원자 조건 포함) + 멱등 로그(service_pass_consumptions) 기록 */
export async function consumePass(db: Db, passId: ObjectId, applicationId: ObjectId, count: number = 1) {
  const passes = db.collection<ServicePass>('service_passes');
  const consumptions = db.collection<ServicePassConsumption>('service_pass_consumptions');
  const packageOrders = db.collection('packageOrders'); // ← 주문 컬렉션
  const now = new Date();

  // 1) 먼저 패스를 읽어서 연결된 orderId 확인
  const passDoc = await passes.findOne({ _id: passId }, { projection: { _id: 1, orderId: 1 } as any });
  if (!passDoc) {
    throw Object.assign(new Error('PASS_NOT_FOUND'), { code: 'PASS_NOT_FOUND', httpStatus: 404 });
  }

  // 2) 연결된 주문이 있으면 결제완료인지 검증 (서버 측 방어막)
  if (passDoc.orderId) {
    const order = await packageOrders.findOne({ _id: passDoc.orderId as any }, { projection: { paymentStatus: 1 } as any });
    if (!order || order.paymentStatus !== '결제완료') {
      throw Object.assign(new Error('ORDER_NOT_PAID'), { code: 'ORDER_NOT_PAID', httpStatus: 409 });
    }
  }

  // 3) 멱등 소비 로그 먼저 기록(유니크 인덱스 권장: {passId, applicationId})
  await consumptions.insertOne({
    _id: new OID(),
    passId,
    applicationId,
    usedAt: now,
    count,
    createdAt: now,
  });

  // 4) 차감 기록(redemptions) 원소 타입 맞춰 준비
  const redemption: ServicePass['redemptions'][number] = {
    applicationId,
    usedAt: now,
  };

  // 5) 원자 차감
  const raw = await passes.findOneAndUpdate(
    {
      _id: passId,
      status: 'active',
      // 남은 횟수가 "이번에 차감할 횟수(count)" 이상일 때만 패스 사용 허용
      remainingCount: { $gte: count },
      expiresAt: { $gte: now },
    },
    {
      $inc: { usedCount: count, remainingCount: -count },
      $push: { redemptions: { $each: [redemption] } },
      $set: { updatedAt: now },
    },
    { returnDocument: 'after' } as any
  );

  const updatedDoc = (raw && 'value' in raw ? raw.value : raw) as ServicePass | null;

  if (!updatedDoc) {
    // 차감 실패 시 소비 로그 롤백 시도
    await consumptions.deleteOne({ passId, applicationId });
    throw new Error('PASS_CONSUME_FAILED');
  }

  return updatedDoc;
}
/** 차감 복원(취소 시 등) */
export async function revertConsumption(db: Db, passId: ObjectId, applicationId: ObjectId) {
  const passes = db.collection<ServicePass>('service_passes');
  const consumptions = db.collection<ServicePassConsumption>('service_pass_consumptions');

  // 아직 되돌리지 않은 소비 로그 조회
  const log = await consumptions.findOne(
    {
      passId,
      applicationId,
      // 이미 되돌린 기록은 건너뛴다
      $or: [{ reverted: { $exists: false } }, { reverted: false }],
    } as any,
    { projection: { count: 1 } as any }
  );

  // 소비 로그가 없으면 (이미 되돌렸거나, 애초에 패키지 미사용) → 아무 것도 하지 않음
  if (!log) return;

  // 사용된 회차 수 (기록에 없으면 안전하게 1회로 간주)
  const count = typeof (log as any).count === 'number' ? (log as any).count : 1;

  // 소비 로그에 reverted 표시
  await consumptions.updateOne(
    { passId, applicationId },
    {
      $set: {
        reverted: true,
      },
    }
  );

  // 패스 문서에서 usedCount / remainingCount를 count 만큼 되돌리고,
  //    해당 applicationId에 대한 redemptions 원소에 reverted 플래그를 남김
  await passes.updateOne(
    { _id: passId, 'redemptions.applicationId': applicationId },
    {
      $inc: {
        usedCount: -count,
        remainingCount: count,
      },
      $set: {
        'redemptions.$.reverted': true,
        updatedAt: new Date(),
      },
    }
  );
}

/** 패키지 주문(결제완료) → 패스 발급(멱등) */
export async function issuePassesForPaidPackageOrder(db: Db, packageOrder: any) {
  const passes = db.collection<ServicePass>('service_passes');
  const now = new Date();

  // 멱등: 같은 packageOrder._id 로 이미 발급된 패스가 있으면 스킵
  const orderId = typeof packageOrder._id === 'string' ? new OID(packageOrder._id) : packageOrder._id;
  const userId = typeof packageOrder.userId === 'string' ? new OID(packageOrder.userId) : packageOrder.userId;
  const sessions = Number(packageOrder?.packageInfo?.sessions || 0);
  const planId = packageOrder?.packageInfo?.id ?? `sessions-${sessions}`;
  const planTitle = packageOrder?.packageInfo?.title ?? '교체 서비스 패키지';

  if (!sessions) return;

  const orderItemId = `package:${planId}:${sessions}`;
  const existing = await passes.findOne({ orderId, orderItemId });
  if (existing) return;

  const passDoc: ServicePass = {
    _id: new OID(),
    userId,
    orderId, // packageOrders의 _id를 그대로 사용
    orderItemId, // 멱등 키용
    packageSize: sessions,
    usedCount: 0,
    remainingCount: sessions,
    status: 'active',
    purchasedAt: now,
    expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    redemptions: [],
    meta: { planId, planTitle },
    createdAt: now,
    updatedAt: now,
  };

  await passes.insertOne(passDoc);
}

// 이미 차감됐다면 아무것도 안 하는 멱등 차감
export async function deductPassIfNeeded(db: Db, passId: ObjectId, applicationId: ObjectId) {
  const used = await db.collection('pass_usages').findOne({ passId, applicationId, type: 'deduct' });
  if (used) return; // 멱등 보장

  await db.collection('service_passes').updateOne({ _id: passId, remainingCount: { $gt: 0 } }, { $inc: { remainingCount: -1 } });
  await db.collection('pass_usages').insertOne({
    passId,
    applicationId,
    type: 'deduct',
    createdAt: new Date(),
  });
}

// 이미 복원됐다면 아무것도 안 하는 멱등 복원
export async function restorePassIfNeeded(db: Db, passId: ObjectId, applicationId: ObjectId) {
  const restored = await db.collection('pass_usages').findOne({ passId, applicationId, type: 'restore' });
  if (restored) return;

  const used = await db.collection('pass_usages').findOne({ passId, applicationId, type: 'deduct' });
  if (!used) return;

  await db.collection('service_passes').updateOne({ _id: passId }, { $inc: { remainingCount: +1 } });
  await db.collection('pass_usages').insertOne({
    passId,
    applicationId,
    type: 'restore',
    createdAt: new Date(),
  });
}
