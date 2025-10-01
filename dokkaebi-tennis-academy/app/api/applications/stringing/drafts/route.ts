// 역할: 초안(draft) 신청서 "생성 or 재사용"을 수행하는 엔드포인트
// - 요청: POST { orderId: string }
// - 응답: { applicationId, orderId, link, reused }

import { handleCreateOrGetDraftApplication } from '@/app/features/stringing-applications/api/handlers';

export async function POST(req: Request) {
  // 실제 로직은 handlers.ts에 두고, 라우터는 얇게 유지(프로젝트 기존 패턴 준수)
  return handleCreateOrGetDraftApplication(req);
}
