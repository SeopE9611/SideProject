export const TZ = 'Asia/Seoul';

export function fmtYMD_KST(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function firstDayOfMonth_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}-${parts.month}-01`;
}

export function prevMonthRange_KST(base = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(base)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  let y = Number(parts.year);
  let m = Number(parts.month);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  const mm = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export function monthEdges(yyyymm: string) {
  const y = Number(yyyymm.slice(0, 4));
  const m = Number(yyyymm.slice(4, 6)) - 1;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { from, to };
}
