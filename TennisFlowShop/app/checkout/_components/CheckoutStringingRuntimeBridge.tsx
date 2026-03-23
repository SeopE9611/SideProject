"use client";

import type { ReactNode } from "react";

import useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";

type CheckoutStringingServiceAdapter = ReturnType<typeof useCheckoutStringingServiceAdapter>;
type CheckoutStringingRuntimeBridgeProps = Parameters<typeof useCheckoutStringingServiceAdapter>[0] & {
  children: (adapter: CheckoutStringingServiceAdapter) => ReactNode;
};

export default function CheckoutStringingRuntimeBridge({ children, ...params }: CheckoutStringingRuntimeBridgeProps) {
  const adapter = useCheckoutStringingServiceAdapter(params);
  return <>{children(adapter)}</>;
}
