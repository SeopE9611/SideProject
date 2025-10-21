// 역할: 초안(draft) 신청서 "생성 or 재사용"을 수행하는 엔드포인트
// - 요청: POST { orderId: string }
// - 응답: { applicationId, orderId, link, reused }

import { handleCreateOrGetDraftApplication } from '@/app/features/stringing-applications/api/handlers';
import { ensureStringingTTLIndexes } from '@/app/features/stringing-applications/api/indexes';
import { getDb } from '@/lib/mongodb';

export async function POST(req: Request) {
  // 멱등(존재하면 skip)하게 인덱스 보장: 최초 몇 번만 생성됨
  const db = await getDb();
  await ensureStringingTTLIndexes(db);

  // 실제 로직은 handlers.ts에 두고, 라우터는 얇게 유지(프로젝트 기존 패턴 준수)
  return handleCreateOrGetDraftApplication(req);
}
