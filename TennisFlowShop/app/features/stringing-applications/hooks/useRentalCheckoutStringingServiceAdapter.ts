'use client';

import { useEffect, useMemo } from 'react';

import useStringingApplySharedState from '@/app/features/stringing-applications/hooks/useStringingApplySharedState';

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
    // 대여 checkout에서는 패키지 미적용 정책을 유지한다.
    usingPackage: false,
    packageInsufficient: false,
    canApplyPackage: false,
    packagePreview: null,
    packageRemaining: 0,
    requiredPassCount: 0,
  };
}
