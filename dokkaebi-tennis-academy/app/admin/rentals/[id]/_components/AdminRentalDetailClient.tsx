'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const won = (n: number) => (n || 0).toLocaleString('ko-KR') + '원';

export default function AdminRentalDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(id ? `/api/rentals/${id}` : null, fetcher);
  const [busy, setBusy] = useState(false); //  전체 상세 화면 처리 중

  // 보증금 환불 처리/해제(멱등)
  const onToggleRefund = async (mark: boolean) => {
    const ok = confirm(mark ? '보증금 환불 처리할까요?' : '보증금 환불 처리 해제할까요?');
    if (!ok) return;
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/admin/rentals/${id}/deposit/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: mark ? 'mark' : 'clear' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      alert(json?.message || '처리 실패');
      setBusy(false);
      return;
    }
    await mutate(); // 상세 재검증
    alert(mark ? '환불 처리 완료' : '환불 해제 완료');
    setBusy(false);
  };

  const onOut = async () => {
    if (!confirm('대여를 시작(out) 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${id}/out`, { method: 'POST' });
    if (res.ok) {
      mutate();
      alert('대여 시작 처리 완료');
    } else alert('처리 실패');
  };

  const onReturn = async () => {
    if (!confirm('반납 처리하시겠어요?')) return;
    const res = await fetch(`/api/rentals/${id}/return`, { method: 'POST' });
    if (res.ok) {
      mutate();
      alert('반납 처리 완료');
    } else alert('처리 실패');
  };

  if (!id) return <div className="p-4">유효하지 않은 ID</div>;
  if (isLoading || !data) return <div className="p-4">불러오는 중…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">대여 상세</h1>
        <button onClick={() => router.push('/admin/rentals')} className="h-9 rounded border px-3">
          목록으로
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid grid-cols-3 gap-y-2 text-sm">
          <div className="text-gray-500">대여 번호</div>
          <div className="col-span-2">{data.id}</div>
          <div className="text-gray-500">라켓</div>
          <div className="col-span-2">
            {data.brand} {data.model}
          </div>
          <div className="text-gray-500">기간</div>
          <div className="col-span-2">{data.days}일</div>
          <div className="text-gray-500">수수료</div>
          <div className="col-span-2">{won(data.amount?.fee)}</div>
          <div className="text-gray-500">보증금</div>
          <div className="col-span-2">{won(data.amount?.deposit)}</div>
          <div className="text-gray-500">총액</div>
          <div className="col-span-2 font-semibold">{won(data.amount?.total)}</div>
          <div className="text-gray-500">상태</div>
          <div className="col-span-2">{data.status}</div>
          <div className="text-gray-500">반납 예정</div>
          <div className="col-span-2">{data.dueAt ? new Date(data.dueAt).toLocaleDateString('ko-KR') : '-'}</div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="h-9 rounded bg-sky-600 px-3 text-white disabled:opacity-50"
            disabled={busy || !(data.status === 'paid')}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              await onOut();
              setBusy(false);
            }}
          >
            {busy ? '처리중…' : '대여 시작(out)'}
          </button>
          <button
            className="h-9 rounded bg-emerald-600 px-3 text-white disabled:opacity-50"
            disabled={busy || !['paid', 'out'].includes(data.status)}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              await onReturn();
              setBusy(false);
            }}
          >
            {busy ? '처리중…' : '반납 처리(return)'}
          </button>
          {/* returned 상태에서만 환불 토글 노출 */}
          {data.status === 'returned' &&
            (data.depositRefundedAt ? (
              <button className="h-9 rounded border px-3 hover:bg-gray-50" title="보증금 환불 처리 해제" disabled={busy} onClick={() => onToggleRefund(false)}>
                {busy ? '처리중…' : '환불 해제'}
              </button>
            ) : (
              <button className="h-9 rounded border px-3 hover:bg-gray-50" title="보증금 환불 처리" disabled={busy} onClick={() => onToggleRefund(true)}>
                {busy ? '처리중…' : '환불 처리'}
              </button>
            ))}
        </div>
        {/* 타임라인(표시 전용) */}
        <div className="mt-4 rounded-lg bg-muted/40 p-3">
          <div className="text-sm text-muted-foreground mb-1">대여 타임라인</div>
          <ul className="text-sm space-y-1">
            <li>
              대여 시작: <span className="font-medium">{data.outAt ? new Date(data.outAt).toLocaleString('ko-KR') : '-'}</span>
            </li>
            <li>
              반납 예정: <span className="font-medium">{data.dueAt ? new Date(data.dueAt).toLocaleDateString('ko-KR') : '-'}</span>
            </li>
            <li>
              반납 완료: <span className="font-medium">{data.returnedAt ? new Date(data.returnedAt).toLocaleString('ko-KR') : '-'}</span>
            </li>
            <li>
              환불 시각: <span className="font-medium">{data.depositRefundedAt ? new Date(data.depositRefundedAt).toLocaleString('ko-KR') : '-'}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
