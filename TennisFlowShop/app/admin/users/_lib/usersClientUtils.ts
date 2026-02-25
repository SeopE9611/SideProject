export const fullAddress = (postal?: string, addr?: string, detail?: string) => {
  const p = postal ? `[${postal}] ` : '';
  const a = addr || '';
  const d = detail ? ` ${detail}` : '';
  const s = `${p}${a}${d}`.trim();
  return s || '-';
};

export const shortAddress = (addr?: string) => {
  if (!addr) return '-';
  const t = addr.split(/\s+/).filter(Boolean);
  return t.slice(0, 3).join(' ');
};

export const splitDateTime = (iso?: string) => {
  if (!iso) return { date: '-', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString(),
  };
};

export const th =
  'sticky top-0 z-10 whitespace-nowrap px-3.5 py-2 bg-card shadow-sm border-b border-border text-[12px] font-semibold text-foreground text-center';
export const td = 'px-3.5 py-2 align-middle text-center text-[13px] leading-tight tabular-nums';

export const roleColors: Record<'admin' | 'user', string> = {
  admin: 'bg-muted text-foreground border-border',
  user: 'bg-background text-foreground border-border',
};

export const STATUS = {
  active: 'bg-primary/10 text-primary border-border dark:bg-primary/20',
  suspended: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/15 dark:text-warning dark:border-warning/40',
  deleted: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/15',
} as const;

export type UserStatusKey = keyof typeof STATUS;

export const badgeSm = 'px-2 py-0.5 text-[11px] rounded-md font-medium border';

export const buildPageItems = (page: number, totalPages: number) => {
  const arr: (number | '...')[] = [];
  const DOT = '...' as const;
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) arr.push(i);
  } else {
    const l = Math.max(2, page - 1);
    const r = Math.min(totalPages - 1, page + 1);
    arr.push(1);
    if (l > 2) arr.push(DOT);
    for (let i = l; i <= r; i++) arr.push(i);
    if (r < totalPages - 1) arr.push(DOT);
    arr.push(totalPages);
  }
  return arr;
};
