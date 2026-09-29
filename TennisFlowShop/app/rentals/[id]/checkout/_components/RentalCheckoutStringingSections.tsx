"use client";

import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import RentalCheckoutStringingCompactEditor from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingCompactEditor";
import RentalCheckoutStringingSummaryCard from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingSummaryCard";
import CheckoutSection from "@/components/checkout/CheckoutSection";
import { Wrench } from "lucide-react";

type RentalCheckoutStringingServiceAdapter = ReturnType<
  typeof useRentalCheckoutStringingServiceAdapter
>;

type Props = {
  withStringService: boolean;
  adapter: RentalCheckoutStringingServiceAdapter;
};

export default function RentalCheckoutStringingSections({ withStringService, adapter }: Props) {
  if (!withStringService) return null;

  return (
    <CheckoutSection
      id="rental-checkout-stringing"
      icon={<Wrench className="h-5 w-5" />}
      title="대여 라켓 스트링 설정"
      description="대여할 라켓에 장착할 스트링 텐션과 요청사항을 입력하세요. 라켓 정보는 대여 상품 기준으로 자동 반영됩니다."
      contentClassName="space-y-3 bp-sm:p-5"
    >
      <RentalCheckoutStringingCompactEditor adapter={adapter} />
      <RentalCheckoutStringingSummaryCard adapter={adapter} />
    </CheckoutSection>
  );
}
