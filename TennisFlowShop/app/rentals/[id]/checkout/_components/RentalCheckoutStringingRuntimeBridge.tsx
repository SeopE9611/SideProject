"use client";

import { type ReactNode, useEffect, useMemo } from "react";

import useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";

type ServicePickup = "SELF_SEND" | "COURIER_VISIT" | "SHOP_VISIT";

type RentalCheckoutStringingRuntimeBridgeProps = {
  rentalId: string;
  rentalRacketId: string;
  rentalDays: number;
  withStringService: boolean;
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
  onDirtySignatureChange?: (signature: string) => void;
  children: (payload: {
    adapter: ReturnType<typeof useRentalCheckoutStringingServiceAdapter>;
    dirtySignature: string;
  }) => ReactNode;
};

export default function RentalCheckoutStringingRuntimeBridge({
  children,
  onDirtySignatureChange,
  ...adapterParams
}: RentalCheckoutStringingRuntimeBridgeProps) {
  const adapter = useRentalCheckoutStringingServiceAdapter(adapterParams);
  const dirtySignature = useMemo(
    () => JSON.stringify(adapter.formData ?? null),
    [adapter.formData],
  );

  useEffect(() => {
    onDirtySignatureChange?.(dirtySignature);
  }, [dirtySignature, onDirtySignatureChange]);

  return <>{children({ adapter, dirtySignature })}</>;
}
