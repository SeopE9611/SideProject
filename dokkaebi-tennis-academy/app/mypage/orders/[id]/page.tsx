import OrderDetailContent from '../_components/OrderDetailContent';
import OrderDetailSkeleton from '../_components/OrderDetailSkeleton';

import { Suspense } from 'react';

import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import UserSidebar from '@/app/mypage/orders/_components/UserSidebar';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* 사용자 정보 */}
        <div className="md:col-span-1">
          <UserSidebar />
        </div>

        {/* 오른쪽 콘텐츠 – Suspense 처리 */}
        <div className="md:col-span-3">
          <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetailContent orderId={id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
