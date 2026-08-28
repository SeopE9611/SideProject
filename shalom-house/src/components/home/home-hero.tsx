"use client";

import Link from "next/link";
import { useState } from "react";

const heroSlides = [
  {
    eyebrow: "장애인거주시설 샬롬의 집",
    title: "함께 살아가는 하루",
    description:
      "서로의 속도를 존중하며 식사하고, 쉬고, 이야기를 나누는 생활 공간입니다.",
    primaryLabel: "샬롬의 집 소개",
    primaryHref: "/about",
    secondaryLabel: "생활이야기 보기",
    secondaryHref: "/life",
    visualWord: "함께",
    visualTitle: "평범한 하루가 가장 소중한 이야기입니다.",
    visualCaption: "일상 · 관계 · 생활",
    visualClassName: "bg-home-sun text-home-ink",
  },
  {
    eyebrow: "지역사회와 잇는 경험",
    title: "집 밖에서 만나는 새로운 하루",
    description:
      "나들이와 외부 활동을 통해 다양한 장소와 사람을 만나고 경험을 넓혀 갑니다.",
    primaryLabel: "주요 활동 보기",
    primaryHref: "/life",
    secondaryLabel: "새 소식 보기",
    secondaryHref: "/news",
    visualWord: "일상",
    visualTitle: "걷고, 만나고, 함께 경험합니다.",
    visualCaption: "나들이 · 지역사회 · 경험",
    visualClassName: "bg-home-sky text-home-ink",
  },
  {
    eyebrow: "더 편안한 생활 공간",
    title: "생활에 맞춰 가꾸는 공간",
    description:
      "안전하고 편안한 일상을 위해 생활 공간을 살피고 필요한 변화를 이어 갑니다.",
    primaryLabel: "함께하는 방법",
    primaryHref: "/support",
    secondaryLabel: "정보공개 보기",
    secondaryHref: "/transparency",
    visualWord: "공간",
    visualTitle: "매일 머무는 곳을 더 편안하게.",
    visualCaption: "안전 · 편안함 · 변화",
    visualClassName: "bg-home-coral text-home-ink",
  },
] as const;

export function HomeHero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const activeSlide = heroSlides[currentIndex] ?? heroSlides[0];

  function showSlide(index: number) {
    const nextIndex = (index + heroSlides.length) % heroSlides.length;
    const nextSlide = heroSlides[nextIndex];

    setCurrentIndex(nextIndex);
    setAnnouncement(
      `${nextIndex + 1}번째 이야기: ${nextSlide?.title ?? ""}`,
    );
  }

  return (
    <section
      aria-label="샬롬의 집 주요 이야기"
      aria-roledescription="캐러셀"
      className="bg-home-cream px-page pb-16 pt-7 sm:px-page-wide sm:pb-20 sm:pt-10"
    >
      <div className="mx-auto w-full max-w-site overflow-hidden rounded-panel bg-home-ink shadow-elevated">
        <div className="grid lg:min-h-[36rem] lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
          <div className="flex min-w-0 flex-col justify-between px-6 py-9 text-hero-on-dark sm:px-10 sm:py-12 lg:px-14 lg:py-14">
            <article
              key={activeSlide.title}
              aria-label={`${currentIndex + 1} / ${heroSlides.length}`}
              aria-roledescription="슬라이드"
              className="animate-hero-enter max-w-3xl"
              role="group"
            >
              <p className="inline-flex rounded-full border border-hero-on-dark/30 px-4 py-2 text-small font-bold text-sun-soft">
                {activeSlide.eyebrow}
              </p>
              <h1 className="mt-7 max-w-2xl text-[clamp(2.75rem,6vw,5rem)] font-bold leading-[1.04] tracking-[-0.055em] text-hero-on-dark">
                {activeSlide.title}
              </h1>
              <p className="mt-6 max-w-2xl text-body text-hero-muted sm:text-xl sm:leading-9">
                {activeSlide.description}
              </p>
              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-control bg-home-sun px-6 py-3 text-base font-bold text-home-ink transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hero-on-dark"
                  href={activeSlide.primaryHref}
                >
                  {activeSlide.primaryLabel}
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center gap-2 px-3 py-3 text-base font-bold text-hero-on-dark underline decoration-hero-on-dark/60 underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-home-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  href={activeSlide.secondaryHref}
                >
                  {activeSlide.secondaryLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-hero-on-dark/25 pt-5">
              <div aria-label="주요 이야기 선택" className="flex items-center gap-2">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    aria-label={`${index + 1}번째 이야기 보기: ${slide.title}`}
                    aria-pressed={currentIndex === index}
                    className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors duration-[var(--motion-duration-fast)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark ${
                      currentIndex === index
                        ? "bg-hero-on-dark text-home-ink"
                        : "border border-hero-on-dark/40 text-hero-on-dark hover:bg-hero-on-dark/10"
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
                  aria-label="이전 주요 이야기"
                  className="grid size-12 place-items-center rounded-full border border-hero-on-dark/45 text-xl font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark hover:text-home-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  onClick={() => showSlide(currentIndex - 1)}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  aria-label="다음 주요 이야기"
                  className="grid size-12 place-items-center rounded-full bg-home-sun text-xl font-bold text-home-ink transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-hero-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-on-dark"
                  onClick={() => showSlide(currentIndex + 1)}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>

          <div
            className={`relative min-h-[27rem] overflow-hidden border-t border-home-ink/20 p-7 sm:p-10 lg:min-h-full lg:border-l lg:border-t-0 ${activeSlide.visualClassName}`}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="absolute inset-0 size-full opacity-30"
              viewBox="0 0 600 600"
              fill="none"
            >
              <circle
                cx="492"
                cy="104"
                r="136"
                stroke="currentColor"
                strokeWidth="46"
                opacity="0.2"
              />
              <path
                d="M-20 430C120 320 188 520 322 410C426 325 498 365 640 244"
                stroke="currentColor"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.24"
              />
              <path
                d="M-40 492C112 386 202 574 346 470C448 396 532 420 652 334"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.28"
              />
            </svg>

            <div className="relative flex h-full min-h-[22rem] flex-col justify-between lg:min-h-full">
              <div className="flex items-center justify-between gap-4 text-small font-bold">
                <span>{String(currentIndex + 1).padStart(2, "0")}</span>
                <span>SHALOM HOUSE</span>
              </div>

              <div>
                <p
                  aria-hidden="true"
                  className="text-[clamp(5rem,13vw,9.5rem)] font-bold leading-none tracking-[-0.08em] opacity-15"
                >
                  {activeSlide.visualWord}
                </p>
                <div className="mt-5 rounded-card border-2 border-home-ink bg-hero-on-dark/80 p-6 shadow-card backdrop-blur-sm sm:p-8">
                  <p className="text-small font-bold text-accent">
                    {activeSlide.visualCaption}
                  </p>
                  <p className="mt-3 text-title font-bold leading-snug text-home-ink">
                    {activeSlide.visualTitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
