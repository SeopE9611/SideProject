import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { findBlockingPackageOrderByUserId } from '@/lib/package-order-ownership';

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const token = (await cookies()).get('accessToken')?.value ?? null;
    const user = safeVerifyAccessToken(token);
    if (!user?.sub) {
      return NextResponse.json({ hasBlockingPackage: false }, { status: 200 });
    }

    const blockingOrder = await findBlockingPackageOrderByUserId(String(user.sub));
    if (!blockingOrder) {
      return NextResponse.json({ hasBlockingPackage: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        hasBlockingPackage: true,
        message: '이미 보유 중인 패키지가 있어 추가 구매할 수 없습니다. 기존 패키지를 취소 또는 정리한 뒤 다시 시도해주세요.',
        blockingOrder: {
          id: blockingOrder._id.toString(),
          status: String(blockingOrder.status ?? ''),
          paymentStatus: String(blockingOrder.paymentStatus ?? ''),
          packageTitle: String(blockingOrder?.packageInfo?.title ?? ''),
          sessions: Number(blockingOrder?.packageInfo?.sessions ?? 0),
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[GET /api/packages/ownership] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
