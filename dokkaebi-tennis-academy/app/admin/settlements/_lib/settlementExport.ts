import { TZ } from '@/app/admin/settlements/_components/filters/settlementDateFilters';

export function makeCsvFilename(base: string) {
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
