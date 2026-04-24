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
    <Card className="group overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50 transition-all duration-300 hover:shadow-xl hover:ring-border">
      <div className="border-b border-border bg-secondary/40 p-5 bp-sm:p-6">
        <CardTitle className="flex items-center gap-3 text-lg font-bold bp-sm:text-xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Wrench className="h-5 w-5 text-primary" />
          </span>
          교체 서비스 옵션
        </CardTitle>
      </div>
      <CardContent className="space-y-5 p-5 bp-sm:p-6">
        <CheckoutStringingSummaryCard adapter={adapter} />
        <CheckoutStringingCompactEditor adapter={adapter} />
      </CardContent>
    </Card>
  );
}
