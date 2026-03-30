"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

import CheckoutStringingCompactEditor from "@/app/checkout/_components/CheckoutStringingCompactEditor";
import CheckoutStringingSummaryCard from "@/app/checkout/_components/CheckoutStringingSummaryCard";
import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";

type CheckoutStringingServiceAdapter = ReturnType<
  typeof useCheckoutStringingServiceAdapter
>;

type Props = {
  withStringService: boolean;
  adapter: CheckoutStringingServiceAdapter;
};

export default function CheckoutStringingServiceSections({
  withStringService,
  adapter,
}: Props) {
  if (!withStringService) return null;

  return (
    <Card className="border border-border/90 bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-5 py-4.5">
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <Wrench className="h-4 w-4 text-primary" />
          교체 서비스 옵션
        </CardTitle>
      </div>
      <CardContent className="space-y-5 p-5">
        <CheckoutStringingSummaryCard adapter={adapter} />
        <CheckoutStringingCompactEditor adapter={adapter} />
      </CardContent>
    </Card>
  );
}
