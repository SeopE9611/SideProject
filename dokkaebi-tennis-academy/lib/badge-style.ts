import { Order } from '@/lib/types/order';
import type { QnaCategory } from '@/lib/types/board';
import { normalizeOrderShippingMethod } from '@/lib/order-shipping';

// 전역 배지 토큰 (크기/정렬/테두리 옵션)
export const badgeSizeSm = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';
export const badgeBase = 'inline-flex items-center gap-1 font-normal';
export const badgeBaseOutlined = `${badgeBase} border border-border bg-background`;

const SEMANTIC_BADGE = {
  success: 'bg-success/20 text-success border border-success/40 dark:bg-success/25 dark:border-success/50',
  warning: 'bg-warning/20 text-warning border border-warning/40 dark:bg-warning/25 dark:border-warning/50',
  info: 'bg-primary/20 text-primary border border-primary/40 dark:bg-primary/25 dark:border-primary/50',
  neutral: 'bg-card text-foreground border border-border',
  danger: 'bg-destructive/20 text-destructive border border-destructive/40 dark:bg-destructive/25 dark:border-destructive/50',
  destructive: 'bg-destructive/20 text-destructive border border-destructive/40 dark:bg-destructive/25 dark:border-destructive/50',
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
  destructive: 'danger',
} as const;

export type BadgeSemanticVariant = (typeof SEMANTIC_BADGE_VARIANT)[BadgeSemanticTone];

export function badgeToneVariant(tone: BadgeSemanticTone): BadgeSemanticVariant {
  return SEMANTIC_BADGE_VARIANT[tone];
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

export const paymentStatusColors: Record<string, string> = {
  결제완료: SEMANTIC_BADGE.success,
  결제대기: SEMANTIC_BADGE.warning,
  결제실패: SEMANTIC_BADGE.destructive,
  결제취소: SEMANTIC_BADGE.destructive,
  환불: SEMANTIC_BADGE.destructive,
};

export const orderTypeColors: Record<string, string> = {
  상품: SEMANTIC_BADGE.info,
  서비스: SEMANTIC_BADGE.info,
  클래스: SEMANTIC_BADGE.info,
};

export const shippingStatusColors: Record<string, string> = {
  등록됨: SEMANTIC_BADGE.success,
  미등록: SEMANTIC_BADGE.destructive,
  방문수령: SEMANTIC_BADGE.info,
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
// "운송장" 전용 색상(테이블 분리용)
export const trackingStatusColors: Record<string, string> = {
  등록됨: shippingStatusColors['등록됨'],
  미등록: shippingStatusColors['미등록'],
  해당없음: SEMANTIC_BADGE.neutral,
};

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

  return { code, label, displayLabel, color: shippingMethodColors[label]! };
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
    return { label: '해당없음' as const, color: trackingStatusColors['해당없음'] };
  }

  const tn = order.shippingInfo?.invoice?.trackingNumber?.trim() ?? '';
  const label: '등록됨' | '미등록' = tn ? '등록됨' : '미등록';
  return { label, color: trackingStatusColors[label] };
}

export const applicationStatusColors = {
  접수완료: SEMANTIC_BADGE.success,
  '검토 중': SEMANTIC_BADGE.warning,
  '작업 중': SEMANTIC_BADGE.info,
  교체완료: SEMANTIC_BADGE.success,
  취소: SEMANTIC_BADGE.destructive,
  default: SEMANTIC_BADGE.neutral,
} as const;

/** ---------------------- QnA 배지 (카테고리/답변 상태) ---------------------- */
export const qnaCategoryColors: Record<QnaCategory, string> = {
  상품문의: SEMANTIC_BADGE.success,
  '주문/결제': SEMANTIC_BADGE.info,
  배송: SEMANTIC_BADGE.info,
  '환불/교환': SEMANTIC_BADGE.destructive,
  서비스: SEMANTIC_BADGE.neutral,
  아카데미: SEMANTIC_BADGE.neutral,
  회원: SEMANTIC_BADGE.neutral,
  일반문의: SEMANTIC_BADGE.neutral,
};

/** 안전 헬퍼: 잘못된 값이 와도 기본 회색으로 */
export function getQnaCategoryColor(label?: QnaCategory | string | null) {
  if (!label) return qnaCategoryColors['일반문의'];
  return (qnaCategoryColors as Record<string, string>)[label] ?? qnaCategoryColors['일반문의'];
}

/** 답변 상태 배지 색상 */
export function getAnswerStatusColor(answered: boolean) {
  return answered ? SEMANTIC_BADGE.success : SEMANTIC_BADGE.neutral;
}

/** ---------------------- Notice / Review 전용 배지 ---------------------- */
export const noticePinColor = SEMANTIC_BADGE.info;

export type ReviewType = 'product' | 'service' | 'etc';
export const reviewTypeColors: Record<ReviewType, string> = {
  product: SEMANTIC_BADGE.info,
  service: SEMANTIC_BADGE.info,
  etc: SEMANTIC_BADGE.neutral,
};
export function getReviewTypeColor(t?: string | null) {
  const key = t === 'product' || t === 'service' ? (t as ReviewType) : 'etc';
  return reviewTypeColors[key];
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

export function getBoardCategoryBadgeColor(kind: BoardBadgeKind, category?: string | null) {
  const c = category ?? '';
  const muted = 'bg-background text-muted-foreground dark:bg-card dark:text-muted-foreground';

  if (kind === 'free') {
    switch (c) {
      case 'general':
        return SEMANTIC_BADGE.neutral;
      case 'info':
        return SEMANTIC_BADGE.info;
      case 'qna':
        return SEMANTIC_BADGE.success;
      case 'tip':
        return SEMANTIC_BADGE.warning;
      case 'etc':
      default:
        return muted;
    }
  }

  if (kind === 'market') {
    switch (c) {
      case 'racket':
      case 'string':
        return SEMANTIC_BADGE.info;
      case 'equipment':
        return SEMANTIC_BADGE.warning;
      default:
        return muted;
    }
  }

  switch (c) {
    case 'racket':
    case 'string':
      return SEMANTIC_BADGE.info;
    case 'shoes':
      return SEMANTIC_BADGE.warning;
    case 'bag':
      return SEMANTIC_BADGE.neutral;
    case 'apparel':
      return SEMANTIC_BADGE.danger;
    case 'grip':
      return SEMANTIC_BADGE.success;
    case 'accessory':
    case 'ball':
      return SEMANTIC_BADGE.warning;
    case 'other':
    default:
      return muted;
  }
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
