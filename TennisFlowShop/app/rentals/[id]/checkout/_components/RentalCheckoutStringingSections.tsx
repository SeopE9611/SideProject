"use client";

import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import RentalCheckoutStringingCompactEditor from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingCompactEditor";
import RentalCheckoutStringingSummaryCard from "@/app/rentals/[id]/checkout/_components/RentalCheckoutStringingSummaryCard";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
    <Card className="overflow-hidden rounded-2xl border-0 bg-card shadow-lg shadow-foreground/[0.03] ring-1 ring-border/50">
      <div className="bg-secondary/40 p-4 md:p-6">
        <CardTitle className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Wrench className="h-5 w-5 text-primary" />
          </span>
          대여 라켓 스트링 설정
        </CardTitle>
        <CardDescription className="mt-2">
          대여할 라켓에 장착할 스트링 텐션과 요청사항을 입력하세요. 라켓 정보는 대여 상품 기준으로
          자동 반영됩니다.
        </CardDescription>
      </div>
      <CardContent className="space-y-4 p-4 md:space-y-6 md:p-6">
        <RentalCheckoutStringingSummaryCard adapter={adapter} />
        <RentalCheckoutStringingCompactEditor adapter={adapter} />
      </CardContent>
    </Card>
  );
}
