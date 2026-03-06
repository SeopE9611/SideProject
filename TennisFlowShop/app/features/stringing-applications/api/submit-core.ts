import type { ClientSession, Db, ObjectId } from 'mongodb';
import { ObjectId as MongoObjectId } from 'mongodb';

import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import { applyPackageToServiceFee, resolvePackageUsage, resolveRequiredPassCountFromInput } from '@/app/features/stringing-applications/lib/package-pricing';
import { loadStringingSettings, resolveDaySchedule } from '@/app/features/stringing-applications/lib/slotEngine';
import { normalizeEmail } from '@/lib/claims';
import { calcStringingTotal } from '@/lib/pricing';
import { consumePass, findOneActivePassForUser } from '@/lib/passes.service';

export type StringingApplicationInput = {
  applicationId?: string;
  orderId?: string;
  rentalId?: string;
  name: string;
  phone: string;
  email?: string;
  shippingInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    depositor?: string;
    bank?: string;
    deliveryRequest?: string;
    collectionMethod?: string;
  };
  racketType?: string;
  stringTypes: string[];
  customStringName?: string;
  preferredDate?: string;
  preferredTime?: string;
  requirements?: string;
  packageOptOut?: boolean;
  lines?: Array<{
    racketType?: string;
    stringProductId?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    note?: string;
    mountingFee?: number;
  }>;
};

type SubmitCoreParams = {
  db: Db;
  input: StringingApplicationInput;
  userId: ObjectId | null;
  session?: ClientSession;
};

export type SubmitCoreResult = {
  applicationId: ObjectId;
  orderObjectId: ObjectId | null;
  rentalObjectId: ObjectId | null;
  stringingSubmitted: true;
};

