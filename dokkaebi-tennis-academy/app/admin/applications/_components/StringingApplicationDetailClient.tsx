'use client';

import useSWR from 'swr';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Truck, User, CreditCard, Calendar, XCircle } from 'lucide-react';
import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/admin/applications/_components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/admin/applications/_components/StringingApplicationHistory';
import { paymentStatusColors } from '@/lib/badge-style';
import { bankLabelMap } from '@/lib/constants';

interface Props {
  id: string;
  baseUrl: string;
}

function courierLabel(code: string): string {
  switch (code) {
    case 'cj':
      return 'CJ 대한통운';
    case 'hanjin':
      return '한진택배';
    case 'logen':
      return '로젠택배';
    case 'post':
      return '우체국택배';
    case 'etc':
      return '기타';
    default:
      return code;
  }
}

const shippingMethodLabelMap: Record<string, string> = {
  visit: '방문 수령',
  delivery: '택배 배송',
  quick: '퀵서비스',
};

interface ApplicationDetail {
  id: string;
  customer: {
    name: string;
    email: string;
  };
  requestedAt: string;
  status: string;
  totalPrice?: number;
  history?: { status: string; date: string; description: string }[];
  stringDetails: {
    preferredDate: string;
    preferredTime: string;
    stringType: string;
    customStringName?: string;
    racketType: string;
    requirements?: string;
  };
  shippingInfo?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
    depositor?: string;
    bank?: string;
    deliveryRequest?: string;
    shippingMethod?: string;
    estimatedDate?: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
    };
  } | null;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function StringingApplicationDetailClient({ id, baseUrl }: Props) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(`${baseUrl}/api/applications/stringing/${id}`, fetcher);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm('정말로 이 신청서를 취소하시겠습니까?')) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '취소' }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        showSuccessToast('신청서가 취소되었습니다.');
        mutate();
      } catch (err) {
        showErrorToast('취소 중 오류가 발생했습니다.');
      }
    });
  };

  if (isLoading || !data) return <Skeleton className="h-[300px] w-full" />;
  if (error) return <div className="text-red-500 p-4">신청서를 불러오는 중 오류가 발생했습니다.</div>;

  const isCancelled = data.status === '취소';
  const isPaid = ['접수완료', '작업 중', '교체완료'].includes(data.status);
  const paymentStatus = isPaid ? '결제완료' : '결제대기';

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">신청 상세 정보</h1>
            <p className="mt-1 text-muted-foreground">신청 ID: {data.id}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push(`/admin/applications/stringing/${id}/shipping-update`)}>
              <Truck className="mr-2 h-4 w-4" /> 배송 정보 수정
            </Button>
            {!isCancelled && (
              <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                <XCircle className="mr-2 h-4 w-4" /> 신청 취소
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 상태 카드 */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>신청 상태</CardTitle>
                <ApplicationStatusBadge status={data.status} />
              </div>
              <CardDescription>{new Date(data.requestedAt).toLocaleDateString()}에 접수된 신청입니다.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <ApplicationStatusSelect applicationId={data.id} currentStatus={data.status} onUpdated={() => mutate()} disabled={isCancelled} />
                {isCancelled && <p className="text-sm text-muted-foreground italic mt-2">취소된 신청서입니다. 상태 변경 및 취소가 불가능합니다.</p>}
              </div>
            </CardContent>
          </Card>

          {/* 고객 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" /> 고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>이름:</strong> {data.customer.name}
              </div>
              <div className="flex items-center">
                <Mail className="mr-1 w-4 h-4" /> {data.customer.email}
              </div>
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5" /> 배송 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* 배송 방법 */}
              <div>
                <span className="text-muted-foreground">배송 방법</span>
                <div>{shippingMethodLabelMap[data?.shippingInfo?.shippingMethod ?? ''] || '정보 없음'}</div>
              </div>

              {/* 예상 수령일 */}
              <div>
                <span className="text-muted-foreground">예상 수령일</span>
                <div>{data?.shippingInfo?.estimatedDate || '날짜 없음'}</div>
              </div>

              {/* 택배 배송일 경우 택배사, 운송장 번호 표시 */}
              {data?.shippingInfo?.shippingMethod === 'delivery' && (
                <>
                  <div>
                    <span className="text-muted-foreground">택배사</span>
                    <div>{courierLabel(data?.shippingInfo?.invoice?.courier || '정보 없음')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">운송장 번호</span>
                    <div>{data?.shippingInfo?.invoice?.trackingNumber || '정보 없음'}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 결제 정보 */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                결제 정보
              </CardTitle>
              <Badge variant="outline" className={paymentStatusColors[['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기']}>
                {['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기'}
              </Badge>
            </CardHeader>

            <CardContent className="grid gap-2 text-sm">
              {/* 결제 방식 */}
              <div>
                <span className="text-muted-foreground">결제 방식</span>
                <div>무통장 입금 {data?.shippingInfo?.bank && `(${bankLabelMap[data.shippingInfo.bank]?.label || data.shippingInfo.bank})`}</div>
                {data?.shippingInfo?.depositor && <div className="text-muted-foreground">입금자명: {data?.shippingInfo?.depositor || '미입력'}</div>}
              </div>

              {/* 결제 금액 */}
              <div>
                <span className="text-muted-foreground">결제 금액</span>
                <div>{data?.totalPrice?.toLocaleString()}원</div>
              </div>
            </CardContent>
          </Card>

          {/* 스트링 정보 */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>스트링 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>희망 일시:</strong> {data.stringDetails.preferredDate} {data.stringDetails.preferredTime}
              </div>
              <div>
                <strong>스트링 종류:</strong> {data.stringDetails.stringType === 'custom' ? data.stringDetails.customStringName : data.stringDetails.stringType}
              </div>
              <div>
                <strong>라켓 종류:</strong> {data.stringDetails.racketType}
              </div>
              {data.stringDetails.requirements && (
                <div>
                  <strong>요청사항:</strong> {data.stringDetails.requirements}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 처리 이력 */}
          <div className="md:col-span-3">
            <StringingApplicationHistory history={data.history ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
