import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import RentalsCheckoutClient from '@/app/rentals/[id]/checkout/_components/RentalsCheckoutClient';
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

// [id] = racketId, period = 7|15|30
async function getInitialForRacket(racketId: string, period: number, stringId?: string) {
  const db = (await clientPromise).db();
  const racket = await db.collection('used_rackets').findOne({
    _id: new ObjectId(racketId),
  });

  if (!racket) return null;

  const days = (period === 7 || period === 15 || period === 30 ? period : 7) as 7 | 15 | 30;

  const feeMap = {
    7: racket.rental?.fee?.d7 ?? 0,
    15: racket.rental?.fee?.d15 ?? 0,
    30: racket.rental?.fee?.d30 ?? 0,
  } as const;

  const fee = feeMap[days] ?? 0;
  const deposit = Number(racket.rental?.deposit ?? 0);

  //  선택 스트링(옵션): stringId가 있으면 products에서 미니 정보 조회
  let selectedString:
    | undefined
    | {
        id: string;
        name: string;
        price: number;
        mountingFee: number; // 상품별 교체비(장착비)
        image: string | null;
      } = undefined;
  if (stringId && ObjectId.isValid(stringId)) {
    const p = await db.collection('products').findOne({ _id: new ObjectId(stringId) }, { projection: { name: 1, price: 1, mountingFee: 1, images: 1, thumbnail: 1 } });
    if (p) {
      const img = (typeof (p as any).thumbnail === 'string' && (p as any).thumbnail) || (Array.isArray((p as any).images) && (p as any).images[0] ? (p as any).images[0] : null);
      selectedString = {
        id: stringId,
        name: (p as any).name ?? '',
        price: Number((p as any).price ?? 0),
        mountingFee: Number((p as any).mountingFee ?? 0),
        image: img,
      };
    }
  }

  return {
    racketId: racket._id.toString(),
    period: days,
    fee,
    deposit,
    // 구매 플로우와 동일하게: stringId(=선택된 스트링) 유무가 곧 신청 여부
    requestStringing: Boolean(selectedString?.id),
    selectedString,
    racket: {
      id: racket._id.toString(),
      brand: racket.brand,
      model: racket.model,
      image: Array.isArray(racket.images) && racket.images[0] ? racket.images[0] : null,
      condition: racket.condition,
    },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; stringId?: string }> }) {
  const [{ id }, s] = await Promise.all([params, searchParams]);
  const rawPeriod = Number((s?.period as string | undefined) ?? NaN);
  const period = rawPeriod === 7 || rawPeriod === 15 || rawPeriod === 30 ? rawPeriod : 7;
  const stringId = (s?.stringId as string | undefined) ?? undefined;

  // 비회원 주문(대여) 차단 정책(서버)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set('period', String(period));
      if (stringId) qs.set('stringId', stringId);
      const next = `/rentals/${id}/checkout` + (qs.toString() ? `?${qs.toString()}` : '');
      return <LoginGate next={next} variant="checkout" />;
    }
  }

  const data = await getInitialForRacket(id, period, stringId);
  if (!data) notFound();

  return <RentalsCheckoutClient initial={data} />;
}
