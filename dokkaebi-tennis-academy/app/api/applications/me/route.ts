import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

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

  // draft는 마이페이지 목록/카운트에서 제외
  const total = await db.collection('stringing_applications').countDocuments({ userId, status: { $ne: 'draft' } });
  const rawList = await db
    .collection('stringing_applications')
    .find({ userId, status: { $ne: 'draft' } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // sanitize + stringType 매핑
  const items = await Promise.all(
    rawList.map(async (doc) => {
      const details: any = (doc as any).stringDetails ?? {};
      const typeIds: string[] = Array.isArray(details.stringTypes) ? details.stringTypes : [];

      // 스트링 이름 목록 생성 (커스텀/상품명 혼합)
      const names = await Promise.all(
        typeIds.map(async (prodId: string) => {
          if (prodId === 'custom') {
            return details.customStringName || '커스텀 스트링';
          }
          const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
          return prod?.name || '알 수 없는 상품';
        })
      );
      // createdAt 안전 보정
      const appliedAtISO = doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString();

      // 운송장/수거방식 정보(목록 라벨 전환 근거)
      const trackingNo = (doc as any)?.shippingInfo?.selfShip?.trackingNo ?? (doc as any)?.shippingInfo?.invoice?.trackingNumber ?? (doc as any)?.shippingInfo?.trackingNumber ?? null;
      const collectionMethod = normalizeCollection((doc as any)?.shippingInfo?.collectionMethod ?? (doc as any)?.collectionMethod ?? 'self_ship');

      return {
        id: doc._id.toString(),
        type: '스트링 장착 서비스',
        applicantName: doc.name ?? null,
        phone: doc.phone ?? null,
        appliedAt: appliedAtISO,
        status: doc.status ?? '접수',
        racketType: details.racketType ?? '-',
        stringType: names.join(', ') || '-',
        preferredDate: details.preferredDate ?? null,
        preferredTime: details.preferredTime ?? null,
        requests: details.requirements ?? null,
        shippingInfo: {
          collectionMethod,
          selfShip: { trackingNo },
        },
      };
    })
  );

  return NextResponse.json({ items, total });
}
