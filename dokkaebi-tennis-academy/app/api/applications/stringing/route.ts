import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, phone, racketType, stringType, preferredDate, requirements } = body;

    // 필수 필드 검증
    if (!name || !phone || !racketType || !stringType || !preferredDate) {
      return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 신청서 객체 구성
    const application = {
      type: '스트링 장착 서비스', // 구분용
      applicantName: name,
      phone,
      appliedAt: new Date().toISOString(), // 제출 시간
      status: '접수 완료',
      racketType,
      stringType,
      preferredDate,
      requirements,
    };

    await db.collection('applications').insertOne(application);

    return NextResponse.json({ message: 'success' }, { status: 201 });
  } catch (err) {
    console.error('신청서 저장 오류:', err);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
