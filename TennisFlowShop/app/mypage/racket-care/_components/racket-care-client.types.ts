export type RacketCareState = "good" | "prepare" | "due";
export type RacketCareImportCandidate = {
  id: string;
  source: "profile" | "application";
  sourceLabel: string;
  nickname: string;
  racket: { brand: string; model: string };
  playFrequency: string;
  lastStringingAt: string | null;
  stringSnapshot: { name?: string | null; gauge?: string | null; tensionMain?: string | null; tensionCross?: string | null } | null;
  latestCompletedApplication?: { id: string } | null;
};
export type CareItem = {
  id: string;
  nickname: string;
  racket: { brand: string; model: string };
  playFrequency: string;
  lastStringingAt: string;
  lastStringProductId: string | null;
  stringSnapshot: { name?: string | null; gauge?: string | null; tensionMain?: string | null; tensionCross?: string | null } | null;
  reminderEnabled: boolean;
  recentStringProductAvailable: boolean | null;
  careStatus: { intervalDays: number; elapsedDays: number; daysRemaining: number; elapsedPercent: number; lifeScore: number; nextRecommendedAt: string; state: RacketCareState; reasonSummary: string; reasonDetails: string[] };
};
export type RacketCareResponse = { items: CareItem[]; importCandidates: RacketCareImportCandidate[]; suggestedImport?: RacketCareImportCandidate | null; maxItems: number; remainingSlots: number };
export type CareForm = { nickname: string; brand: string; model: string; playFrequency: string; lastStringingAt: string; reminderEnabled: boolean; stringName: string; gauge: string; tensionMain: string; tensionCross: string; latestCompletedApplicationId: string };

export type CreateMode = "import" | "manual";
export type StartCreateOptions = { mode?: CreateMode; skipMethodStep?: boolean };
