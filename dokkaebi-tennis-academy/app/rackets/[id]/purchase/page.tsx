import RacketPurchaseCheckoutClient from '@/app/rackets/[id]/_components/RacketPurchaseCheckoutClient';
import LoginGate from '@/components/system/LoginGate';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

export default async function RacketPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  // verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
  function safeVerifyAccessToken(token?: string) {
    if (!token) return null;
    try {
      return verifyAccessToken(token);
    } catch {
      return null;
    }
  }
  const { id } = await params;

  if (!ObjectId.isValid(id)) notFound();

  // 비회원 주문/구매 차단(서버 1차 방어)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';
  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      return <LoginGate next={`/rackets/${id}/purchase`} variant="checkout" />;
    }
  }

  const client = await clientPromise;
  const db = client.db();

  const racket = await db.collection('used_rackets').findOne({ _id: new ObjectId(id) });
  if (!racket) notFound();

  const racketView = {
    id: racket._id.toString(),
    brand: racket.brand,
    model: racket.model,
    price: racket.price ?? 0,
    images: racket.images ?? [],
    status: racket.status,
  };

  return <RacketPurchaseCheckoutClient racket={racketView} />;
}
