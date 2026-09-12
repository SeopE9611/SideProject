import Link from "next/link";

import { HomeHeroMedia } from "@/components/home/home-hero-media";

type HomeHeroProps = {
  siteName: string;
  description: string;
  image?: { src: string; alt: string; width: number; height: number; caption: string; href?: string };
};

export function HomeHero({ siteName, description, image }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-heading" className="border-b border-border bg-surface">
      <div className={`mx-auto max-w-site px-page py-12 sm:px-page-wide sm:py-18 ${image ? "grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16" : ""}`}>
        <div className="max-w-2xl">
          <p className="text-small font-bold tracking-[0.08em] text-accent">장애인거주시설</p>
          <h1 id="home-heading" className="text-safe-wrap mt-4 text-[clamp(2.9rem,7vw,5.5rem)] font-extrabold leading-none tracking-[-0.055em] text-primary">{siteName}</h1>
          <p className="text-safe-wrap mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{description}</p>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2">
            <Link className="institution-link min-h-11 py-2 font-bold" href="/about">시설 알아보기 →</Link>
            <Link className="min-h-11 py-2 font-semibold text-foreground underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/directions">찾아오시는 길</Link>
          </div>
        </div>
        {image ? <HomeHeroMedia key={image.src} image={image} /> : null}
      </div>
    </section>
  );
}
