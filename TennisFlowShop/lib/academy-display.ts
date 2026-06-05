const ACADEMY_SCHEDULE_FALLBACK = "상담 후 조율";

const ACADEMY_TIME_PATTERN =
  /(?:오전|오후)?\s*\d{1,2}:\d{2}(?:\s*(?:~|-|–|—|부터|to)\s*(?:오전|오후)?\s*\d{1,2}:\d{2})?/i;

export type AcademyScheduleDisplay = {
  daysText: string;
  timeText: string | null;
};

export function getAcademyScheduleDisplay(
  scheduleText: string | null | undefined,
): AcademyScheduleDisplay {
  const normalizedSchedule = scheduleText?.trim() || ACADEMY_SCHEDULE_FALLBACK;
  const timeMatch = normalizedSchedule.match(ACADEMY_TIME_PATTERN);

  if (!timeMatch || typeof timeMatch.index !== "number") {
    return {
      daysText: normalizedSchedule,
      timeText: null,
    };
  }

  const daysText = normalizedSchedule.slice(0, timeMatch.index).trim();
  const timeText = normalizedSchedule.slice(timeMatch.index).trim();

  if (!daysText || !timeText) {
    return {
      daysText: normalizedSchedule,
      timeText: null,
    };
  }

  return {
    daysText,
    timeText,
  };
}
