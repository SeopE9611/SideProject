import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  // 인증
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload?.sub) return new NextResponse('Unauthorized', { status: 401 });
  const userId = new ObjectId(payload.sub);

  // 페이지 파라미터
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  // DB 조회: count + paged
  const client = await clientPromise;
  const db = client.db();

  const total = await db.collection('stringing_applications').countDocuments({ userId });

  const rawList = await db.collection('stringing_applications').find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();

  // sanitize + stringType 매핑
  const items = await Promise.all(
    rawList.map(async (doc) => {
      const names = await Promise.all(
        (doc.stringDetails.stringTypes || []).map(async (prodId: string) => {
          if (prodId === 'custom') return doc.stringDetails.customStringName || '커스텀 스트링';
          const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
          return prod?.name || '알 수 없는 상품';
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

  return NextResponse.json({ items, total });
}
