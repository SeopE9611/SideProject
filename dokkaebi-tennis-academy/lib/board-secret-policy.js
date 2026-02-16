/**
 * QnA 비밀글 마스킹 정책 공통 유틸
 * - accessToken 파싱(payload.sub) 기반으로 viewerId를 확정한다.
 * - 관리자 권한은 DB role 조회 결과로만 판단한다.
 */

/**
 * @typedef {{ viewerId: string | null, isAdmin: boolean, payload: any | null }} BoardViewerContext
 */

/**
 * accessToken + 의존성 콜백을 이용해 뷰어 컨텍스트를 계산한다.
 * @param {{
 *   accessToken?: string | null,
 *   verifyToken: (token: string) => any,
 *   fetchUserRoleById: (userId: string) => Promise<string | null>,
 * }} params
 * @returns {Promise<BoardViewerContext>}
 */
export async function resolveBoardViewerContext({ accessToken, verifyToken, fetchUserRoleById }) {
  if (!accessToken) {
    return { viewerId: null, isAdmin: false, payload: null };
  }

  let payload = null;
  try {
    payload = verifyToken(accessToken);
  } catch {
    payload = null;
  }

  const viewerId = payload?.sub ? String(payload.sub) : null;
  if (!viewerId) {
    return { viewerId: null, isAdmin: false, payload: null };
  }

  let role = null;
  try {
    role = await fetchUserRoleById(viewerId);
  } catch {
    role = null;
  }

  return {
    viewerId,
    isAdmin: role === 'admin',
    payload,
  };
}

/**
 * QnA 비밀글 제목 열람 가능 여부
 * @param {{ isSecret?: boolean | null, authorId?: string | null, viewerId?: string | null, isAdmin?: boolean }} params
 */
export function canViewSecretTitle({ isSecret, authorId, viewerId, isAdmin }) {
  if (!isSecret) return true;
  if (isAdmin) return true;
  if (!authorId || !viewerId) return false;
  return String(authorId) === String(viewerId);
}

/**
 * 목록 아이템의 제목을 비밀글 정책에 맞게 치환한다.
 * @template T extends { title?: string | null, isSecret?: boolean | null, authorId?: string | null }
 * @param {T} item
 * @param {{ viewerId?: string | null, isAdmin?: boolean }} viewer
 * @returns {T & { title: string }}
 */
export function maskSecretTitle(item, viewer) {
  const canView = canViewSecretTitle({
    isSecret: Boolean(item?.isSecret),
    authorId: item?.authorId ?? null,
    viewerId: viewer?.viewerId ?? null,
    isAdmin: Boolean(viewer?.isAdmin),
  });

  return {
    ...item,
    title: canView ? String(item?.title ?? '') : '비밀글입니다',
  };
}
