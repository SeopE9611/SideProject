/**
 * created 상태 대여 신청 정리 기능 플래그.
 *
 * - 서버: ADMIN_RENTALS_CLEANUP_CREATED_ENABLED 값을 우선 사용한다.
 * - 클라이언트: NEXT_PUBLIC_ADMIN_RENTALS_CLEANUP_CREATED_ENABLED 값만 접근 가능하다.
 * - 기본값은 false(비활성)로 두어, 명시적으로 켠 환경에서만 동작하게 한다.
 */

const ENABLED_TOKENS = new Set(['1', 'true', 'yes', 'on']);

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  return ENABLED_TOKENS.has(raw.trim().toLowerCase());
}

export const RENTAL_CLEANUP_CREATED_DISABLED_MESSAGE = '정리 기능이 비활성화되었습니다';

/**
 * 관리자 API(서버) 기준 기능 활성 여부.
 * 서버 전용 환경변수를 먼저 확인해 운영 환경에서 강제 제어가 가능하도록 한다.
 */
export const isRentalCleanupCreatedEnabledForServer = (): boolean => parseBoolean(
  process.env.ADMIN_RENTALS_CLEANUP_CREATED_ENABLED
    ?? process.env.NEXT_PUBLIC_ADMIN_RENTALS_CLEANUP_CREATED_ENABLED,
  false,
);

/**
 * 관리자 UI(클라이언트) 기준 기능 활성 여부.
 * 브라우저 번들에서 접근 가능한 NEXT_PUBLIC 변수만 사용한다.
 */
export const isRentalCleanupCreatedEnabledForClient = (): boolean => parseBoolean(
  process.env.NEXT_PUBLIC_ADMIN_RENTALS_CLEANUP_CREATED_ENABLED,
  false,
);

