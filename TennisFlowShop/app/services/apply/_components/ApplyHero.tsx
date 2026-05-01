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
        <h1 className="text-2xl bp-sm:text-3xl md:text-4xl font-bold mb-4">
          교체서비스 신청 시작
        </h1>
        <p className="text-base bp-sm:text-lg text-primary max-w-2xl mx-auto">
          신청 방식을 먼저 선택하면 필요한 정보만 이어서 입력할 수 있어요
        </p>
      </div>
    </div>
  );
}
