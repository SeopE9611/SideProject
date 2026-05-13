const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type DateRangeYmd = {
  from: string;
  to: string;
};

export function toKstYmd(date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

export function addKstDaysYmd(days: number, base = new Date()): string {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const shifted = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + days));
  return shifted.toISOString().slice(0, 10);
}

export function getKstTodayRange(date = new Date()): DateRangeYmd {
  const today = toKstYmd(date);
  return { from: today, to: today };
}

export function getKstMonthRange(date = new Date()): DateRangeYmd {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));

  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

export function getKstRecentDaysRange(days: number, date = new Date()): DateRangeYmd {
  const safeDays = Math.max(1, Math.floor(days));
  return {
    from: addKstDaysYmd(-(safeDays - 1), date),
    to: toKstYmd(date),
  };
}

export function getKstPreviousMonthYyyymm(date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const previousMonth = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1));
  return `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;
}
