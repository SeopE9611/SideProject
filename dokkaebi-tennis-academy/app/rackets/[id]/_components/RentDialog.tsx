'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RentDialog({ id, rental, brand, model }: { id: string; rental: any; brand: string; model: string }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<7 | 15 | 30>(7);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      alert(`대여 생성 완료 (id: ${json.id}). 다음 단계에서 결제/주소 입력으로 이동시킬게요.`);
      setOpen(false);
      router.push(`/rentals/${json.id}/checkout`);
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
