'use client';

import { useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Slide = {
  img: string;
  alt?: string;
  href?: string; // 배너 클릭 이동이 필요하면 사용
  caption?: string; // 화면 하단 간단 문구
};

export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

  useEffect(() => {
    if (!emblaApi) return;
    // 필요 시 이벤트 바인딩 가능
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section className="relative">
      <div className="overflow-hidden rounded-2xl mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0" ref={emblaRef}>
        <div className="flex">
          {slides.map((s, i) => {
            const body = (
              <div
                className="relative h-[200px] /* ≤575 */ bp-sm:h-[240px] /* 576~767 */ bp-md-only:h-[340px] /* 768~1199 */ bp-lg:h-[520px] /* ≥1200 */ w-full flex-[0_0_100%] select-none"
              >
                {/* 원본 비율 유지 + 잘림 방지(cover → contain)
                    - grid place-items-center: 중앙 정렬
                    - max-w/max-h: 작은 이미지를 억지로 확대하지 않음(원본 크기 느낌 유지) */}
                <div className="absolute inset-0 grid place-items-center bg-background">
                  <img src={s.img} alt={s.alt ?? `slide-${i + 1}`} className="max-w-full max-h-full object-contain" loading="eager" decoding="async" />
                </div>
                {/* 상단 그라데이션/얇은 라인으로 품질감 */}
                <div className="absolute inset-0 bg-muted/30" />
                {s.caption && (
                  <div className="absolute bottom-4 left-4 bp-sm:bottom-6 bp-sm:left-6 bp-md:bottom-8 bp-md:left-10">
                    <span
                      className="inline-block rounded-full bg-background/80 text-foreground border border-border text-xs bp-md:text-sm px-3 py-1 shadow-sm backdrop-blur dark:bg-background/30 dark:hover:bg-background/40"
                    >
                      {s.caption}
                    </span>
                  </div>
                )}
              </div>
            );

            return (
              <div className="flex-[0_0_100%] min-w-0" key={i}>
                {s.href ? <a href={s.href}>{body}</a> : body}
              </div>
            );
          })}
        </div>
      </div>

      {/* 좌우 네비게이션 */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 bp-md:left-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-border/10 bg-card/80 border border-border hover:bg-card shadow-md"
        aria-label="이전 배너"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 bp-md:right-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-border/10 bg-card/80 border border-border hover:bg-card shadow-md"
        aria-label="다음 배너"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}
