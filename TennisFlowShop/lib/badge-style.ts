import { Order } from '@/lib/types/order';
import type { QnaCategory } from '@/lib/types/board';
import { normalizeOrderShippingMethod } from '@/lib/order-shipping';

// 전역 배지 토큰 (크기/정렬/테두리 옵션)
export const badgeSizeSm = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';
export const badgeBase = 'inline-flex items-center gap-1 font-normal';
export const badgeBaseOutlined = `${badgeBase} border border-border bg-background`;

const SEMANTIC_BADGE = {
  neutral: 'bg-card text-foreground border border-border dark:bg-card/90',
  info: 'bg-info/15 text-info border border-info/45 dark:bg-info/22 dark:border-info/55',
  success: 'bg-success/15 text-success border border-success/45 dark:bg-success/24 dark:border-success/55',
  warning: 'bg-warning/15 text-warning border border-warning/45 dark:bg-warning/26 dark:border-warning/55',
  danger: 'bg-destructive/15 text-destructive border border-destructive/45 dark:bg-destructive/24 dark:border-destructive/55',
  brand: 'bg-primary/15 text-primary border border-primary/45 dark:bg-primary/24 dark:border-primary/55',
  destructive: 'bg-destructive/15 text-destructive border border-destructive/45 dark:bg-destructive/24 dark:border-destructive/55',
} as const;

export type BadgeSemanticTone = keyof typeof SEMANTIC_BADGE;

export function badgeToneClass(tone: BadgeSemanticTone) {
  return SEMANTIC_BADGE[tone];
}


export const SEMANTIC_BADGE_VARIANT = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  brand: 'brand',
  destructive: 'danger',
} as const;

export type BadgeSemanticVariant = (typeof SEMANTIC_BADGE_VARIANT)[BadgeSemanticTone];

export function badgeToneVariant(tone: BadgeSemanticTone): BadgeSemanticVariant {
  return SEMANTIC_BADGE_VARIANT[tone];
}

export type BadgeStyleSpec = {
  tone: BadgeSemanticTone;
  variant: BadgeSemanticVariant;
  className: string;
};

export function badgeStyleSpec(tone: BadgeSemanticTone): BadgeStyleSpec {
  return {
    tone,
    variant: badgeToneVariant(tone),
    className: badgeToneClass(tone),
  };
}

export type OrderFlowBadgeState = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type OrderKindBadgeState = 'order' | 'stringing_application' | 'rental_order' | 'rental';
export type OrderLinkBadgeState = 'integrated' | 'standalone' | 'linked_order' | 'rental' | 'error';

export function flowBadgeTone(flow?: OrderFlowBadgeState): BadgeSemanticTone {
  if (!flow || flow === 3) return 'neutral';
  if (flow === 4 || flow === 5) return 'warning';
  if (flow === 6 || flow === 7) return 'info';
  return 'neutral';
}

export function kindBadgeTone(kind: OrderKindBadgeState): BadgeSemanticTone {
  if (kind === 'order') return 'info';
  if (kind === 'rental_order' || kind === 'rental') return 'success';
  return 'neutral';
}

export function linkBadgeTone(state: OrderLinkBadgeState): BadgeSemanticTone {
  if (state === 'integrated') return 'info';
  if (state === 'error') return 'destructive';
  if (state === 'rental') return 'success';
  return 'neutral';
}

export function flowBadgeClass(flow?: OrderFlowBadgeState) {
  return badgeToneClass(flowBadgeTone(flow));
}

export function kindBadgeClass(kind: OrderKindBadgeState) {
  return badgeToneClass(kindBadgeTone(kind));
}

export function linkBadgeClass(state: OrderLinkBadgeState) {
  return badgeToneClass(linkBadgeTone(state));
}

// 사용자 역할/상태 배지 전역 토큰
export const userRoleColors = {
  admin: SEMANTIC_BADGE.info,
  user: SEMANTIC_BADGE.neutral,
} as const;

