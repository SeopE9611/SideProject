"use client";

import type { ReactNode } from "react";

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
  children: (
    adapter: ReturnType<typeof useRentalCheckoutStringingServiceAdapter>,
  ) => ReactNode;
};

export default function RentalCheckoutStringingRuntimeBridge({
  children,
  ...adapterParams
}: RentalCheckoutStringingRuntimeBridgeProps) {
  const adapter = useRentalCheckoutStringingServiceAdapter(adapterParams);
  return <>{children(adapter)}</>;
}
