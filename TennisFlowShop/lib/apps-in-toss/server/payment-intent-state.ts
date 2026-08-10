export const APPS_IN_TOSS_PAYMENT_INTENT_STATES = [
  "creating", "awaiting_authorization", "executing", "paid", "finalized", "cancelled",
  "failed", "refunding", "refunded", "reconciliation_required",
] as const;

export type AppsInTossPaymentIntentState = (typeof APPS_IN_TOSS_PAYMENT_INTENT_STATES)[number];

const TRANSITIONS: Record<AppsInTossPaymentIntentState, readonly AppsInTossPaymentIntentState[]> = {
  creating: ["awaiting_authorization", "failed"],
  awaiting_authorization: ["executing", "cancelled", "failed"],
  executing: ["paid", "failed", "reconciliation_required"],
  paid: ["finalized", "refunding", "reconciliation_required"],
  finalized: [], cancelled: [], failed: [],
  refunding: ["refunded", "reconciliation_required"],
  refunded: [], reconciliation_required: ["paid", "failed", "refunded"],
};

export class AppsInTossPaymentIntentTransitionError extends Error {
  constructor(from: AppsInTossPaymentIntentState, to: AppsInTossPaymentIntentState) {
    super(`Apps in Toss 결제 의도 상태를 ${from}에서 ${to}(으)로 변경할 수 없습니다.`);
    this.name = "AppsInTossPaymentIntentTransitionError";
  }
}

export function assertAppsInTossPaymentIntentTransition(from: AppsInTossPaymentIntentState, to: AppsInTossPaymentIntentState) {
  if (!TRANSITIONS[from].includes(to)) throw new AppsInTossPaymentIntentTransitionError(from, to);
}
