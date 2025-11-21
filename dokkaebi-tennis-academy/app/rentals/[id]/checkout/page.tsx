import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import RentalsCheckoutClient from '@/app/rentals/[id]/checkout/_components/RentalsCheckoutClient';

export const dynamic = 'force-dynamic';

// [id] = racketId, period = 7|15|30
async function getInitialForRacket(racketId: string, period: number) {
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

  return {
    racketId: racket._id.toString(),
    period: days,
    fee,
    deposit,
    racket: {
      id: racket._id.toString(),
      brand: racket.brand,
      model: racket.model,
      image: Array.isArray(racket.images) && racket.images[0] ? racket.images[0] : null,
      condition: racket.condition,
    },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string }> }) {
  const [{ id }, s] = await Promise.all([params, searchParams]);
  const rawPeriod = Number((s?.period as string | undefined) ?? NaN);
  const period = rawPeriod === 7 || rawPeriod === 15 || rawPeriod === 30 ? rawPeriod : 7;

  const data = await getInitialForRacket(id, period);
  if (!data) notFound();

  return <RentalsCheckoutClient initial={data} />;
}
