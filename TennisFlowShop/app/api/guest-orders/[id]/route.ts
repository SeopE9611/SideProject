import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

// 단일 비회원 주문 상세 조회
type GuestOrderMode = 'off' | 'legacy' | 'on';

function getGuestOrderMode(): GuestOrderMode {
  const raw = (process.env.GUEST_ORDER_MODE ?? 'on').trim();
  return raw === 'off' || raw === 'legacy' || raw === 'on' ? raw : 'on';
}

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === 'visit') return '방문 접수';
  if (collectionMethod === 'courier_pickup') return '기사 방문 수거';
  return '발송 접수';
}

function getTensionSummary(lines: any[]): string | null {
  const set = Array.from(
    new Set(
      lines
        .map((line: any) => {
          const main = String(line?.tensionMain ?? '').trim();
          const cross = String(line?.tensionCross ?? '').trim();
          if (!main && !cross) return '';
          return cross && cross !== main ? `${main}/${cross}` : main || cross;
        })
        .filter(Boolean),
    ),
  );
  return set.length ? set.join(', ') : null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
     // 운영 정책: 비회원 주문을 받지 않는 경우(off)에는 "비회원 주문 조회/상세"도 중단
    // 주문 존재 여부를 외부에 노출하지 않기 위해 404로 통일.
    if (getGuestOrderMode() === 'off') {
      return NextResponse.json({ success: false, error: '비회원 주문 조회가 현재 중단되었습니다.' }, { status: 404 });
    }
    const client = await clientPromise;
    const db = client.db();

    // 요청된 주문 ID로 주문 조회
    const { id } = await params;
    const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });

    if (!order) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);

    // 보호 로직: 회원 주문일 경우, 로그인된 사용자만 접근 가능
    if (order.userId) {
      if (!payload || payload.sub !== order.userId.toString()) {
        return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 비회원 주문조회에서도 교체서비스 핵심 요약을 바로 볼 수 있도록 읽기용 요약을 함께 제공
    const apps = await db
      .collection('stringing_applications')
      .find({
        orderId: order._id,
        status: { $ne: '취소' },
      })
      .toArray();

    const stringingApplications = apps.map((app: any) => {
      const lines = getApplicationLines(app?.stringDetails);
      const stringNames = Array.from(new Set(lines.map((line: any) => String(line?.stringName ?? '').trim()).filter(Boolean)));
      const preferredDate = String(app?.stringDetails?.preferredDate ?? '').trim();
      const preferredTime = String(app?.stringDetails?.preferredTime ?? '').trim();
      return {
        id: app._id?.toString(),
        status: app.status ?? 'draft',
        createdAt: app.createdAt ?? null,
        racketCount: lines.length,
        receptionLabel: getReceptionLabel(app?.collectionMethod),
        tensionSummary: getTensionSummary(lines),
        stringNames,
        reservationLabel: preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
      };
    });

    const latestApplication = stringingApplications
      .filter((app) => app.id)
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0] ?? null;

    const isStringServiceApplied = stringingApplications.some((app) => app.status !== 'draft');

    // 비회원 주문은 userId 없음 -> 누구나 접근 허용
    return NextResponse.json({
      success: true,
      order: {
        ...order,
        isStringServiceApplied,
        stringingApplicationId: latestApplication?.id ?? null,
        stringingApplications,
      },
    });
  } catch (err) {
    console.error('[GUEST_ORDER_DETAIL_ERROR]', err);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
