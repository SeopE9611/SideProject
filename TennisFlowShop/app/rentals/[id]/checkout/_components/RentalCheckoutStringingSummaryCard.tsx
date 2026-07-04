"use client";

import type useRentalCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useRentalCheckoutStringingServiceAdapter";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag } from "lucide-react";

type RentalCheckoutStringingServiceAdapter = ReturnType<
  typeof useRentalCheckoutStringingServiceAdapter
>;

type Props = {
  adapter: RentalCheckoutStringingServiceAdapter;
};

export default function RentalCheckoutStringingSummaryCard({ adapter }: Props) {
  const { summary, completion } = adapter;

  return (
    <section className="space-y-3 border-t border-border/70 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-ui-body-sm font-medium text-foreground">
            <ShoppingBag className="h-4 w-4 text-primary" />
            구매 스트링
          </p>
          <p className="mt-1 text-ui-label text-muted-foreground">
            대여 라켓에 장착할 구매 스트링과 교체서비스 비용입니다.
          </p>
        </div>
        <Badge
          variant={completion.isReadyToSubmit ? "success" : "secondary"}
          className="mt-0.5 shrink-0 border border-border/70 bg-transparent text-ui-micro"
        >
          {completion.statusLabel}
        </Badge>
      </div>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-2 text-ui-body-sm bp-sm:grid-cols-2">
        <div>
          <dt className="text-ui-label text-muted-foreground">구매 스트링</dt>
          <dd className="mt-1 font-medium text-foreground">
            {summary.stringNames.join(", ") || "미선택"}
          </dd>
        </div>
        <div>
          <dt className="text-ui-label text-muted-foreground">교체서비스 비용</dt>
          <dd className="mt-1 font-medium text-foreground">{summary.priceLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
