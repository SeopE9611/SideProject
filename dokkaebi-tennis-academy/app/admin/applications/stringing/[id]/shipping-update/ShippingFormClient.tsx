'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, Truck } from 'lucide-react';
import ShippingForm from '@/app/admin/applications/stringing/[id]/shipping-update/shipping-form';

type Application = {
  _id: string;
  shippingInfo?: {
    shippingMethod?: string;
    estimatedDate?: string;
    invoice?: {
      courier?: string;
      trackingNumber?: string;
    };
  };
};

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('신청서 조회 실패');
    return r.json();
  });

export interface Props {
  applicationId: string;
  onSuccess?: () => void;
}

export default function ShippingFormClient({ applicationId, onSuccess }: Props) {
  const { data, error, isLoading } = useSWR<Application>(`/api/applications/stringing/${applicationId}`, fetcher);

  const shippingInfo = data?.shippingInfo ?? {};
  const invoice = shippingInfo.invoice ?? {};

  // 기존 배송정보가 하나라도 있으면 "수정", 아무것도 없으면 "등록"
  const method = String(shippingInfo.shippingMethod ?? '').trim();
  const date = String(shippingInfo.estimatedDate ?? '').trim();
  const courier = String(invoice.courier ?? '').trim();
  const tracking = String(invoice.trackingNumber ?? '').trim();
  const isRegistered = Boolean(method || date || courier || tracking);

  const pageTitle = data ? (isRegistered ? '배송 정보 수정' : '배송 정보 등록') : '배송 정보 관리';
  const pageDesc = data ? (isRegistered ? '배송 방법과 예상 수령일을 수정할 수 있습니다.' : '배송 방법과 예상 수령일을 등록할 수 있습니다.') : isLoading ? '신청 정보를 불러오는 중입니다…' : '신청 정보를 불러올 수 없습니다.';

  let content = null;
  if (isLoading) {
    content = (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>신청 정보를 불러오는 중입니다…</span>
        </CardContent>
      </Card>
    );
  } else if (error || !data) {
    content = (
      <Card className="border-red-200">
        <CardContent className="py-10 flex items-center justify-center gap-3 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>신청 정보를 불러올 수 없습니다.</span>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <ShippingForm
        applicationId={applicationId}
        initialShippingMethod={shippingInfo.shippingMethod || ''}
        initialEstimatedDelivery={shippingInfo.estimatedDate || ''}
        initialCourier={invoice.courier || ''}
        initialTrackingNumber={invoice.trackingNumber || ''}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
            <Truck className="h-8 w-8 text-blue-600 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{pageTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400">{pageDesc}</p>
        </div>
        {content}
      </div>
    </div>
  );
}
