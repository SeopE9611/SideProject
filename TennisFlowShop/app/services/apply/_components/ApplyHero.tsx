"use client";

import { PublicPageHero } from "@/components/public/PublicPageHero";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

type Props = {
  entryLabel?: string;
};

export default function ApplyHero({ entryLabel }: Props) {
  return (
    <PublicPageHero
      align="left"
      eyebrow={
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-brand-highlight-muted px-3 py-1.5 text-ui-body-sm font-medium text-brand-highlight-foreground">
          <Wrench className="h-4 w-4" />
          교체서비스
        </span>
      }
      title="스트링 교체 신청"
      description="신청 정보와 작업 라켓, 예약·결제 내용을 단계별로 확인해 주세요."
      actions={
        entryLabel ? (
          <Badge variant="signal" className="px-3 py-1 text-ui-body-sm">
            {entryLabel}
          </Badge>
        ) : undefined
      }
      className="py-5 bp-sm:py-6 bp-lg:py-8 [&_h1]:font-brand-heading"
    />
  );
}
