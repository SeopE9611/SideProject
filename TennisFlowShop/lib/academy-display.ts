const ACADEMY_SCHEDULE_FALLBACK = "상담 후 조율";

const ACADEMY_TIME_PATTERN =
  /(?:오전|오후)?\s*\d{1,2}:\d{2}(?:\s*(?:~|-|–|—|부터|to)\s*(?:오전|오후)?\s*\d{1,2}:\d{2})?/i;

export type AcademyScheduleDisplay = {
  daysText: string;
  timeText: string | null;
};

/** 명백히 모순되는 AM/PM + 24시간제 조합만 표시 시 정리합니다. */
export function normalizeAcademyPreferredTimeText(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return text.replace(/^(?:오전|오후)\s+(?=(?:1[3-9]|2[0-3]):[0-5]\d$)/, "");
}

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
