'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CartItem } from '@/app/store/cartStore';
import useStringingApplySharedState from '@/app/features/stringing-applications/hooks/useStringingApplySharedState';

type ServicePickup = 'SELF_SEND' | 'COURIER_VISIT' | 'SHOP_VISIT';

type Params = {
  withStringService: boolean;
  orderItems: CartItem[];
  mountingFeeByProductId: Record<string, number>;
  serviceTargetIds: string[];

  name: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  depositor: string;
  selectedBank: string;
  servicePickupMethod: ServicePickup;
  isMember: boolean;
};

const PREVIEW_ORDER_ID = '__checkout_preview_order__';

const mapPickupToCollectionMethod = (pickup: ServicePickup) => {
  if (pickup === 'SHOP_VISIT') return 'visit' as const;
  if (pickup === 'COURIER_VISIT') return 'courier_pickup' as const;
  return 'self_ship' as const;
};

export default function useCheckoutStringingServiceAdapter({ withStringService, orderItems, mountingFeeByProductId, serviceTargetIds, name, email, phone, postalCode, address, addressDetail, depositor, selectedBank, servicePickupMethod, isMember }: Params) {
  const [packagePreview, setPackagePreview] = useState<{
    has: boolean;
    remaining?: number;
    expiresAt?: string;
    passId?: string;
    packageSize?: number;
  }>({ has: false });

  const previewOrder = useMemo(() => {
    const items = orderItems.map((item) => ({
      id: String(item.id),
      name: item.name,
      kind: item.kind ?? 'product',
      quantity: Number(item.quantity ?? 1),
      price: Number(item.price ?? 0),
      mountingFee: mountingFeeByProductId[String(item.id)] ?? 0,
      image: item.image ?? null,
    }));

    return {
      id: PREVIEW_ORDER_ID,
      items,
      stringService: {
        totalSlots: serviceTargetIds.reduce((sum, id) => {
          const found = items.find((it) => it.id === id);
          return sum + Number(found?.quantity ?? 0);
        }, 0),
        usedSlots: 0,
      },
    } as const;
  }, [orderItems, mountingFeeByProductId, serviceTargetIds]);

  const shared = useStringingApplySharedState({
    fromPDP: false,
    orderId: PREVIEW_ORDER_ID,
    rentalId: null,
    order: previewOrder,
    pdpProductId: null,
    pdpProduct: null,
    pdpMountingFee: Number.NaN,
    lockedStringStock: null,
    lockedRacketQuantity: null,
    isRentalBased: false,
  });

  const { setFormData } = shared;

  useEffect(() => {
    if (!withStringService) return;

    (async () => {
      try {
        const res = await fetch('/api/passes/me', { credentials: 'include' });
        if (!res.ok) {
          setPackagePreview({ has: false });
          return;
        }

        const data = await res.json();
        const items = (data?.items ?? []).filter((p: any) => p.status === 'active' && p.remainingCount > 0 && new Date(p.expiresAt).getTime() >= Date.now());
        items.sort((a: any, b: any) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

        if (items.length === 0) {
          setPackagePreview({ has: false });
          return;
        }

        const pass = items[0];
        setPackagePreview({
          has: true,
          remaining: pass.remainingCount,
          expiresAt: pass.expiresAt,
          passId: pass.id,
          packageSize: pass.packageSize,
        });
      } catch {
        setPackagePreview({ has: false });
      }
    })();
  }, [withStringService]);

  useEffect(() => {
    if (!withStringService) return;

    const collectionMethod = mapPickupToCollectionMethod(servicePickupMethod);

    setFormData((prev) => ({
      ...prev,
      name,
      email,
      phone,
      shippingName: name,
      shippingEmail: email,
      shippingPhone: phone,
      shippingPostcode: postalCode,
      shippingAddress: address,
      shippingAddressDetail: addressDetail,
      shippingDepositor: depositor,
      shippingBank: selectedBank,
      collectionMethod,
    }));
  }, [withStringService, servicePickupMethod, name, email, phone, postalCode, address, addressDetail, depositor, selectedBank, setFormData]);

  useEffect(() => {
    if (!withStringService) return;

    const selectedIds = serviceTargetIds.filter(Boolean);
    const nextCounts: Record<string, number> = {};

    selectedIds.forEach((id) => {
      const found = previewOrder.items.find((it) => it.id === id);
      const qty = Number(found?.quantity ?? 1);
      nextCounts[id] = Number.isFinite(qty) && qty > 0 ? qty : 1;
    });

    setFormData((prev) => ({
      ...prev,
      stringTypes: selectedIds,
      stringUseCounts: nextCounts,
    }));
  }, [withStringService, serviceTargetIds, previewOrder.items, setFormData]);

  const orderRemainingSlots = (previewOrder.stringService.totalSlots ?? 0) - (previewOrder.stringService.usedSlots ?? 0);
  const requiredPassCount = useMemo(() => {
    const ids = (shared.formData.stringTypes ?? []).filter(Boolean);
    if (!ids.length) return 0;

    return ids.reduce((sum, id) => {
      const count = shared.formData.stringUseCounts?.[id];
      return sum + (typeof count === 'number' && count > 0 ? count : 1);
    }, 0);
  }, [shared.formData.stringTypes, shared.formData.stringUseCounts]);

  const packageRemaining = Math.max(0, packagePreview?.remaining ?? 0);
  const canApplyPackage = !!(packagePreview?.has && requiredPassCount > 0 && packageRemaining >= requiredPassCount);
  const packageInsufficient = !!(packagePreview?.has && requiredPassCount > 0 && packageRemaining < requiredPassCount);
  const usingPackage = !!(canApplyPackage && !shared.formData.packageOptOut);

  useEffect(() => {
    if (packageInsufficient && !shared.formData.packageOptOut) {
      shared.setFormData((prev) => ({ ...prev, packageOptOut: true }));
    }
  }, [packageInsufficient, shared.formData.packageOptOut, shared.setFormData]);

  const base = shared.linesForSubmit.reduce((sum, line) => sum + Number(line.mountingFee ?? 0), 0);
  const price = usingPackage ? 0 : base;
  const selectedOrderItem = previewOrder.items.find((it) => it.id === shared.formData.stringTypes?.[0]) ?? null;

  return {
    previewOrder,
    previewOrderId: PREVIEW_ORDER_ID,
    orderRemainingSlots,
    orderStringService: previewOrder.stringService,
    selectedOrderItem,

    isMember,
    packagePreview,
    canApplyPackage,
    packageInsufficient,
    packageRemaining,
    requiredPassCount,
    usingPackage,

    price,
    priceView: {
      usingPackage,
      base,
      pickupFee: 0,
      total: price,
    },

    ...shared,
  };
}
