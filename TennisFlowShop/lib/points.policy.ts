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

// =========================================================
// 회원가입 보너스(이벤트) 정책
// - 환경변수로 ON/OFF + 기간 + 금액 제어
// - refKey를 고정 규칙으로 만들어 멱등(중복 지급) 보장
// =========================================================

function envBool(v: string | undefined, fallback = false) {
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function envNumber(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
// KST 기준 날짜(YYYY-MM-DD)를 Date로 변환
function kstDate(dateStr: string, endOfDay = false): Date | null {
  const s = (dateStr ?? '').trim();
  if (!s) return null;
  // KST(+09:00) 기준으로 고정 파싱 (Vercel UTC 환경에서도 안전)
  const time = endOfDay ? '23:59:59' : '00:00:00';
  const d = new Date(`${s}T${time}+09:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

// Client 컴포넌트(app/page.tsx 등)에서도 팝업 노출 판단이 필요해서
// server env(SIGNUP_BONUS_*)가 없을 경우 NEXT_PUBLIC_* 값을 fallback으로 사용
const RAW_SIGNUP_BONUS_ENABLED = process.env.SIGNUP_BONUS_ENABLED ?? process.env.NEXT_PUBLIC_SIGNUP_BONUS_ENABLED;
const RAW_SIGNUP_BONUS_POINTS = process.env.SIGNUP_BONUS_POINTS ?? process.env.NEXT_PUBLIC_SIGNUP_BONUS_POINTS;
const RAW_SIGNUP_BONUS_START_DATE = process.env.SIGNUP_BONUS_START_DATE ?? process.env.NEXT_PUBLIC_SIGNUP_BONUS_START_DATE;
const RAW_SIGNUP_BONUS_END_DATE = process.env.SIGNUP_BONUS_END_DATE ?? process.env.NEXT_PUBLIC_SIGNUP_BONUS_END_DATE;
const RAW_SIGNUP_BONUS_CAMPAIGN_ID = process.env.SIGNUP_BONUS_CAMPAIGN_ID ?? process.env.NEXT_PUBLIC_SIGNUP_BONUS_CAMPAIGN_ID;

export const SIGNUP_BONUS_ENABLED = envBool(RAW_SIGNUP_BONUS_ENABLED, false);
export const SIGNUP_BONUS_POINTS = envNumber(RAW_SIGNUP_BONUS_POINTS, 3000);
export const SIGNUP_BONUS_START_DATE = (RAW_SIGNUP_BONUS_START_DATE ?? '').trim(); // YYYY-MM-DD
export const SIGNUP_BONUS_END_DATE = (RAW_SIGNUP_BONUS_END_DATE ?? '').trim();     // YYYY-MM-DD
export const SIGNUP_BONUS_CAMPAIGN_ID = (RAW_SIGNUP_BONUS_CAMPAIGN_ID ?? 'signup_bonus').trim();

export function isSignupBonusActive(now = new Date()): boolean {
  if (!SIGNUP_BONUS_ENABLED) return false;
  if (!Number.isFinite(SIGNUP_BONUS_POINTS) || SIGNUP_BONUS_POINTS <= 0) return false;

  const start = kstDate(SIGNUP_BONUS_START_DATE, false);
 const end = kstDate(SIGNUP_BONUS_END_DATE, true);

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

// refKey는 points_transactions에 unique 인덱스가 걸려있어서 “중복 지급”을 구조적으로 차단함
export function signupBonusRefKey(userId: { toString(): string } | string) {
  const uid = typeof userId === 'string' ? userId : userId.toString();
  return `signup_bonus:${SIGNUP_BONUS_CAMPAIGN_ID}:${uid}`;
}
