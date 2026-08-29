import Image from "next/image";
import Link from "next/link";

type HomeHeroProps = {
  siteName: string;
  facilityType: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number; caption: string };
};

export function HomeHero({ siteName, facilityType, description, image }: HomeHeroProps) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto grid w-full max-w-site gap-10 px-page py-12 sm:px-page-wide sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-12">
        <header className="border-t-4 border-primary pt-7 lg:col-span-7">
          <p className="text-small font-bold tracking-[0.08em] text-accent">{facilityType}</p>
          <h1 className="text-safe-wrap mt-4 text-balance text-display font-bold text-foreground sm:text-display-lg">{siteName}</h1>
          <p className="text-safe-wrap mt-5 max-w-2xl text-pretty text-body text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link className="inline-flex min-h-12 items-center bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring" href="/about">시설소개</Link>
            <Link className="inline-flex min-h-12 items-center px-2 py-3 font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/directions">찾아오시는 길</Link>
          </div>
        </header>
        <figure className="lg:col-span-5">
          <Image className="h-auto w-full border border-border object-cover" src={image.src} alt={image.alt} width={image.width} height={image.height} priority />
          <figcaption className="text-safe-wrap mt-3 text-small text-muted-foreground">{image.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
