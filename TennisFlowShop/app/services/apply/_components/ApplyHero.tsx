"use client";

import { PublicPageHero } from "@/components/public/PublicPageHero";
import { SemanticBadge as Badge } from "@/components/badges/SemanticBadge";

type Props = {
  entryLabel?: string;
};

export default function ApplyHero({ entryLabel }: Props) {
  return (
    <PublicPageHero
      align="left"
      title="스트링 교체 신청"
      description="신청 정보와 작업 라켓, 예약·결제 내용을 단계별로 확인해 주세요."
      actions={
        entryLabel ? (
          <Badge variant="signal" className="px-3 py-1 text-ui-body-sm">
            {entryLabel}
          </Badge>
        ) : undefined
      }
      className="py-5 bp-sm:py-6 bp-lg:py-8 [&_h1]:font-ui-bold"
    />
  );
}
