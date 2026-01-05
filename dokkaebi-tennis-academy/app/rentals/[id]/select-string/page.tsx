import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import RentalSelectStringClient from '@/app/rentals/[id]/select-string/RentalSelectStringClient';

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

  const racket = await getRacketMini(racketId);
  if (!racket) notFound();

  return <RentalSelectStringClient racket={racket} period={period} />;
}
