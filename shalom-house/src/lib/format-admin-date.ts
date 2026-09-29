const adminDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatAdminDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 확인 불가";

  const parts = Object.fromEntries(
    adminDateFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]),
  );

  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) {
    return "시간 확인 불가";
  }

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
