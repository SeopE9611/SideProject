import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';
import { getStringingServicePrice } from '@/lib/stringing-prices';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const userId = payload?.sub ? new ObjectId(payload.sub) : null;

  try {
    const body = await req.json();

    // body에서 필요한 값들 추출
    const { name, phone, email, shippingInfo, racketType, stringType, customStringName, preferredDate, preferredTime, requirements, orderId } = body;

    // shippingInfo 내부에서 세부 필드 분해
    const { name: shippingName, phone: shippingPhone, email: shippingEmail, address, addressDetail, postalCode, depositor, deliveryRequest, bank } = shippingInfo;

    // 필수 필드 검증
    if (!name || !phone || !racketType || !stringType || !preferredDate) {
      return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 중복 예약 방지 로직
    const existing = await db.collection('stringing_applications').findOne({
      'stringDetails.preferredDate': preferredDate,
      'stringDetails.preferredTime': preferredTime,
    });
    if (existing) {
      return NextResponse.json({ error: '이미 해당 시간대에 신청이 존재합니다.' }, { status: 409 });
    }

    const stringDetails = {
      racketType,
      stringType,
      ...(stringType === 'custom' && customStringName ? { customStringName: customStringName.trim() } : {}),
      preferredDate,
      preferredTime,
      requirements,
    };

    const orderObjectId = new ObjectId(orderId);

    // 금액 계산
    const isCustom = stringType === 'custom';
    const totalPrice = getStringingServicePrice(stringType, isCustom);

    // 신청서 저장
    const result = await db.collection('stringing_applications').insertOne({
      orderId: orderObjectId,
      name,
      phone,
      email,
      shippingInfo: {
        name: shippingName,
        phone: shippingPhone,
        email: shippingEmail,
        address,
        addressDetail,
        postalCode,
        depositor,
        deliveryRequest,
        bank,
      },
      stringDetails,
      totalPrice,
      status: '검토 중',
      createdAt: new Date(),
      userId,
      guestName: !userId ? name : null,
      guestEmail: !userId ? email : null,
      guestPhone: !userId ? phone : null,
      userSnapshot: userId ? { name, email } : null,
    });

    if (!depositor || !bank) {
      return NextResponse.json({ message: '입금자명과 은행을 모두 입력해주세요.' }, { status: 400 });
    }

    // insertedId 추출
    const applicationId = result.insertedId;

    await db.collection('orders').updateOne(
      { _id: orderObjectId },
      {
        $set: {
          isStringServiceApplied: true,
          stringingApplicationId: applicationId.toString(),
        },
      }
    );
    return NextResponse.json({ message: 'success', applicationId }, { status: 201 });
  } catch (err) {
    console.error('신청서 저장 오류:', err);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
