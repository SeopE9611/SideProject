/**
 * 게시판별 공개 라우트 정책.
 * - type별 외부 공개 경로를 단일 맵으로 관리한다.
 * - 식별자 정책(identifier)으로 URL 세그먼트 구성 방식을 분리한다.
 */
export const BOARD_PUBLIC_ROUTE_POLICY = Object.freeze({
  notice: Object.freeze({ routePrefix: '/board/notice', identifier: 'postNo' }),
  qna: Object.freeze({ routePrefix: '/board/qna', identifier: 'postNo' }),
  free: Object.freeze({ routePrefix: '/board/free', identifier: 'postNo' }),
  gear: Object.freeze({ routePrefix: '/board/gear', identifier: 'postNo' }),
  market: Object.freeze({ routePrefix: '/board/market', identifier: 'postNo' }),
  hot: Object.freeze({ routePrefix: '/board/hot', identifier: 'postNo' }),
  // 타입 체계는 brand로 표준화하되, 공개 URL은 기존 /board/brands 경로를 유지한다.
  brand: Object.freeze({ routePrefix: '/board/brands', identifier: 'postNo' }),
});

function normalizeBoardType(type) {
  if (typeof type !== 'string') return '';

  const normalizedType = type.trim().toLowerCase();

  // 과도기 호환: 레거시 brands 입력을 표준 brand로 흡수한다.
  if (normalizedType === 'brands') {
    return 'brand';
  }

  return normalizedType;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * 공개 게시글 링크를 생성한다.
 * @param {{ type: string; id?: string | null; postNo?: number | null; status?: string | null }} params
 * @returns {{ ok: true; url: string; policyType: string } | { ok: false; reason: 'missing_type_route' | 'private_post' | 'missing_identifier' }}
 */
export function buildBoardPublicUrl(params) {
  const type = normalizeBoardType(params?.type);
  const policy = BOARD_PUBLIC_ROUTE_POLICY[type];

  if (!policy) {
    return { ok: false, reason: 'missing_type_route' };
  }

  if (params?.status === 'hidden' || params?.status === 'private') {
    return { ok: false, reason: 'private_post' };
  }

  if (policy.identifier === 'postNo') {
    if (!isPositiveInteger(params?.postNo)) {
      return { ok: false, reason: 'missing_identifier' };
    }

    return {
      ok: true,
      url: `${policy.routePrefix}/${params.postNo}`,
      policyType: type,
    };
  }

  return { ok: false, reason: 'missing_identifier' };
}

/**
 * 관리자 내부 상세 URL fallback.
 * URL 생성 실패 시 새 탭 이동 실패를 줄이기 위해 사용한다.
 * @param {{ id?: string | null }} params
 */
export function buildAdminBoardDetailUrl(params) {
  const id = typeof params?.id === 'string' ? params.id.trim() : '';
  return id ? `/admin/boards/${id}` : null;
}
