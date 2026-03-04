'use client';

import { useEffect, useMemo } from 'react';

import useStringingApplySharedState from '@/app/features/stringing-applications/hooks/useStringingApplySharedState';
import { useReservedSlots } from '@/app/services/apply/_hooks/useReservedSlots';

type ServicePickup = 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';

type Params = {
  withStringService: boolean;
  rentalId: string;
  rentalRacketId: string;
  rentalDays: number;
  stringProduct: {
    id: string;
    name: string;
    image: string | null;
    mountingFee: number;
  } | null;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  deliveryRequest: string;
  depositor: string;
  selectedBank: string;
  servicePickupMethod: ServicePickup;
};

// "10:30" -> 630(분)
// 예약 슬롯 간격(예: 30분)을 계산
const parseTimeToMinutes = (time: string | null | undefined) => {
  if (!time || typeof time !== 'string') return null;
  const [h, m] = time.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const mapPickupToCollectionMethod = (pickup: ServicePickup) => {
  if (pickup === 'SHOP_VISIT') return 'visit' as const;
  if (pickup === 'COURIER_VISIT') return 'courier_pickup' as const;
  return 'self_ship' as const;
};

export default function useRentalCheckoutStringingServiceAdapter({
  withStringService,
  rentalId,
  rentalRacketId,
  rentalDays,
  stringProduct,
  name,
  email,
  phone,
  postalCode,
  address,
  addressDetail,
  deliveryRequest,
  depositor,
  selectedBank,
  servicePickupMethod,
}: Params) {
  const shared = useStringingApplySharedState({
    fromPDP: false,
    orderId: null,
    rentalId,
    order: null,
    pdpProductId: stringProduct?.id ?? null,
    pdpProduct: stringProduct,
    pdpMountingFee: Number(stringProduct?.mountingFee ?? Number.NaN),
    lockedStringStock: null,
    lockedRacketQuantity: 1,
    isRentalBased: true,
  });

  const { setFormData } = shared;

  useEffect(() => {
    if (!withStringService) return;

    const collectionMethod = mapPickupToCollectionMethod(servicePickupMethod);
    const isVisit = collectionMethod === 'visit';

    setFormData((prev) => ({
      ...prev,
      name,
      email,
      phone,
      shippingName: name,
      shippingEmail: email,
      shippingPhone: phone,
      shippingPostcode: isVisit ? '' : postalCode,
      shippingAddress: isVisit ? '' : address,
      shippingAddressDetail: isVisit ? '' : addressDetail,
      shippingDepositor: depositor,
      shippingBank: selectedBank,
      shippingRequest: deliveryRequest,
      collectionMethod,
    }));
  }, [withStringService, servicePickupMethod, name, email, phone, postalCode, address, addressDetail, deliveryRequest, depositor, selectedBank, setFormData]);

  useEffect(() => {
    if (!withStringService || !stringProduct?.id) return;

    setFormData((prev) => ({
      ...prev,
      stringTypes: [stringProduct.id],
      stringUseCounts: {
        ...prev.stringUseCounts,
        [stringProduct.id]: 1,
      },
    }));
  }, [withStringService, stringProduct?.id, setFormData]);

  const price = useMemo(() => shared.linesForSubmit.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0), [shared.linesForSubmit]);

  // 패키지(requiredPassCount)와는 별개로, 예약 슬롯 cap은 "이번 신청에 필요한 실제 슬롯 수"를 사용.
  // 대여는 1대 기준이므로 일반적으로 1이지만, 안전하게 lineCount 기준으로 맞춤
  const reservationSlotCount = Math.max(shared.lineCount || 1, 1);

  const { disabledTimes, timeSlots, slotsLoading, slotsError, hasCacheForDate } = useReservedSlots({
    preferredDate: shared.formData.preferredDate,
    preferredTime: shared.formData.preferredTime,
    requiredPassCount: reservationSlotCount,
    setFormData: shared.setFormData,
  });

  // 예약 슬롯 배열에서 시간 간격을 추정
  // 예: ["10:00", "10:30", "11:00"] -> 30분
  const slotIntervalMinutes = useMemo(() => {
    if (!timeSlots || timeSlots.length < 2) return null;
    const first = parseTimeToMinutes(timeSlots[0]);
    const second = parseTimeToMinutes(timeSlots[1]);
    if (first == null || second == null) return null;
    const diff = Math.abs(second - first);
    return diff > 0 ? diff : null;
  }, [timeSlots]);

  // UI 표시용: 이번 방문에서 실제 사용하는 슬롯 수
  const visitSlotCountUi = shared.lineCount || 0;

  // UI 표시용: 예상 소요 시간 = 슬롯 간격 × 슬롯 수
  const visitDurationMinutesUi = useMemo(() => {
    if (!slotIntervalMinutes || !visitSlotCountUi) return null;
    return slotIntervalMinutes * visitSlotCountUi;
  }, [slotIntervalMinutes, visitSlotCountUi]);

  useEffect(() => {
    // shared 훅 내부 visitTimeRange 계산에 필요한 값을 동기화
    shared.setVisitDurationMinutesUi(visitDurationMinutesUi);
  }, [visitDurationMinutesUi, shared.setVisitDurationMinutesUi]);

  return {
    ...shared,
    rentalId,
    rentalRacketId,
    rentalDays,
    stringProduct,
    price,
    priceView: {
      usingPackage: false,
      base: price,
      pickupFee: 0,
      total: price,
    },

    // MountingInfoSection으로 내려줄 예약 슬롯 관련 값
    timeSlots,
    disabledTimes,
    slotsLoading,
    hasCacheForDate,
    slotsError,
    visitSlotCountUi,
    visitDurationMinutesUi,

    // 대여 checkout에서는 패키지 미적용 정책을 유지한다.
    usingPackage: false,
    packageInsufficient: false,
    canApplyPackage: false,
    packagePreview: null,
    packageRemaining: 0,
    requiredPassCount: 0,
  };
}
