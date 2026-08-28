"use client";

import Link from "next/link";
import {
  type FocusEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const SLIDE_INTERVAL = 8_000;

const heroSlides = [
  {
    eyebrow: "30년 넘게 이어 온 보금자리",
    title: (
      <>
        함께 사는 집,
        <br />
        함께 이어 가는 일상
      </>
    ),
    description:
      "샬롬의 집은 서로의 속도와 선택을 존중하며 오랜 시간 지역사회 안에서 일상을 함께해 왔습니다.",
    primaryLink: { href: "/about", label: "샬롬 소개 보기" },
    secondaryLink: { href: "/life", label: "생활과 활동 보기" },
    backgroundClass: "bg-hero-forest",
    motifClass: "bg-hero-mist",
    accentClass: "bg-hero-sun",
  },
  {
    eyebrow: "생활과 활동",
    title: (
      <>
        평범한 하루가
        <br />
        오래 기억될 이야기가 됩니다
      </>
    ),
    description:
      "식사를 나누고, 나들이를 떠나고, 편안한 공간을 가꾸는 매일의 경험이 샬롬의 집을 만듭니다.",
    primaryLink: { href: "/life", label: "함께하는 일상 보기" },
    secondaryLink: { href: "/news", label: "최근 이야기 보기" },
    backgroundClass: "bg-hero-clay",
    motifClass: "bg-accent-soft",
    accentClass: "bg-hero-sun",
  },
  {
    eyebrow: "지역사회와 함께",
    title: (
      <>
        관심이 연결될 때
        <br />
        일상의 가능성이 넓어집니다
      </>
    ),
    description:
      "후원과 자원봉사, 투명한 운영 정보까지 샬롬의 집과 함께하는 방법을 차분하고 분명하게 안내합니다.",
    primaryLink: { href: "/support", label: "함께하는 방법 보기" },
    secondaryLink: { href: "/transparency", label: "운영 공개 보기" },
    backgroundClass: "bg-hero-night",
    motifClass: "bg-primary-soft",
    accentClass: "bg-hero-sun",
  },
] as const;

export function HomeHeroSlider() {
  const regionRef = useRef<HTMLElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusInside, setIsFocusInside] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const animationFrameId = window.requestAnimationFrame(() => {
      setIsPlaying(!reducedMotionQuery.matches);
    });

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsPlaying(false);
      }
    }

    reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      reducedMotionQuery.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );
    };
  }, []);

  const showSlide = useCallback((index: number, announce = true) => {
    const normalizedIndex =
      (index + heroSlides.length) % heroSlides.length;

    setCurrentIndex(normalizedIndex);

    if (announce) {
      setAnnouncement(
        `${normalizedIndex + 1}번째 소개 화면: ${heroSlides[normalizedIndex].eyebrow}`,
      );
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || isPointerInside || isFocusInside) return;

    const intervalId = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % heroSlides.length);
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [isFocusInside, isPlaying, isPointerInside]);

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocusInside(false);
    }
  }

  function toggleAutoPlay() {
    setIsPlaying((current) => {
      const next = !current;
      setAnnouncement(
        next
          ? "소개 화면 자동 넘김을 시작했습니다."
          : "소개 화면 자동 넘김을 멈췄습니다.",
      );
      return next;
    });
  }

  const activeSlide = heroSlides[currentIndex];

  return (
    <section
      ref={regionRef}
      aria-label="샬롬의 집 주요 소개"
      aria-roledescription="캐러셀"
      className={`relative isolate overflow-hidden text-on-dark transition-colors duration-[var(--motion-duration-hero)] ease-standard ${activeSlide.backgroundClass}`}
      onBlur={handleBlur}
      onFocusCapture={() => setIsFocusInside(true)}
      onPointerEnter={() => setIsPointerInside(true)}
      onPointerLeave={() => setIsPointerInside(false)}
    >
      <h1 className="sr-only">
        샬롬의 집, 함께 살아가는 장애인 거주 공동체
      </h1>

      <div className="mx-auto grid min-h-[43rem] w-full max-w-site items-center gap-12 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[45rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:py-24">
        <article
          key={currentIndex}
          aria-label={`${currentIndex + 1} / ${heroSlides.length}`}
          aria-roledescription="슬라이드"
          className="animate-hero-enter relative z-10 max-w-3xl"
          role="group"
        >
          <p className="inline-flex rounded-full border border-on-dark/40 px-4 py-2 text-small font-bold text-on-dark">
            {activeSlide.eyebrow}
          </p>
          <h2 className="mt-7 text-hero font-bold text-balance text-on-dark sm:text-display-lg lg:text-hero-lg">
            {activeSlide.title}
          </h2>
          <p className="mt-7 max-w-2xl text-body text-on-dark/85 sm:text-lg sm:leading-8">
            {activeSlide.description}
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-control bg-on-dark px-6 py-3 text-base font-bold text-hero-night transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-sun focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-on-dark"
              href={activeSlide.primaryLink.href}
            >
              {activeSlide.primaryLink.label}
            </Link>
            <Link
              className="inline-flex min-h-12 items-center gap-2 px-2 py-3 text-base font-bold text-on-dark underline decoration-on-dark/60 underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-hero-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
              href={activeSlide.secondaryLink.href}
            >
              {activeSlide.secondaryLink.label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>

        <div aria-hidden="true" className="relative hidden min-h-[31rem] lg:block">
          <div
            className={`absolute inset-x-7 bottom-0 top-8 rounded-t-[14rem] rounded-b-panel opacity-95 shadow-elevated ${activeSlide.motifClass}`}
          />
          <div className="absolute bottom-0 left-1/2 h-[74%] w-[42%] -translate-x-1/2 rounded-t-[9rem] bg-hero-night/85" />
          <div
            className={`absolute right-2 top-2 size-32 rounded-full opacity-90 ${activeSlide.accentClass}`}
          />
          <div className="absolute bottom-[18%] left-4 size-20 rounded-full border-[1.25rem] border-on-dark/70" />
          <div className="absolute bottom-[10%] right-0 h-28 w-28 rounded-t-full bg-primary/80" />
          <div className="absolute bottom-[22%] left-1/2 h-px w-[72%] -translate-x-1/2 bg-on-dark/30" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-on-dark/25 bg-hero-night/35">
        <div className="mx-auto flex min-h-16 w-full max-w-site flex-wrap items-center justify-between gap-3 px-page py-3 sm:px-page-wide">
          <div aria-label="소개 화면 선택" className="flex items-center gap-2">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.eyebrow}
                type="button"
                aria-label={`${index + 1}번째 소개 화면 보기: ${slide.eyebrow}`}
                aria-pressed={currentIndex === index}
                className={`grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark ${
                  currentIndex === index
                    ? "bg-on-dark text-hero-night"
                    : "border border-on-dark/50 text-on-dark hover:bg-on-dark/15"
                }`}
                onClick={() => showSlide(index)}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="이전 소개 화면"
              className="grid min-h-11 min-w-11 place-items-center rounded-full border border-on-dark/50 text-xl font-bold text-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
              onClick={() => showSlide(currentIndex - 1)}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label="다음 소개 화면"
              className="grid min-h-11 min-w-11 place-items-center rounded-full border border-on-dark/50 text-xl font-bold text-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
              onClick={() => showSlide(currentIndex + 1)}
            >
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              aria-label={isPlaying ? "자동 넘김 정지" : "자동 넘김 재생"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-on-dark/50 px-4 text-sm font-bold text-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
              onClick={toggleAutoPlay}
            >
              <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
              <span>{isPlaying ? "정지" : "재생"}</span>
            </button>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
