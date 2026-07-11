import type { ObjectId } from "mongodb";

export type RacketCarePlayFrequency = "monthly" | "weekly" | "biweekly_plus" | "heavy";
export type RacketCareState = "good" | "prepare" | "due";

export type RacketCareItemDoc = {
  _id: ObjectId;
  userId: ObjectId;
  nickname: string;
  racket: { brand: string; model: string };
  playFrequency: RacketCarePlayFrequency;
  lastStringingAt: Date;
  lastApplicationId?: ObjectId | null;
  lastStringProductId?: ObjectId | null;
  stringSnapshot?: {
    name?: string | null;
    gauge?: string | null;
    tensionMain?: string | null;
    tensionCross?: string | null;
  } | null;
  reminderEnabled: boolean;
  reminderSentFor?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RacketCareStatus = {
  intervalDays: number;
  nextRecommendedAt: string;
  elapsedDays: number;
  daysRemaining: number;
  elapsedPercent: number;
  lifeScore: number;
  progressPercent: number;
  state: RacketCareState;
  reasonSummary: string;
  reasonDetails: string[];
};
