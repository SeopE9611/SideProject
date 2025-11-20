import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { writeRentalHistory } from '@/app/features/rentals/utils/history';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // 1) 인증
    const at = (await cookies()).get('accessToken')?.value;
    if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let payload: any;
    try {
      payload = verifyAccessToken(at);
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 2) 파라미터
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
    }

    const userId = new ObjectId(payload.sub);
    const rentalId = new ObjectId(id);

    // 3) DB 연결
    const client = await clientPromise;
    const db = client.db();
    const rentals = db.collection('rental_orders');

    // 4) 본인 소유 + 현재 상태 조회
    const doc = await rentals.findOne({
      _id: rentalId,
      userId,
    });

    if (!doc) {
      return NextResponse.json({ message: 'Not Found' }, { status: 404 });
    }

    const currentStatus = (doc as any).status ?? 'created';
    const cancelRequest = (doc as any).cancelRequest ?? null;

    // 5) 철회 가능 조건
    // - 이미 취소 승인/거절이 된 건은 철회 불가
    if (!cancelRequest || cancelRequest.status !== 'requested') {
      return NextResponse.json({ message: '철회할 수 있는 취소 요청이 없습니다.', status: currentStatus }, { status: 400 });
    }

    // 6) 실제 철회 처리
    //    : 취소 요청 자체를 없애버리고, 상태는 그대로 둠
    const now = new Date();

    await rentals.updateOne(
      { _id: rentalId },
      {
        $set: {
          cancelRequest: null,
        },
      }
    );

    // 7) 히스토리 기록
    const prevStatus = String((doc as any).status ?? 'created');

    await writeRentalHistory(db, doc._id, {
      action: 'cancel-withdrawn', // HistoryAction 중 하나
      from: prevStatus, // 철회 전 대여 상태
      to: prevStatus, // 철회 후 대여 상태 (변화 없으니 prev와 동일)
      actor: {
        // Actor 타입에 맞춰 객체로
        role: 'user',
        id: payload.sub, // 토큰에서 꺼낸 userId
      },
      snapshot: {
        status: prevStatus,
        cancelRequest: null, // 철회 후 상태 스냅샷
      },
    });

    return NextResponse.json({
      id,
      status: currentStatus,
      cancelRequest: null,
      message: '대여 취소 요청이 철회되었습니다.',
    });
  } catch (e) {
    console.error('cancel-withdraw error:', e);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
