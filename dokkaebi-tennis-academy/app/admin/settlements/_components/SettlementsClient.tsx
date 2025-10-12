'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/toast';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// KST(Asia/Seoul) 기준 YYYY-MM-DD 문자열 포맷터
const TZ = 'Asia/Seoul';
function fmtYMD_KST(date = new Date()) {
  // en-CA는 2025-10-12 형태를 보장
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// KST 기준 이번 달 1일 (문자열)
function firstDayOfMonth_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(base).reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-01`;
}

// KST 기준 지난 달 [from, to] (문자열 범위)
function prevMonthRange_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(base).reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  let y = Number(parts.year);
  let m = Number(parts.month);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  const mm = String(m).padStart(2, '0');
  // KST는 DST가 없어 월말 계산에 로컬 Date 사용해도 안전
  const lastDay = new Date(y, m, 0).getDate(); // m은 1-12
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export default function SettlementsClient() {
  const [yyyymm, setYyyymm] = useState<string>(new Date().toISOString().slice(0, 7).replace('-', ''));
  const { data, mutate, isLoading } = useSWR('/api/settlements', fetcher);
  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');
  const [from, setFrom] = useState(() => firstDayOfMonth_KST());
  const [to, setTo] = useState(() => fmtYMD_KST());
  const [live, setLive] = useState<any | null>(null);

  // 스냅샷과 현재 값이 다른(=갱신 필요) 월 표시용
  const [staleMap, setStaleMap] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<string, 'ok' | 'stale' | 'checking'>>({});

  const [bulkChecking, setBulkChecking] = useState(false);

  // 캐시 키: yyyymm + 스냅샷의 버전(최초/최종 생성시각 중 하나)
  // 라우트에 lastGeneratedAt/createdAt 필드를 이미 넣었으니 그중 존재하는 걸 사용
  function getCacheKey(row: any) {
    const ver = row.lastGeneratedAt || row.createdAt || '';
    return `settle:${row.yyyymm}:${new Date(ver).getTime()}`;
  }

  async function validateAll(rows: any[]) {
    setBulkChecking(true);
    try {
      for (const row of rows) {
        const key = String(row.yyyymm);
        setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
        const { ok } = await checkStalenessOfRow(row);
        setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
        setStaleMap((prev) => ({ ...prev, [key]: !ok }));
        // 세션 캐시 저장
        sessionStorage.setItem(getCacheKey(row), ok ? 'ok' : 'stale');
      }
      showSuccessToast('전체 검증 완료');
    } catch (e) {
      console.error(e);
      showErrorToast('전체 검증 중 오류가 발생했습니다.');
    } finally {
      setBulkChecking(false);
    }
  }

  // 파일명 생성 핼퍼
  function makeCsvFilename(base: string) {
    // Windows 금지문자 치환
    const safe = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);

    // KST 타임스탬프: 20251011_192115
    const tz = 'Asia/Seoul';
    const fmt = new Intl.DateTimeFormat('ko-KR', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const ts = `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;

    return `${safe}_${ts}.csv`;
  }

  const createSnapshot = async () => {
    try {
      await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
      mutate();
      showSuccessToast(`${yyyymm} 스냅샷 생성 완료`);
    } catch (e) {
      console.error(e);
      showErrorToast('스냅샷 생성 실패');
    }
  };

  async function fetchLive() {
    const q = new URLSearchParams({ from, to }).toString();
    const res = await fetch(`/api/settlements/live?${q}`);
    setLive(await res.json());
  }

  const downloadCSV = () => {
    const rows = data ?? [];
    const header = ['월(YYYYMM)', '매출', '환불', '순익', '주문수', '신청수'];
    const csvRows = rows.map((r: any) => [`'${String(r.yyyymm)}`, r.totals?.paid || 0, r.totals?.refund || 0, r.totals?.net || 0, r.breakdown?.orders || 0, r.breakdown?.applications || 0]);

    // 파일명: 목록의 최소~최대 yyyymm 계산
    const yyyymms = rows.map((r: any) => String(r.yyyymm)).filter(Boolean);
    const minYm = yyyymms.length ? yyyymms[yyyymms.length - 1] : 'YYYYMM';
    const maxYm = yyyymms.length ? yyyymms[0] : 'YYYYMM';

    // CRLF + BOM
    const lines = [header, ...csvRows].map((a) => a.join(',')).join('\r\n');
    const csv = '\ufeff' + lines;

    const fileName = makeCsvFilename(`도깨비테니스_정산스냅샷_${minYm}-${maxYm}`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 갱신 버튼 핼퍼
  async function rebuildSnapshot(yyyymm: string) {
    await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
  }

  function monthEdges(yyyymm: string) {
    const y = Number(yyyymm.slice(0, 4)),
      m = Number(yyyymm.slice(4, 6)) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    return { from, to };
  }

  // 검증 로직 함수
  async function checkStalenessOfRow(row: any) {
    const yyyymm = String(row.yyyymm);
    const { from, to } = monthEdges(yyyymm);

    // 같은 달의 "실시간 집계"를 조회해 스냅샷과 비교
    const res = await fetch(`/api/settlements/live?from=${from}&to=${to}`);
    const liveJson = await res.json();

    const paidOk = (row.totals?.paid || 0) === (liveJson.totals?.paid || 0);
    const refundOk = (row.totals?.refund || 0) === (liveJson.totals?.refund || 0);
    const netOk = (row.totals?.net || 0) === (liveJson.totals?.net || 0);
    const ordOk = (row.breakdown?.orders || 0) === (liveJson.breakdown?.orders || 0);
    const appOk = (row.breakdown?.applications || 0) === (liveJson.breakdown?.applications || 0);

    return { ok: paidOk && refundOk && netOk && ordOk && appOk, live: liveJson };
  }

  useEffect(() => {
    if (!data?.length) return;
    const nextStatus: Record<string, 'ok' | 'stale'> = {};
    const nextStale: Record<string, boolean> = {};
    for (const row of data) {
      const key = String(row.yyyymm);
      const cached = sessionStorage.getItem(getCacheKey(row));
      if (cached === 'ok' || cached === 'stale') {
        nextStatus[key] = cached as any;
        nextStale[key] = cached === 'stale';
      }
    }
    if (Object.keys(nextStatus).length) setStatusMap((prev) => ({ ...nextStatus, ...prev }));
    if (Object.keys(nextStale).length) setStaleMap((prev) => ({ ...nextStale, ...prev }));
  }, [data]);

  return (
    <>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('snapshot')} className={tab === 'snapshot' ? 'font-bold' : ''}>
          스냅샷
        </button>
        <button onClick={() => setTab('live')} className={tab === 'live' ? 'font-bold' : ''}>
          실시간
        </button>
      </div>
      {tab === 'snapshot' && (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">정산 스냅샷</h1>

          {/* 월 선택 + 생성 */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm mb-1">대상 월(YYYYMM)</label>
              <input
                value={yyyymm}
                onChange={(e) => setYyyymm(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createSnapshot();
                }}
                placeholder="202510"
                className="border rounded px-3 py-2"
              />
            </div>
            <button onClick={createSnapshot} className="px-4 py-2 rounded bg-black text-white">
              스냅샷 생성
            </button>
            <button onClick={downloadCSV} className="px-4 py-2 rounded border">
              CSV 다운로드
            </button>
            <button
              onClick={async () => {
                const fresh = await mutate();
                await validateAll(fresh ?? []);
              }}
              disabled={bulkChecking || !data?.length}
              className="px-3 py-2 rounded border"
            >
              {bulkChecking ? '검증 중…' : '전체 검증'}
            </button>
          </div>

          {/* 목록 */}
          <div className="border rounded">
            <div className="grid grid-cols-8 p-3 font-medium bg-muted/40">
              <div>월</div>
              <div>매출</div>
              <div>환불</div>
              <div>순익</div>
              <div>주문수</div>
              <div>신청수</div>
              <div>상태</div>
              <div>액션</div>
            </div>

            {isLoading ? (
              <div className="p-4">불러오는 중…</div>
            ) : (
              (data ?? []).map((row: any, idx: number) => (
                <div key={row.yyyymm} className={`grid grid-cols-8 p-3 border-t ${idx === 0 ? 'bg-muted/20 font-semibold' : ''}`}>
                  {/* 월 + 빨간점(갱신 필요) 배지 */}
                  <div className="flex items-center gap-2">
                    <span>{row.yyyymm}</span>
                    {staleMap[String(row.yyyymm)] && <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="갱신 필요" />}
                  </div>

                  <div>{(row.totals?.paid || 0).toLocaleString()}</div>
                  <div>{(row.totals?.refund || 0).toLocaleString()}</div>
                  <div className="font-semibold">{(row.totals?.net || 0).toLocaleString()}</div>
                  <div>{row.breakdown?.orders || 0}</div>
                  <div>{row.breakdown?.applications || 0}</div>

                  {/* ── 새로 추가: 상태 셀 */}
                  <div>
                    {statusMap[String(row.yyyymm)] === 'checking' && <span className="text-xs rounded px-2 py-1 bg-slate-200">검증 중…</span>}
                    {statusMap[String(row.yyyymm)] === 'ok' && <span className="text-xs rounded px-2 py-1 bg-green-100 text-green-700">최신</span>}
                    {statusMap[String(row.yyyymm)] === 'stale' && <span className="text-xs rounded px-2 py-1 bg-rose-100 text-rose-700">갱신 필요</span>}
                    {!statusMap[String(row.yyyymm)] && <span className="text-xs text-slate-400">-</span>}
                  </div>

                  {/* 액션 셀 */}
                  <div className="flex gap-2">
                    {/* 갱신 */}
                    <button
                      className="px-2 py-1 border rounded text-sm"
                      onClick={async () => {
                        try {
                          await rebuildSnapshot(String(row.yyyymm));
                          // 갱신 후 상태 업데이트
                          await mutate();
                          setStatusMap((prev) => ({ ...prev, [String(row.yyyymm)]: 'ok' }));
                          setStaleMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                          showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                        } catch (e) {
                          console.error(e);
                          showErrorToast('스냅샷 갱신 중 오류가 발생했습니다.');
                        }
                      }}
                    >
                      갱신
                    </button>

                    {/* 검증 */}
                    <button
                      className="px-2 py-1 border rounded text-sm"
                      onClick={async () => {
                        const key = String(row.yyyymm);
                        try {
                          setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
                          const { ok, live } = await checkStalenessOfRow(row);

                          setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
                          setStaleMap((prev) => ({ ...prev, [key]: !ok }));

                          if (ok) {
                            showSuccessToast('스냅샷이 현재 집계와 일치합니다.');
                          } else {
                            showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다. ‘갱신’을 권장합니다.`);
                            // 세부 수치 차이를 모달/얼럿으로 띄우고 싶으면 아래 유지 가능
                            // alert(`매출 ${ (row.totals?.paid||0).toLocaleString() } → ${ (live.totals?.paid||0).toLocaleString() } ...`);
                          }
                        } catch (e) {
                          console.error(e);
                          setStatusMap((prev) => ({ ...prev, [key]: 'stale' })); // 안전하게 갱신 권고
                          showErrorToast('검증 중 오류가 발생했습니다.');
                        }
                      }}
                    >
                      검증
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {tab === 'live' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm mb-1">FROM</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">TO</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2" />
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  const fromStr = firstDayOfMonth_KST();
                  const toStr = fmtYMD_KST();
                  setFrom(fromStr);
                  setTo(toStr);
                }}
              >
                이번 달
              </button>

              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  const r = prevMonthRange_KST();
                  setFrom(r.from);
                  setTo(r.to);
                }}
              >
                지난 달
              </button>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  const end = new Date();
                  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
                  setFrom(fmtYMD_KST(start));
                  setTo(fmtYMD_KST(end));
                }}
              >
                지난 7일
              </button>

              <span className="text-xs text-muted-foreground self-center">※ KST 기준 합산</span>
            </div>
            <button onClick={fetchLive} className="px-4 py-2 rounded bg-black text-white">
              조회
            </button>
            <button
              onClick={() => {
                if (!live) return;

                const header = ['기간', '매출', '환불', '순익', '주문수', '신청수'];
                const rows = [[`${live.range.from} ~ ${live.range.to}`, live.totals?.paid || 0, live.totals?.refund || 0, live.totals?.net || 0, live.breakdown?.orders || 0, live.breakdown?.applications || 0]];

                // CRLF + UTF-8 BOM
                const lines = [header, ...rows].map((r) => r.join(',')).join('\r\n');
                const csv = '\ufeff' + lines; // ← BOM

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = makeCsvFilename(`도깨비테니스_정산실시간_${live.range.from}~${live.range.to}`);
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 border rounded"
            >
              CSV
            </button>
          </div>

          {live && (
            <div className="border rounded">
              <div className="flex justify-end p-2"></div>
              <div className="grid grid-cols-6 p-3 font-medium bg-muted/40">
                <div>기간</div>
                <div>매출</div>
                <div>환불</div>
                <div>순익</div>
                <div>주문수</div>
                <div>신청수</div>
              </div>
              <div className="grid grid-cols-6 p-3 border-t">
                <div>
                  {live.range.from} ~ {live.range.to}
                </div>
                <div>{(live.totals?.paid || 0).toLocaleString()}</div>
                <div>{(live.totals?.refund || 0).toLocaleString()}</div>
                <div className="font-semibold">{(live.totals?.net || 0).toLocaleString()}</div>
                <div>{live.breakdown?.orders || 0}</div>
                <div>{live.breakdown?.applications || 0}</div>
              </div>
              <div className="grid grid-cols-6 p-3 border-t bg-muted/30 font-medium">
                <div>총계</div>
                <div>{(live.totals?.paid || 0).toLocaleString()}</div>
                <div>{(live.totals?.refund || 0).toLocaleString()}</div>
                <div>{(live.totals?.net || 0).toLocaleString()}</div>
                <div>{live.breakdown?.orders || 0}</div>
                <div>{live.breakdown?.applications || 0}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
