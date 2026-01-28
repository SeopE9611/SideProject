import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import RentalSelectStringClient from '@/app/rentals/[id]/select-string/RentalSelectStringClient';
import { verifyAccessToken } from '@/lib/auth.utils';
import { cookies } from 'next/headers';
import LoginGate from '@/components/system/LoginGate';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

async function getRacketMini(racketId: string) {
  const db = (await clientPromise).db();

  const racket = await db.collection('used_rackets').findOne({ _id: new ObjectId(racketId) }, { projection: { brand: 1, model: 1, condition: 1, images: 1 } });

  if (!racket) return null;

  const image = Array.isArray(racket.images) && racket.images.length > 0 ? racket.images[0] : null;

  return {
    id: String(racket._id),
    brand: racket.brand ?? '',
    model: racket.model ?? '',
    condition: racket.condition ?? 'B',
    image,
  };
}

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams?: { period?: string } }) {
  const racketId = params.id;

  if (!ObjectId.isValid(racketId)) notFound();

  const raw = Number(searchParams?.period ?? 7);
  const period = raw === 7 || raw === 15 || raw === 30 ? (raw as 7 | 15 | 30) : 7;

  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set('period', String(period));
      const next = `/rentals/${racketId}/select-string` + (qs.toString() ? `?${qs.toString()}` : '');
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const racket = await getRacketMini(racketId);
  if (!racket) notFound();

  return <RentalSelectStringClient racket={racket} period={period} />;
}
