'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, CreditCard, Calendar, XCircle, ArrowLeft, LinkIcon, ShoppingCart, Target, Pencil, Settings, Edit3, Truck, CheckCircle2, Clock, Ticket } from 'lucide-react';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/features/stringing-applications/components/ApplicationStatusSelect';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import StringingApplicationHistory from '@/app/features/stringing-applications/components/StringingApplicationHistory';
import { badgeBase, badgeSizeSm, getShippingMethodBadge, paymentStatusColors } from '@/lib/badge-style';
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
import LinkedDocsCard, { LinkedDocItem } from '@/components/admin/LinkedDocsCard';

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
  rentalId?: string;
  orderCancelStatus?: string;
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
  updatedAt?: string;
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
  visitSlotCount?: number | null;
  visitDurationMinutes?: number | null;
  lines?: Array<{
    id?: string;
    racketType?: string;
    racketLabel?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    note?: string;
  }>;
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
      shippedAt?: string;
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

  packageInfo?: {
    applied: boolean;
    useCount: number;
    passId?: string | null;
    passTitle?: string | null;
    packageSize?: number | null;
    usedCount?: number | null;
    remainingCount?: number | null;
    redeemedAt?: string | null;
    expiresAt?: string | null;
  };
  // service_pass_consumptions 기반 패키지 차감 이력
  packageConsumptions?: Array<{
    id: string;
    passId: string;
    usedAt: string;
    count: number;
    reverted?: boolean;
  }>;
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

// 스트링 교체 서비스용 택배사 라벨/URL 헬퍼
const stringingCourierLabelMap: Record<string, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  logen: '로젠택배',
  post: '우체국택배',
  etc: '기타',
};

// 코드 + 운송장번호 → 조회 URL
// 코드/라벨 모두 대응하는 운송장 조회 URL 헬퍼
const buildTrackingUrl = (courier?: string | null, trackingNumber?: string | null) => {
  if (!trackingNumber) return null;
  const no = trackingNumber.trim();
  if (!no) return null;

  const c = (courier ?? '').toLowerCase();

  // CJ 대한통운 (코드: cj / 라벨: CJ대한통운)
  if (c.includes('cj') || c.includes('cj대한통운')) {
    return `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`;
  }

  // 우체국택배 (코드: post)
  if (c.includes('우체국') || c === 'post') {
    return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`;
  }

  // 한진택배 (코드: hanjin)
  if (c.includes('한진') || c === 'hanjin') {
    return `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(no)}`;
  }

  // 로젠택배 (코드: logen)
  if (c.includes('로젠') || c === 'logen') {
    return `https://www.ilogen.com/web/personal/trace/${encodeURIComponent(no)}`;
  }

  // 그 외(롯데/경동/기타)는 일단 기본값: CJ 페이지로 통일
  return `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`;
};

// 코드 → 한글 라벨
const getCourierLabel = (courier?: string | null) => {
  if (!courier) return '택배사 미입력';
  return stringingCourierLabelMap[courier] ?? courier;
};

// 시간(시/분)을 2자리 문자열로 포맷
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * 방문 예약 일시를 "YYYY-MM-DD HH:mm ~ HH:mm (n슬롯 / 총 m분)" 형태로 포맷.
 *
 * - preferredDate / preferredTime 이 비어 있으면 간단한 문구만 반환
 * - durationMinutes 가 없으면 "YYYY-MM-DD HH:mm"까지만,
 * - slotCount 가 있으면 "(n슬롯 / 총 m분)" 꼬리를 붙여줌.
 */
