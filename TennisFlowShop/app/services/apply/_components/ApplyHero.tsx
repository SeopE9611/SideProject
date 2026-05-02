"use client";

import { Wrench } from "lucide-react";

export default function ApplyHero() {
  return (
    <div className="relative overflow-hidden bg-muted py-10 bp-sm:py-14 bp-lg:py-16">
      <div className="absolute inset-0 bg-overlay/20" />
      <div className="relative container mx-auto px-4 text-center text-foreground">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary border border-border mb-6">
          <Wrench className="h-10 w-10" />
        </div>
        <p className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">보유 장비 신청</p>
        <h1 className="text-2xl bp-sm:text-3xl md:text-4xl font-bold mb-4">
          보유 라켓/보유 스트링으로 교체서비스를 신청합니다.
        </h1>
        <p className="text-base bp-sm:text-lg text-primary max-w-2xl mx-auto">
          이미 가지고 있는 라켓이나 스트링 정보를 입력해 교체서비스 신청서를 작성합니다.
        </p>
      </div>
    </div>
  );
}
