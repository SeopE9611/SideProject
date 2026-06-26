"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

type Slide = {
  img: string;
  alt?: string;
  href?: string; // 배너 클릭 이동이 필요하면 사용
  caption?: string; // 화면 하단 간단 문구
};

const normalizeImageSrc = (src: string) =>
  src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;

export default function HeroSlider({
  slides,
  slideClassName = "h-[200px] bp-sm:h-[240px] bp-md-only:h-[340px] bp-lg:h-[520px]",
}: {
  slides: Slide[];
  slideClassName?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  useEffect(() => {
    if (!emblaApi) return;
    // 필요 시 이벤트 바인딩 가능
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section className="relative">
      <div
        className="overflow-hidden rounded-2xl mx-3 bp-sm:mx-4 bp-md:mx-6 bp-lg:mx-0"
        ref={emblaRef}
      >
        <div className="flex">
          {slides.map((s, i) => {
            const imageSrc = normalizeImageSrc(s.img);
            const body = (
              <div className={`relative w-full flex-[0_0_100%] select-none ${slideClassName}`}>
                {/* 원본 비율 유지 + 잘림 방지(cover → contain)
                    - grid place-items-center: 중앙 정렬
                    - max-w/max-h: 작은 이미지를 억지로 확대하지 않음(원본 크기 느낌 유지) */}
                <div className="absolute inset-0 grid place-items-center bg-background">
                  <Image
                    src={imageSrc}
                    alt={s.alt ?? `slide-${i + 1}`}
                    fill
                    className="object-contain"
                    priority={i === 0}
                    sizes="(max-width: 575px) calc(100vw - 24px), (max-width: 767px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 48px), 1200px"
                  />
                </div>
                {/* 상단 그라데이션/얇은 라인으로 품질감 */}
                <div className="absolute inset-0 bg-muted/30" />
                {s.caption && (
                  <div className="absolute bottom-4 left-4 bp-sm:bottom-6 bp-sm:left-6 bp-md:bottom-8 bp-md:left-10">
                    <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-ui-label text-foreground shadow-sm bp-md:text-ui-body-sm">
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
        className="absolute left-4 bp-md:left-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-border/10 bg-card border border-border hover:bg-secondary shadow-sm"
        aria-label="이전 배너"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 bp-md:right-5 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-10 w-10 rounded-full focus:outline-none focus:ring focus:ring-border/10 bg-card border border-border hover:bg-secondary shadow-sm"
        aria-label="다음 배너"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}
