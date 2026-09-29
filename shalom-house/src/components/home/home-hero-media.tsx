"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";

export type HeroImage = { src: string; alt: string; width: number; height: number; caption: string; href?: string };

export function HomeHeroMedia({ images }: { images: HeroImage[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const id = useId();
  const image = images[index];
  if (!image) return null;
  return (
    <div className="home-photo" role="region" aria-roledescription="캐러셀" aria-label="샬롬의 집 활동사진">
      <figure id={id}>
        <div className="home-photo-frame">
          {failed[image.src] ? (
            <p className="flex h-full items-center justify-center p-6 text-primary">
              사진을 표시하지 못했습니다.{" "}
              <Link className="institution-link ml-2" href="/life/gallery">
                목록 보기
              </Link>
            </p>
          ) : (
            <Image
              key={image.src}
              alt={image.alt}
              className="home-photo-image"
              fill
              onError={() => setFailed((current) => ({ ...current, [image.src]: true }))}
              loading="eager"
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="(max-width: 1023px) 100vw, 60vw"
              src={image.src}
              unoptimized
            />
          )}
        </div>
        <figcaption className="home-photo-caption" aria-live="polite" aria-atomic="true">
          <span className="text-safe-wrap">
            {image.href ? <Link href={image.href}>{image.caption}</Link> : image.caption}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </span>
        </figcaption>
      </figure>
      {images.length > 1 ? (
        <div className="home-photo-controls">
          <button
            type="button"
            aria-label="이전 활동사진"
            aria-controls={id}
            onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="다음 활동사진"
            aria-controls={id}
            onClick={() => setIndex((current) => (current + 1) % images.length)}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
