//
// 포인트 정책(금액/비율/반올림 규칙)을 “한 곳”에서만 관리하기 위한 파일
// - 라우트(orders/reviews)나 서비스(points.service)에서 숫자를 직접 박지 않도록 처리
// - 정책이 바뀌면 이 파일만 수정

/**
 * MVP: 리뷰 작성 시 적립 포인트
 * - 상품/서비스 리뷰 모두 동일 포인트로 시작
 */
export const REVIEW_REWARD_POINTS = 50;

/**
 * 주문 결제완료 시 적립 비율 (예: 1% = 0.01)
 * - 정책을 바꾸면 이 값만 조정
 */
export const ORDER_EARN_RATE = 0.01;

/**
 * 결제 완료된 주문 금액(totalPrice)을 받아, 적립 포인트를 계산
 * - 정수 포인트만 사용하므로 내림 처리
 */
export function calcOrderEarnPoints(totalPrice: number): number {
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return 0;
  return Math.floor(totalPrice * ORDER_EARN_RATE);
}
