/**
 * PATCH 매칭 실패 시 응답 에러를 분기한다.
 * - 클라이언트가 clientSeenDate(또는 If-Unmodified-Since)를 보냈고 문서가 여전히 존재하면 동시 수정 충돌로 본다.
 * - 그 외(문서 삭제/실제 미존재)는 not_found로 본다.
 *
 * @param {{ hasClientSeenDate: boolean; postStillExists: boolean }} input
 * @returns {'conflict' | 'not_found'}
 */
export function classifyBoardPatchFailure({ hasClientSeenDate, postStillExists }) {
  if (hasClientSeenDate && postStillExists) {
    return 'conflict';
  }
  return 'not_found';
}
