"use client";

import CheckoutSection from "@/components/checkout/CheckoutSection";
import { Wrench } from "lucide-react";

import CheckoutStringingCompactEditor from "@/app/checkout/_components/CheckoutStringingCompactEditor";
import CheckoutStringingSummaryCard from "@/app/checkout/_components/CheckoutStringingSummaryCard";
import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";

type CheckoutStringingServiceAdapter = ReturnType<typeof useCheckoutStringingServiceAdapter>;

type Props = {
  withStringService: boolean;
  adapter: CheckoutStringingServiceAdapter;
  showValidationErrors?: boolean;
};

export default function CheckoutStringingServiceSections({
  withStringService,
  adapter,
  showValidationErrors = false,
}: Props) {
  if (!withStringService) return null;

  return (
    <CheckoutSection
      icon={<Wrench className="h-5 w-5" />}
      title="교체서비스 옵션"
      contentClassName="space-y-3 bp-sm:p-5"
    >
      <CheckoutStringingCompactEditor
        adapter={adapter}
        showValidationErrors={showValidationErrors}
      />
      <CheckoutStringingSummaryCard adapter={adapter} />
    </CheckoutSection>
  );
}
