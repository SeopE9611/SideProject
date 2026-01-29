import ReturnShippingForm from '@/app/mypage/rentals/[id]/return-shipping/return-form';
import LoginGate from '@/components/system/LoginGate';
import { verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';

export default async function Page({ params }: { params: { id: string } }) {
  // verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
  function safeVerifyAccessToken(token?: string) {
    if (!token) return null;
    try {
      return verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  // 비회원 주문/대여 차단: 반송 운송장 등록도 회원만 허용
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';
  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const next = `/mypage/rentals/${params.id}/return-shipping`;
      return <LoginGate next={next} variant="default" />;
    }
  }

  return <ReturnShippingForm rentalId={params.id} />;
}
