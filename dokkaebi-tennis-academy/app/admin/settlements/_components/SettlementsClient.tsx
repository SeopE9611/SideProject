'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function SettlementsClient() {
  const [yyyymm, setYyyymm] = useState<string>(new Date().toISOString().slice(0, 7).replace('-', ''));
  const { data, mutate, isLoading } = useSWR('/api/settlements', fetcher);

  const createSnapshot = async () => {
    await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
    mutate();
  };

  const downloadCSV = () => {
    const rows = data ?? [];
    const header = ['yyyymm', 'paid', 'refund', 'net', 'orders', 'applications'];
    const csv = [header.join(',')].concat(rows.map((r: any) => [r.yyyymm, r.totals?.paid || 0, r.totals?.refund || 0, r.totals?.net || 0, r.breakdown?.orders || 0, r.breakdown?.applications || 0].join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlements.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">정산 스냅샷</h1>

      {/* 월 선택 + 생성 */}
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-sm mb-1">대상 월(YYYYMM)</label>
          <input value={yyyymm} onChange={(e) => setYyyymm(e.target.value.replace(/[^0-9]/g, ''))} placeholder="202510" className="border rounded px-3 py-2" />
        </div>
        <button onClick={createSnapshot} className="px-4 py-2 rounded bg-black text-white">
          스냅샷 생성
        </button>
        <button onClick={downloadCSV} className="px-4 py-2 rounded border">
          CSV 다운로드
        </button>
      </div>

      {/* 목록 */}
      <div className="border rounded">
        <div className="grid grid-cols-6 p-3 font-medium bg-muted/40">
          <div>월</div>
          <div>매출</div>
          <div>환불</div>
          <div>순익</div>
          <div>주문수</div>
          <div>신청수</div>
        </div>
        {isLoading ? (
          <div className="p-4">불러오는 중…</div>
        ) : (
          (data ?? []).map((row: any) => (
            <div key={row.yyyymm} className="grid grid-cols-6 p-3 border-t">
              <div>{row.yyyymm}</div>
              <div>{(row.totals?.paid || 0).toLocaleString()}</div>
              <div>{(row.totals?.refund || 0).toLocaleString()}</div>
              <div className="font-semibold">{(row.totals?.net || 0).toLocaleString()}</div>
              <div>{row.breakdown?.orders || 0}</div>
              <div>{row.breakdown?.applications || 0}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
