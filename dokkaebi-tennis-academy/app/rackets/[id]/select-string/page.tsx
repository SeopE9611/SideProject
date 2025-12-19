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
  const racketObjectId = new ObjectId(id);
  const doc: any = await db.collection('used_rackets').findOne({ _id: racketObjectId });

  if (!doc) {
    return (
      <div className="container py-10">
        <h1 className="text-lg font-semibold">라켓을 찾을 수 없습니다.</h1>
      </div>
    );
  }

  // (가드) 라켓 구매 가능 여부: 대여중(판매 불가) / 판매완료 상태를 선택 단계에서 1차 차단
  // - createOrder(서버) 검증이 최종이지만, UX 상 여기서 먼저 막아주면 '장바구니/결제'까지 헛걸음을 줄일 수 있어요.
  const stockQty = Number(doc.quantity ?? 1);
  const activeRentalCount = await db.collection('rental_orders').countDocuments({
    racketId: racketObjectId,
    status: { $in: ['paid', 'out'] },
  });
  const baseQty = !Number.isFinite(stockQty) || stockQty <= 1 ? (doc.status === 'available' ? 1 : 0) : stockQty;
  const sellableQty = baseQty - activeRentalCount;

  if (sellableQty < 1) {
    const reasonLabel = activeRentalCount > 0 ? '현재 대여중인 라켓이라 구매할 수 없습니다.' : '현재 판매 가능한 상태가 아닙니다.';
    return (
      <div className="container py-10 space-y-2">
        <h1 className="text-lg font-semibold">현재 구매할 수 없는 라켓입니다.</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{reasonLabel}</p>
        <a className="text-sm underline" href={`/rackets/${id}`}>
          상세로 돌아가기
        </a>
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
