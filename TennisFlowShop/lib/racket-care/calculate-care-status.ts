import type { RacketCarePlayFrequency, RacketCareStatus } from "@/lib/racket-care/types";

export const RACKET_CARE_INTERVAL_DAYS: Record<RacketCarePlayFrequency, number> = {
  monthly: 120,
  weekly: 90,
  biweekly_plus: 60,
  heavy: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDateOnly(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function calculateRacketCareStatus(params: {
  playFrequency: RacketCarePlayFrequency;
  lastStringingAt: Date;
  now?: Date;
}): RacketCareStatus {
  const intervalDays = RACKET_CARE_INTERVAL_DAYS[params.playFrequency];
  const now = params.now ?? new Date();
  const lastTime = toUtcDateOnly(params.lastStringingAt);
  const todayTime = toUtcDateOnly(now);
  const nextTime = lastTime + intervalDays * DAY_MS;
  const elapsedDays = Math.max(0, Math.floor((todayTime - lastTime) / DAY_MS));
  const daysRemaining = Math.ceil((nextTime - todayTime) / DAY_MS);
  const rawProgress = Math.round((elapsedDays / intervalDays) * 100);
  const elapsedPercent = Math.max(0, Math.min(100, rawProgress));
  const lifeScore = Math.max(0, Math.min(100, 100 - elapsedPercent));
  const state =
    daysRemaining <= 0 ? "due" : daysRemaining <= intervalDays * 0.2 ? "prepare" : "good";
  const nextRecommendedAt = new Date(nextTime).toISOString();
  const lastDate = params.lastStringingAt.toISOString().slice(0, 10);
  const dueText =
    daysRemaining > 0
      ? `예상 교체일까지 ${daysRemaining}일 남았습니다.`
      : daysRemaining === 0
        ? "오늘이 예상 교체일입니다."
        : `예상 교체일이 ${Math.abs(daysRemaining)}일 지났습니다.`;

  return {
    intervalDays,
    nextRecommendedAt,
    elapsedDays,
    daysRemaining,
    elapsedPercent,
    lifeScore,
    progressPercent: elapsedPercent,
    state,
    reasonSummary: `${intervalDays}일 권장 주기 중 ${elapsedDays}일이 지났습니다.`,
    reasonDetails: [
      `마지막 교체일: ${lastDate}`,
      `선택한 플레이 빈도: ${params.playFrequency}`,
      `적용된 권장 교체 주기: ${intervalDays}일`,
      `현재까지 경과한 일수: ${elapsedDays}일`,
      dueText,
      "실제 마모는 타구 강도·스트링 소재·보관 환경에 따라 달라질 수 있습니다.",
    ],
  };
}
