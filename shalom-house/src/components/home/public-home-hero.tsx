"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HeroImage } from "./home-hero-media";
import styles from "./public-home.module.css";

export function PublicHomeHero({
  siteName,
  description,
  image,
}: {
  siteName: string;
  description: string;
  image?: HeroImage;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!image && !failed;
  return (
    <section className={`${styles.hero} ${hasImage ? "" : styles.heroWithoutImage}`} aria-labelledby="home-heading">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>기관소개</p>
        <h1 id="home-heading">{siteName}</h1>
        <p className={styles.heroDescription}>{description}</p>
        <Link href="/about" className={styles.primaryButton}>
          샬롬의집 알아보기 <span aria-hidden="true">↗</span>
        </Link>
        {failed && (
          <p role="status" className={styles.imageError}>
            사진을 표시하지 못했습니다. <Link href="/life/gallery">활동사진 목록 보기</Link>
          </p>
        )}
      </div>
      {hasImage && image && (
        <figure className={styles.heroFigure}>
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(min-width: 1200px) 52vw, 100vw"
            loading="eager"
            fetchPriority="high"
            unoptimized
            onError={() => setFailed(true)}
          />
          <figcaption>{image.href ? <Link href={image.href}>{image.caption}</Link> : image.caption}</figcaption>
        </figure>
      )}
    </section>
  );
}
