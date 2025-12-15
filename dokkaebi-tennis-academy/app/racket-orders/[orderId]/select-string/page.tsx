import SelectStringClient from '@/app/racket-orders/[orderId]/select-string/SelectStringClient';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { notFound } from 'next/navigation';

type PageProps = { params: Promise<{ orderId: string }> };

export default async function SelectStringPage({ params }: PageProps) {
  const { orderId } = await params;

  // orderId 형식 검증 (24자/hex 형태가 아니면 즉시 404)
  if (!ObjectId.isValid(orderId)) notFound();

  // 주문 존재 여부 + 라켓 항목 포함 여부 확인
  const db = (await clientPromise).db();
  // projection으로 필요한 필드만 가져와 성능·보안 모두 이점
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) }, { projection: { items: 1 } });

  if (!order) notFound();

  const hasRacket = Array.isArray(order.items) && order.items.some((it: any) => it?.kind === 'racket');

  // 라켓 구매 주문이 아니면 선택 모드로 올 수 없음
  if (!hasRacket) notFound();

  // 통과: 기존 화면 렌더
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">스트링을 선택해 주세요</h1>
        <p className="text-sm text-slate-600">
          주문 ID: <span className="font-mono">{orderId}</span>
        </p>
        <div className="rounded-lg border p-4 text-sm bg-white">아래 목록에서 스트링을 고른 뒤, 교체 서비스 신청으로 연결됩니다.</div>
      </div>
      <SelectStringClient orderId={orderId} />
    </div>
  );
}
