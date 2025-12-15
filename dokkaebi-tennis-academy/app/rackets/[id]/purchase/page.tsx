import RacketPurchaseCheckoutClient from '@/app/rackets/[id]/_components/RacketPurchaseCheckoutClient';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { notFound } from 'next/navigation';

export default async function RacketPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) notFound();

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
