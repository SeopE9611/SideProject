import OrderDetailSkeleton from '../_components/OrderDetailSkeleton';

import { Suspense } from 'react';
import { UserSidebar } from '@/app/mypage/orders/_components/UserSidebar';
import OrderDetailClient from '@/app/mypage/orders/_components/OrderDetailClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export default async function OrderDetailPage({ params: { id } }: { params: { id: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* 사이드바 */}
        <div className="md:col-span-1">
          <UserSidebar />
        </div>

        {/* 메인 콘텐츠 – Suspense 로딩 처리 */}
        <div className="md:col-span-3">
          <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetailClient orderId={id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
