import Link from "next/link";
import { HomeHeroMedia, type HeroImage } from "@/components/home/home-hero-media";

type HomeHeroProps = { siteName: string; description: string; images: HeroImage[] };
export function HomeHero({ siteName, description, images }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-heading" className={`home-cover ${images.length ? "home-cover-with-photo" : ""}`}>
      <div className="home-cover-title">
      </div>
      {images.length ? <HomeHeroMedia images={images} /> : null}
      <div className="home-cover-note">
        <p className="text-safe-wrap">{description}</p>
        <Link href="/about" className="cover-link">
          시설 알아보기 <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <nav aria-label="빠른 안내" className="home-cover-index">
        <a href="#life-home-heading">
          생활 기록 <span aria-hidden="true">↓</span>
        </a>
        <Link href="/about/directions">
          방문 안내 <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/support">
          후원·참여 <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </section>
  );
}