const formatVisitTimeRange = (preferredDate?: string, preferredTime?: string, durationMinutes?: number | null, slotCount?: number | null): string => {
  if (!preferredDate || !preferredTime) {
    return '예약 일시 미입력';
  }

  // HH:mm 파싱
  const [hh, mm] = preferredTime.split(':');
  const h = Number(hh);
  const m = Number(mm);

  // 시간이 이상하거나 duration이 없으면 그냥 "날짜 + 시작시간"만
  if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
    return `${preferredDate} ${preferredTime}`;
  }

  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;

  // 단순하게 24시간 기준으로 mod 처리 (자정 넘는 극단 케이스도 안전하게 표시)
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

  const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

  if (slotCount && slotCount > 0) {
    return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
  }
  return `${baseRange} (총 ${durationMinutes}분)`;
};

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

  // 교체 확정 전용 로딩 상태
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

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

  const handleConfirmExchange = async () => {
    if (!canConfirmExchange || isConfirmSubmitting) return;

    if (!window.confirm('교체 작업을 확정하시겠습니까?\n확정 후에는 되돌릴 수 없습니다.')) return;

    try {
      setIsConfirmSubmitting(true);

      const res = await fetch(`${baseUrl}/api/applications/stringing/${applicationId}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        console.error('confirm failed', res.status, msg);
        throw new Error('confirm failed');
      }

      showSuccessToast('교체 확정이 완료되었습니다.');
      await mutate();
      await historyMutateRef.current?.();
    } catch (e) {
      console.error(e);
      showErrorToast('교체 확정 중 오류가 발생했습니다.');
    } finally {
      setIsConfirmSubmitting(false);
    }
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
  const swrFetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text().catch(() => 'fetch failed'));
    return res.json();
  };

  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(applicationId ? `${baseUrl}/api/applications/stringing/${applicationId}` : null, swrFetcher);

  if (error) return <div className="text-red-500 p-4">신청서를 불러오는 중 오류가 발생했습니다.</div>;
  if (isLoading || !data) return <StringingApplicationDetailSkeleton />;

  // 관리자이거나(isAdmin), 또는 상태가 userEditableStatuses에 포함될 때를 판단
  const isEditableAllowed = isAdmin || userEditableStatuses.includes(data.status);

  // 요약 표시용 파생 값
  const stringTypeCount = data.stringDetails?.stringTypes?.length ?? 0;

  // 패키지 차감 총 회수 (이력 카드 상단에 표시 용도)
  const totalPackageConsumed = data.packageConsumptions?.reduce((sum, c) => sum + (c.count ?? 1), 0) ?? 0;

  // 라켓 자루 수 추정: 현재 racketType 에 '라켓1, 라켓2' 형태라면 split 로 계산
  const racketCount = Array.isArray(data.lines) && data.lines.length > 0 ? data.lines.length : data.stringDetails?.racketType ? data.stringDetails.racketType.split(',').filter((s) => s.trim().length > 0).length : 1;

  // 총 장착비 (백엔드 totalPrice 신뢰)
  const totalPrice = data.totalPrice ?? 0;

  const isCancelled = data.status === '취소';
  const isPaid = ['접수완료', '작업 중', '교체완료'].includes(data.status);
  const paymentStatus = isPaid ? '결제완료' : '결제대기';

  // 취소 요청 상태 (한글/영문 모두 허용)
  const rawCancelStatus = (data.cancelRequest?.status ?? null) as string | null;

  const isCancelRequested = rawCancelStatus === '요청' || rawCancelStatus === 'requested';
  const isCancelApproved = rawCancelStatus === '승인' || rawCancelStatus === 'approved';
  const isCancelRejected = rawCancelStatus === '거절' || rawCancelStatus === 'rejected';

  // 확정 여부 필드가 서버에서 내려온다는 전제
  const isUserConfirmed = Boolean((data as any).userConfirmedAt);

  // 확정 버튼 노출/활성 조건 (ApplicationsClient 규칙에 맞게 "상태 기반"으로 단순화)
  const confirmableStatuses = ['반송완료', '교체완료', '완료'];
  const canConfirmExchange = !isAdmin && !isCancelled && !isCancelRequested && !isUserConfirmed && confirmableStatuses.includes(data.status);

  // 라켓 종류 요약 문자열
  const racketTypeSummary =
    data.stringDetails?.racketType && data.stringDetails.racketType.trim().length > 0
      ? data.stringDetails.racketType.trim()
      : Array.isArray(data.lines) && data.lines.length > 0
        ? data.lines.map((line, index) => line.racketType || line.racketLabel || `라켓 ${index + 1}`).join(', ')
        : '입력된 라켓 정보 없음';

  // 주문 취소 요청 여부
  const hasOrderCancelRequested = data.orderCancelStatus === 'requested' || data.orderCancelStatus === '요청';

  // 연결 문서(표시 전용)
  const linkedDocs: LinkedDocItem[] = [];
  if (data.orderId) {
    linkedDocs.push({
      kind: 'order',
      id: String(data.orderId),
      href: isAdmin ? `/admin/orders/${data.orderId}` : `/mypage?tab=orders&orderId=${data.orderId}`,
      subtitle: '연결된 주문',
    });
  }
  if (data.rentalId) {
    const rid = String(data.rentalId);
    linkedDocs.push({
      kind: 'rental',
      id: rid,
      href: isAdmin ? `/admin/rentals/${encodeURIComponent(rid)}` : `/mypage/rentals/${encodeURIComponent(rid)}`,
      subtitle: '연결된 대여',
    });
  }

  const linkedDocsDescription =
    linkedDocs.length === 0
      ? undefined
      : linkedDocs.length === 2
        ? '이 신청은 주문 및 대여와 연결되어 있습니다. 연결 문서에서 상태/취소/운영 흐름을 함께 확인하세요.'
        : data.orderId
          ? '이 신청은 주문에서 생성된 신청입니다. 최종 취소/운영 처리는 주문 상세와 함께 확인하세요.'
          : '이 신청은 대여에서 생성된 신청입니다. 대여 상세와 함께 전체 흐름을 확인하세요.';

  const paymentMethodLabel = data.packageInfo?.applied ? '무통장입금(패키지 사용)' : '무통장입금';

  // 관리자용 취소 요청 정보 (주문 상세와 동일 패턴)
  const cancelInfo = getAdminApplicationCancelRequestInfo(data);

  // 자가발송/운송장 등록 여부 계산
  // "고객→매장" 기준은 collectionMethod만 사용
  const collectionMethodRaw = data.shippingInfo?.collectionMethod ?? null;
  const cm = normalizeCollection(collectionMethodRaw ?? 'self_ship');
  const isSelfShip = cm === 'self_ship';
  const isVisit = cm === 'visit';

  // "매장→고객" 배송은 shippingMethod로 별도 유지
  const shippingMethod = data.shippingInfo?.shippingMethod;

  // 관리자 상세에서 “수령/배송(매장 → 고객 반환)”을 한눈에 보기 위한 배지
  const shippingMethodBadge = getShippingMethodBadge(data as any);

  // 연결 주문에서 선택된 “수령방식(방문/택배/퀵)” 배지
  // - handleGetStringingApplication에서 linkedOrderPickupMethod를 내려주므로,
  //   신청서 상세에서도 같은 수령방식을 표시할 수 있다.
  const linkedOrderPickupMethod = (data as any)?.linkedOrderPickupMethod as 'visit' | 'delivery' | 'quick' | null | undefined;
  const linkedOrderPickupBadge = linkedOrderPickupMethod ? getShippingMethodBadge({ shippingInfo: { shippingMethod: linkedOrderPickupMethod } } as any) : null;

  // 방문 예약인 경우에만 의미 있는 희망 일시 라벨
  const visitTimeLabel = isVisit ? formatVisitTimeRange(data.stringDetails.preferredDate, data.stringDetails.preferredTime, data.visitDurationMinutes ?? null, data.visitSlotCount ?? null) : '예약 불필요';

  const trackingNo = data?.shippingInfo?.selfShip?.trackingNo ?? data?.shippingInfo?.invoice?.trackingNumber ?? null;
  const hasTracking = Boolean(trackingNo);
  const selfShip = data.shippingInfo?.selfShip;
  const invoice = data.shippingInfo?.invoice;

  const hasStoreShippingInfo = Boolean(shippingMethod) || Boolean(invoice?.trackingNumber) || Boolean(invoice?.shippedAt);

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
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
                <Link href={backUrl}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm border-green-200 hover:bg-green-50
             dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    신청 목록으로 돌아가기
                  </Button>
                </Link>

                {/* 사용자: 자가발송 운송장 등록/수정 버튼 */}
                {!isAdmin && isSelfShip && (
                  <Link
                    href={`/services/applications/${data.id}/shipping?${new URLSearchParams({
                      return: `/mypage/applications/${data.id}`,
                    }).toString()}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/60 backdrop-blur-sm border-green-200 hover:bg-green-50
       dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      {hasTracking ? '운송장 수정하기' : '운송장 등록하기'}
                    </Button>
                  </Link>
                )}

                {/* 관리자: 매장 발송 운송장 등록/수정 버튼 */}
                {isAdmin && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-white/60 backdrop-blur-sm border-green-200 hover:bg-green-50
       dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-700/60"
                  >
                    <Link href={`/admin/applications/stringing/${data.id}/shipping-update`}>
                      <Truck className="mr-1 h-4 w-4" />
                      {invoice?.trackingNumber ? '운송장 수정하기' : '운송장 등록하기'}
                    </Link>
                  </Button>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        variant={isEditMode ? 'destructive' : 'outline'}
                        size="sm"
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
              {/* 사용자: 교체확정 버튼 */}
              {!isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button size="sm" disabled={!canConfirmExchange || isConfirmSubmitting} onClick={handleConfirmExchange}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {isConfirmSubmitting ? '확정 중...' : isUserConfirmed ? '확정 완료' : '교체 확정'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canConfirmExchange && <TooltipContent>{isUserConfirmed ? '이미 교체 확정된 신청입니다.' : '교체완료/반송완료 이후에 확정할 수 있습니다.'}</TooltipContent>}
                </Tooltip>
              )}
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
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{racketTypeSummary}</p>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">희망 일시</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{visitTimeLabel}</p>
            </div>
          </div>
          {data.orderId && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Truck className="h-4 w-4 text-gray-500" />
              <span className="font-medium">수령/배송(주문)</span>
              <Badge className={`${badgeBase} ${badgeSizeSm} whitespace-nowrap ${linkedOrderPickupBadge?.color ?? 'bg-red-100 text-red-700'}`}>{linkedOrderPickupBadge?.label ?? '선택 없음'}</Badge>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="font-medium">수령/배송(반환)</span>
            <Badge className={`${badgeBase} ${badgeSizeSm} whitespace-nowrap ${shippingMethodBadge.color}`}>{shippingMethodBadge.label}</Badge>
            {shippingMethodBadge.label === '선택 없음' && <span className="text-xs text-muted-foreground">반환 방식이 아직 선택되지 않았습니다.</span>}
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

        {/* 연결 문서(공용 카드) */}
        {linkedDocs.length > 0 && <LinkedDocsCard docs={linkedDocs} description={linkedDocsDescription} className="mb-8" />}

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
                {isAdmin && isCancelRequested && !isCancelled && !hasOrderCancelRequested && (
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

                {/* 주문에 취소 요청이 걸려 있으면 신청 단독 승인/거절 막기 */}
                {isAdmin && hasOrderCancelRequested && !isCancelled && <p className="text-xs text-red-500 mt-2">이 신청이 연결된 주문에 이미 취소 요청이 걸려 있습니다. 최종 취소 승인/거절은 주문 상세 화면에서 처리해 주세요.</p>}
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
                    <PaymentMethodDetail method={paymentMethodLabel} bankKey={data.shippingInfo?.bank} depositor={data.shippingInfo?.depositor} />
                  </div>
                  {/* 패키지 사용 정보 요약 */}
                  {data.packageInfo && (
                    <div
                      className={
                        data.packageInfo.applied
                          ? 'p-3 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/40'
                          : 'p-3 rounded-lg border border-slate-200 bg-slate-50/80 dark:border-slate-700/60 dark:bg-slate-900/40'
                      }
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        </div>
                        <div className="flex-1 text-xs leading-relaxed">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-50">패키지 사용 정보</span>
                            <Badge variant="outline" className={data.packageInfo.applied ? 'border-emerald-300 text-emerald-700 dark:text-emerald-200' : 'border-slate-300 text-slate-600 dark:text-slate-200'}>
                              {data.packageInfo.applied ? '이번 신청에 패키지 적용' : '이번 신청에는 패키지 미사용'}
                            </Badge>
                          </div>

                          {/* 본문 설명 */}
                          {data.packageInfo.applied ? (
                            <p className="text-slate-700 dark:text-slate-100">
                              이번 신청에서 패키지 <span className="font-semibold">{data.packageInfo.useCount}회</span>가 차감되었습니다.
                            </p>
                          ) : (
                            <p className="text-slate-600 dark:text-slate-200">
                              이 신청은 패키지 기준으로는 <span className="font-semibold">{data.packageInfo.useCount}회</span>에 해당하지만, 실제로 패키지는 사용되지 않았습니다.
                            </p>
                          )}

                          {/* 패스 정보가 있는 경우에만 상세 숫자 표시 */}
                          {data.packageInfo.passId && (
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-200">
                              {data.packageInfo.passTitle && <span className="font-medium">{data.packageInfo.passTitle}</span>}
                              {typeof data.packageInfo.packageSize === 'number' && <span>총 {data.packageInfo.packageSize}회</span>}
                              {typeof data.packageInfo.usedCount === 'number' && <span>사용 {data.packageInfo.usedCount}회</span>}
                              {typeof data.packageInfo.remainingCount === 'number' && <span>잔여 {data.packageInfo.remainingCount}회</span>}
                              {data.packageInfo.expiresAt && <span>만료일 {new Date(data.packageInfo.expiresAt).toLocaleDateString('ko-KR')}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 패키지 사용 정보 카드 아래에 차감 이력 표시 */}
                  {data.packageConsumptions && data.packageConsumptions.length > 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-purple-100 bg-purple-50/60 px-3 py-2 text-xs text-gray-700 dark:border-purple-700/60 dark:bg-purple-950/30 dark:text-gray-100">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                          <span className="font-semibold">패키지 차감 이력</span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-300">총 {totalPackageConsumed}회</span>
                      </div>
                      <ul className="space-y-1.5">
                        {data.packageConsumptions.map((c) => (
                          <li key={c.id} className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-600 dark:text-gray-300">
                              {new Date(c.usedAt).toLocaleString('ko-KR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300">
                              {c.count ?? 1}회 사용
                              {c.reverted && <span className="ml-1 text-[10px] text-red-500">(복원됨)</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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

            <div className="mx-6 mt-4 mb-3 rounded-xl border border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-900/70 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/90 dark:bg-slate-800 px-3 py-1 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-50">스트링 {stringTypeCount}종</span>
                  <span className="inline-flex items-center rounded-full bg-white/90 dark:bg-slate-800 px-3 py-1 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-50">라켓 {racketCount}자루</span>
                </div>

                <div className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">총 장착비 {totalPrice.toLocaleString()}원</div>
              </div>
            </div>

            <CardContent className="px-6 pb-6">
              <div className="space-y-6">
                <section className="flex items-start justify-between border-b border-dashed border-slate-200 pb-4 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">희망 일시</span>
                  </div>
                  <div className="text-right text-gray-900 dark:text-gray-100 text-sm">{visitTimeLabel}</div>
                </section>

                {/* 섹션 2: 라켓별 장착 정보 */}
                {Array.isArray(data.lines) && data.lines.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Target className="w-5 h-5" />
                      <span className="font-medium">라켓별 장착 정보</span>
                    </div>

                    <div className="space-y-3">
                      {data.lines.map((line, index) => (
                        <div key={line.id ?? index} className="rounded-xl px-4 py-3 ring-1 ring-slate-200/70 bg-white/70 dark:ring-slate-700 dark:bg-slate-900/40">
                          {/* 라켓 이름 + 순번 */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              라켓 {index + 1}
                              {line.racketType ? ` · ${line.racketType}` : ''}
                            </p>
                            {(line.tensionMain || line.tensionCross) && (
                              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                텐션 {line.tensionMain ?? '-'} / {line.tensionCross ?? '-'}
                              </span>
                            )}
                          </div>

                          {/* 스트링 이름 */}
                          {line.stringName && (
                            <p className="text-xs text-slate-700 dark:text-slate-200">
                              스트링: <span className="font-medium">{line.stringName}</span>
                            </p>
                          )}

                          {/* 라켓별 메모 */}
                          {line.note && <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">메모: {line.note}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 섹션 3: 장착 상품 정보 (스트링 상품 리스트) */}
                {data.items && data.items.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <ShoppingCart className="w-5 h-5" />
                      <span className="font-medium">장착 상품 정보</span>
                    </div>

                    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/70 bg-white/80 dark:ring-slate-700 dark:bg-slate-900/60">
                      {/* 헤더 행 */}
                      <div className="grid grid-cols-[minmax(0,1.6fr)_80px_100px] px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/70">
                        <span>상품명</span>
                        <span className="text-center">수량</span>
                        <span className="text-right">장착비</span>
                      </div>

                      {/* 데이터 행 */}
                      {data.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="grid grid-cols-[minmax(0,1.6fr)_80px_100px] px-4 py-2 text-sm border-t border-slate-100 dark:border-slate-700/70">
                          <div className="pr-2">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                          </div>
                          <div className="text-center text-xs text-muted-foreground">x {item.quantity}개</div>
                          <div className="text-right font-semibold text-gray-900 dark:text-gray-100">{item.price.toLocaleString()}원</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 섹션 4: 라켓 종류 요약 */}
                <section className="flex items-start justify-between border-t border-dashed border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Target className="w-5 h-5" />
                    <span className="font-medium">라켓 종류</span>
                  </div>
                  <div className="text-right text-gray-900 dark:text-gray-100 text-sm max-w-xs">{racketTypeSummary}</div>
                </section>
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
        {/* 관리자 전용 운송장 정보 카드 */}
        <div className="mt-8 space-y-6">
          {isAdmin && (
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur mb-8">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-slate-700 flex flex-col items-center py-4">
                <Truck className="h-5 w-5 text-indigo-500" />
                <CardTitle className="mt-2 text-lg font-semibold">운송장 정보</CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                {/* 자가 발송(사용자 → 매장) */}
                <div className="rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">자가 발송</p>
                  {data.shippingInfo?.selfShip?.trackingNo ? (
                    <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      <p>택배사: {data.shippingInfo.selfShip.courier || '미입력'}</p>
                      <p>
                        운송장:
                        <a href={buildTrackingUrl(data.shippingInfo.selfShip.courier, data.shippingInfo.selfShip.trackingNo) ?? '#'} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {data.shippingInfo.selfShip.trackingNo}
                        </a>
                      </p>
                      <p>발송일: {data.shippingInfo.selfShip.shippedAt ? new Date(data.shippingInfo.selfShip.shippedAt).toLocaleDateString('ko-KR') : '-'}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">등록된 자가 발송 운송장이 없습니다.</p>
                  )}
                </div>

                {/* 매장 발송(매장 → 사용자) */}
                <div className="rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">매장 발송</p>
                  {hasStoreShippingInfo ? (
                    <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      {shippingMethod === 'delivery' && invoice?.trackingNumber ? (
                        <>
                          <p>택배사: {getCourierLabel(invoice.courier)}</p>
                          <p>
                            운송장:
                            <a href={buildTrackingUrl(invoice.courier, invoice.trackingNumber) ?? undefined} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {invoice.trackingNumber}
                            </a>
                          </p>
                          <p>발송일: {invoice.shippedAt ? new Date(invoice.shippedAt).toLocaleDateString('ko-KR') : '-'}</p>
                        </>
                      ) : (
                        <>
                          <p>배송 방식: {shippingMethod === 'quick' ? '퀵배송' : shippingMethod === 'visit' ? '매장 방문 수령' : shippingMethod === 'delivery' ? '택배' : '미입력'}</p>
                          <p>예정일: {data.shippingInfo?.estimatedDate ? new Date(data.shippingInfo.estimatedDate).toLocaleDateString('ko-KR') : '-'}</p>
                          <p className="text-xs text-slate-500">운송장 번호는 발급되지 않는 배송 방식입니다.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">등록된 매장 발송 운송장이 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 신청 타임라인: 마이페이지 전용 */}
          {!isAdmin && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50/80 via-slate-50/60 to-indigo-50/80 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-800/80 overflow-hidden mb-8">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>신청 타임라인</span>
                </CardTitle>
                <CardDescription>신청 접수부터 운송장 등록까지의 주요 진행 상태입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* 신청 접수 */}
                  <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">신청 접수</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{data?.requestedAt ? new Date(data.requestedAt).toLocaleString('ko-KR') : '-'}</p>
                    </div>
                  </div>

                  {/* 자가 발송(사용자 → 매장) */}
                  {selfShip?.trackingNo && (
                    <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
                        <Truck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">자가 발송 완료</p>
                        {/* 날짜 */}
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selfShip.shippedAt ? new Date(selfShip.shippedAt).toLocaleDateString('ko-KR') : '운송장 번호가 등록되었습니다.'}</p>
                        {/* 택배사 + 운송장번호 + 조회 링크 */}
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {(selfShip.courier || '택배사 미입력') + ' · '}
                          <a href={buildTrackingUrl(selfShip.courier, selfShip.trackingNo) ?? '#'} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            {selfShip.trackingNo}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                  {/* 매장 발송(매장 → 사용자) */}
                  {invoice?.trackingNumber && (
                    <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">매장 발송</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{invoice.shippedAt ? new Date(invoice.shippedAt).toLocaleDateString('ko-KR') : '고객에게 발송을 위한 운송장 번호가 등록되었습니다.'}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {getCourierLabel(invoice.courier) + ' · '}
                          <a href={buildTrackingUrl(invoice.courier, invoice.trackingNumber) ?? '#'} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            {invoice.trackingNumber}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 전체 상태 요약 */}
                  <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">현재 상태</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{data?.status ? `현재 상태: ${data.status}` : '상태 정보가 없습니다.'}</p>
                      {data?.updatedAt && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">마지막 변경: {new Date(data.updatedAt).toLocaleString('ko-KR')}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* 처리 이력 */}
          {applicationId && (
            <div className="mt-6">
              <StringingApplicationHistory
                applicationId={applicationId}
                onHistoryMutate={(mutateFn) => {
                  historyMutateRef.current = mutateFn;
                }}
              />
            </div>
          )}
        </div>
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
