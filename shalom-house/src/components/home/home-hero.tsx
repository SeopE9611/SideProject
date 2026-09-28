import Link from "next/link";
import { HomeHeroMedia, type HeroImage } from "@/components/home/home-hero-media";

type HomeHeroProps = { siteName: string; description: string; images: HeroImage[] };

export function HomeHero({ siteName, description, images }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-heading" className="home-intro">
      <div className={`home-intro-inner ${images.length ? "" : "home-intro-text"}`}>
        <div className="home-intro-copy">
          <p className="eyebrow">장애인거주시설</p>
          <h1 id="home-heading">{siteName}</h1>
          <p className="home-intro-description text-safe-wrap">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link className="action-link" href="/about">
              시설 알아보기 <span aria-hidden="true">↗</span>
            </Link>
            <Link className="institution-link" href="/about/directions">
              찾아오시는 길
            </Link>
          </div>
          <a href="#life-home-heading" className="home-explore">
            생활사진 살펴보기 <span aria-hidden="true">↓</span>
          </a>
        </div>
        {images.length ? <HomeHeroMedia images={images} /> : null}
      </div>
    </section>
  );
}
