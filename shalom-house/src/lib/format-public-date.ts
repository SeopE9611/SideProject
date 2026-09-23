const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

export function formatPublicDate(value: string): string {
  const dateOnly = DATE_ONLY_PATTERN.exec(value);

  if (dateOnly) {
    const [, yearPart, monthPart, dayPart] = dateOnly;
    const year = Number(yearPart);
    const month = Number(monthPart);
    const day = Number(dayPart);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return formatParts(year, month, day);
    }

    return "날짜 확인 불가";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 확인 불가";

  return formatParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}
