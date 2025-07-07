'use client';

import useSWR from 'swr';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';
import { ApplicationStatusSelect } from '@/app/admin/applications/_components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/admin/applications/_components/StringingApplicationHistory';

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

interface ApplicationDetail {
  id: string;
  customer: {
    name: string;
    email: string;
  };
  requestedAt: string;
  status: string;

  history?: {
    status: string;
    date: string;
    description: string;
  }[];

  stringDetails: {
    preferredDate: string;
    preferredTime: string;
    stringType: string;
    customStringName?: string;
    racketType: string;
    requirements?: string;
  };

  totalPrice?: number;

  shippingInfo?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
    depositor?: string;
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
  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(`${baseUrl}/api/applications/stringing/${id}`, fetcher);

  const [isPending, startTransition] = useTransition();

  const isCancelled = data?.status === '취소';
  // console.log('응답 받은 data:', data);

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

        if (!res.ok) throw new Error('신청서 취소 실패');

        showSuccessToast('신청서가 취소되었습니다.');
        mutate(); // SWR 데이터 갱신
      } catch (err) {
        showErrorToast('취소 중 오류가 발생했습니다.');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-10 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-10 text-red-500">신청서를 불러오지 못했습니다.</div>;
  }
  console.log('📌 applicationId:', data.id);
  // console.log('data.totalPrice:', data.totalPrice);

  return (
    <div className="space-y-6 px-6 py-10">
      <div className="text-right mt-4">
        <Link href={`/admin/applications/stringing/${id}/shipping-update`}>
          <Button variant="outline">
            <Truck className="w-4 h-4 mr-2" />
            배송 정보 수정
          </Button>
        </Link>
        {!isCancelled ? (
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            신청 취소
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">취소된 신청서입니다. 상태 변경 및 취소가 불가능합니다.</p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>신청자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>이름:</strong> {data.customer?.name ?? '이름 없음'}
          </div>
          <div>
            <strong>이메일:</strong> {data.customer.email}
          </div>
          <div>
            <strong>신청 일시:</strong> {new Date(data.requestedAt).toLocaleString()}
          </div>
          <div>
            <ApplicationStatusBadge status={data.status} />
          </div>
          <div>
            <ApplicationStatusSelect applicationId={data.id} currentStatus={data.status} onUpdated={() => mutate()} disabled={isCancelled} />
          </div>
        </CardContent>
      </Card>

      {/* 스트링 정보 섹션 */}
      <Card>
        <CardHeader>
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
              <strong>추가 요청사항:</strong> {data.stringDetails.requirements}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 배송지 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>배송지 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.shippingInfo ? (
            <>
              <div>
                <strong>수령인:</strong> {data.shippingInfo.name}
              </div>
              <div>
                <strong>연락처:</strong> {data.shippingInfo.phone}
              </div>
              <div>
                <strong>주소:</strong> {data.shippingInfo.address} {data.shippingInfo.addressDetail}
              </div>
              <div>
                <strong>우편번호:</strong> {data.shippingInfo.postalCode}
              </div>
              {data.shippingInfo.deliveryRequest && (
                <div>
                  <strong>배송 요청사항:</strong> {data.shippingInfo.deliveryRequest}
                </div>
              )}
              {data.shippingInfo.shippingMethod && (
                <div>
                  <strong>배송 방법:</strong>{' '}
                  {data.shippingInfo.shippingMethod === 'visit' ? '방문 수령' : data.shippingInfo.shippingMethod === 'delivery' ? '택배 배송' : data.shippingInfo.shippingMethod === 'quick' ? '퀵 배송' : data.shippingInfo.shippingMethod}
                </div>
              )}
              {data.shippingInfo.estimatedDate && (
                <div>
                  <strong>예상 수령일:</strong> {data.shippingInfo.estimatedDate}
                </div>
              )}
              {data.shippingInfo.invoice?.courier && (
                <div>
                  <strong>택배사:</strong> {courierLabel(data.shippingInfo.invoice.courier)}
                </div>
              )}
              {data.shippingInfo.invoice?.trackingNumber && (
                <div>
                  <strong>운송장 번호:</strong> {data.shippingInfo.invoice.trackingNumber}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">배송지 정보가 없습니다.</div>
          )}
        </CardContent>
      </Card>

      {/* 결제 정보 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {/* 입금자명이 있는 경우 */}
          {data.shippingInfo?.depositor && (
            <div>
              <strong>입금자명:</strong> {data.shippingInfo.depositor}
            </div>
          )}

          {/* 서비스 금액이 있는 경우 */}
          {typeof data.totalPrice === 'number' && (
            <div>
              <strong>서비스 금액:</strong> {data.totalPrice.toLocaleString()}원
            </div>
          )}

          {/* 아무 정보도 없을 때 */}
          {!data.shippingInfo?.depositor && data.totalPrice === undefined && <div className="text-muted-foreground">결제 정보가 없습니다.</div>}
        </CardContent>
      </Card>

      {/* 주문서 상태 처리 이력 */}
      <StringingApplicationHistory history={data.history ?? []} />
    </div>
  );
}
