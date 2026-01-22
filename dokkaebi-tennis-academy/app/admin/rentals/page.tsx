import AdminRentalsClient from '@/app/admin/rentals/_components/AdminRentalsClient';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // 서버에서 관리자 권한을 먼저 확인 (페이지 자체를 관리자 전용으로 고정)
  // - e2e 테스트/점검 목적의 우회 쿠키(__e2e=1)는 admin layout과 동일하게 유지
  const cookieStore = await cookies();
  const e2eBypass = cookieStore.get('__e2e')?.value === '1';

  if (!e2eBypass) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return <AccessDenied />;
    }
  }

  return <AdminRentalsClient />;
}