export const userStatusColors = {
  active: SEMANTIC_BADGE.success,
  deleted: SEMANTIC_BADGE.destructive,
} as const;

export function getUserStatusBadge(isDeleted: boolean) {
  return {
    label: isDeleted ? '삭제됨' : '활성',
    color: isDeleted ? userStatusColors.deleted : userStatusColors.active,
  };
}

export const orderStatusColors: Record<string, string> = {
  대기중: SEMANTIC_BADGE.warning,
  처리중: SEMANTIC_BADGE.info,
  결제완료: SEMANTIC_BADGE.success,
  배송중: SEMANTIC_BADGE.info,
  배송완료: SEMANTIC_BADGE.success,
  구매확정: SEMANTIC_BADGE.success,
  취소: SEMANTIC_BADGE.destructive,
  환불: SEMANTIC_BADGE.destructive,
};


export function getOrderStatusTone(status?: string | null): BadgeSemanticTone {
  const normalized = String(status ?? '').trim();
  if (!normalized) return 'neutral';
  if (normalized.includes('취소') || normalized.includes('환불')) return 'danger';
  if (normalized === '결제완료' || normalized === '배송완료' || normalized === '구매확정') return 'success';
  if (normalized === '배송중' || normalized === '처리중') return 'info';
  if (normalized === '대기중' || normalized === '배송준비중') return 'warning';
  return 'neutral';
}

export function getOrderStatusBadgeSpec(status?: string | null) {
  return badgeStyleSpec(getOrderStatusTone(status));
}

export const paymentStatusColors: Record<string, string> = {
  결제완료: SEMANTIC_BADGE.success,
  결제대기: SEMANTIC_BADGE.warning,
  결제실패: SEMANTIC_BADGE.destructive,
  결제취소: SEMANTIC_BADGE.destructive,
  패키지차감: SEMANTIC_BADGE.info,
  주문결제포함: SEMANTIC_BADGE.success,
  대여결제포함: SEMANTIC_BADGE.success,
  확인필요: SEMANTIC_BADGE.warning,
  환불: SEMANTIC_BADGE.destructive,
};

export function getPaymentStatusTone(status?: string | null): BadgeSemanticTone {
  const normalized = String(status ?? '').trim();
  if (!normalized) return 'neutral';
  if (normalized.includes('실패') || normalized.includes('취소') || normalized.includes('환불')) return 'danger';
  if (normalized === '결제완료' || normalized === '주문결제포함' || normalized === '대여결제포함') return 'success';
  if (normalized === '패키지차감') return 'info';
  if (normalized === '결제대기' || normalized === '확인필요') return 'warning';
  return 'neutral';
}

export function getPaymentStatusBadgeSpec(status?: string | null) {
  return badgeStyleSpec(getPaymentStatusTone(status));
}

export const orderTypeColors: Record<string, string> = {
  상품: SEMANTIC_BADGE.info,
  서비스: SEMANTIC_BADGE.brand,
  클래스: SEMANTIC_BADGE.warning,
};

export const shippingStatusColors: Record<string, string> = {
  등록됨: SEMANTIC_BADGE.success,
  미등록: SEMANTIC_BADGE.destructive,
  방문수령: SEMANTIC_BADGE.brand,
  퀵배송: SEMANTIC_BADGE.info,
  미입력: SEMANTIC_BADGE.neutral,
};

//"수령방식" 전용 색상(테이블 분리용)
export const shippingMethodColors: Record<string, string> = {
  택배: SEMANTIC_BADGE.neutral,
  방문: shippingStatusColors['방문수령'],
  퀵: shippingStatusColors['퀵배송'],
  '선택 없음': shippingStatusColors['미입력'],
};

export function getShippingMethodTone(label?: string | null): BadgeSemanticTone {
  if (label === '방문') return 'brand';
  if (label === '퀵') return 'info';
  if (label === '택배') return 'neutral';
  return 'neutral';
}
// "운송장" 전용 색상(테이블 분리용)
export const trackingStatusColors: Record<string, string> = {
  등록됨: shippingStatusColors['등록됨'],
  미등록: shippingStatusColors['미등록'],
  해당없음: SEMANTIC_BADGE.neutral,
};

