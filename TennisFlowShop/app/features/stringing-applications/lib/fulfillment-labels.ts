import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

export type OrderShippingMethod = 'delivery' | 'quick' | 'visit';

export const normalizeOrderShippingMethod = (raw: unknown): OrderShippingMethod => {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();

  if (['visit', 'pickup', '방문', '방문수령', '매장', 'shop_visit'].includes(s)) return 'visit';
  if (['quick', '퀵', '퀵배송'].includes(s)) return 'quick';
  if (['delivery', 'courier', 'parcel', 'ship', 'shipping', '택배', '택배수령'].includes(s)) return 'delivery';
  return 'delivery';
};

export const collectionMethodLabel = (raw: unknown): string => {
  const method = normalizeCollection(raw);
  if (method === 'visit') return '매장 방문 접수';
  if (method === 'courier_pickup') return '기사 방문 수거';
  return '자가 발송(택배)';
};

export const collectionVisitNotice = '방문 접수는 주소 입력이 필요하지 않습니다.';

export const getStringingAddressReadLabels = (raw: unknown): {
  sectionTitle: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
} => {
  const method = normalizeCollection(raw);
  const isVisit = method === 'visit';

  return {
    sectionTitle: isVisit ? '방문 접수 정보' : '배송지 정보',
    primaryLabel: isVisit ? '접수 방식' : '주소',
    primaryValue: isVisit ? `${collectionMethodLabel(method)} (주소 입력 불필요)` : '-',
    secondaryLabel: isVisit ? '안내' : '우편번호',
    secondaryValue: isVisit ? collectionVisitNotice : '-',
  };
};

export const orderShippingMethodLabel = (raw: unknown): string => {
  const method = normalizeOrderShippingMethod(raw);
  if (method === 'visit') return '매장 방문 수령';
  if (method === 'quick') return '퀵배송';
  return '택배';
};

export const getOrderShippingReadLabels = (raw: unknown): {
  sectionTitle: string;
  primaryLabel: string;
  primaryValue: string;
} => {
  const method = normalizeOrderShippingMethod(raw);
  const isVisit = method === 'visit';

  return {
    sectionTitle: isVisit ? '수령 정보' : '배송지 정보',
    primaryLabel: isVisit ? '수령 방식' : '배송지',
    primaryValue: isVisit ? `${orderShippingMethodLabel(method)} (주소 입력 불필요)` : '-',
  };
};

export const withAddressValue = (raw: unknown, address: string | null | undefined): string => {
  const method = normalizeCollection(raw);
  if (method === 'visit') return `${collectionMethodLabel(method)} (주소 입력 불필요)`;
  return address?.trim() || '-';
};

export const withPostalValue = (raw: unknown, postalCode: string | null | undefined): string => {
  const method = normalizeCollection(raw);
  if (method === 'visit') return collectionVisitNotice;
  return postalCode?.trim() || '-';
};
