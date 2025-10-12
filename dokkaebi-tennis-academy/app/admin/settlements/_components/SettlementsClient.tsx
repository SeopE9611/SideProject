'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

// ──────────────────────────────────────────────────────────────
// 공통 유틸
// ──────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// KST(Asia/Seoul) 기준 YYYY-MM-DD 문자열 포맷터
const TZ = 'Asia/Seoul';
function fmtYMD_KST(date = new Date()) {
  // 'en-CA'는 2025-10-12 형식을 보장
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// 이번 달 1일(KST) 문자열
function firstDayOfMonth_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-01`;
}

// 지난 달 [from, to] (KST) 문자열 범위
function prevMonthRange_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  let y = Number(parts.year);
  let m = Number(parts.month); // 1~12
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  const mm = String(m).padStart(2, '0');
  // KST는 DST가 없어 월말 계산에 로컬 Date 사용해도 안전
  const lastDay = new Date(y, m, 0).getDate(); // m은 1~12
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

// yyyymm → 같은 달의 from/to(YYYY-MM-DD)
function monthEdges(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1; // 0-based
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { from, to };
}

// 파일명 유틸: 금지문자 치환 + KST 타임스탬프 (YYYYMMDD_HHMMSS)
function makeCsvFilename(base: string) {
  const safe = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
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

export default function SettlementsClient() {
  const router = useRouter();

  // ──────────────────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────────────────
  const [yyyymm, setYyyymm] = useState<string>(() => fmtYMD_KST().slice(0, 7).replace('-', '')); // KST 기준 초기 yyyymm
  const { data, mutate, isLoading } = useSWR('/api/settlements', fetcher);

  const [tab, setTab] = useState<'snapshot' | 'live'>('snapshot');

  // 실시간 탭의 조회 기간 (KST)
  const [from, setFrom] = useState(() => firstDayOfMonth_KST());
  const [to, setTo] = useState(() => fmtYMD_KST());

  const [live, setLive] = useState<any | null>(null);

  // 버튼 로딩/락
  const [doing, setDoing] = useState<{ create?: boolean; rebuild?: string; live?: boolean }>({});

  // 검증 결과: yyyymm → { live, snap }
  const [diffMap, setDiffMap] = useState<
    Record<
      string,
      {
        live: { paid: number; refund: number; net: number; orders: number; applications: number };
        snap: { paid: number; refund: number; net: number; orders: number; applications: number };
      }
    >
  >({});

  // 팝오버 열림 상태: yyyymm → boolean
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // 상태 배지
  const [staleMap, setStaleMap] = useState<Record<string, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<string, 'ok' | 'stale' | 'checking'>>({});

  // 전체 검증 로딩
  const [bulkChecking, setBulkChecking] = useState(false);

  // 캐시 키(세션 캐시): yyyymm + 스냅샷 버전(최초/최종 생성시간)
  function getCacheKey(row: any) {
    const ver = row.lastGeneratedAt || row.createdAt || '';
    return `settle:${row.yyyymm}:${new Date(ver).getTime()}`;
  }

  // ──────────────────────────────────────────────────────────
  // 서버 액션
  // ──────────────────────────────────────────────────────────
  const createSnapshot = async () => {
    try {
      await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
      await mutate(); // 최신 데이터 보장
      showSuccessToast(`${yyyymm} 스냅샷 생성 완료`);
    } catch (e) {
      console.error(e);
      showErrorToast('스냅샷 생성 실패');
    }
  };

  async function rebuildSnapshot(yyyymm: string) {
    await fetch(`/api/settlements/${yyyymm}`, { method: 'POST' });
  }

  async function fetchLive() {
    const q = new URLSearchParams({ from, to }).toString();
    const res = await fetch(`/api/settlements/live?${q}`);
    setLive(await res.json());
  }

  // 스냅샷 vs 실시간 비교(한 행)
  async function checkStalenessOfRow(row: any) {
    const key = String(row.yyyymm);
    const { from, to } = monthEdges(key);

    // 같은 달의 실시간 집계 호출
    const res = await fetch(`/api/settlements/live?from=${from}&to=${to}`);
    const liveJson = await res.json();

    const paidOk = (row.totals?.paid || 0) === (liveJson.totals?.paid || 0);
    const refundOk = (row.totals?.refund || 0) === (liveJson.totals?.refund || 0);
    const netOk = (row.totals?.net || 0) === (liveJson.totals?.net || 0);
    const ordOk = (row.breakdown?.orders || 0) === (liveJson.breakdown?.orders || 0);
    const appOk = (row.breakdown?.applications || 0) === (liveJson.breakdown?.applications || 0);

    return { ok: paidOk && refundOk && netOk && ordOk && appOk, live: liveJson };
  }

  // 전체 검증
  async function validateAll(rows: any[]) {
    setBulkChecking(true);
    try {
      for (const row of rows) {
        const key = String(row.yyyymm);
        setStatusMap((prev) => ({ ...prev, [key]: 'checking' }));
        const { ok } = await checkStalenessOfRow(row);
        setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
        setStaleMap((prev) => ({ ...prev, [key]: !ok }));
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

  // 세션 캐시 → 초기 상태 프리필(재방문 최적화)
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

  // 스냅샷 CSV 다운로드
  const downloadCSV = () => {
    const rows = data ?? [];
    const header = ['월(YYYYMM)', '매출', '환불', '순익', '주문수', '신청수'];
    const csvRows = rows.map((r: any) => [
      `'${String(r.yyyymm)}`, // yyyymm 자동서식 방지
      r.totals?.paid || 0,
      r.totals?.refund || 0,
      r.totals?.net || 0,
      r.breakdown?.orders || 0,
      r.breakdown?.applications || 0,
    ]);

    // 파일명: 목록 최소~최대 yyyymm
    const yyyymms = rows.map((r: any) => String(r.yyyymm)).filter(Boolean);
    const minYm = yyyymms.length ? yyyymms[yyyymms.length - 1] : 'YYYYMM';
    const maxYm = yyyymms.length ? yyyymms[0] : 'YYYYMM';

    // CRLF + UTF-8 BOM
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

  // ──────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────
  return (
    <>
      {/* 상단 탭 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('snapshot')} className={tab === 'snapshot' ? 'font-bold' : ''}>
          스냅샷
        </button>
        <button
          onClick={async () => {
            setTab('live');
            try {
              setDoing((d) => ({ ...d, live: true }));
              await fetchLive();
            } finally {
              setDoing((d) => ({ ...d, live: false }));
            }
          }}
          disabled={doing.live}
          className={tab === 'live' ? 'font-bold' : ''}
        >
          실시간
        </button>
      </div>

      {/* 스냅샷 탭 */}
      {tab === 'snapshot' && (
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold">정산 스냅샷</h1>

          {/* 월 선택 + 생성 + CSV + 전체 검증 */}
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

            <button
              onClick={async () => {
                try {
                  setDoing((d) => ({ ...d, create: true }));
                  await createSnapshot();
                } finally {
                  setDoing((d) => ({ ...d, create: false }));
                }
              }}
              disabled={doing.create}
              className="px-4 py-2 rounded bg-black text-white"
            >
              스냅샷 생성
            </button>

            <button onClick={downloadCSV} className="px-4 py-2 rounded border">
              CSV 다운로드
            </button>

            {/* 전체 검증: 최신 데이터 받아서 일괄 검증 */}
            <button
              onClick={async () => {
                const fresh = await mutate(); // 최신 리스트
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
                <div key={row.yyyymm}>
                  {/* (1) 행 */}
                  <div className={`grid grid-cols-8 p-3 border-t ${idx === 0 ? 'bg-muted/20 font-semibold' : ''}`}>
                    {/* 월 + 드릴다운 링크 + 배지 */}
                    <div className="flex items-center gap-2">
                      <button
                        className="underline underline-offset-4 hover:opacity-80"
                        onClick={() => {
                          const { from, to } = monthEdges(String(row.yyyymm));
                          router.push(`/admin/orders?from=${from}&to=${to}`);
                        }}
                        title="이 월의 주문/신청 목록 보기"
                      >
                        {row.yyyymm}
                      </button>
                      {staleMap[String(row.yyyymm)] && <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="갱신 필요" />}
                    </div>

                    <div>{(row.totals?.paid || 0).toLocaleString()}</div>
                    <div>{(row.totals?.refund || 0).toLocaleString()}</div>
                    <div className="font-semibold">{(row.totals?.net || 0).toLocaleString()}</div>
                    <div>{row.breakdown?.orders || 0}</div>
                    <div>{row.breakdown?.applications || 0}</div>

                    {/* 상태 셀 */}
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
                        disabled={doing.rebuild === row.yyyymm}
                        onClick={async () => {
                          try {
                            setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                            await rebuildSnapshot(String(row.yyyymm));
                            await mutate(); // 최신 동기화
                            setStatusMap((prev) => ({
                              ...prev,
                              [String(row.yyyymm)]: 'ok',
                            }));
                            setStaleMap((prev) => ({
                              ...prev,
                              [String(row.yyyymm)]: false,
                            }));
                            setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                            showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                          } catch (e) {
                            console.error(e);
                            showErrorToast('스냅샷 갱신 중 오류가 발생했습니다.');
                          } finally {
                            setDoing((d) => ({ ...d, rebuild: undefined }));
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

                            const snap = {
                              paid: row.totals?.paid || 0,
                              refund: row.totals?.refund || 0,
                              net: row.totals?.net || 0,
                              orders: row.breakdown?.orders || 0,
                              applications: row.breakdown?.applications || 0,
                            };
                            const livePack = {
                              paid: live.totals?.paid || 0,
                              refund: live.totals?.refund || 0,
                              net: live.totals?.net || 0,
                              orders: live.breakdown?.orders || 0,
                              applications: live.breakdown?.applications || 0,
                            };
                            setDiffMap((prev) => ({ ...prev, [key]: { live: livePack, snap } }));

                            setStatusMap((prev) => ({ ...prev, [key]: ok ? 'ok' : 'stale' }));
                            setStaleMap((prev) => ({ ...prev, [key]: !ok }));

                            if (ok) {
                              showSuccessToast('스냅샷이 현재 집계와 일치합니다.');
                              setOpenMap((prev) => ({ ...prev, [key]: false })); // 일치하면 닫기
                            } else {
                              showInfoToast(`변경 감지됨: ${key} 스냅샷과 현재 집계가 다릅니다.`);
                              setOpenMap((prev) => ({ ...prev, [key]: true })); // 다르면 열기
                            }
                          } catch (e) {
                            console.error(e);
                            setStatusMap((prev) => ({ ...prev, [key]: 'stale' }));
                            showErrorToast('검증 중 오류가 발생했습니다.');
                          }
                        }}
                      >
                        검증
                      </button>
                    </div>
                  </div>

                  {/* (2) 검증 결과 팝오버(행 아래) : 갱신 필요일 때만 */}
                  {openMap[String(row.yyyymm)] && statusMap[String(row.yyyymm)] === 'stale' && diffMap[String(row.yyyymm)] && (
                    <div className="p-3 border-b bg-muted/10 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">검증 결과 비교</div>
                        <div className="flex gap-2">
                          <button
                            className="text-xs underline"
                            onClick={() =>
                              setOpenMap((prev) => ({
                                ...prev,
                                [String(row.yyyymm)]: false,
                              }))
                            }
                          >
                            닫기
                          </button>
                        </div>
                      </div>

                      {/* 비교 표 */}
                      <div className="grid grid-cols-5 font-medium border-b py-2">
                        <div></div>
                        <div>매출</div>
                        <div>환불</div>
                        <div>순익</div>
                        <div>주문/신청</div>
                      </div>
                      <div className="grid grid-cols-5 py-2 border-b">
                        <div className="text-slate-600">스냅샷</div>
                        <div>{diffMap[String(row.yyyymm)]!.snap.paid.toLocaleString()}</div>
                        <div>{diffMap[String(row.yyyymm)]!.snap.refund.toLocaleString()}</div>
                        <div className="font-semibold">{diffMap[String(row.yyyymm)]!.snap.net.toLocaleString()}</div>
                        <div>
                          {diffMap[String(row.yyyymm)]!.snap.orders} / {diffMap[String(row.yyyymm)]!.snap.applications}
                        </div>
                      </div>
                      <div className="grid grid-cols-5 py-2">
                        <div className="text-slate-600">실시간</div>
                        <div>{diffMap[String(row.yyyymm)]!.live.paid.toLocaleString()}</div>
                        <div>{diffMap[String(row.yyyymm)]!.live.refund.toLocaleString()}</div>
                        <div className="font-semibold">{diffMap[String(row.yyyymm)]!.live.net.toLocaleString()}</div>
                        <div>
                          {diffMap[String(row.yyyymm)]!.live.orders} / {diffMap[String(row.yyyymm)]!.live.applications}
                        </div>
                      </div>

                      {/* 권장 액션: 지금 갱신 */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-rose-600 text-xs">※ 값이 다릅니다. ‘갱신’을 눌러 스냅샷을 업데이트 하세요.</span>
                        <button
                          className="px-2 py-1 border rounded text-xs"
                          disabled={doing.rebuild === row.yyyymm}
                          onClick={async () => {
                            try {
                              setDoing((d) => ({ ...d, rebuild: row.yyyymm }));
                              await rebuildSnapshot(String(row.yyyymm));
                              await mutate();
                              setStatusMap((prev) => ({
                                ...prev,
                                [String(row.yyyymm)]: 'ok',
                              }));
                              setStaleMap((prev) => ({
                                ...prev,
                                [String(row.yyyymm)]: false,
                              }));
                              setOpenMap((prev) => ({ ...prev, [String(row.yyyymm)]: false }));
                              showSuccessToast(`${row.yyyymm} 스냅샷을 갱신했습니다.`);
                            } catch (e) {
                              console.error(e);
                              showErrorToast('스냅샷 갱신 중 오류가 발생했습니다.');
                            } finally {
                              setDoing((d) => ({ ...d, rebuild: undefined }));
                            }
                          }}
                        >
                          지금 갱신
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 실시간 탭 */}
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

            {/* 프리셋 */}
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  const fromStr = firstDayOfMonth_KST();
                  const toStr = fmtYMD_KST(); // 오늘(KST)
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
                  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000); // 오늘 포함 7일
                  setFrom(fmtYMD_KST(start));
                  setTo(fmtYMD_KST(end));
                }}
              >
                지난 7일
              </button>

              <span className="text-xs text-muted-foreground self-center">※ KST 기준 합산</span>
            </div>

            <button onClick={fetchLive} className="px-4 py-2 rounded bg-black text-white" disabled={doing.live}>
              조회
            </button>

            {/* 실시간 CSV */}
            <button
              onClick={() => {
                if (!live) return;
                const header = ['기간', '매출', '환불', '순익', '주문수', '신청수'];
                const rows = [[`${live.range.from} ~ ${live.range.to}`, live.totals?.paid || 0, live.totals?.refund || 0, live.totals?.net || 0, live.breakdown?.orders || 0, live.breakdown?.applications || 0]];
                const lines = [header, ...rows].map((r) => r.join(',')).join('\r\n');
                const csv = '\ufeff' + lines; // BOM
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
              <div className="flex justify-end p-2" />
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
                <div className="font-semibold">{(live.totals?.net || 0).toLocaleString()}</div>
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
