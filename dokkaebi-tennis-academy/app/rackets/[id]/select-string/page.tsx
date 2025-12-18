import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { racketBrandLabel } from '@/lib/constants';
import RacketSelectStringClient from '@/app/rackets/[id]/select-string/RacketSelectStringClient';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const db = (await clientPromise).db();



  if (!ObjectId.isValid(id)) {
    return (
      <div className="container py-10">
        <h1 className="text-lg font-semibold">라켓을 찾을 수 없습니다.</h1>
      </div>
    );
  }
  const doc: any = await db.collection('used_rackets').findOne({ _id: new ObjectId(id) });

  if (!doc) {
    return (
      <div className="container py-10">
        <h1 className="text-lg font-semibold">라켓을 찾을 수 없습니다.</h1>
      </div>
    );
  }

  const racket = {
    id: String(doc._id),
    name: `${racketBrandLabel(doc.brand)} ${doc.model}`.trim(),
    price: Number(doc.price ?? 0),
    image: Array.isArray(doc.images) ? doc.images[0] : undefined,
    status: doc.status,
  };

  return <RacketSelectStringClient racket={racket} />;
}
