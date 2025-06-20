import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, phone, racketType, stringType, customStringName, preferredDate, preferredTime, requirements, orderId } = body;

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
      ...(stringType === 'custom' && customStringName ? { customStringName: customStringName.trim() } : {}), // 조건부 추가
      preferredDate,
      preferredTime,
      requirements,
    };

    const orderObjectId = new ObjectId(orderId);

    await db.collection('stringing_applications').insertOne({
      orderId: orderObjectId,
      name,
      phone,
      stringDetails,
      status: '접수 완료',
      createdAt: new Date(),
    });

    // 주문 상태 업데이트
    await db.collection('orders').updateOne({ _id: orderObjectId }, { $set: { isStringServiceApplied: true } });

    return NextResponse.json({ message: 'success' }, { status: 201 });
  } catch (err) {
    console.error('신청서 저장 오류:', err);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
