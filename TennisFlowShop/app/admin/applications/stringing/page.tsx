import { redirect } from 'next/navigation';

/**
 * 과거 경로 호환용 페이지입니다.
 * - 교체 서비스 신청서는 이제 /admin/orders에서 일반 주문과 함께 통합 관리합니다.
 * - 접근 권한 검사는 app/admin/layout.tsx 단일 가드에서 처리합니다.
 * - 여기서는 통합 주문관리 페이지로만 리다이렉트합니다.
 */
export default async function AdminStringingApplicationsPage() {
  // 통합 주문관리로 이동 (교체서비스 프리셋)
  redirect('/admin/orders?preset=stringing');
}
