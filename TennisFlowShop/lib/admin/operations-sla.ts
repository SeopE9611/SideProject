export type OperationsSlaLevel = "normal" | "watch" | "urgent";

export type OperationsSlaThreshold = {
  /**
   * 확인 필요로 올릴 기준 시간입니다.
   * 예: 취소 요청은 6시간 이상이면 확인 필요로 표시합니다.
   */
  watchHours: number;

  /**
   * 긴급으로 올릴 기준 시간입니다.
   * 예: 취소 요청은 24시간 이상이면 긴급으로 표시합니다.
   */
  urgentHours: number;
};

/**
 * 관리자 운영 업무의 처리 지연 기준입니다.
 *
 * 이 값은 /admin/operations 화면의 SLA 배지 기준으로 사용됩니다.
 * 추후 대시보드, 관리자 알림, 일일 업무 리포트에서도 같은 기준을 재사용할 수 있도록
 * 컴포넌트 내부 하드코딩 대신 공통 상수로 분리했습니다.
 */
export const ADMIN_OPERATION_SLA_HOURS = {
  /**
   * 취소 요청은 고객 응답 민감도가 높기 때문에 가장 빠르게 확인 대상으로 올립니다.
   */
  cancelRequest: {
    watchHours: 6,
    urgentHours: 24,
  },

  /**
   * 결제 확인, 배송/출고 누락, 대여 반납은 운영 처리 지연 기준을 동일하게 둡니다.
   */
  paymentShippingRental: {
    watchHours: 24,
    urgentHours: 48,
  },

  /**
   * 그 외 일반 업무는 기본 SLA 기준을 적용합니다.
   */
  default: {
    watchHours: 24,
    urgentHours: 72,
  },
} satisfies Record<string, OperationsSlaThreshold>;

type ResolveOperationsSlaLevelInput = {
  /**
   * 업무 그룹의 생성/접수 기준 시각입니다.
   */
  createdAt?: string | null;

  /**
   * 서버에서 이미 계산한 운영 큐 버킷입니다.
   * urgent이면 시간 계산과 무관하게 긴급으로 유지합니다.
   */
  groupQueueBucket?: string | null;

  /**
   * 취소 요청 포함 여부입니다.
   */
  hasCancel?: boolean;

  /**
   * 결제 확인 필요 여부입니다.
   */
  hasPayment?: boolean;

  /**
   * 배송/출고 확인 필요 여부입니다.
   */
  hasShipping?: boolean;

  /**
   * 대여 반납/연체 확인 필요 여부입니다.
   */
  hasRental?: boolean;
};

export function getElapsedHours(value?: string | null) {
  if (!value) return null;

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;

  const diffMs = Date.now() - time;
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function formatElapsedText(hours: number | null) {
  if (hours === null) return null;
  if (hours < 1) return "1시간 미만";
  if (hours < 24) return `${hours}시간 경과`;

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;

  if (restHours === 0) return `${days}일 경과`;
  return `${days}일 ${restHours}시간 경과`;
}

function resolveThreshold(input: ResolveOperationsSlaLevelInput): OperationsSlaThreshold {
  if (input.hasCancel) {
    return ADMIN_OPERATION_SLA_HOURS.cancelRequest;
  }

  if (input.hasPayment || input.hasShipping || input.hasRental) {
    return ADMIN_OPERATION_SLA_HOURS.paymentShippingRental;
  }

  return ADMIN_OPERATION_SLA_HOURS.default;
}

export function resolveOperationsSlaLevel(input: ResolveOperationsSlaLevelInput): OperationsSlaLevel {
  const hasBucketWatch = input.groupQueueBucket === "caution" || input.groupQueueBucket === "pending";

  if (input.groupQueueBucket === "urgent") {
    return "urgent";
  }

  const hours = getElapsedHours(input.createdAt);

  if (hours === null) {
    return hasBucketWatch ? "watch" : "normal";
  }

  const threshold = resolveThreshold(input);

  if (hours >= threshold.urgentHours) {
    return "urgent";
  }

  if (hours >= threshold.watchHours || hasBucketWatch) {
    return "watch";
  }

  return "normal";
}

export function getSlaBadgeMeta(level: OperationsSlaLevel, elapsedText: string | null) {
  if (!elapsedText) return null;

  if (level === "urgent") {
    return {
      label: `긴급 · ${elapsedText}`,
      className: "border-warning/40 bg-warning/10 text-warning",
    };
  }

  if (level === "watch") {
    return {
      label: `확인 · ${elapsedText}`,
      className: "border-info/40 bg-info/10 text-info",
    };
  }

  return {
    label: elapsedText,
    className: "border-border bg-muted/40 text-foreground/70",
  };
}
