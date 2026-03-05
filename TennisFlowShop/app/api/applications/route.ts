import { NextResponse } from 'next/server';

/**
 * Legacy endpoint sunset.
 *
 * - 운영 경로에서 `/api/applications` 직접 조회를 제거한다.
 * - 정식 신청서 컬렉션은 `stringing_applications` 이며,
 *   조회 계약은 `/api/applications/me` 또는 `/api/applications/stringing/list` 를 사용한다.
 */
export async function GET() {
  return NextResponse.json(
    {
      message: 'This endpoint is gone. Use /api/applications/me or /api/applications/stringing/list.',
      code: 'GONE_LEGACY_ENDPOINT',
      canonicalCollection: 'stringing_applications',
    },
    { status: 410 },
  );
}