export function getTrackingTone(label?: string | null): BadgeSemanticTone {
  if (label === '등록됨') return 'success';
  if (label === '미등록') return 'danger';
  return 'neutral';
}

export function getShippingBadge(order: Order) {
  const shippingRaw = (order.shippingInfo as any)?.shippingMethod ?? (order.shippingInfo as any)?.deliveryMethod;
  const code = normalizeOrderShippingMethod(shippingRaw);
  const tn = order.shippingInfo?.invoice?.trackingNumber?.trim() ?? '';

  let label: keyof typeof shippingStatusColors = '미입력';
  if (code === 'courier') label = tn ? '등록됨' : '미등록';
  else if (code === 'quick') label = '퀵배송';
  else if (code === 'visit') label = '방문수령';

  const displayLabel = label === '미입력' ? '선택 없음' : code === 'courier' && (label === '등록됨' || label === '미등록') ? `택배 · ${label}` : label;

  return { label, displayLabel, color: shippingStatusColors[label]! };
}

/**
 * 수령방식 컬럼 전용 배지
 * - courier => 택배
 * - visit   => 방문
 * - quick   => 퀵
 * - null    => 선택 없음
 */
export function getShippingMethodBadge(order: Order) {
  const servicePickupMethod = (order as any)?.servicePickupMethod as 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT' | null | undefined;

  const codeFromPickup = servicePickupMethod === 'SHOP_VISIT' ? 'visit' : servicePickupMethod === 'SELF_SEND' || servicePickupMethod === 'COURIER_VISIT' ? 'courier' : undefined;

  const shippingRaw = (order.shippingInfo as any)?.shippingMethod ?? (order.shippingInfo as any)?.deliveryMethod;
  const code = normalizeOrderShippingMethod(shippingRaw) ?? codeFromPickup;

  const label = code === 'courier' ? '택배' : code === 'visit' ? '방문' : code === 'quick' ? '퀵' : '선택 없음';
  const displayLabel = label;

  const tone = getShippingMethodTone(label);
  return { code, label, displayLabel, tone, variant: badgeToneVariant(tone), color: shippingMethodColors[label]! };
}

/**
 * 운송장 컬럼 전용 배지
 * - courier(택배)만 등록됨/미등록 의미가 있음
 * - 방문/퀵/선택없음은 운송장 "해당없음"으로 통일
 */
export function getTrackingBadge(order: Order) {
  const shippingRaw = (order.shippingInfo as any)?.shippingMethod ?? (order.shippingInfo as any)?.deliveryMethod;
  const code = normalizeOrderShippingMethod(shippingRaw);
  if (code !== 'courier') {
    return { label: '해당없음' as const, tone: 'neutral' as const, variant: 'neutral' as const, color: trackingStatusColors['해당없음'] };
  }

  const tn = order.shippingInfo?.invoice?.trackingNumber?.trim() ?? '';
  const label: '등록됨' | '미등록' = tn ? '등록됨' : '미등록';
  const tone = getTrackingTone(label);
  return { label, tone, variant: badgeToneVariant(tone), color: trackingStatusColors[label] };
}

export const applicationStatusColors = {
  접수완료: SEMANTIC_BADGE.info,
  '검토 중': SEMANTIC_BADGE.warning,
  '작업 중': SEMANTIC_BADGE.brand,
  교체완료: SEMANTIC_BADGE.success,
  취소: SEMANTIC_BADGE.destructive,
  default: SEMANTIC_BADGE.neutral,
} as const;

export function getApplicationStatusTone(status?: string | null): BadgeSemanticTone {
  const normalized = String(status ?? '').trim();
  if (!normalized) return 'neutral';
  if (normalized === '교체완료') return 'success';
  if (normalized === '작업 중') return 'warning';
  if (normalized === '검토 중') return 'warning';
  if (normalized === '접수완료') return 'info';
  if (normalized.includes('취소')) return 'danger';
  return 'neutral';
}

