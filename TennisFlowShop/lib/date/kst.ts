const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type DateRangeYmd = {
  from: string;
  to: string;
};

export function toKstYmd(date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

export function parseKstYmdBoundary(
  value: string,
  boundary: "from" | "to",
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const utcMidnight = new Date(0);
  utcMidnight.setUTCFullYear(year, month - 1, day);
  utcMidnight.setUTCHours(0, 0, 0, 0);

  const from = new Date(utcMidnight.getTime() - KST_OFFSET_MS);
  if (toKstYmd(from) !== value) return null;

  return boundary === "from" ? from : new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function addKstDaysYmd(days: number, base = new Date()): string {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const shifted = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + days),
  );
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
