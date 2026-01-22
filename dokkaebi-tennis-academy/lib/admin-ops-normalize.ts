import type { OpsKind } from '@/lib/admin-ops-taxonomy';

/**
 * 관리자 운영/목록 화면에서 “표시용 정규화”를 한 곳에서 유지하기 위한 유틸.
 *
 * 왜 필요한가?
 * - 현재 프로젝트는 주문/대여/신청서가 서로 다른 컬렉션에 있고,
 *   각 화면(orders, rentals, operations)에서 라벨/금액/고객 표시 규칙이 중복 구현되어 있고
 * - 중복은 시간이 지나면 “어떤 화면은 A, 어떤 화면은 B”로 드리프트(불일치)함
 * - 이 파일을 기준으로 정규화 규칙을 고정하면, 화면/라우터가 달라도 동일한 표현을 유지할 수 있기때문.
 *
 *
 * - 정산(매출 집계) 정책과는 분리. 정산 계산은 settlementPolicy가 기준.
 * - 여기서는 “관리자 UI에서 이해하기 쉬운 텍스트/금액 표시”를 목표.
 */

export type OpsCustomer = { name: string; email: string };

export function toISO(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 주문 상태(배송/처리 상태 등) 표시용 정규화
 * - 기존 데이터에 영문 코드가 섞여 있어도, 관리자 화면에서는 한글로 통일
 * - 일부 데이터는 status에 'paid' 같은 값이 들어간 케이스가 있어 방어적으로 처리.
 */
export function normalizeOrderStatus(status?: string | null) {
  const s = (status ?? '').trim();
  switch (s) {
    case '':
      return '대기중';
    case 'pending':
      return '대기중';
    case 'processing':
      return '처리중';
    case 'shipped':
      return '배송중';
    case 'delivered':
      return '배송완료';
    case 'confirmed':
      return '구매확정';
    case 'paid': // 일부 레거시/혼재 데이터 방어
      return '결제완료';
    case 'cancelled':
    case 'canceled':
      return '취소';
    case 'refunded':
      return '환불';
    default:
      // 이미 한글이면 그대로 노출(예: '대기중', '배송중' 등)
      return s || '대기중';
  }
}

/**
 * 결제 상태 표시용 정규화
 */
export function normalizePaymentStatus(status?: string | null) {
  const s = (status ?? '').trim();
  switch (s) {
    case '':
      return '결제대기';
    case 'pending':
      return '결제대기';
    case 'paid':
    case 'confirmed': // 일부 흐름에서 confirmed를 결제완료로 취급
      return '결제완료';
    case 'failed':
      return '결제실패';
    case 'cancelled':
    case 'canceled':
      return '결제취소';
    case 'refunded':
      return '환불';
    default:
      return s || '결제대기';
  }
}

/**
 * 대여 상태 표시용 정규화
 * - rental_orders의 status 코드들을 운영함/대여목록에서 동일 라벨로 보여주기 위한 목적
 */
export function normalizeRentalStatus(status?: string | null) {
  const s = (status ?? '').trim();
  switch (s) {
    case '':
      return '대기중';
    case 'pending':
      return '대기중';
    case 'paid':
      return '결제완료';
    case 'out':
      return '대여중';
    case 'returned':
      return '반납완료';
    case 'canceled':
    case 'cancelled':
      return '취소됨';
    default:
      return s || '대기중';
  }
}

/**
 * 주문 아이템 요약(목록 1줄)
 */
export function summarizeOrderItems(items: any[] | undefined) {
  const names = (items ?? []).map((it) => String(it?.name ?? '').trim()).filter(Boolean);
  if (names.length === 0) return '주문';
  if (names.length === 1) return names[0]!;
  return `${names[0]} 외 ${names.length - 1}개`;
}

/**
 * 고객 표시용 스냅샷을 문서에서 최대한 안전하게 추출
 * - orders / stringing_applications / rental_orders가 서로 다른 필드 구조를 가질 수 있어 후보군을 넓게.
 */
export function pickCustomerFromDoc(doc: any): OpsCustomer {
  const c = doc?.customer;
  if (c?.name || c?.email) return { name: String(c?.name ?? ''), email: String(c?.email ?? '') };

  const us = doc?.userSnapshot;
  if (us?.name || us?.email) return { name: String(us?.name ?? ''), email: String(us?.email ?? '') };

  const guestInfo = doc?.guestInfo;
  if (guestInfo?.name || guestInfo?.email) return { name: String(guestInfo?.name ?? ''), email: String(guestInfo?.email ?? '') };

  // stringing_application guest fields
  if (doc?.guestName || doc?.guestEmail) return { name: String(doc?.guestName ?? ''), email: String(doc?.guestEmail ?? '') };

  // rental_orders guest object
  const g = doc?.guest;
  if (g?.name || g?.email) return { name: String(g?.name ?? ''), email: String(g?.email ?? '') };

  return { name: '', email: '' };
}

/**
 * 대여 금액(표시용) 계산
 * - admin/rentals/route.ts 및 operations/route.ts에서 동일 규칙을 쓰기 위해 분리.
 * - “정산 정책”이 아니라 “대여 주문서 화면에서 보여주는 총액” 기준
 */
export function normalizeRentalAmountTotal(r: any) {
  const fee = Number(r?.amount?.fee ?? r?.fee ?? 0);
  const deposit = Number(r?.amount?.deposit ?? r?.deposit ?? 0);
  const requested = !!r?.stringing?.requested;
  const stringPrice = Number(r?.amount?.stringPrice ?? (requested ? (r?.stringing?.price ?? 0) : 0));
  const stringingFee = Number(r?.amount?.stringingFee ?? (requested ? (r?.stringing?.mountingFee ?? 0) : 0));
  const total = Number(r?.amount?.total ?? fee + deposit + stringPrice + stringingFee);
  return total;
}

/**
 * (옵션) kind별 status/payment 정규화를 한 번에 쓰고 싶을 때를 위한 헬퍼
 */
export function normalizeStatusLabel(kind: OpsKind, rawStatus?: string | null) {
  if (kind === 'order') return normalizeOrderStatus(rawStatus);
  if (kind === 'rental') return normalizeRentalStatus(rawStatus);
  // 신청서는 이미 한글 상태를 쓰는 경우가 많아 기본은 그대로 두되, 빈 값만 방어
  const s = (rawStatus ?? '').trim();
  return s || '접수완료';
}
