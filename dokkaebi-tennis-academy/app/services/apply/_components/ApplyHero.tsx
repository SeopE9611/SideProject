'use client';

import { Wrench } from 'lucide-react';

export default function ApplyHero() {
  return (
    <div className="relative overflow-hidden bg-primary    py-10 bp-sm:py-14 bp-lg:py-16">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative container mx-auto px-4 text-center text-foreground">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-card/20 backdrop-blur-sm mb-6">
          <Wrench className="h-10 w-10" />
        </div>
        <h1 className="text-2xl bp-sm:text-4xl md:text-5xl font-bold mb-4">스트링 장착 서비스 신청</h1>
        <p className="text-base bp-sm:text-lg text-blue-100 max-w-2xl mx-auto">전문가가 직접 라켓에 스트링을 장착해드립니다</p>
      </div>
    </div>
  );
}
