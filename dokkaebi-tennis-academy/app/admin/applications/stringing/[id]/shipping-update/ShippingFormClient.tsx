'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>신청 정보를 불러오는 중입니다…</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <Card className="border-red-200">
          <CardContent className="py-10 flex items-center justify-center gap-3 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>신청 정보를 불러올 수 없습니다.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shippingInfo = data.shippingInfo ?? {};
  const invoice = shippingInfo.invoice ?? {};

  return (
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
