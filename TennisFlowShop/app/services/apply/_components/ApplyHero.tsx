"use client";

import { PublicPageHero } from "@/components/public/PublicPageHero";
import { Wrench } from "lucide-react";

export default function ApplyHero() {
  return (
    <PublicPageHero
      align="center"
      eyebrow={
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
          <Wrench className="h-4 w-4" />
          교체서비스
        </span>
      }
      title="교체서비스 신청"
      description="스트링 교체 방식과 수령 정보를 입력하면 신청이 접수됩니다."
      className="py-6 bp-sm:py-8 bp-lg:py-10"
    />
  );
}
