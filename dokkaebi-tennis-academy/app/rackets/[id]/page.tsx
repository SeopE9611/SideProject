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

// ———————————————————————————————————————
// 간단한 대여 모달(동일 파일 내 임시 구현)
// 추후 /_components/RentDialog.tsx로 분리 예정
// ———————————————————————————————————————
('use client');
import { useState } from 'react';

function RentDialog({ id, rental, brand, model }: { id: string; rental: any; brand: string; model: string }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<7 | 15 | 30>(7);
  const [loading, setLoading] = useState(false);
  const fee = period === 7 ? rental.fee.d7 : period === 15 ? rental.fee.d15 : rental.fee.d30;

  const onSubmit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rackets/${id}/rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.message ?? '대여 생성에 실패했어요.');
        return;
      }
      // TODO: 생성 후 체크아웃 페이지로 라우팅(다음 단계)
      alert(`대여 생성 완료 (id: ${json.id}). 다음 단계에서 결제/주소 입력으로 이동시킬게요.`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="h-10 px-4 rounded-lg bg-emerald-600 text-white" onClick={() => setOpen(true)}>
        대여하기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-4">
            <div className="text-lg font-semibold">대여 신청</div>
            <div className="text-sm text-gray-500">
              {brand} {model}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">기간 선택</div>
              <div className="flex gap-2">
                {[7, 15, 30].map((d) => (
                  <button key={d} onClick={() => setPeriod(d as 7 | 15 | 30)} className={`h-9 px-3 rounded border ${period === d ? 'bg-emerald-50 border-emerald-300' : ''}`}>
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border p-3 text-sm">
              <div>
                수수료: <strong>{fee.toLocaleString()}원</strong>
              </div>
              <div>
                보증금: <strong>{(rental.deposit ?? 0).toLocaleString()}원</strong>
              </div>
              <div className="text-xs text-gray-500 mt-1">* 반납 완료 시 보증금 환불(연체/파손 시 차감)</div>
            </div>

            <div className="flex justify-end gap-2">
              <button className="h-9 px-4 rounded border" onClick={() => setOpen(false)} disabled={loading}>
                취소
              </button>
              <button className="h-9 px-4 rounded bg-emerald-600 text-white disabled:opacity-50" onClick={onSubmit} disabled={loading}>
                {loading ? '처리 중...' : '대여 신청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
