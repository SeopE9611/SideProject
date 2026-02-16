/**
 * 대시보드 메트릭 집계에서 사용하는 순수 유틸 모음.
 * - 날짜(KST) 파싱/범위 생성
 * - Mongo aggregate 결과 시리즈 매핑
 * - unknown 데이터 정규화
 * - 상태값 매칭 상수
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export type KstDateParts = { y: number; m: number; d: number };
export type UnknownDoc = Record<string, unknown>;

/** "KST 기준" 날짜 파츠를 얻기 위해, 시간을 +9h 시프트한 뒤 UTC getter를 사용합니다. */
export function getKstParts(dateUtc: Date): KstDateParts {
  const shifted = new Date(dateUtc.getTime() + KST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

export function toYmd({ y, m, d }: KstDateParts): string {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** KST 기준 YYYYMM (예: 202510) */
export function fmtYyyymmKst(dateUtc: Date): string {
  const { y, m } = getKstParts(dateUtc);
  return `${y}${String(m).padStart(2, '0')}`;
}

/** YYYYMM을 월 단위로 이동 (deltaMonths: -1 = 이전달, +1 = 다음달) */
export function shiftYyyymm(yyyymm: string, deltaMonths: number): string {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6));
  const dt = new Date(Date.UTC(y, m - 1 + deltaMonths, 1, 0, 0, 0));
  const ny = dt.getUTCFullYear();
  const nm = dt.getUTCMonth() + 1;
  return `${ny}${String(nm).padStart(2, '0')}`;
}

/** KST 자정(00:00)을 UTC Date로 변환 */
export function kstDayStartUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0, 0));
}

export function addKstDays(parts: KstDateParts, deltaDays: number): KstDateParts {
  const base = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0, 0));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() };
}

export function buildYmdRange(endInclusiveUtc: Date, days: number): { startKst: KstDateParts; endKst: KstDateParts; ymds: string[] } {
  const endKst = getKstParts(endInclusiveUtc);
  const startKst = addKstDays(endKst, -(days - 1));
  const ymds: string[] = [];
  for (let i = 0; i < days; i += 1) {
    ymds.push(toYmd(addKstDays(startKst, i)));
  }
  return { startKst, endKst, ymds };
}

/** 일별 시리즈 (Mongo) -> { 'YYYY-MM-DD': number } 형태로 변환 */
export function rowsToMap(rows: Array<{ _id: string; v: number }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r._id] = Number(r.v || 0);
  }
  return map;
}

export function mergeSeries(ymds: string[], ...maps: Array<Record<string, number>>): Array<{ date: string; value: number }> {
  return ymds.map((date) => ({
    date,
    value: maps.reduce((sum, m) => sum + Number(m?.[date] || 0), 0),
  }));
}

export function asDoc(value: unknown): UnknownDoc | null {
  return typeof value === 'object' && value !== null ? (value as UnknownDoc) : null;
}

export function asDocArray(value: unknown): UnknownDoc[] {
  return Array.isArray(value) ? value.map((item) => asDoc(item)).filter((item): item is UnknownDoc => item !== null) : [];
}

export function getString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function getNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toIsoSafe(value: unknown): string {
  return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : new Date().toISOString();
}

export function toTimeMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  return Number.NaN;
}

/** DB에 한글/영문 상태가 섞여 있어도 KPI/운영큐 집계가 누락되지 않도록 통일한 매칭 기준 */
export const PAYMENT_PAID_VALUES = ['결제완료', 'paid', 'confirmed'];
export const PAYMENT_PENDING_VALUES = ['결제대기', 'pending'];
export const CANCEL_REQUESTED_VALUES = ['requested', '요청'];
