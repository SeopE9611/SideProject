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
    /**
     * sub(ObjectId 문자열) 최종 방어
     * - sub가 ObjectId 형식이 아니면 new ObjectId(sub)에서 500이 발생할 수 있음
     */
    const sub = typeof payload?.sub === 'string' && ObjectId.isValid(payload.sub) ? payload.sub : null;
    if (!sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 2) 파라미터
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
    }

    const userId = new ObjectId(sub);
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

    const currentStatus = (doc as any).status ?? 'pending';
    const cancelRequest = (doc as any).cancelRequest ?? null;

    // 5) 철회 가능 조건
    // - 이미 취소 승인/거절이 된 건은 철회 불가
    if (!cancelRequest || cancelRequest.status !== 'requested') {
      return NextResponse.json({ message: '철회할 수 있는 취소 요청이 없습니다.', status: currentStatus }, { status: 400 });
    }

    // 6) 실제 철회 처리
    //    : 취소 요청 자체를 없애버리고, 상태는 그대로 둠
    const now = new Date();

    /**
     * 경합 방어:
     * - findOne 이후 관리자 승인/거절로 cancelRequest.status가 바뀌었을 수 있음
     * - 따라서 "requested 상태일 때만" 철회되도록 조건부 update로 보강
     */
    const u = await rentals.updateOne({ _id: rentalId, userId, 'cancelRequest.status': 'requested' }, { $set: { cancelRequest: null, updatedAt: now } });
    if (u.matchedCount === 0) {
      return NextResponse.json({ message: '철회할 수 있는 취소 요청이 없습니다.', status: currentStatus }, { status: 400 });
    }

    // 7) 히스토리 기록
    const prevStatus = String((doc as any).status ?? 'pending');

    await writeRentalHistory(db, doc._id, {
      action: 'cancel-withdrawn', // HistoryAction 중 하나
      from: prevStatus, // 철회 전 대여 상태
      to: prevStatus, // 철회 후 대여 상태 (변화 없으니 prev와 동일)
      actor: {
        // Actor 타입에 맞춰 객체로
        role: 'user',
        id: sub, // 토큰에서 꺼낸 userId(검증된 값)
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
