export type RecommendGoal =
  | "power"
  | "spin"
  | "control"
  | "comfort"
  | "durability";

export type RecommendLevel =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced";

export type ArmLoad = "high" | "medium" | "low";

export type PlayFrequency =
  | "monthly"
  | "weekly"
  | "biweekly_plus"
  | "heavy";

export type BudgetPreference = "value" | "mid" | "premium";

export type StringRecommendAnswers = {
  goal: RecommendGoal | null;
  level: RecommendLevel | null;
  arm: ArmLoad | null;
  freq: PlayFrequency | null;
  budget: BudgetPreference | null;
};

export type CompletedStringRecommendAnswers = {
  goal: RecommendGoal;
  level: RecommendLevel;
  arm: ArmLoad;
  freq: PlayFrequency;
  budget: BudgetPreference;
};

export type RecommendQuestionId = keyof StringRecommendAnswers;

export type RecommendQuestionOption = {
  label: string;
  description?: string;
  value: NonNullable<StringRecommendAnswers[RecommendQuestionId]>;
};

export type RecommendQuestion = {
  id: RecommendQuestionId;
  title: string;
  description?: string;
  options: RecommendQuestionOption[];
};
