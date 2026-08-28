"use client";

import Link from "next/link";
import { type FocusEvent, useEffect, useState } from "react";

const SLIDE_INTERVAL = 8_000;

const quickLinks = [
  {
    number: "01",
    label: "시설소개",
    description: "샬롬의 집 기본 정보",
    href: "/about",
  },
  {
    number: "02",
    label: "생활이야기",
    description: "일상과 주요 활동",
    href: "/life",
  },
  {
    number: "03",
    label: "함께하기",
    description: "자원봉사와 후원 안내",
    href: "/support",
  },
  {
    number: "04",
    label: "찾아오시는 길",
    description: "주소와 방문 문의",
    href: "/about/directions",
  },
] as const;

export type HomeHeroNewsItem = {
  id: string;
  categoryLabel: string;
  publishedAtLabel: string;
  title: string;
  summary: string;
  href: string;
};

type HomeHeroProps = {
  newsItems: readonly HomeHeroNewsItem[];
};

export function HomeHero({ newsItems }: HomeHeroProps) {
  const hasCarousel = newsItems.length >= 2;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusInside, setIsFocusInside] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const activeNewsItem = hasCarousel
    ? (newsItems[currentIndex] ?? newsItems[0])
    : undefined;

  useEffect(() => {
    if (!hasCarousel) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsPlaying(!reducedMotionQuery.matches);
    });

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      if (event.matches) setIsPlaying(false);
    }

    reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      reducedMotionQuery.removeEventListener(
        "change",
        handleMotionPreferenceChange,
      );
    };
  }, [hasCarousel]);

  useEffect(() => {
    if (
      !hasCarousel ||
      !isPlaying ||
      isPointerInside ||
      isFocusInside
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % newsItems.length);
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [hasCarousel, isFocusInside, isPlaying, isPointerInside, newsItems.length]);

  function showSlide(index: number) {
    const normalizedIndex =
      (index + newsItems.length) % newsItems.length;
    const nextItem = newsItems[normalizedIndex];

    setCurrentIndex(normalizedIndex);
    if (nextItem) {
      setAnnouncement(
        `${normalizedIndex + 1}번째 주요 소식: ${nextItem.title}`,
      );
    }
  }

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
          ? "주요 소식 자동 넘김을 시작했습니다."
          : "주요 소식 자동 넘김을 멈췄습니다.",
      );
      return next;
    });
  }

  return (
    <section
      aria-labelledby="home-heading"
      aria-roledescription={hasCarousel ? "캐러셀" : undefined}
      className="border-b border-hero-on-dark/20 bg-hero-night text-hero-on-dark"
      onBlur={handleBlur}
      onFocusCapture={() => setIsFocusInside(true)}
      onPointerEnter={() => setIsPointerInside(true)}
      onPointerLeave={() => setIsPointerInside(false)}
    >
      <div className="mx-auto grid min-h-[39rem] w-full max-w-site lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="flex min-w-0 flex-col justify-between px-page py-14 sm:px-page-wide sm:py-18 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-small font-bold text-sun-soft">
              장애인거주시설
            </p>
            <h1
              id="home-heading"
              className="mt-4 text-hero font-bold text-hero-on-dark sm:text-hero-lg"
            >
              샬롬의 집
            </h1>

            {activeNewsItem ? (
              <article
                key={activeNewsItem.id}
                aria-label={`${currentIndex + 1} / ${newsItems.length}`}
                aria-roledescription="슬라이드"
                className="animate-hero-enter mt-9 border-l-4 border-sun-soft pl-5 sm:pl-7"
                role="group"
              >
                <p className="text-small font-bold text-sun-soft">
                  {activeNewsItem.categoryLabel} · {activeNewsItem.publishedAtLabel}
                </p>
                <h2 className="mt-3 max-w-2xl text-title font-bold text-hero-on-dark sm:text-display">
                  {activeNewsItem.title}
                </h2>
                <p className="mt-4 max-w-2xl text-body text-hero-muted">
                  {activeNewsItem.summary}
                </p>
              </article>
            ) : (
              <div className="mt-9 max-w-2xl border-l-4 border-sun-soft pl-5 sm:pl-7">
                <p className="text-title font-bold leading-snug text-hero-on-dark sm:text-display sm:leading-tight">
                  지체 및 지적 장애인이 함께 생활하는 공간입니다.
                </p>
                <p className="mt-5 max-w-xl text-body text-hero-muted">
                  홈페이지에서 시설 정보, 생활이야기, 소식과 참여 방법을 확인할
                  수 있습니다.
                </p>
              </div>
            )}
          </div>

          <div className="mt-10">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-hero-on-dark px-6 py-3 text-base font-bold text-hero-night transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-sun-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                href={activeNewsItem?.href ?? "/about"}
              >
                {activeNewsItem ? "소식 읽기" : "시설소개 보기"}
              </Link>
              <Link
                className="inline-flex min-h-12 items-center gap-2 px-2 py-3 text-base font-bold text-hero-on-dark underline decoration-hero-on-dark/60 underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-sun-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                href={activeNewsItem ? "/news" : "/life"}
              >
                {activeNewsItem ? "전체 소식 보기" : "생활이야기 보기"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {hasCarousel ? (
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-hero-on-dark/25 pt-5">
                <div aria-label="주요 소식 선택" className="flex items-center gap-2">
                  {newsItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`${index + 1}번째 주요 소식 보기: ${item.title}`}
                      aria-pressed={currentIndex === index}
                      className={`grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark ${
                        currentIndex === index
                          ? "bg-hero-on-dark text-hero-night"
                          : "border border-hero-on-dark/50 text-hero-on-dark hover:bg-hero-on-dark/15"
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
                    aria-label="이전 주요 소식"
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-hero-on-dark/50 text-xl font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    onClick={() => showSlide(currentIndex - 1)}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    type="button"
                    aria-label="다음 주요 소식"
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-hero-on-dark/50 text-xl font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    onClick={() => showSlide(currentIndex + 1)}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    aria-label={isPlaying ? "자동 넘김 정지" : "자동 넘김 재생"}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hero-on-dark/50 px-4 text-sm font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark hover:text-hero-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                    onClick={toggleAutoPlay}
                  >
                    <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
                    <span>{isPlaying ? "정지" : "재생"}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside
          aria-labelledby="home-quick-links-heading"
          className="border-t border-hero-night/20 bg-sun-soft px-page py-10 text-hero-night sm:px-page-wide lg:border-l lg:border-t-0 lg:py-16"
        >
          <p className="text-small font-bold text-hero-clay">빠른 안내</p>
          <h2
            id="home-quick-links-heading"
            className="mt-3 text-heading font-bold text-hero-night"
          >
            필요한 정보를 바로 찾으세요
          </h2>
          <ol className="mt-8 border-t border-hero-night/35">
            {quickLinks.map((item) => (
              <li key={item.href} className="border-b border-hero-night/35">
                <Link
                  className="group grid min-h-24 grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-4 text-hero-night transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-clay"
                  href={item.href}
                >
                  <span className="text-small font-bold text-hero-clay">
                    {item.number}
                  </span>
                  <span>
                    <span className="block text-base font-bold">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-small text-hero-night/75">
                      {item.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-xl font-bold transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
