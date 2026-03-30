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
    <Card className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-border bg-muted/40">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4 text-primary" />
          교체 서비스 옵션
        </CardTitle>
      </div>
      <CardContent className="p-4 space-y-3">
        <CheckoutStringingSummaryCard adapter={adapter} />
        <CheckoutStringingCompactEditor adapter={adapter} />
      </CardContent>
    </Card>
  );
}
