"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type HomeLifeStory = {
  slug: string;
  title: string;
  category: string;
  altText: string;
  dateLabel: string;
  activityDate: string;
  mediaSrc?: string;
  href?: string;
};

export function HomeLifeStories({ items }: { items: readonly HomeLifeStory[] }) {
  const regionId = useId();
  const filmstripRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef({ active: false, dragged: false, startX: 0, scrollLeft: 0 });
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateControls = useCallback(() => {
    const filmstrip = filmstripRef.current;
    if (!filmstrip) return;
    setCanScrollPrevious(filmstrip.scrollLeft > 1);
    setCanScrollNext(filmstrip.scrollLeft < filmstrip.scrollWidth - filmstrip.clientWidth - 1);
  }, []);

  useEffect(() => {
    const filmstrip = filmstripRef.current;
    if (!filmstrip) return;
    updateControls();
    const resizeObserver = new ResizeObserver(updateControls);
    resizeObserver.observe(filmstrip);
    return () => resizeObserver.disconnect();
  }, [items, updateControls]);

  const scroll = (direction: -1 | 1) => {
    const filmstrip = filmstripRef.current;
    if (!filmstrip) return;
    const card = filmstrip.querySelector<HTMLElement>("li");
    const gap = Number.parseFloat(getComputedStyle(filmstrip).columnGap) || 0;
    const distance = (card?.offsetWidth ?? filmstrip.clientWidth * 0.8) + gap;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    filmstrip.scrollBy({ left: direction * distance, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className="life-filmstrip-carousel">
      <div className="life-filmstrip-toolbar">
        <p className="life-filmstrip-help life-filmstrip-help-fine">
          마우스로 좌우로 드래그하거나 화살표 버튼을 사용해 보세요.
        </p>
        <p className="life-filmstrip-help life-filmstrip-help-coarse">
          사진을 좌우로 밀어 더 많은 생활 기록을 확인해 보세요.
        </p>
        <div className="life-filmstrip-controls">
          <button
            type="button"
            aria-label="이전 생활 기록"
            aria-controls={regionId}
            disabled={!canScrollPrevious}
            onClick={() => scroll(-1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="다음 생활 기록"
            aria-controls={regionId}
            disabled={!canScrollNext}
            onClick={() => scroll(1)}
          >
            →
          </button>
        </div>
      </div>
      <ul
        id={regionId}
        ref={filmstripRef}
        className="life-filmstrip"
        onScroll={updateControls}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          dragRef.current = {
            active: true,
            dragged: false,
            startX: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag.active || event.pointerType !== "mouse") return;
          const distance = event.clientX - drag.startX;
          if (!drag.dragged && Math.abs(distance) < 6) return;
          drag.dragged = true;
          event.currentTarget.scrollLeft = drag.scrollLeft - distance;
        }}
        onPointerUp={(event) => {
          if (dragRef.current.active && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragRef.current.active = false;
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (dragRef.current.dragged) {
            event.preventDefault();
            event.stopPropagation();
            dragRef.current.dragged = false;
          }
        }}
      >
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href ?? `/life/gallery/${item.slug}`}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) {
                  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                    behavior: reducedMotion ? "auto" : "smooth",
                  });
                }
              }}
            >
              <figure>
                <div className="life-filmstrip-photo">
                  <Image
                    src={item.mediaSrc ?? `/api/gallery/${item.slug}/media`}
                    alt={item.altText}
                    fill
                    unoptimized
                    sizes="(max-width: 767px) 80vw, 38vw"
                  />
                </div>
                <figcaption>
                  <p>
                    {item.category} <time dateTime={item.activityDate}>{item.dateLabel}</time>
                  </p>
                  <h3 className="text-safe-wrap">{item.title}</h3>
                </figcaption>
              </figure>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
