import RentalsSuccessClient from '@/app/rentals/success/_components/RentalsSuccessClient';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  const db = (await clientPromise).db();
  const r = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!r) return null;
  const rk = await db.collection('used_rackets').findOne({ _id: r.racketId });
  const period = r.days ?? r.period ?? 0;
  const fee = r.amount?.fee ?? r.fee ?? 0;
  const deposit = r.amount?.deposit ?? r.deposit ?? 0;

  return {
    id,
    period,
    fee,
    deposit,
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
  const data = await getData(id);
  if (!data) return <div className="max-w-3xl mx-auto p-6">존재하지 않는 대여 건입니다.</div>;
  return <RentalsSuccessClient data={data} />;
}