export function getApplicationStatusBadgeSpec(status?: string | null) {
  return badgeStyleSpec(getApplicationStatusTone(status));
}

/** ---------------------- QnA 배지 (카테고리/답변 상태) ---------------------- */
export const qnaCategoryColors: Record<QnaCategory, string> = {
  상품문의: SEMANTIC_BADGE.info,
  '주문/결제': SEMANTIC_BADGE.brand,
  배송: SEMANTIC_BADGE.warning,
  '환불/교환': SEMANTIC_BADGE.destructive,
  서비스: SEMANTIC_BADGE.success,
  아카데미: SEMANTIC_BADGE.brand,
  회원: SEMANTIC_BADGE.warning,
  일반문의: SEMANTIC_BADGE.neutral,
};

/** 안전 헬퍼: 잘못된 값이 와도 기본 회색으로 */
export function getQnaCategoryColor(label?: QnaCategory | string | null) {
  if (!label) return qnaCategoryColors['일반문의'];
  return (qnaCategoryColors as Record<string, string>)[label] ?? qnaCategoryColors['일반문의'];
}

export function getQnaCategoryTone(label?: QnaCategory | string | null): BadgeSemanticTone {
  if (!label) return 'neutral';
  if (label === '상품문의') return 'info';
  if (label === '주문/결제' || label === '아카데미') return 'brand';
  if (label === '배송' || label === '회원') return 'warning';
  if (label === '환불/교환') return 'danger';
  if (label === '서비스') return 'success';
  return 'neutral';
}

export function getQnaCategoryBadgeSpec(label?: QnaCategory | string | null) {
  return badgeStyleSpec(getQnaCategoryTone(label));
}

/** 답변 상태 배지 색상 */
export function getAnswerStatusColor(answered: boolean) {
  return answered ? SEMANTIC_BADGE.success : SEMANTIC_BADGE.neutral;
}

export function getAnswerStatusTone(answered: boolean): BadgeSemanticTone {
  return answered ? 'success' : 'warning';
}

export function getAnswerStatusBadgeSpec(answered: boolean) {
  return badgeStyleSpec(getAnswerStatusTone(answered));
}

/** ---------------------- Notice / Review 전용 배지 ---------------------- */
export const noticePinColor = SEMANTIC_BADGE.brand;

export type ReviewType = 'product' | 'service' | 'etc';
export const reviewTypeColors: Record<ReviewType, string> = {
  product: SEMANTIC_BADGE.info,
  service: SEMANTIC_BADGE.brand,
  etc: SEMANTIC_BADGE.neutral,
};
export function getReviewTypeColor(t?: string | null) {
  const key = t === 'product' || t === 'service' ? (t as ReviewType) : 'etc';
  return reviewTypeColors[key];
}

export function getReviewTypeTone(t?: string | null): BadgeSemanticTone {
  if (t === 'service' || t === 'lesson') return 'brand';
  if (t === 'product' || t === 'stringing') return 'info';
  return 'neutral';
}

export function getReviewTypeBadgeSpec(t?: string | null) {
  return badgeStyleSpec(getReviewTypeTone(t));
}

export function getUserRoleBadgeSpec(role?: string | null) {
  return badgeStyleSpec(role === 'admin' ? 'info' : 'neutral');
}

export function getCurrentSessionBadgeSpec(isCurrent: boolean) {
  return badgeStyleSpec(isCurrent ? 'brand' : 'neutral');
}

export function getSessionDeviceBadgeSpec(deviceType?: string | null) {
  if (deviceType === 'mobile') return badgeStyleSpec('info');
  if (deviceType === 'tablet') return badgeStyleSpec('brand');
  return badgeStyleSpec('neutral');
}

