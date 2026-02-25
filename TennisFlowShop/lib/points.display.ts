import type { PointTransactionStatus, PointTransactionType } from '@/lib/types/points';

type AnyStr = string | null | undefined;

export type PointRefInfo = { kind: 'order'; orderId: string; suffix?: string } | { kind: 'review'; reviewId: string } | { kind: 'unknown'; raw: string };

/**
 * refKey 파싱 (중복 방지/연결 키)
 * - order:<orderId>[:...]
 * - review:<reviewId>
 */
export function parsePointRefKey(refKey: AnyStr): PointRefInfo | null {
  const v = String(refKey ?? '').trim();
  if (!v) return null;

  const [prefix, id, ...rest] = v.split(':');

  if (prefix === 'order' && id) {
    const suffix = rest.length ? rest.join(':') : undefined;
    return { kind: 'order', orderId: id, suffix };
  }

  if (prefix === 'review' && id) {
    return { kind: 'review', reviewId: id };
  }

  return { kind: 'unknown', raw: v };
}

export function shortId(id: string, head = 6, tail = 4) {
  const v = String(id ?? '').trim();
  if (!v) return '';
  if (v.length <= head + tail + 1) return v;
  return `${v.slice(0, head)}…${v.slice(-tail)}`;
}

export function pointTxTypeLabel(type: PointTransactionType | AnyStr) {
  switch (type) {
    case 'admin_adjust':
      return '관리자 조정';
    case 'review_reward_product':
      return '리뷰 적립(상품)';
    case 'review_reward_service':
      return '리뷰 적립(서비스)';
    case 'order_reward':
      return '구매 적립';
    case 'signup_bonus':
      return '가입 보너스';
    case 'spend_on_order':
      return '포인트 사용';
    case 'reversal':
      return '회수/되돌림';
    case 'hold_on_order':
      return '포인트 보류';
    case 'release_hold':
      return '보류 해제';
    default:
      return type ? String(type) : '기타';
  }
}

export function pointTxStatusLabel(status: PointTransactionStatus | AnyStr) {
  switch (status) {
    case 'confirmed':
      return '확정';
    case 'held':
      return '보류';
    case 'canceled':
      return '취소';
    default:
      return status ? String(status) : '미정';
  }
}

/**
 * reason이 비어 있는 경우(또는 너무 짧은 경우) 기본 문구를 제공
 * - 서버 reason이 아직 충분히 풍부하지 않은 구간을 UI에서 보완하기 위한 안전장치
 */
export function fallbackReason(type: PointTransactionType | AnyStr) {
  switch (type) {
    case 'order_reward':
      return '주문 구매 적립';
    case 'spend_on_order':
      return '주문 결제/차감';
    case 'review_reward_product':
    case 'review_reward_service':
      return '리뷰 작성 적립';
    case 'signup_bonus':
      return '회원 가입 보너스';
    case 'admin_adjust':
      return '관리자에 의해 조정됨';
    case 'reversal':
      return '거래 되돌림/회수';
    case 'hold_on_order':
      return '사용 포인트 보류';
    case 'release_hold':
      return '보류된 포인트 해제';
    default:
      return null;
  }
}

export function safeLocalDateTime(iso: AnyStr) {
  const d = new Date(String(iso ?? ''));
  if (!Number.isFinite(d.getTime())) return '-';
  return d.toLocaleString('ko-KR');
}
