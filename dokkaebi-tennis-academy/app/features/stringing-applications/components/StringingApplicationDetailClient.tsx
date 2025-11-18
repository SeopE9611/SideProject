'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, CreditCard, Calendar, XCircle, ArrowLeft, LinkIcon, ShoppingCart, Target, Pencil, Settings, Edit3, Truck } from 'lucide-react';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/features/stringing-applications/components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/features/stringing-applications/components/StringingApplicationHistory';
import { paymentStatusColors } from '@/lib/badge-style';
import { useStringingStore } from '@/app/store/stringingStore';
import CustomerEditForm from '@/app/features/stringing-applications/components/CustomerEditForm';
import PaymentEditForm from '@/app/features/stringing-applications/components/PaymentEditForm';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StringInfoEditForm from '@/app/features/stringing-applications/components/StringInfoEditForm';
import RequirementsEditForm from '@/app/features/stringing-applications/components/RequirementsEditForm';
import StringingApplicationDetailSkeleton from '@/app/features/stringing-applications/components/StringingApplicationDetailSkeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PaymentMethodDetail from '@/app/features/stringing-applications/components/PaymentMethodDetail';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import CancelStringingDialog from '@/app/mypage/applications/_components/CancelStringingDialog';

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
  submittedAt?: string;
  status: string;
  totalPrice: number;
  history?: { status: string; date: string; description: string }[];
  cancelRequest?: {
    status: '요청' | '승인' | '거절';
    reasonCode?: string;
    reasonText?: string;
    requestedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    rejectedReason?: string;
  } | null;
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
    collectionMethod?: string;
    estimatedDate?: string;
    invoice?: {
      courier: string;
      trackingNumber: string;
    };
    selfShip?: {
      courier?: string;
      trackingNo?: string;
      shippedAt?: string;
      note?: string;
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

function getAdminApplicationCancelRequestInfo(app: any): {
  label: string;
  badge: string;
  reason?: string;
} | null {
  const cancel = app?.cancelRequest;
  if (!cancel || !cancel.status || cancel.status === 'none') return null;

  const reasonSummary = cancel.reasonCode ? `${cancel.reasonCode}${cancel.reasonText ? ` (${cancel.reasonText})` : ''}` : cancel.reasonText || '';

  // 한글/영문 상태 모두 허용
  const status = cancel.status;

  switch (status) {
    case 'requested':
    case '요청':
      return {
        label: '고객이 신청 취소를 요청했습니다.',
        badge: '요청됨',
        reason: reasonSummary,
      };
    case 'approved':
    case '승인':
      return {
        label: '취소 요청이 승인되어 신청이 취소되었습니다.',
        badge: '승인',
        reason: reasonSummary,
      };
    case 'rejected':
    case '거절':
      return {
        label: '취소 요청이 거절되었습니다.',
        badge: '거절',
        reason: reasonSummary,
      };
    default:
      return null;
  }
}

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

  // 신청 취소 요청 모달 상태
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // 관리자: 취소 요청 거절 모달 상태
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);

  // 취소 요청 철회 로딩 상태
  const [isWithdrawingCancel, setIsWithdrawingCancel] = useState(false);

  // 1) 버튼에서 모달 여는 함수
  const handleOpenCancelDialog = () => {
    if (isCancelled || isCancelRequested) return;
    setIsCancelDialogOpen(true);
  };

  // 2) 모달에서 "취소 요청하기" 눌렀을 때 실제 요청
  const handleConfirmCancelRequest = (params: { reasonCode: string; reasonText?: string }) => {
    const { reasonCode, reasonText } = params;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reasonCode,
            reasonText,
          }),
          credentials: 'include',
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          console.error('cancel-request failed', res.status, msg);
          throw new Error('취소 요청 실패');
        }

        showSuccessToast('취소 요청이 정상적으로 접수되었습니다. 관리자 확인 후 결과가 반영됩니다.');
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }
        setIsCancelDialogOpen(false);
      } catch (err) {
        console.error(err);
        showErrorToast('취소 요청 중 오류가 발생했습니다.');
      }
    });
  };

  // 사용자: 이미 넣어둔 취소 요청을 철회
  const handleWithdrawCancelRequest = async () => {
    if (!data?.id) return;

    if (!window.confirm('이미 제출한 취소 요청을 철회하시겠습니까?')) {
      return;
    }

    try {
      setIsWithdrawingCancel(true);

      const res = await fetch(`/api/applications/${data.id}/cancel-request-withdraw`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        console.error('cancel-request-withdraw failed', res.status, msg);
        throw new Error('취소 요청 철회 실패');
      }

      showSuccessToast('취소 요청을 철회했습니다.');

      // 상세 + 이력 모두 갱신
      await mutate();
      if (historyMutateRef.current) {
        await historyMutateRef.current();
      }
    } catch (err) {
      console.error(err);
      showErrorToast('취소 요청 철회 중 오류가 발생했습니다.');
    } finally {
      setIsWithdrawingCancel(false);
    }
  };

  // 관리자: 취소 요청 승인
  const handleAdminApproveCancel = () => {
    if (!confirm('이 신청의 취소 요청을 승인하시겠습니까?')) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-approve`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          console.error('cancel-approve failed', res.status, msg);
          throw new Error('취소 승인 실패');
        }

        showSuccessToast('취소 요청을 승인했습니다.');
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }
      } catch (err) {
        console.error(err);
        showErrorToast('취소 승인 중 오류가 발생했습니다.');
      }
    });
  };

  // 관리자: 취소 요청 거절 버튼 클릭
  const handleAdminRejectCancel = () => {
    if (!isCancelRequested || isCancelled) return;

    // 이전에 입력한 내용 초기화
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  // 모달 안에서 "거절 확정" 버튼 클릭 시 실제 API 호출
  const handleConfirmRejectCancel = () => {
    const reason = rejectReason.trim();

    startTransition(async () => {
      try {
        setIsRejectSubmitting(true);

        const res = await fetch(`/api/applications/stringing/${applicationId}/cancel-reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
          credentials: 'include',
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          console.error('cancel-reject failed', res.status, msg);
          throw new Error('취소 거절 실패');
        }

        showSuccessToast('취소 요청을 거절했습니다.');
        await mutate();
        if (historyMutateRef.current) {
          await historyMutateRef.current();
        }

        // 모달 닫기 + 입력값 초기화
        setIsRejectDialogOpen(false);
        setRejectReason('');
      } catch (err) {
        console.error(err);
        showErrorToast('취소 거절 중 오류가 발생했습니다.');
      } finally {
        setIsRejectSubmitting(false);
      }
    });
  };

  // // 기존 store 아이디
  // const storeId = useStringingStore((state) => state.selectedApplicationId);
  // // 새로고침 대비 fallback: prop 으로 내려준 id 를 쓰거나, storeId 사용
  // const applicationId = storeId ?? id;

  const applicationId = id;

  // store가 비어 있을 땐 id 로 채워두면 이후 내비게이션 시에도 동일하게 동작
  useEffect(() => {
    useStringingStore.setState({ selectedApplicationId: id });
  }, [id]);
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

  // 취소 요청 상태 (한글/영문 모두 허용)
  const rawCancelStatus = (data.cancelRequest?.status ?? null) as string | null;

  const isCancelRequested = rawCancelStatus === '요청' || rawCancelStatus === 'requested';
  const isCancelApproved = rawCancelStatus === '승인' || rawCancelStatus === 'approved';
  const isCancelRejected = rawCancelStatus === '거절' || rawCancelStatus === 'rejected';

  // 관리자용 취소 요청 정보 (주문 상세와 동일 패턴)
  const cancelInfo = getAdminApplicationCancelRequestInfo(data);

  // 자가발송/운송장 등록 여부 계산
  const collectionMethod = data?.shippingInfo?.collectionMethod ?? data?.shippingInfo?.shippingMethod ?? null;
  const isSelfShip = typeof collectionMethod === 'string' && ['self_ship', 'self', '자가발송'].includes(collectionMethod.toLowerCase());
  const isVisit = normalizeCollection(collectionMethod ?? 'self_ship') === 'visit';

  const trackingNo = data?.shippingInfo?.selfShip?.trackingNo ?? data?.shippingInfo?.invoice?.trackingNumber ?? null;
  const hasTracking = Boolean(trackingNo);

  // 일반 사용자도 편집 가능 상태일 때만 노출하고, 완료/취소 등엔 비활성화
  const completedLikeStatuses = ['교체완료', '반송완료', '완료', 'DONE', '취소'];
  const canEditSelfShip = (isAdmin || (userEditableStatuses ?? []).includes(data.status)) && !completedLikeStatuses.includes(data.status);

  return (
    <div className="container py-10 space-y-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-8 border border-green-100 dark:border-green-800/30 shadow-lg mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-md">{isAdmin ? <Settings className="h-8 w-8 text-green-600" /> : <Target className="h-8 w-8 text-green-600" />}</div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{isAdmin ? '스트링 신청 관리' : '스트링 신청 상세'}</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">신청 ID: {data.id}</p>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex space-x-2">
                <Link href={backUrl}>
                  <Button
                    variant="outline"
                    className="mb-3 bg-white/60 backdrop-blur-sm border-green-200 hover:bg-green-50
             dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    신청 목록으로 돌아가기
                  </Button>
                </Link>
                {/* 자가발송일 때만 노출 '운송장 등록/수정' 버튼 */}
                {isSelfShip && (
                  <Button
                    className="mb-3"
                    variant="outline"
                    disabled={!canEditSelfShip}
                    onClick={() => {
                      // 상세 → 운송장 입력/수정 페이지로 이동
                      // 경로: /services/applications/[id]/shipping
                      const id = String(data.id);
                      // next/navigation 의 router 사용
                      // 파일 상단에 이미 useRouter import 되어 있음
                      // 여기서는 링크 이동이므로 push
                      // (CSR 흐름이므로 문제 없음)
                      const url = `/services/applications/${id}/shipping`;
                      // useRouter는 함수 바깥에 선언되어 있으니 그대로 접근
                      // eslint-disable-next-line @typescript-eslint/no-use-before-define
                      router.push(url);
                    }}
                    title={canEditSelfShip ? (hasTracking ? '운송장 정보를 수정합니다' : '운송장을 등록합니다') : '현재 상태에서는 수정할 수 없습니다'}
                  >
                    <Truck className="mr-1 h-4 w-4" />
                    {hasTracking ? '운송장 수정하기' : '운송장 등록하기'}
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        variant={isEditMode ? 'destructive' : 'outline'}
                        disabled={!isEditableAllowed}
                        className={
                          !isEditableAllowed
                            ? 'opacity-50 cursor-not-allowed'
                            : isEditMode
                            ? ''
                            : 'bg-white/60 backdrop-blur-sm border-green-200 hover:bg-green-50 \
         dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60'
                        }
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

          {/* 신청 요약 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">신청일시</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{new Date(data.requestedAt).toLocaleDateString()}</p>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">총 비용</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.totalPrice.toLocaleString()}원</p>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">라켓 종류</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.stringDetails.racketType}</p>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">희망 일시</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isVisit && data.stringDetails.preferredDate && data.stringDetails.preferredTime ? `${data.stringDetails.preferredDate} ${data.stringDetails.preferredTime}` : '예약 불필요'}
              </p>
            </div>
          </div>
          {/* 취소 요청 상태 안내 (관리자용) */}
          {isAdmin && cancelInfo && (
            <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-amber-900">취소 요청 상태: {cancelInfo.badge}</p>
                  <p className="mt-1">{cancelInfo.label}</p>
                  {cancelInfo.reason && <p className="mt-1 text-xs text-amber-900/80">사유: {cancelInfo.reason}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 상태 카드 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden mb-8">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>신청 상태</CardTitle>
              <ApplicationStatusBadge status={data.status} />
            </div>
            <CardDescription>{new Date(data.requestedAt).toLocaleDateString()}에 접수된 신청입니다.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* 왼쪽: 안내 문구 */}
              <div className="text-sm text-muted-foreground">
                {isCancelled && <span className="italic">취소된 신청서입니다. 상태 변경 및 취소가 불가능합니다.</span>}

                {!isCancelled && isCancelRequested && <span className="italic">취소 요청 처리 중입니다. 관리자 확인 후 결과가 반영됩니다.</span>}

                {!isCancelled && !isCancelRequested && <span>{new Date(data.requestedAt).toLocaleDateString()}에 접수된 신청입니다.</span>}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {/* 관리자: 상태 드롭다운 */}
                {isAdmin && (
                  <ApplicationStatusSelect
                    applicationId={data.id}
                    currentStatus={data.status}
                    onUpdated={async () => {
                      await mutate();
                      if (historyMutateRef.current) {
                        await historyMutateRef.current();
                      }
                    }}
                    disabled={isCancelled}
                  />
                )}

                {/* 사용자: 아직 취소 요청 전 → "신청 취소 요청" 버튼 */}
                {!isAdmin && !isCancelled && !isCancelRequested && (
                  <Button variant="destructive" onClick={handleOpenCancelDialog} disabled={isPending}>
                    <XCircle className="mr-2 h-4 w-4" />
                    신청 취소 요청
                  </Button>
                )}

                {/* 사용자: 이미 취소 요청 상태 → "취소 요청 철회" 버튼 */}
                {!isAdmin && !isCancelled && isCancelRequested && (
                  <Button variant="outline" size="sm" onClick={handleWithdrawCancelRequest} disabled={isWithdrawingCancel} className="border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900">
                    {isWithdrawingCancel ? '취소 요청 철회 중...' : '취소 요청 철회'}
                  </Button>
                )}

                {/* 관리자: 취소 요청이 들어온 경우에만 승인/거절 버튼 노출 */}
                {isAdmin && isCancelRequested && !isCancelled && (
                  <>
                    <Button size="sm" variant="destructive" onClick={handleAdminApproveCancel} disabled={isPending}>
                      <XCircle className="mr-1 h-4 w-4" />
                      취소 승인
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleAdminRejectCancel} disabled={isPending}>
                      취소 거절
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>

          {/* 연결된 주문 링크 */}
          {data?.orderId && (
            <Card className="border border-muted text-sm text-muted-foreground m-4">
              <CardContent className="flex justify-between items-center py-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>이 신청은 상품 주문서와 연결되어 있습니다.</span>
                </div>
                <Link href={isAdmin ? `/admin/orders/${data.orderId}` : `/mypage?tab=orders&orderId=${data.orderId}`}>
                  <Button variant="ghost" size="sm">
                    주문 상세 보기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 고객 정보 */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>고객 정보</span>
                </div>
                {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">이름</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.customer.name ?? '정보 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">이메일</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.customer.email ?? '정보 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">전화번호</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.customer?.phone ?? '정보 없음'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">주소</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.customer?.address ?? '정보 없음'}</p>
                      {data.customer?.addressDetail && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.customer.addressDetail}</p>}
                      {data.customer?.postalCode && <p className="text-sm text-gray-600 dark:text-gray-400">우편번호: {data.customer.postalCode}</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            {!editingCustomer && isEditMode && (
              <CardFooter className="pt-2 flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                <Button size="sm" variant="outline" onClick={() => setEditingCustomer(true)} className="hover:bg-blue-50 border-blue-200">
                  고객 정보 수정
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 결제 정보 */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" /> 결제 정보
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={paymentStatusColors[['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기']}>
                  {['접수완료', '작업 중', '교체완료'].includes(data?.status || '') ? '결제완료' : '결제대기'}
                </Badge>
                {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
              </div>
            </CardHeader>

            <CardContent className="p-6">
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
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <PaymentMethodDetail method="무통장입금" bankKey={data.shippingInfo?.bank} depositor={data.shippingInfo?.depositor} />
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-100 dark:border-purple-800/30">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">결제 금액</p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{data.totalPrice.toLocaleString()}원</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            {!editingPayment && isEditMode && (
              <CardFooter className="flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                <Button size="sm" variant="outline" onClick={() => setEditingPayment(true)} className="hover:bg-purple-50 border-purple-200">
                  결제 정보 수정
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* 스트링 정보 */}
          <Card className="md:col-span-2 border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-slate-700 flex flex-col items-center py-4">
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <CardTitle className="mt-2 text-lg font-semibold">신청 스트링 정보</CardTitle>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              {/* 섹션을 하나로 묶고 divide-y로 구분해 가독성/일관성 향상 */}
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {/* 희망 일시 */}
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">희망 일시</span>
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">{isVisit && data.stringDetails.preferredDate && data.stringDetails.preferredTime ? `${data.stringDetails.preferredDate} ${data.stringDetails.preferredTime}` : '예약 불필요'}</div>
                </div>

                {/* 스트링 정보 */}
                <div className="py-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="font-medium">스트링 정보</span>
                  </div>

                  {/* 아이템 카드들: 더 넓은 패딩/대비, 오른쪽 가격 칩으로 시인성 향상 */}
                  <ul className="space-y-3 md:space-y-4">
                    {data.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3
                     ring-1 ring-slate-200/70 bg-white/70
                     dark:ring-slate-700 dark:bg-slate-900/40"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">수량: {item.quantity}개</p>
                        </div>

                        {/* 가격을 칩 형태로; 다크모드 대비 강화 */}
                        <span
                          className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold
                           bg-slate-100 text-gray-900
                           dark:bg-slate-800 dark:text-gray-100"
                        >
                          {item.price.toLocaleString()}원
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 라켓 종류 */}
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Target className="w-5 h-5" />
                    <span className="font-medium">라켓 종류</span>
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">{data.stringDetails.racketType}</div>
                </div>
              </div>
            </CardContent>

            {/* 수정 버튼 */}
            {isEditMode && (
              <CardFooter className="flex justify-center pt-2 bg-gray-50/50 dark:bg-gray-800/50">
                <Button size="sm" variant="outline" onClick={() => setIsStringModalOpen(true)} className="hover:bg-green-50 border-green-200">
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
                    desiredDateTime: data.stringDetails.preferredDate && data.stringDetails.preferredTime ? `${data.stringDetails.preferredDate}T${data.stringDetails.preferredTime}` : '',
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
                  <Button variant="outline" className="mt-4 bg-transparent">
                    닫기
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </Card>

          {/* 요청사항 카드 */}
          <Card className="md:col-span-2 border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>요청사항</span>
                {isEditMode && <Edit3 className="h-4 w-4 text-gray-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{data.stringDetails.requirements}</p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">요청사항이 없습니다.</p>
              )}
            </CardContent>
            {!editingRequirements && isEditMode && (
              <CardFooter className="flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                <Button size="sm" variant="outline" onClick={() => setEditingRequirements(true)} className="hover:bg-orange-50 border-orange-200">
                  요청사항 수정
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* 처리 이력 */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>처리 이력</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {applicationId && (
              <StringingApplicationHistory
                applicationId={applicationId}
                onHistoryMutate={(mutateFn) => {
                  historyMutateRef.current = mutateFn;
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
      {/* 관리자: 취소 요청 거절 모달 */}
      {isAdmin && (
        <Dialog
          open={isRejectDialogOpen}
          onOpenChange={(open) => {
            setIsRejectDialogOpen(open);
            if (!open) {
              setRejectReason('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle className="text-lg font-semibold">취소 요청 거절</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">고객의 신청 취소 요청을 거절하는 사유를 입력해 주세요. 이 내용은 처리 이력에 기록되어 나중에 참고할 수 있습니다.</p>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">거절 사유 (선택 입력)</label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="예: 이미 작업이 진행되어 취소가 불가능한 상태입니다."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isRejectSubmitting}>
                닫기
              </Button>
              <Button variant="destructive" onClick={handleConfirmRejectCancel} disabled={isRejectSubmitting}>
                {isRejectSubmitting ? '처리 중...' : '거절 확정'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <CancelStringingDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} onConfirm={handleConfirmCancelRequest} isSubmitting={isPending} />
    </div>
  );
}
