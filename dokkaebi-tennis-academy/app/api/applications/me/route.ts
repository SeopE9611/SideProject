import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  // 토큰 추출
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 사용자
  const userId = new ObjectId(payload.sub);

  // DB 연결
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection('stringing_applications'); // 기존 코드

  // userId 기준 필터링
  // 최신 순으로 정렬하도록 .sort({ createdAt: -1 }) 추가
  // 그리고 rawList 변수로 받아서 아래에서 매핑 처리
  const rawList = await collection.find({ userId }).sort({ createdAt: -1 }).toArray();

  const applications = await Promise.all(
    rawList.map(async (doc) => {
      // stringTypes 배열 -> 상품명 배열로 변환
      const names = await Promise.all(
        (doc.stringDetails.stringTypes || []).map(async (prodId: string) => {
          if (prodId === 'custom') {
            return doc.stringDetails.customStringName ?? '커스텀 스트링';
          }
          const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
          return prod?.name ?? '알 수 없는 상품';
        })
      );

      return {
        id: doc._id.toString(),
        type: '스트링 장착 서비스',
        applicantName: doc.name,
        phone: doc.phone,
        appliedAt: doc.createdAt.toISOString(),
        status: doc.status,
        racketType: doc.stringDetails.racketType,
        stringType: names.join(', '),
        preferredDate: doc.stringDetails.preferredDate,
        preferredTime: doc.stringDetails.preferredTime,
        requests: doc.stringDetails.requirements,
      };
    })
  );

  return NextResponse.json(applications);
}
