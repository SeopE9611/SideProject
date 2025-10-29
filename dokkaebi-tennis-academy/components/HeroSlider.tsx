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
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((s, i) => {
            const body = (
              <div
                className="relative h-[460px] md:h-[520px] lg:h-[560px] w-full flex-[0_0_100%]
                           select-none"
              >
                <img src={s.img} alt={s.alt ?? `slide-${i + 1}`} className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
                {/* 상단 그라데이션/얇은 라인으로 품질감 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-black/5 to-transparent" />
                {s.caption && (
                  <div className="absolute bottom-6 left-6 md:bottom-8 md:left-10">
                    <span
                      className="inline-block rounded-full bg-black/50 text-white
                                       text-xs md:text-sm px-3 py-1 backdrop-blur"
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
        className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-black/10 dark:focus:ring-white/10 bg-white/80 dark:bg-slate-800/80
                   border border-slate-200 dark:border-slate-700
                   hover:bg-white shadow-md"
        aria-label="이전 배너"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-black/10 dark:focus:ring-white/10 bg-white/80 dark:bg-slate-800/80
                   border border-slate-200 dark:border-slate-700
                   hover:bg-white shadow-md"
        aria-label="다음 배너"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}
