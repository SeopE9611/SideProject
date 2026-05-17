"use client";

import { Wrench } from "lucide-react";

export default function ApplyHero() {
  return (
    <div className="relative overflow-hidden border-b border-border bg-muted py-6 bp-sm:py-8 bp-lg:py-10">
      <div className="absolute inset-0 bg-overlay/10" />
      <div className="relative container mx-auto px-4 text-center text-foreground">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary bp-sm:h-14 bp-sm:w-14">
          <Wrench className="h-6 w-6 bp-sm:h-7 bp-sm:w-7" />
        </div>
        <h1 className="text-2xl font-bold bp-sm:text-3xl md:text-4xl">
          교체서비스 신청
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-primary bp-sm:text-base">
          스트링 교체 방식과 수령 정보를 입력하면 신청이 접수됩니다.
        </p>
      </div>
    </div>
  );
}
