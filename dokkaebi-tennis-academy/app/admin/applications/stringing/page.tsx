import { redirect } from 'next/navigation';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

/**
 * 과거 경로 호환용 페이지입니다.
 * - 교체 서비스 신청서는 이제 /admin/orders에서 일반 주문과 함께 통합 관리합니다.
 * - 관리자가 아닌 경우 접근을 차단합니다.
 * - 관리자면 주문관리 페이지로 리다이렉트합니다.
 */
export default async function AdminStringingApplicationsPage() {
  const user = await getCurrentUser();
  // 관리자 아니면 접근 불가
  if (!user || user.role !== 'admin') return <AccessDenied />;

  // 통합 주문관리로 이동 (교체서비스 프리셋)
  redirect('/admin/orders?preset=stringing');
}
