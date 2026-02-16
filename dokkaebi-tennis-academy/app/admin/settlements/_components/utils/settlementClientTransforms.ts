import type { SettlementLiveResponse, SettlementSnapshot } from '@/types/admin/settlements';

/** 세션 캐시 키: yyyymm + 스냅샷 버전(최초/최종 생성시간) */
export function getSettlementCacheKey(row: SettlementSnapshot): string {
  const version = row.lastGeneratedAt || row.createdAt || '';
  return `settle:${row.yyyymm}:${new Date(version).getTime()}`;
}

/** 스냅샷 vs 실시간 합계/브레이크다운이 완전히 일치하는지 비교 */
export function isSettlementMatched(row: SettlementSnapshot, live: SettlementLiveResponse): boolean {
  const paidOk = (row.totals?.paid || 0) === (live.totals?.paid || 0);
  const refundOk = (row.totals?.refund || 0) === (live.totals?.refund || 0);
  const netOk = (row.totals?.net || 0) === (live.totals?.net || 0);
  const orderOk = (row.breakdown?.orders || 0) === (live.breakdown?.orders || 0);
  const applicationOk = (row.breakdown?.applications || 0) === (live.breakdown?.applications || 0);
  const packageOk = (row.breakdown?.packages || 0) === (live.breakdown?.packages || 0);
  return paidOk && refundOk && netOk && orderOk && applicationOk && packageOk;
}

/** YYYYMM 클라이언트 검증: 6자리·월범위·미래금지 */
export function validateYyyymmClient(ym: string, nowYyyymm = nowYyyymmKst()): { ok: true } | { ok: false; reason: string } {
  if (!/^\d{6}$/.test(ym)) return { ok: false, reason: 'YYYYMM 6자리로 입력하세요.' };
  const mm = Number(ym.slice(4, 6));
  if (mm < 1 || mm > 12) return { ok: false, reason: '월은 01~12만 가능합니다.' };
  if (Number(ym) > Number(nowYyyymm)) return { ok: false, reason: '미래 월은 생성할 수 없습니다.' };
  return { ok: true };
}

/** KST 기준 현재 YYYYMM */
export function nowYyyymmKst(baseDate: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(baseDate).map((p) => [p.type, p.value]));
  return `${parts.year}${parts.month}`;
}

export function toggleYyyymmSelection(current: Set<string>, yyyymm: string): Set<string> {
  const next = new Set(current);
  if (next.has(yyyymm)) {
    next.delete(yyyymm);
  } else {
    next.add(yyyymm);
  }
  return next;
}

export function buildAllSettlementSelection(rows: SettlementSnapshot[]): Set<string> {
  return new Set(rows.map((row) => String(row.yyyymm)));
}
