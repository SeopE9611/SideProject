import type { ClientSession, Db, ObjectId } from 'mongodb';
import { ObjectId as MongoObjectId } from 'mongodb';

import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
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

  const serviceFeeBefore = usingLines ? normalizedLines.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0) : await calcStringingTotal(db, stringTypes);

  const packageUseCount = usingLines ? normalizedLines.length : Math.max(1, stringTypes.length);
  let packageApplied = false;
  let packagePassId: ObjectId | null = null;
  let packageRedeemedAt: Date | null = null;

  if (!packageOptOut && userId) {
    const pass = await findOneActivePassForUser(db, userId);
    if (pass && Number(pass.remainingCount ?? 0) >= packageUseCount) {
      await consumePass(db, pass._id, applicationId, packageUseCount);
      packageApplied = true;
      packagePassId = pass._id;
      packageRedeemedAt = new Date();
    }
  }

  const totalPrice = packageApplied ? 0 : serviceFeeBefore;

  const updateDoc = {
    orderId: orderObjectId,
    rentalId: rentalObjectId,
    name,
    phone,
    email: email ?? '',
    contactEmail: normalizeEmail(email),
    contactPhone: phone.replace(/\D/g, '') || null,
    shippingInfo: {
      ...(shippingInfo ?? {}),
      collectionMethod: cm,
    },
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
