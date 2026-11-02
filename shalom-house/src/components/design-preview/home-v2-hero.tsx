"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import stillLife from "@/content/fixtures/assets/home-still-life.png";
import landscape from "@/content/fixtures/assets/landscape.webp";
import square from "@/content/fixtures/assets/square.webp";
import styles from "./home-v2.module.css";

export function HomeV2Hero({ photo, introduction, lifeDescription }: {
  photo: boolean; introduction: string; lifeDescription: string;
}) {
  const slides = [
    { title: "샬롬의집", description: introduction, cta: "샬롬의집 알아보기", href: "/about", image: stillLife,
      alt: "붓과 수채화 종이를 배치한 AI 생성 테스트 이미지. 실제 시설·활동사진이 아닙니다.", label: "AI 생성 테스트 이미지 · 실제 기관 사진 아님", position: "65% center" },
    { title: "생활과 활동", description: lifeDescription, cta: "생활·활동 살펴보기", href: "/life", image: landscape,
      alt: "가로 비율과 크롭 확인용 도형 테스트 이미지. 실제 시설·활동사진이 아닙니다.", label: "가로형 도형 테스트 이미지 · 실제 기관 사진 아님", position: "center" },
    { title: "후원과 자원봉사", description: "후원과 자원봉사에 관한 안내와 문의 방법을 확인합니다.", cta: "참여 안내 살펴보기", href: "/support", image: square,
      alt: "정사각형 비율과 크롭 확인용 도형 테스트 이미지. 실제 시설·활동사진이 아닙니다.", label: "정사각형 도형 테스트 이미지 · 실제 기관 사진 아님", position: "center" },
  ];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Start only after the browser's motion preference is known.
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const pointerWasPlaying = useRef<boolean | null>(null);
  const playing = photo && motionAllowed && !paused;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMotionAllowed(!preference.matches);
      if (preference.matches) setPaused(true);
    };
    const visibility = () => setVisible(!document.hidden);
    update(); visibility();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || hovered || !visible) return;
    const timer = window.setInterval(() => setCurrent(index => (index + 1) % 3), 7500);
    return () => window.clearInterval(timer);
  }, [playing, hovered, visible, current]);

  function move(direction: number) {
    const index = (current + direction + slides.length) % slides.length;
    setPaused(true);
    setCurrent(index);
    setAnnouncement(`${index + 1} / 3, ${slides[index].title}`);
  }

  if (!photo) return (
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="v2-home-heading">
      <div className={styles.heroCopy}>
        <h1 id="v2-home-heading">샬롬의집</h1>
        <p className={styles.heroDescription}>{introduction}</p>
        <Link className={styles.primaryButton} href="/about">샬롬의집 알아보기 <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );

  return (
    <section className={styles.carousel} aria-label="샬롬의집 주요 안내" aria-roledescription="캐러셀"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}>
      <div className={`${styles.container} ${styles.heroControls}`}>
        <button type="button" disabled={!motionAllowed} aria-label={playing ? "슬라이드 자동 전환 일시정지" : "슬라이드 자동 전환 재생"}
          onPointerDown={() => { pointerWasPlaying.current = playing; }}
          onPointerCancel={() => { pointerWasPlaying.current = null; }}
          onClick={() => {
            setPaused(pointerWasPlaying.current === null ? !paused : pointerWasPlaying.current);
            pointerWasPlaying.current = null;
          }}>{playing ? "일시정지" : "재생"}</button>
        <button type="button" aria-label="이전 슬라이드" onClick={() => move(-1)}>←</button>
        <span className={styles.slideNumber} aria-hidden="true">{String(current + 1).padStart(2, "0")} / 03</span>
        <button type="button" aria-label="다음 슬라이드" onClick={() => move(1)}>→</button>
        <span className={styles.rotationNote}>{!motionAllowed ? "모션 제한 · 자동 전환 안 함" : paused ? "자동 전환 정지" : hovered ? "마우스 머무는 동안 정지" : "7.5초마다 전환"}</span>
      </div>
      <h1 className={styles.screenReaderOnly}>샬롬의집</h1>
      <div className={styles.slides} aria-live="off">
        {slides.map((slide, index) => (
          <div key={slide.href} className={`${styles.slide} ${index === current ? styles.slideActive : ""}`}
            role="group" aria-roledescription="슬라이드" aria-label={`${index + 1} / 3, ${slide.title}`}
            aria-hidden={index !== current} inert={index !== current}>
            <Image className={styles.slideImage} src={slide.image} alt={slide.alt} fill sizes="100vw"
              preload={index === 0} style={{ objectPosition: slide.position }} />
            <div className={styles.heroShade} aria-hidden="true" />
            <div className={`${styles.container} ${styles.slideContent}`}>
              <div className={styles.heroCopy}>
                <h2>{slide.title}</h2>
                <p className={styles.heroDescription}>{slide.description}</p>
                <Link className={styles.heroButton} href={slide.href} tabIndex={index === current ? 0 : -1}>
                  {slide.cta} <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <p className={styles.heroCaption}>{slide.label}</p>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.screenReaderOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
