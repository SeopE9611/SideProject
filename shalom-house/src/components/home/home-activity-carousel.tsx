"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LineIcon } from "@/components/ui/line-icon";

type HomeActivitySlide = {
  slug: string;
  title: string;
  category: string;
  altText: string;
  dateLabel: string;
  activityDate: string;
};

type HomeActivityCarouselProps = {
  items: readonly HomeActivitySlide[];
};

export function HomeActivityCarousel({ items }: HomeActivityCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex];

  if (!activeItem) return null;

  if (items.length < 3) {
    return (
      <ul className={`grid gap-6 ${items.length === 2 ? "md:grid-cols-2" : "max-w-4xl"}`}>
        {items.map((item) => (
          <li key={item.slug}>
            <article>
              <Link
                className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href={`/life/gallery/${item.slug}`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-primary-soft">
                  <Image
                    alt={item.altText}
                    className="object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.015]"
                    fill
                    sizes={items.length === 2 ? "(max-width: 767px) 100vw, 50vw" : "100vw"}
                    src={`/api/gallery/${item.slug}/media`}
                    unoptimized
                  />
                </div>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small font-semibold text-accent">
                  <span>{item.category}</span>
                  <time className="text-muted-foreground" dateTime={item.activityDate}>
                    {item.dateLabel}
                  </time>
                </p>
                <h3 className="text-safe-wrap mt-2 text-xl font-bold leading-snug group-hover:text-primary group-hover:underline">
                  {item.title}
                </h3>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    );
  }

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + items.length) % items.length);
  };

  return (
    <div
      role="group"
      aria-label="활동 기록 슬라이드"
      className="grid overflow-hidden border border-border bg-surface lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]"
    >
      <Link
        className="group relative block min-h-72 overflow-hidden bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring sm:min-h-[30rem]"
        href={`/life/gallery/${activeItem.slug}`}
      >
        <Image
          alt={activeItem.altText}
          className="object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.015]"
          fill
          key={activeItem.slug}
          sizes="(max-width: 1023px) 100vw, 64vw"
          src={`/api/gallery/${activeItem.slug}/media`}
          unoptimized
        />
      </Link>
      <div className="flex min-h-72 flex-col justify-between bg-primary px-7 py-8 text-primary-foreground sm:p-10 lg:min-h-[30rem]">
        <div aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-between gap-4">
            <p className="text-small font-bold text-sun-soft">{activeItem.category}</p>
            <p className="text-small tabular-nums text-primary-foreground/70">
              {String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </p>
          </div>
          <h3 className="text-safe-wrap mt-8 text-[1.75rem] leading-snug font-extrabold tracking-[-0.025em] sm:text-[2rem]">
            <Link
              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
              href={`/life/gallery/${activeItem.slug}`}
            >
              {activeItem.title}
            </Link>
          </h3>
          <p className="mt-5 inline-flex items-center gap-2 text-small text-primary-foreground/74">
            <LineIcon name="calendar" size={18} />
            <time dateTime={activeItem.activityDate}>{activeItem.dateLabel}</time>
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-primary-foreground/20 pt-6">
          <Link
            className="inline-flex min-h-11 items-center gap-2 font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-3"
            href={`/life/gallery/${activeItem.slug}`}
          >
            기록 자세히 보기
            <LineIcon name="arrow-right" size={18} />
          </Link>
          <div className="flex gap-2">
            <button
              aria-label="이전 활동 기록"
              className="inline-flex size-12 items-center justify-center rounded-full border border-primary-foreground/45 transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-3"
              onClick={() => move(-1)}
              type="button"
            >
              <LineIcon name="chevron-left" />
            </button>
            <button
              aria-label="다음 활동 기록"
              className="inline-flex size-12 items-center justify-center rounded-full border border-primary-foreground/45 transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-3"
              onClick={() => move(1)}
              type="button"
            >
              <LineIcon name="chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
