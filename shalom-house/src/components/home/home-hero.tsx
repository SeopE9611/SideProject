import Image from "next/image";
import Link from "next/link";

import { FixtureMediaPlaceholder } from "@/components/home/fixture-media-placeholder";
import type { HomeMedia } from "@/content/fixtures/home.fixture";

type HomeHeroProps = {
  siteName: string;
  facilityType: string;
  description: string;
  media: HomeMedia;
};

export function HomeHero({ siteName, facilityType, description, media }: HomeHeroProps) {
  return (
    <section className="overflow-hidden border-b border-border bg-background">
      <div className="mx-auto grid w-full max-w-site lg:grid-cols-12">
        <header className="flex flex-col justify-center px-page py-12 sm:px-page-wide sm:py-20 lg:col-span-5 lg:py-24 lg:pr-14">
          <div className="flex items-center gap-3 text-small font-bold text-accent"><span aria-hidden="true" className="h-px w-10 bg-accent" />{facilityType}</div>
          <h1 className="text-safe-wrap mt-5 text-balance text-display font-bold text-foreground sm:text-display-lg">
            {siteName}
          </h1>
          <p className="text-safe-wrap mt-5 max-w-2xl text-pretty text-body text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              className="inline-flex min-h-12 items-center bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href="/about"
            >
              시설소개
            </Link>
            <Link
              className="inline-flex min-h-12 items-center px-2 py-3 font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/about/directions"
            >
              찾아오시는 길
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-2 border-y border-border py-4 text-small"><div><dt className="text-muted-foreground">시설 유형</dt><dd className="mt-1 font-bold">{facilityType}</dd></div><div className="border-l border-border pl-5"><dt className="text-muted-foreground">소재지</dt><dd className="mt-1 font-bold">서울 강서구</dd></div></dl>
        </header>
        <figure className="relative bg-primary p-page sm:p-page-wide lg:col-span-7 lg:flex lg:flex-col lg:justify-center lg:px-14">
          {media.kind === "image" ? (
            <Image
              className="aspect-[3/2] h-auto w-full border border-white/30 object-cover"
              src={media.src}
              alt={media.alt}
              width={media.width}
              height={media.height}
              priority
            />
          ) : (
            <FixtureMediaPlaceholder label={media.label} description={media.description} />
          )}
          {media.caption ? (
            <figcaption className="text-safe-wrap mt-3 text-small text-white/75">{media.caption}</figcaption>
          ) : null}
        </figure>
      </div>
    </section>
  );
}
