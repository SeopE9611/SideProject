import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  // 토큰 추출
  const token = getTokenFromHeader(req.headers);
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 사용자 이메일
  const email = payload.email;

  // DB 연결
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('stringing_applications'); // 기존 코드

  // 이메일 기준 필터링
  // 최신 순으로 정렬하도록 .sort({ createdAt: -1 }) 추가
  // 그리고 rawList 변수로 받아서 아래에서 매핑 처리
  const rawList = await collection.find({ email }).sort({ createdAt: -1 }).toArray();

  // Application 형태로 매핑
  const applications = rawList.map((doc) => ({
    id: doc._id.toString(),
    type: '스트링 장착 서비스',
    applicantName: doc.name,
    phone: doc.phone,
    appliedAt: doc.createdAt.toISOString(),
    status: doc.status,
    racketType: doc.stringDetails.racketType,
    stringType: doc.stringDetails.stringType,
    preferredDate: doc.stringDetails.preferredDate,
    preferredTime: doc.stringDetails.preferredTime,
    requests: doc.stringDetails.requirements,
  }));

  return NextResponse.json(applications);
}
