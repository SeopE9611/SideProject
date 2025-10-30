import RentDialog from '@/app/rackets/[id]/_components/RentDialog';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getData(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/rackets/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function RacketDetailPage({ params }: { params: { id: string } }) {
  const doc = await getData(params.id);
  if (!doc) {
    return <div className="max-w-4xl mx-auto p-4">존재하지 않는 라켓입니다.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 이미지 영역 */}
      <div className="space-y-3">
        <div className="aspect-[4/5] bg-gray-100 relative rounded-lg overflow-hidden">
          {doc.images?.[0] ? (
            <Image src={doc.images[0]} alt={`${doc.brand} ${doc.model}`} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">이미지 없음</div>
          )}
        </div>
        {/* 썸네일들(있다면) */}
        <div className="grid grid-cols-5 gap-2">
          {(doc.images ?? []).slice(0, 5).map((src: string, i: number) => (
            <div key={i} className="aspect-square bg-gray-100 relative rounded">
              <Image src={src} alt={`thumb-${i}`} fill sizes="20vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* 정보/CTA 영역 */}
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">{doc.brand}</div>
          <h1 className="text-2xl font-semibold">{doc.model}</h1>
          <div className="text-sm">
            상태: <span className="font-semibold">{doc.condition}</span>
          </div>
        </div>

        {/* 가격/정책 */}
        <div className="rounded-lg border p-4 space-y-1">
          <div className="text-xl font-bold">{doc.price?.toLocaleString()}원</div>
          <div className="text-xs text-gray-500">* 중고 상품 특성상 단순 변심 환불이 제한될 수 있어요.</div>
        </div>

        {/* 스펙 표 (간단) */}
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">스펙</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-gray-500">무게</div>
            <div>{doc.spec?.weight} g</div>
            <div className="text-gray-500">밸런스</div>
            <div>{doc.spec?.balance} mm</div>
            <div className="text-gray-500">헤드사이즈</div>
            <div>{doc.spec?.headSize} in²</div>
            <div className="text-gray-500">패턴</div>
            <div>{doc.spec?.pattern}</div>
            <div className="text-gray-500">그립</div>
            <div>{doc.spec?.gripSize}</div>
          </div>
        </div>

        {/* CTA 영역: 구매 / 대여 */}
        <div className="flex gap-2">
          {/* 구매: 우선 비활성 or 추후 체크아웃 연결 */}
          <button className="h-10 px-4 rounded-lg bg-gray-200 text-gray-700 cursor-not-allowed" title="다음 단계에서 연결 예정" disabled>
            구매(준비중)
          </button>

          {/* 대여: 모달 열기 → 아래 컴포넌트에서 실제 동작 */}
          {doc?.rental?.enabled ? (
            <RentDialog id={doc.id} rental={doc.rental} brand={doc.brand} model={doc.model} />
          ) : (
            <button className="h-10 px-4 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed" disabled>
              대여 불가
            </button>
          )}
        </div>

        <div>
          <Link href="/rackets" className="text-sm text-blue-600 underline">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
