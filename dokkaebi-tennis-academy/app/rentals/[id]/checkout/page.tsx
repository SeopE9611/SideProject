import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import RentalsCheckoutClient from '@/app/rentals/[id]/checkout/_components/RentalsCheckoutClient';

export const dynamic = 'force-dynamic';

async function getRentalWithRacket(id: string) {
  const db = (await clientPromise).db();
  const r = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!r) return null;
  const racket = await db.collection('used_rackets').findOne({ _id: r.racketId });
  return {
    id: r._id.toString(),
    period: r.days ?? r.period ?? 0,
    fee: r.amount?.fee ?? r.fee ?? 0,
    deposit: r.amount?.deposit ?? r.deposit ?? 0,
    status: r.status,
    shipping: r.shipping ?? null,
    racket: racket
      ? {
          id: racket._id.toString(),
          brand: racket.brand,
          model: racket.model,
          image: Array.isArray(racket.images) && racket.images[0] ? racket.images[0] : null,
          condition: racket.condition,
        }
      : null,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRentalWithRacket(id);
  if (!data) notFound();
  return <RentalsCheckoutClient initial={data} />;
}
