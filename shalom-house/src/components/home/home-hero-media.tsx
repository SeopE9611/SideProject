"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type HomeHeroMediaProps = { image: { src: string; alt: string; width: number; height: number; caption: string; href?: string } };

export function HomeHeroMedia({ image }: HomeHeroMediaProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <p className="border-l-2 border-accent py-2 pl-4 text-small text-muted-foreground">활동사진을 표시하지 못했습니다. <Link className="institution-link" href="/life/gallery">활동사진 목록 보기</Link></p>;
  }

  return (
    <figure className="min-w-0 lg:pt-8">
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft sm:aspect-[16/10]">
        <Image alt={image.alt} className="object-cover" fill onError={() => setFailed(true)} preload sizes="(max-width: 1023px) 100vw, 58vw" src={image.src} unoptimized />
      </div>
      <figcaption className="text-safe-wrap mt-3 border-l border-border pl-4 text-small leading-6 text-muted-foreground">
        {image.href ? <Link href={image.href} className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-focus-ring">{image.caption}</Link> : image.caption}
      </figcaption>
    </figure>
  );
}
