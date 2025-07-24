'use client';

import useSWR from 'swr';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Truck, User, CreditCard, Calendar, XCircle, ArrowLeft, LinkIcon, ShoppingCart } from 'lucide-react';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/features/stringing-applications/components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/features/stringing-applications/components/StringingApplicationHistory';
import { paymentStatusColors } from '@/lib/badge-style';
import { bankLabelMap } from '@/lib/constants';
import { useStringingStore } from '@/app/store/stringingStore';
import CustomerEditForm, { CustomerFormValues } from '@/app/features/stringing-applications/components/CustomerEditForm';

interface Props {
  id: string;
  baseUrl: string;
}

interface ApplicationDetail {
  id: string;
  orderId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressDetail: string;
    postalCode: string;
  };
  requestedAt: string;
  status: string;
  // totalPrice?: number;
  total: number;
  history?: { status: string; date: string; description: string }[];
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
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

export default function StringingApplicationDetailClient({ baseUrl }: Props) {
  const router = useRouter();
  const applicationId = useStringingStore((state) => state.selectedApplicationId);
  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(applicationId ? `${baseUrl}/api/applications/stringing/${applicationId}` : null, fetcher);
  const [isPending, startTransition] = useTransition();
  const historyMutateRef = useRef<(() => Promise<any>) | undefined>(undefined);
  // 전역 편집 모드 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 카드 편집 토글
  const [editingCustomer, setEditingCustomer] = useState(false);
  const handleCancel = () => {
    if (!confirm('정말로 이 신청서를 취소하시겠습니까?')) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${applicationId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '취소' }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        showSuccessToast('신청서가 취소되었습니다.');
        mutate();
        if (historyMutateRef.current) historyMutateRef.current();
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
          <div className="flex space-x-2">
            <Button
              variant={isEditMode ? 'destructive' : 'outline'}
              onClick={() => {
                setIsEditMode((m) => !m);
                setEditingCustomer(false);
              }}
            >
              {isEditMode ? '편집 취소' : '편집 모드'}
            </Button>
            <Link href="/admin/orders">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로 돌아가기
              </Button>
            </Link>
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
                <ApplicationStatusSelect
                  applicationId={data.id}
                  currentStatus={data.status}
                  onUpdated={async () => {
                    // 상세 데이터 갱신
                    await mutate();
                    // 이력 컴포넌트 캐시 갱신
                    if (historyMutateRef.current) {
                      await historyMutateRef.current();
                    }
                  }}
                  disabled={isCancelled}
                />
                {/* 취소된 경우 안내 문구 */}
                {!isCancelled && (
                  <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                    <XCircle className="mr-2 h-4 w-4" />
                    신청 취소
                  </Button>
                )}
              </div>

              {/* 취소 안내 메시지는 하단 별도로 */}
              {isCancelled && <p className="text-sm text-muted-foreground italic mt-2">취소된 신청서입니다. 상태 변경 및 취소가 불가능합니다.</p>}
            </CardContent>
            {/* 연결된 주문 링크 */}
            {data?.orderId && (
              <Card className="border border-muted text-sm text-muted-foreground">
                <CardContent className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <span>이 신청은 상품 주문서와 연결되어 있습니다.</span>
                  </div>
                  <Link href={`/admin/orders/${data.orderId}`}>
                    <Button variant="ghost" size="sm">
                      주문 상세 보기
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </Card>

          {/* 고객 정보 */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" /> 고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {editingCustomer ? (
                <CustomerEditForm
                  initialData={{
                    name: data.customer.name ?? '이름 미입력',
                    email: data.customer.email ?? '이메일 미입력',
                    phone: data.shippingInfo?.phone ?? '전화번호 미입력',
                    address: data.shippingInfo?.address ?? '주소 미입력',
                    addressDetail: data.shippingInfo?.addressDetail ?? '상세 주소 미입력',
                    postalCode: data.shippingInfo?.postalCode ?? '우편번호 미입력',
                  }}
                  resourcePath={`${baseUrl}/api/applications/stringing`}
                  entityId={data.id}
                  onSuccess={() => {
                    mutate(); // 상세 데이터 갱신
                    historyMutateRef.current?.(); // 이력 갱신
                    setEditingCustomer(false); // 폼 닫기
                  }}
                  onCancel={() => setEditingCustomer(false)}
                />
              ) : (
                <>
                  <div>
                    <strong>이름:</strong> {data.customer.name ?? '정보 없음'}
                  </div>
                  <div className="flex items-center">
                    <Mail className="mr-1 w-4 h-4" /> {data.customer.email ?? '정보 없음'}
                  </div>
                  <div>
                    <strong>전화번호:</strong> {data.customer?.phone ?? '정보 없음'}
                  </div>
                  <div>
                    <strong>주소:</strong> {data.customer?.address ?? '정보 없음'}
                  </div>
                  <div>
                    <strong>상세주소:</strong> {data.customer?.addressDetail ?? '-'}
                  </div>
                  <div>
                    <strong>우편번호:</strong> {data.customer?.postalCode ?? '-'}
                  </div>
                </>
              )}
            </CardContent>

            {!editingCustomer && isEditMode && (
              <CardFooter className="pt-2 flex justify-center">
                <Button size="sm" variant="outline" onClick={() => setEditingCustomer(true)}>
                  수정하기
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 결제 정보 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> 결제 정보
              </CardTitle>
              <Badge variant="outline" className={paymentStatusColors[['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기']}>
                {['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기'}
              </Badge>
            </CardHeader>

            <CardContent className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">결제 방식</span>
                <div>무통장 입금 {data?.shippingInfo?.bank && `(${bankLabelMap[data.shippingInfo.bank]?.label || data.shippingInfo.bank})`}</div>
                {data?.shippingInfo?.depositor && <div className="text-muted-foreground">입금자명: {data?.shippingInfo?.depositor || '미입력'}</div>}
              </div>

              <div>
                <span className="text-muted-foreground">결제 금액</span>
                <div>{data?.total?.toLocaleString()}원</div>
              </div>
            </CardContent>
          </Card>

          {/* 스트링 정보 */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                신청 스트링 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>희망 일시:</strong> {data.stringDetails.preferredDate} {data.stringDetails.preferredTime}
              </div>
              <div>
                <strong>스트링 정보:</strong>{' '}
                {data.items.length > 0
                  ? data.items.map((item, idx) => (
                      <span key={item.id}>
                        {item.name} ×{item.quantity} ({item.price.toLocaleString()}원)
                        {idx < data.items.length - 1 && ', '}
                      </span>
                    ))
                  : data.stringDetails.customStringName || '정보 없음'}
              </div>
              <div>
                <strong>라켓 종류:</strong> {data.stringDetails.racketType}
              </div>
              {/* <div>
                <strong>요청사항:</strong> {data.stringDetails.requirements ? data.stringDetails.requirements : '요청사항 없음'}
              </div> */}
            </CardContent>
          </Card>

          {/* 요청사항 카드 */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>요청사항</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{data?.stringDetails?.requirements?.trim() ? data.stringDetails.requirements : <span className="text-muted-foreground">요청사항이 없습니다.</span>}</CardContent>
          </Card>

          {/* 처리 이력 */}
          <div className="md:col-span-3">
            {applicationId && (
              <StringingApplicationHistory
                applicationId={applicationId}
                onHistoryMutate={(mutateFn) => {
                  historyMutateRef.current = mutateFn;
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