/** ---------------------- Notice 카테고리 & 첨부 배지 ---------------------- */
export const noticeCategoryColors: Record<string, string> = {
  일반: SEMANTIC_BADGE.neutral,
  이벤트: SEMANTIC_BADGE.success,
  아카데미: SEMANTIC_BADGE.info,
  점검: SEMANTIC_BADGE.neutral,
  긴급: SEMANTIC_BADGE.destructive,
};

export function getNoticeCategoryColor(label?: string | null) {
  if (!label) return noticeCategoryColors['일반'];
  return noticeCategoryColors[label] ?? noticeCategoryColors['일반'];
}

/** 첨부(이미지/파일) 배지 색 */
export const attachImageColor = SEMANTIC_BADGE.info;
export const attachFileColor = SEMANTIC_BADGE.neutral;

/** ---------------------- Used Rackets 배지(대여/상태) ---------------------- */
export type UsedBadgeKind = 'rental' | 'condition';

const USED_BADGE_META: Record<UsedBadgeKind, Record<string, { label: string; className: string }>> = {
  rental: {
    available: { label: '대여 가능', className: SEMANTIC_BADGE.success },
    unavailable: { label: '대여 불가', className: SEMANTIC_BADGE.destructive },
    rented: { label: '대여 중', className: SEMANTIC_BADGE.neutral },
    pending: { label: '예약 대기', className: SEMANTIC_BADGE.info },
  },
  condition: {
    A: { label: '최상', className: SEMANTIC_BADGE.success },
    B: { label: '양호', className: SEMANTIC_BADGE.info },
    C: { label: '보통', className: SEMANTIC_BADGE.neutral },
    D: { label: '하', className: SEMANTIC_BADGE.destructive },
  },
};

export function usedBadgeMeta(kind: UsedBadgeKind, state: string) {
  return (
    USED_BADGE_META[kind]?.[state] ?? {
      label: state,
      className: SEMANTIC_BADGE.neutral,
    }
  );
}


export type BoardBadgeKind = 'free' | 'market' | 'gear';

export type BoardCategoryTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const boardCategoryToneMap: Record<BoardBadgeKind, Record<string, BoardCategoryTone>> = {
  free: {
    general: 'neutral',
    info: 'info',
    qna: 'success',
    tip: 'warning',
    etc: 'neutral',
  },
  market: {
    racket: 'info',
    string: 'info',
    equipment: 'warning',
  },
  gear: {
    racket: 'info',
    string: 'info',
    shoes: 'warning',
    bag: 'neutral',
    apparel: 'danger',
    grip: 'success',
    accessory: 'warning',
    ball: 'warning',
    other: 'neutral',
  },
};

export function getBoardCategoryTone(kind: BoardBadgeKind, category?: string | null): BoardCategoryTone {
  const categoryKey = category ?? '';
  return boardCategoryToneMap[kind][categoryKey] ?? 'neutral';
}

export function academyBadgeVariant() {
  return 'brand' as const;
}

export function packagesBadgeVariant(kind: 'hero' | 'selection' | 'benefits' | 'faq') {
  if (kind === 'hero' || kind === 'benefits') return 'neutral' as const;
  return 'brand' as const;
}

export function racketStockBadgeVariant(state: 'sold' | 'allRented' | 'available' | 'rented') {
  if (state === 'sold') return 'neutral' as const;
  if (state === 'allRented') return 'danger' as const;
  if (state === 'rented') return 'warning' as const;
  return 'brand' as const;
}

export function adminPostVisibilityBadgeVariant(status: 'public' | 'hidden') {
  return status === 'public' ? ('brand' as const) : ('neutral' as const);
}

export function adminReportTargetBadgeVariant(targetType: 'post' | 'comment') {
  return targetType === 'post' ? ('neutral' as const) : ('info' as const);
}

export function adminReportStatusBadgeVariant(status: 'pending' | 'resolved' | 'rejected') {
  if (status === 'pending') return 'warning' as const;
  if (status === 'resolved') return 'success' as const;
  return 'danger' as const;
}
