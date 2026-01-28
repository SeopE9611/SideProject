import RentalsSuccessClient from '@/app/rentals/success/_components/RentalsSuccessClient';
import LoginGate from '@/components/system/LoginGate';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

async function getData(id: string) {
  const db = (await clientPromise).db();
  const r = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!r) return null;
  const rk = await db.collection('used_rackets').findOne({ _id: r.racketId });
  const period = r.days ?? r.period ?? 0;
  const fee = r.amount?.fee ?? r.fee ?? 0;
  const deposit = r.amount?.deposit ?? r.deposit ?? 0;
  const stringPrice = r.amount?.stringPrice ?? 0;
  const stringingFee = r.amount?.stringingFee ?? 0;
  const total = r.amount?.total ?? fee + deposit + stringPrice + stringingFee;

  return {
    id,
    period,
    fee,
    deposit,
    stringPrice,
    stringingFee,
    total,
    status: r.status,
    racket: rk ? { brand: rk.brand, model: rk.model, condition: rk.condition } : null,
    payment: r.payment
      ? {
          method: r.payment.method || 'bank',
          bank: r.payment.bank || null,
          depositor: r.payment.depositor || null,
        }
      : null,
    refundAccount: r.refundAccount
      ? {
          bank: r.refundAccount.bank || null,
          holder: r.refundAccount.holder || null,
          account: r.refundAccount.account || null,
        }
      : null,
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) return <div className="max-w-3xl mx-auto p-6">잘못된 접근입니다.</div>;

  // 비회원 주문(대여) 차단 모드면, success 페이지도 로그인 필수로 막는다.
  // (id만으로 대여/환불계좌 등의 정보가 렌더링될 수 있으므로 DB 조회 전에 차단)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set('id', id);
      const next = `/rentals/success?${qs.toString()}`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }
  const data = await getData(id);
  if (!data) return <div className="max-w-3xl mx-auto p-6">존재하지 않는 대여 건입니다.</div>;
  return <RentalsSuccessClient data={data} />;
}
