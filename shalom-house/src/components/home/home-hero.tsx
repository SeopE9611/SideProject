import Image from "next/image";
import Link from "next/link";

type HomeHeroProps = {
  siteName: string;
  description: string;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    caption: string;
    href?: string;
  };
};

export function HomeHero({ siteName, description, image }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-heading" className="mx-auto max-w-site px-page pt-6 sm:px-page-wide sm:pt-8">
      <div
        className={`grid overflow-hidden bg-primary text-primary-foreground ${image ? "lg:grid-cols-[0.9fr_1.1fr]" : "lg:grid-cols-[1.3fr_1fr]"}`}
      >
        <div className="flex flex-col justify-center px-7 py-9 sm:px-10 sm:py-12 lg:px-12">
          <p className="text-small font-medium tracking-wide text-primary-foreground/75">장애인거주시설</p>
          <h1
            id="home-heading"
            className="text-safe-wrap mt-4 text-[2.75rem] font-bold leading-[1.13] tracking-[-0.045em] sm:text-[3.5rem] lg:text-[4rem]"
          >
            {siteName}
          </h1>
          <p className="text-safe-wrap mt-6 max-w-sm text-body leading-8 text-primary-foreground/85">{description}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center justify-center bg-surface px-3 text-small font-bold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface sm:px-6"
            >
              시설 알아보기
            </Link>
            <Link
              href="/life"
              className="inline-flex min-h-12 items-center justify-center border border-primary-foreground/40 px-3 text-small font-semibold text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface sm:px-6"
            >
              생활·프로그램
            </Link>
          </div>
        </div>
        {image ? (
          <figure className="relative min-w-0 bg-primary-hover">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              unoptimized
              loading="eager"
              fetchPriority="high"
              className="aspect-[3/2] h-full max-h-[28rem] w-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-primary/90 px-5 py-3 text-xs leading-5 text-primary-foreground sm:px-6">
              {image.href ? (
                <Link href={image.href} className="underline underline-offset-4">
                  {image.caption}
                </Link>
              ) : (
                image.caption
              )}
            </figcaption>
          </figure>
        ) : (
          <nav
            aria-label="시설 주요 안내"
            className="mx-7 mb-7 border-t border-primary-foreground/25 pt-4 sm:mx-10 lg:my-10 lg:ml-0 lg:mr-12 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <ul className="divide-y divide-primary-foreground/25">
              {[
                { href: "/about/people", title: "함께하는 사람들", text: "직원의 역할과 담당 업무" },
                { href: "/about/spaces", title: "생활공간", text: "시설의 공간과 쓰임" },
                { href: "/about/directions", title: "찾아오시는 길", text: "주소와 방문 전 문의" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-14 items-center justify-between gap-4 py-3 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-surface sm:py-5"
                  >
                    <span>
                      <span className="block text-body font-semibold sm:text-xl">{item.title}</span>
                      <span className="mt-1 hidden text-small text-primary-foreground/75 sm:block">{item.text}</span>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
