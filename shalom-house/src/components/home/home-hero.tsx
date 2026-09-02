import Image from "next/image";
import Link from "next/link";

import type { HomeMedia } from "@/content/fixtures/home.fixture";

type HomeHeroProps = {
  siteName: string;
  facilityType: string;
  address: string;
  phone: string;
  description: string;
  media: HomeMedia;
};

export function HomeHero({ siteName, facilityType, address, phone, description, media }: HomeHeroProps) {
  const content = (
    <header className="flex flex-col justify-center py-12 sm:py-16 lg:py-20">
      <p className="text-small font-bold tracking-[0.08em] text-accent">{facilityType}</p>
      <h1 className="text-safe-wrap mt-3 text-display font-bold text-foreground sm:text-display-lg">{siteName}</h1>
      <p className="text-safe-wrap mt-5 max-w-2xl text-body text-muted-foreground">{description}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-12 items-center rounded-control bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring" href="/about">시설소개</Link>
        <Link className="inline-flex min-h-12 items-center px-3 py-3 font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/directions">찾아오시는 길</Link>
      </div>
      <dl className="mt-9 grid max-w-3xl gap-5 rounded-card bg-surface p-5 shadow-card sm:grid-cols-[1.6fr_1fr] sm:p-6">
        <div><dt className="text-small font-bold text-muted-foreground">주소</dt><dd className="text-safe-wrap mt-1 text-body font-bold">{address}</dd></div>
        <div><dt className="text-small font-bold text-muted-foreground">대표 전화</dt><dd className="text-safe-wrap mt-1 text-body font-bold">{phone}</dd></div>
      </dl>
    </header>
  );

  return (
    <section className="bg-background">
      <div className={`mx-auto w-full max-w-site px-page sm:px-page-wide ${media.kind === "image" ? "grid gap-10 lg:grid-cols-12 lg:items-center" : ""}`}>
        {media.kind === "image" ? <div className="lg:col-span-5">{content}</div> : content}
        {media.kind === "image" ? (
          <figure className="pb-12 sm:pb-16 lg:col-span-7 lg:py-12">
            <Image className="aspect-[3/2] h-auto w-full rounded-panel object-cover" src={media.src} alt={media.alt} width={media.width} height={media.height} priority />
            {media.caption ? <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">{media.caption}</figcaption> : null}
          </figure>
        ) : null}
      </div>
    </section>
  );
}
