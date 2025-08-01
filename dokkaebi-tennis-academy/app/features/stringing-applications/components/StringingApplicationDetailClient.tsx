'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Truck, User, CreditCard, Calendar, XCircle, ArrowLeft, LinkIcon, ShoppingCart, TargetIcon, Target, Pencil } from 'lucide-react';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/features/stringing-applications/components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/features/stringing-applications/components/StringingApplicationHistory';
import { paymentStatusColors } from '@/lib/badge-style';
import { bankLabelMap } from '@/lib/constants';
import { useStringingStore } from '@/app/store/stringingStore';
import CustomerEditForm, { CustomerFormValues } from '@/app/features/stringing-applications/components/CustomerEditForm';
import PaymentEditForm from '@/app/features/stringing-applications/components/PaymentEditForm';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StringInfoEditForm from '@/app/features/stringing-applications/components/StringInfoEditForm';
import RequirementsEditForm from '@/app/features/stringing-applications/components/RequirementsEditForm';
import StringingApplicationDetailSkeleton from '@/app/features/stringing-applications/components/StringingApplicationDetailSkeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PaymentMethodDetail from '@/app/features/stringing-applications/components/PaymentMethodDetail';

interface Props {
  id: string;
  baseUrl: string;
  backUrl?: string /** 뒤로 가기 링크(관리자 기본: '/admin/orders') */;
  isAdmin?: boolean /** 관리자 여부(기본: true) */;
  userEditableStatuses?: string[] /** 일반 사용자가 편집 가능한 상태 */;
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
  totalPrice: number;
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
    stringTypes: string[];
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
  purchasedStrings: {
    id: string;
    name: string;
    mountingFee: number;
  }[];
  orderStrings: {
    id: string;
    name: string;
    mountingFee: number;
  }[];
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function StringingApplicationDetailClient({ id, baseUrl, backUrl = '/admin/orders', isAdmin = true, userEditableStatuses = ['검토 중', '접수완료'] }: Props) {
  const router = useRouter();

  const historyMutateRef = useRef<(() => Promise<any>) | undefined>(undefined);
  // 전역 편집 모드 토글
  const [isEditMode, setIsEditMode] = useState(false);
  // 고객 정보 카드 편집 토글
  const [editingCustomer, setEditingCustomer] = useState(false);
  // 결제정보 편집 토글
  const [editingPayment, setEditingPayment] = useState(false);
  // 신청 스트링 정보 모달 상태
  const [isStringModalOpen, setIsStringModalOpen] = useState(false);
  // 요청사항 편집 모드
  const [editingRequirements, setEditingRequirements] = useState(false);

  const [isPending, startTransition] = useTransition();
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

  // 기존 store 아이디
  const storeId = useStringingStore((state) => state.selectedApplicationId);
  // 새로고침 대비 fallback: prop 으로 내려준 id 를 쓰거나, storeId 사용
  const applicationId = storeId ?? id;

  // store가 비어 있을 땐 id 로 채워두면 이후 내비게이션 시에도 동일하게 동작
  useEffect(() => {
    if (!storeId) {
      useStringingStore.setState({ selectedApplicationId: id });
    }
  }, [id, storeId]);

  // SWR 키가 항상 applicationId 로 고정 (새로고침해도 fetch가 정상 동작하기 위함)
  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(applicationId ? `${baseUrl}/api/applications/stringing/${applicationId}` : null, (url: any) => fetch(url, { credentials: 'include' }).then((r) => r.json()));
  // 관리자는 항상, 일반 사용자는 지정된 상태에서만 편집 허용
  const [isEditable, setIsEditable] = useState(isAdmin || userEditableStatuses.includes(data?.status || ''));

  if (isLoading || !data) {
    return <StringingApplicationDetailSkeleton />;
  }
  // 관리자이거나(isAdmin), 또는 상태가 userEditableStatuses에 포함될 때를 판단
  const isEditableAllowed = isAdmin || userEditableStatuses.includes(data.status);

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

          <TooltipProvider>
            <div className="flex space-x-2">
              <Link href={backUrl}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  신청 목록으로 돌아가기
                </Button>
              </Link>
              <Tooltip>
                {/* disabled 버튼 래핑용 span: 호버 이벤트 수신 */}
                <TooltipTrigger asChild>
                  <span className="inline-block" /* optional title for extra 안내 */>
                    <Button
                      variant={isEditMode ? 'destructive' : 'outline'}
                      disabled={!isEditableAllowed}
                      className={!isEditableAllowed ? 'opacity-50 cursor-not-allowed' : ''}
                      onClick={() => {
                        if (!isEditableAllowed) return;
                        setIsEditMode((m) => !m);
                        setEditingCustomer(false);
                      }}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      {isEditMode ? '편집 취소' : '편집 모드'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isEditableAllowed && <TooltipContent>현재 상태에서는 편집할 수 없습니다.</TooltipContent>}
              </Tooltip>
            </div>
          </TooltipProvider>
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
                {isAdmin && (
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
                )}
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
                  <Link href={isAdmin ? `/admin/orders//${data.orderId}` : `/mypage?tab=orders&orderId=${data.orderId}`}>
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
                    phone: data.customer?.phone ?? '전화번호 미입력',
                    address: data.customer?.address ?? '주소 미입력',
                    addressDetail: data.customer?.addressDetail ?? '상세 주소 미입력',
                    postalCode: data.customer?.postalCode ?? '우편번호 미입력',
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
                  고객 정보 수정
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

            <CardContent className="text-sm">
              {editingPayment ? (
                <PaymentEditForm
                  initialData={{
                    depositor: data.shippingInfo?.depositor || '',
                  }}
                  resourcePath={`${baseUrl}/api/applications/stringing`}
                  entityId={data.id}
                  onSuccess={() => {
                    mutate(); // 상세 데이터 갱신
                    historyMutateRef.current?.(); // 처리 이력 컴포넌트 갱신
                    setEditingPayment(false); // 폼 닫기
                  }}
                  onCancel={() => setEditingPayment(false)}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <PaymentMethodDetail method="무통장입금" bankKey={data.shippingInfo?.bank} depositor={data.shippingInfo?.depositor} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">결제 금액</div>
                    <div>{data.totalPrice.toLocaleString()}원</div>
                  </div>
                </div>
              )}
            </CardContent>

            {!editingPayment && isEditMode && (
              <CardFooter className="flex justify-center">
                <Button size="sm" variant="outline" onClick={() => setEditingPayment(true)}>
                  결제 정보 수정
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 스트링 정보 */}
          <Card className="md:col-span-3 border rounded-lg shadow-sm">
            {/* 헤더 */}
            <CardHeader className="flex flex-col items-center py-4">
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              <CardTitle className="mt-2 text-lg font-semibold">신청 스트링 정보</CardTitle>
            </CardHeader>

            {/* 본문 */}
            <CardContent className="px-6 pb-6 space-y-6">
              {/* 희망 일시 */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">희망 일시</span>
                </div>
                <div className="text-gray-900">
                  {data.stringDetails.preferredDate} {data.stringDetails.preferredTime}
                </div>
              </div>

              {/* 스트링 정보 */}
              <div className="border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-medium">스트링 정보</span>
                </div>
                <div className="space-y-3 pl-7">
                  {data.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      {/* 왼쪽: 이름 + 수량 */}
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-muted-foreground">수량: {item.quantity}개</p>
                      </div>
                      {/* 오른쪽: 가격 */}
                      <span className="font-medium text-gray-900">{item.price.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 라켓 종류 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <Target className="w-5 h-5" />
                  <span className="font-medium">라켓 종류</span>
                </div>
                <div className="text-gray-900">{data.stringDetails.racketType}</div>
              </div>
            </CardContent>

            {/* 수정 버튼 (가운데 정렬) */}
            {isEditMode && (
              <CardFooter className="flex justify-center pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsStringModalOpen(true)}>
                  스트링 정보 수정
                </Button>
              </CardFooter>
            )}
            <Dialog open={isStringModalOpen} onOpenChange={setIsStringModalOpen}>
              <DialogTrigger asChild></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogTitle className="text-xl font-semibold mb-4">신청 스트링 정보 수정</DialogTitle>
                <StringInfoEditForm
                  id={data.id}
                  initial={{
                    desiredDateTime: `${data.stringDetails.preferredDate}T${data.stringDetails.preferredTime}`,
                    stringTypes: data.stringDetails.stringTypes,
                    customStringName: data.stringDetails.customStringName,
                    racketType: data.stringDetails.racketType,
                  }}
                  stringOptions={data.purchasedStrings}
                  onDone={() => setIsStringModalOpen(false)}
                  mutateData={mutate}
                  mutateHistory={() => historyMutateRef.current?.()}
                  /** 필드 제한: 관리자 전체, 일반 사용자는 desiredDateTime만 */
                  fields={isAdmin ? ['desiredDateTime', 'stringType', 'racketType'] : ['desiredDateTime']}
                />
                <DialogClose asChild>
                  <Button variant="outline" className="mt-4">
                    닫기
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </Card>

          {/* 요청사항 카드 */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle>요청사항</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {editingRequirements ? (
                <RequirementsEditForm
                  initial={data.stringDetails.requirements ?? ''}
                  resourcePath={`${baseUrl}/api/applications/stringing`}
                  entityId={data.id}
                  onSuccess={() => {
                    mutate();
                    historyMutateRef.current?.();
                    setEditingRequirements(false);
                  }}
                  onCancel={() => setEditingRequirements(false)}
                />
              ) : data.stringDetails.requirements?.trim() ? (
                data.stringDetails.requirements
              ) : (
                <span className="text-muted-foreground">요청사항이 없습니다.</span>
              )}
            </CardContent>
            {!editingRequirements && isEditMode && (
              <CardFooter className="flex justify-center">
                <Button size="sm" variant="outline" onClick={() => setEditingRequirements(true)}>
                  요청사항 수정
                </Button>
              </CardFooter>
            )}
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
