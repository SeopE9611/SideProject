"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LineIcon } from "@/components/ui/line-icon";

type HomeHeroMediaProps = {
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
    caption: string;
    href?: string;
  };
};

export function HomeHeroMedia({ image }: HomeHeroMediaProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex min-h-40 flex-col justify-end bg-primary-soft px-7 py-8 text-primary sm:min-h-96 sm:px-10 lg:min-h-[28rem]">
        <span className="mb-auto inline-flex size-14 items-center justify-center rounded-full bg-surface text-accent">
          <LineIcon name="building" size={28} />
        </span>
        <p className="text-small font-bold text-accent">활동사진을 표시하지 못했습니다</p>
        <p className="text-safe-wrap mt-2 max-w-md text-xl font-bold leading-snug">
          시설 정보와 공개된 생활 기록은 각 안내에서 확인할 수 있습니다.
        </p>
        <Link className="institution-link mt-4 w-fit" href="/life/gallery">
          활동사진 목록 보기
          <LineIcon name="arrow-right" size={18} />
        </Link>
      </div>
    );
  }

  return (
    <figure className="group flex min-w-0 flex-col overflow-hidden bg-primary-hover">
      <div className="relative min-h-40 flex-1 sm:min-h-80 lg:min-h-0">
        <Image
          alt={image.alt}
          className="h-full w-full object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.015]"
          fill
          onError={() => setFailed(true)}
          preload
          sizes="(max-width: 1023px) 100vw, 58vw"
          src={image.src}
          unoptimized
        />
      </div>
      <figcaption className="text-safe-wrap bg-primary px-5 py-4 text-small leading-6 text-primary-foreground sm:px-7">
        <span className="mr-3 font-bold text-sun-soft">{image.href ? "최근 활동 기록" : "디자인 예시"}</span>
        {image.href ? (
          <Link href={image.href} className="underline underline-offset-4">
            {image.caption}
          </Link>
        ) : (
          image.caption
        )}
      </figcaption>
    </figure>
  );
}
