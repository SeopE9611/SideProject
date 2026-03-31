"use client";

import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import RentalCheckoutStringingCompactEditor from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingCompactEditor";
import RentalCheckoutStringingSummaryCard from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingSummaryCard";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

type RentalCheckoutStringingServiceAdapter = ReturnType<
  typeof useRentalCheckoutStringingServiceAdapter
>;

type Props = {
  withStringService: boolean;
  adapter: RentalCheckoutStringingServiceAdapter;
};

export default function RentalCheckoutStringingSections({
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
        <RentalCheckoutStringingSummaryCard adapter={adapter} />
        <RentalCheckoutStringingCompactEditor adapter={adapter} />
      </CardContent>
    </Card>
  );
}
