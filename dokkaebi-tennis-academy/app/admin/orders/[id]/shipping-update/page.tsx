import ShippingFormClient from './ShippingFormClient';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import { Truck } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  const headersList = await headers();
  const host = headersList.get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;
  const cookie = headersList.get('cookie') ?? '';

  const res = await fetch(`${baseUrl}/api/orders/${id}`, {
    cache: 'no-store',
    headers: { cookie },
  });

  // (가드) 주문이 아니라면: "신청서 ID를 잘못 넣은 케이스"를 먼저 구제.
  // - 예: /admin/orders/{applicationId}/shipping-update 로 직접 접근했을 때
  // - 이 경우 주문 조회는 404가 나므로, 신청서 조회가 성공하면 신청서 배송 페이지로 즉시 이동
  if (!res.ok) {
    const appRes = await fetch(`${baseUrl}/api/applications/stringing/${id}`, {
      cache: 'no-store',
      headers: { cookie },
    });

    if (appRes.ok) {
      redirect(`/admin/applications/stringing/${id}/shipping-update`);
    }

    // ✅ (UX) throw로 터뜨리지 말고, 페이지 내에서 오류를 안내합니다.
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
              <Truck className="h-8 w-8 text-blue-600 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">배송 정보 관리</h1>
            <p className="text-gray-600 dark:text-gray-400">주문 데이터를 불러올 수 없습니다.</p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white/80 p-6 shadow-lg dark:border-red-900/50 dark:bg-gray-900/70">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              입력한 ID가 <strong>주문 ID</strong>가 아닐 수 있습니다. (예: <strong>교체서비스 신청서 ID</strong>를 주문 URL에 넣은 경우)
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/admin/orders" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                주문 목록으로
              </a>
              <a href="/admin/applications/stringing" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                교체서비스 신청 목록으로
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!res.ok) throw new Error('주문 데이터를 불러올 수 없습니다.');

  const order = await res.json();

  // "상품 주문 + 교체서비스 신청서"로 연결된 케이스는
  // 배송/운송장 관리를 신청서에서만 하도록 단일화한다.
  // 주문 배송등록 URL로 들어오면 신청서 배송등록으로 강제 이동(관리자 혼란 방지)
  const apps = Array.isArray(order?.stringingApplications) ? order.stringingApplications : [];

  const appIdFromList =
    apps.filter((a: any) => a?.id && a?.status && a.status !== 'draft' && a.status !== '취소').sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]?.id ??
    apps.filter((a: any) => a?.id).sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]?.id ??
    null;

  const appId = order?.stringingApplicationId ?? appIdFromList;

  if (order?.isStringServiceApplied && appId) {
    redirect(`/admin/applications/stringing/${appId}/shipping-update`);
  }

  // 기존 배송정보가 하나라도 있으면 "수정", 아무것도 없으면 "등록"
  const method = String(order?.shippingInfo?.shippingMethod ?? '').trim();
  const date = String(order?.shippingInfo?.estimatedDate ?? '').trim();
  const courier = String(order?.shippingInfo?.invoice?.courier ?? '').trim();
  const tracking = String(order?.shippingInfo?.invoice?.trackingNumber ?? '').trim();
  const isRegistered = Boolean(method || date || courier || tracking);
  const pageTitle = isRegistered ? '배송 정보 수정' : '배송 정보 등록';
  const pageDesc = isRegistered ? '배송 방법과 예상 수령일을 수정할 수 있습니다.' : '배송 방법과 예상 수령일을 등록할 수 있습니다.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
            <Truck className="h-8 w-8 text-blue-600 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{pageTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400">{pageDesc}</p>
        </div>

        <ShippingFormClient
          orderId={order._id}
          initialShippingMethod={order.shippingInfo?.shippingMethod ?? ''}
          initialEstimatedDelivery={order.shippingInfo?.estimatedDate ?? ''}
          initialCourier={order.shippingInfo?.invoice?.courier ?? ''}
          initialTrackingNumber={order.shippingInfo?.invoice?.trackingNumber ?? ''}
        />
      </div>
    </div>
  );
}
