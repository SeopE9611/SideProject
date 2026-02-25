import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1) 인증
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;

  // 토큰 파싱 방어 (없거나, 손상된 토큰이면 401)
  if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  let payload: any = null;
  try {
    payload = verifyAccessToken(at);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const sub = String(payload?.sub ?? '');
  if (!sub || !ObjectId.isValid(sub)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = new ObjectId(sub);

  // 2) 페이지네이션 파라미터
  const url = new URL(req.url);
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get('pageSize') || '20', 10), 1), 50);
  const skip = (page - 1) * pageSize;

  // 3) 조회
  const db = (await clientPromise).db();
  const [items, total] = await Promise.all([db.collection('rental_orders').find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(), db.collection('rental_orders').countDocuments({ userId })]);

  // 4) 응답 평탄화
  const rows = items.map((d) => {
    const ret = d?.shipping?.return;
    const outbound = d?.shipping?.outbound;

    const returnTracking = ret?.trackingNumber || '';
    const outboundTracking = outbound?.trackingNumber || '';

    return {
      id: d._id.toString(),

      /**
       * 대여 기반 교체 신청서 연결용 ID
       * - 대여 신청 시 교체 서비스가 포함되면 rental_orders에 stringingApplicationId가 저장됨
       * - 마이페이지(대여 내역)에서 "신청서 보기" 버튼을 띄우기 위해 내려준다.
       */
      stringingApplicationId: d.stringingApplicationId ? d.stringingApplicationId.toString() : null,

      /**
       * 교체 서비스 포함 여부
       * - 일반적으로 stringing.requested=true면 신청서가 자동 생성되어 stringingApplicationId가 채워지지만,
       *   레거시/예외 케이스에서 ID가 비어 있을 수 있어 boolean을 함께 내려준다.
       */
      withStringService: Boolean(d?.stringing?.requested) || Boolean(d?.stringingApplicationId),

      brand: d.brand,
      model: d.model,
      days: d.days,
      status: d.status, // created | paid | out | returned
      amount: d.amount, // { fee, deposit, total }
      createdAt: d.createdAt,
      dueAt: d.dueAt,
      // 출고/반납 운송장 등록 여부를 별도 플래그로 내려서 마이페이지 카드에서 쉽게 사용
      hasOutboundShipping: Boolean(outboundTracking),
      hasReturnShipping: Boolean(returnTracking),
      returnShippingBrief: returnTracking
        ? {
            courier: ret?.courier || '',
            trackingLast4: String(returnTracking).slice(-4),
          }
        : null,
      cancelStatus: d.cancelRequest?.status ?? null,
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: rows,
  });
}
