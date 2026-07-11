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
  const progressPercent = Math.max(0, Math.min(100, rawProgress));
  const state = daysRemaining <= 0 ? "due" : daysRemaining <= intervalDays * 0.2 ? "prepare" : "good";

  return {
    intervalDays,
    nextRecommendedAt: new Date(nextTime).toISOString(),
    daysRemaining,
    progressPercent,
    state,
  };
}
