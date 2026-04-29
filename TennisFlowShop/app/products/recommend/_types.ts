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

export type RecommendableProduct = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  material?: string;
  gauge?: string;
  mountingFee?: number;
  shippingFee?: number;
  features?: {
    power?: number;
    control?: number;
    spin?: number;
    durability?: number;
    comfort?: number;
  };
  tags?: Partial<Record<"beginner" | "intermediate" | "advanced" | "baseline" | "serveVolley" | "allCourt" | "power", boolean>>;
  inventory?: {
    stock?: number;
    status?: string;
    manageStock?: boolean;
    allowBackorder?: boolean;
  };
};

export type TensionRange = {
  min: number;
  max: number;
  label: string;
  note: string;
};

export type RecommendedStringProduct = {
  product: RecommendableProduct;
  score: number;
  reasons: string[];
  tensionRange: TensionRange;
  badges: string[];
};
