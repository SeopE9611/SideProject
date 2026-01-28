import ShippingFormClient from '@/app/services/applications/[id]/shipping/ShippingFormClient';
import LoginGate from '@/components/system/LoginGate';
import { verifyAccessToken } from '@/lib/auth.utils';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: '운송장 입력 | 도깨비 테니스',
  description: '자가발송 신청을 위한 운송장 정보를 입력합니다.',
};

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

// 캐시 방지(운송장 갱신 직후 새로고침 시 즉시 반영되도록)
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  // 비회원 주문/신청 차단 정책(서버)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  // 게스트 허용이 아니면(=비회원 차단 모드), 로그인 안 했을 때는 진입 자체를 LoginGate로 차단
  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      return <LoginGate next={`/services/applications/${p.id}/shipping`} variant="default" />;
    }
  }

  return <ShippingFormClient applicationId={p.id} />;
}
