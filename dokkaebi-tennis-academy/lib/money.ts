// KRW 포맷 공통 유틸

/** 원 단위 풀 표기: 1,234,567 → "₩1,234,567" */
export const formatKRWFull = (n: number) => `₩${n.toLocaleString()}`;

/**
 * 카드 축약 표기:
 * - 1억 이상 → "₩x.x억" 또는 "₩xx억"
 * - 1만 이상 → "₩x.x만" 또는 "₩xxxx만" (길이에 맞춰 절삭)
 * - 그 외 → "₩1,234"
 */
export function formatKRWCard(n: number, maxChars = 6) {
  const abs = Math.abs(n);

  if (abs >= 100_000_000) {
    const v = n / 100_000_000;
    const str = Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toString();
    return `₩${str.replace(/\.0$/, '')}억`;
  }

  if (abs >= 10_000) {
    const v = n / 10_000;
    let core = Math.round(v).toString();
    let out = `₩${core}만`;
    if (out.length > maxChars) {
      core = (Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toString()).replace(/\.0$/, '');
      out = `₩${core}만`;
    }
    return out;
  }

  return `₩${n.toLocaleString()}`;
}

/** compact=true면 축약, false면 원단위 */
export const formatKRW = (n: number, compact = true) => (compact ? formatKRWCard(n) : formatKRWFull(n));
