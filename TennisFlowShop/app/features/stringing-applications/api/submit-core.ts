import type { ClientSession, Db, ObjectId } from 'mongodb';
import { ObjectId as MongoObjectId } from 'mongodb';

import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import { applyPackageToServiceFee, resolvePackageUsage, resolveRequiredPassCountFromInput } from '@/app/features/stringing-applications/lib/package-pricing';
import { loadStringingSettings, resolveDaySchedule } from '@/app/features/stringing-applications/lib/slotEngine';
import { normalizeEmail } from '@/lib/claims';
import { calcStringingMountingFeeByProductId, calcStringingTotal } from '@/lib/pricing';
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
  guestOrderId?: string | null;
  guestRentalId?: string | null;
  session?: ClientSession;
};

export type SubmitCoreResult = {
  applicationId: ObjectId;
  orderObjectId: ObjectId | null;
  rentalObjectId: ObjectId | null;
  stringingSubmitted: true;
};

function toObjectIdOrThrow(id: unknown, fieldName: string): ObjectId | null {
  if (typeof id !== 'string' || !id.trim()) return null;
  if (!MongoObjectId.isValid(id)) {
    throw Object.assign(new Error(`유효하지 않은 ${fieldName}입니다.`), { status: 400 });
  }
  return new MongoObjectId(id);
}

function isSameObjectId(a: unknown, b: ObjectId): boolean {
  return !!a && MongoObjectId.isValid(String(a)) && String(a) === String(b);
}

export async function submitStringingApplicationCore({ db, input, userId, guestOrderId, guestRentalId, session }: SubmitCoreParams): Promise<SubmitCoreResult> {
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
  const orderObjectId = toObjectIdOrThrow(orderId, 'orderId');
  const rentalObjectId = toObjectIdOrThrow(rentalId, 'rentalId');

  if (orderObjectId && rentalObjectId) {
    throw Object.assign(new Error('orderId와 rentalId는 동시에 제출할 수 없습니다.'), { status: 400 });
  }

  const bodyApplicationObjectId = toObjectIdOrThrow(bodyAppId, 'applicationId');

  if (bodyApplicationObjectId) {
    const existingApp = await db.collection('stringing_applications').findOne(
      { _id: bodyApplicationObjectId },
      { projection: { _id: 1, userId: 1, orderId: 1, rentalId: 1 }, session },
    );

    if (!existingApp) {
      throw Object.assign(new Error('수정 권한이 없는 신청서입니다.'), { status: 403 });
    }

    const isMemberOwner = !!userId && isSameObjectId((existingApp as any).userId, userId);
    const isGuestOrderOwner = !userId && !!guestOrderId && !!(existingApp as any).orderId && String((existingApp as any).orderId) === String(guestOrderId);
    const isGuestRentalOwner = !userId && !!guestRentalId && !!(existingApp as any).rentalId && String((existingApp as any).rentalId) === String(guestRentalId);

    if (!isMemberOwner && !isGuestOrderOwner && !isGuestRentalOwner) {
      throw Object.assign(new Error('수정 권한이 없는 신청서입니다.'), { status: 403 });
    }
  }

  const applicationId: ObjectId = bodyApplicationObjectId ?? new MongoObjectId();

  if (orderObjectId) {
    const order = await db.collection('orders').findOne({ _id: orderObjectId }, { projection: { _id: 1, userId: 1, guest: 1 }, session });
    if (!order) {
      throw Object.assign(new Error('접근할 수 없는 주문입니다.'), { status: 403 });
    }

    const isOwner = !!userId && isSameObjectId((order as any).userId, userId);
    const isGuestOrder = !userId && (!((order as any).userId) || (order as any).guest === true);
    const guestOwns = !!isGuestOrder && !!guestOrderId && String(guestOrderId) === String((order as any)._id);
    if (!isOwner && !guestOwns) {
      throw Object.assign(new Error('접근할 수 없는 주문입니다.'), { status: 403 });
    }
  }

  if (rentalObjectId) {
    const rental = await db.collection('rental_orders').findOne({ _id: rentalObjectId }, { projection: { _id: 1, userId: 1 }, session });
    if (!rental) {
      throw Object.assign(new Error('접근할 수 없는 대여입니다.'), { status: 403 });
    }

    const isOwner = !!userId && isSameObjectId((rental as any).userId, userId);
    const guestOwns = !userId && !((rental as any).userId) && !!guestRentalId && String(guestRentalId) === String((rental as any)._id);
    if (!isOwner && !guestOwns) {
      throw Object.assign(new Error('접근할 수 없는 대여입니다.'), { status: 403 });
    }
  }

  const usingLines = Array.isArray(lines) && lines.length > 0;
  const normalizedLines = usingLines
    ? await Promise.all(
        lines.map(async (line) => {
          const stringProductId = line.stringProductId ?? 'custom';
          const serverMountingFee = await calcStringingMountingFeeByProductId(db, stringProductId);
          return {
            racketType: line.racketType ?? '',
            stringProductId,
            stringName: line.stringName ?? (stringProductId === 'custom' ? customStringName ?? '커스텀 스트링' : '선택한 스트링'),
            tensionMain: line.tensionMain ?? '',
            tensionCross: line.tensionCross ?? '',
            note: line.note ?? '',
            mountingFee: serverMountingFee,
          };
        }),
      )
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

  const serviceFeeBeforeRaw = usingLines ? normalizedLines.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0) : await calcStringingTotal(db, stringTypes);
  const serviceFeeBefore = Math.max(0, Math.round(Number.isFinite(serviceFeeBeforeRaw) ? serviceFeeBeforeRaw : 0));

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

  const totalPriceRaw = applyPackageToServiceFee(serviceFeeBefore, { usingPackage: packageApplied });
  const totalPrice = Math.max(0, Math.round(Number.isFinite(totalPriceRaw) ? totalPriceRaw : 0));

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
    serviceFee: totalPrice,
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