export async function submitStringingApplicationCore({ db, input, userId, session }: SubmitCoreParams): Promise<SubmitCoreResult> {
  const {
    applicationId: bodyAppId,
    orderId,
    rentalId,
    name,
    phone,
    email,
    shippingInfo,
    racketType,
    stringTypes,
    customStringName,
    preferredDate,
    preferredTime,
    requirements,
    packageOptOut,
    lines,
  } = input;

  if (!name || !phone || !Array.isArray(stringTypes) || stringTypes.length === 0) {
    throw Object.assign(new Error('필수 항목 누락'), { status: 400 });
  }

  const cm = normalizeCollection(shippingInfo?.collectionMethod ?? 'self_ship');
  const orderObjectId = typeof orderId === 'string' && MongoObjectId.isValid(orderId) ? new MongoObjectId(orderId) : null;
  const rentalObjectId = typeof rentalId === 'string' && MongoObjectId.isValid(rentalId) ? new MongoObjectId(rentalId) : null;

  if (orderObjectId && rentalObjectId) {
    throw Object.assign(new Error('orderId와 rentalId는 동시에 제출할 수 없습니다.'), { status: 400 });
  }

  let applicationId: ObjectId;
  if (typeof bodyAppId === 'string' && bodyAppId.trim()) {
    if (!MongoObjectId.isValid(bodyAppId)) {
      throw Object.assign(new Error('유효하지 않은 applicationId입니다.'), { status: 400 });
    }
    applicationId = new MongoObjectId(bodyAppId);
  } else {
    applicationId = new MongoObjectId();
  }

  const usingLines = Array.isArray(lines) && lines.length > 0;
  const normalizedLines = usingLines
    ? lines.map((line) => ({
        racketType: line.racketType ?? '',
        stringProductId: line.stringProductId ?? 'custom',
        stringName: line.stringName ?? (line.stringProductId === 'custom' ? customStringName ?? '커스텀 스트링' : '선택한 스트링'),
        tensionMain: line.tensionMain ?? '',
        tensionCross: line.tensionCross ?? '',
        note: line.note ?? '',
        mountingFee: Number(line.mountingFee ?? 0),
      }))
    : [];

  const normalizedStringItems = usingLines
    ? normalizedLines.map((line) => ({
        productId: line.stringProductId,
        name: line.stringName,
        quantity: 1,
        mountingFee: line.mountingFee,
      }))
    : stringTypes.map((id) => ({
        productId: id,
        name: id === 'custom' ? customStringName?.trim() || '커스텀 스트링' : '선택한 스트링',
        quantity: 1,
      }));

  const stringDetails = {
    racketType: racketType ?? '',
    stringTypes,
    customStringName: customStringName ?? '',
    preferredDate: preferredDate ?? '',
    preferredTime: preferredTime ?? '',
    requirements: requirements ?? '',
    lines: normalizedLines,
  };


  const normalizedShippingInfo = {
    ...(shippingInfo ?? {}),
    collectionMethod: cm,
    address: cm === 'visit' ? '' : shippingInfo?.address ?? '',
    addressDetail: cm === 'visit' ? '' : shippingInfo?.addressDetail ?? '',
    postalCode: cm === 'visit' ? '' : shippingInfo?.postalCode ?? '',
  };

  const serviceFeeBefore = usingLines ? normalizedLines.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0) : await calcStringingTotal(db, stringTypes);

  const packageUseCount = resolveRequiredPassCountFromInput({
    lines: normalizedLines,
    stringTypes,
  });

  // 멀티 슬롯 예약 정확도: 방문 예약은 라인 수(패스 사용량)만큼 슬롯 점유 길이가 늘어나므로
  // 신청서 저장 시 슬롯 수/총 소요시간을 함께 기록해 예약 엔진의 점유 계산과 일치시킨다.
  let visitSlotCount: number | null = null;
  let visitDurationMinutes: number | null = null;
  if (cm === 'visit') {
    const slotCount = Math.max(1, Math.floor(packageUseCount || 1));
    let intervalMinutes = 30;

    if (preferredDate) {
      const settings = await loadStringingSettings(db);
      const schedule = resolveDaySchedule(settings, preferredDate);
      const resolvedInterval = Number(schedule.interval);
      if (Number.isFinite(resolvedInterval) && resolvedInterval > 0) {
        intervalMinutes = resolvedInterval;
      }
    }

    visitSlotCount = slotCount;
    visitDurationMinutes = slotCount * intervalMinutes;
  }

  let packageApplied = false;
  let packagePassId: ObjectId | null = null;
  let packageRedeemedAt: Date | null = null;

  if (userId) {
    const pass = await findOneActivePassForUser(db, userId);
    const packageUsage = resolvePackageUsage({
      hasPackage: !!pass,
      packageRemaining: Number(pass?.remainingCount ?? 0),
      requiredPassCount: packageUseCount,
      packageOptOut: !!packageOptOut,
    });

    if (pass && packageUsage.usingPackage) {
      await consumePass(db, pass._id, applicationId, packageUseCount);
      packageApplied = true;
      packagePassId = pass._id;
      packageRedeemedAt = new Date();
    }
  }

  const totalPrice = applyPackageToServiceFee(serviceFeeBefore, { usingPackage: packageApplied });

  const updateDoc = {
    orderId: orderObjectId,
    rentalId: rentalObjectId,
    name,
    phone,
    email: email ?? '',
    contactEmail: normalizeEmail(email),
    contactPhone: phone.replace(/\D/g, '') || null,
    shippingInfo: normalizedShippingInfo,
    collectionMethod: cm,
    stringDetails,
    stringItems: normalizedStringItems,
    totalPrice,
    serviceFeeBefore,
    serviceAmount: totalPrice,
    packageApplied,
    packagePassId,
    packageRedeemedAt,
    status: '검토 중',
    submittedAt: new Date(),
    userId,
    guestName: userId ? null : name,
    guestEmail: userId ? null : email ?? '',
    guestPhone: userId ? null : phone,
    userSnapshot: userId ? { name, email: email ?? '' } : null,
    updatedAt: new Date(),
    ...(cm === 'visit' ? { visitSlotCount, visitDurationMinutes } : {}),
  };

  const existingDraft = orderObjectId
    ? await db.collection('stringing_applications').findOne({ orderId: orderObjectId, status: 'draft' }, { projection: { _id: 1 }, session })
    : null;

  const targetId = existingDraft?._id ?? applicationId;

  const updateResult = await db.collection('stringing_applications').updateOne(
    { _id: targetId },
    {
      $unset: { expireAt: '' },
      $set: updateDoc,
      $setOnInsert: { createdAt: new Date(), servicePaid: false },
    },
    { upsert: true, session },
  );

  if (!updateResult.acknowledged) {
    throw Object.assign(new Error('신청서 저장 실패'), { status: 500 });
  }

  if (orderObjectId) {
    await db.collection('orders').updateOne({ _id: orderObjectId }, { $set: { isStringServiceApplied: true, stringingApplicationId: String(targetId) } }, { session });
  }

  if (rentalObjectId) {
    await db.collection('rental_orders').updateOne(
      { _id: rentalObjectId },
      { $set: { isStringServiceApplied: true, stringingApplicationId: String(targetId), updatedAt: new Date() } },
      { session },
    );
  }

  return { applicationId: targetId, orderObjectId, rentalObjectId, stringingSubmitted: true };
}
