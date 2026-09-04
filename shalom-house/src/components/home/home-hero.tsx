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
    <section aria-labelledby="home-heading" className="border-b border-border bg-surface">
      <div
        className={`mx-auto grid max-w-site px-page py-6 sm:px-page-wide sm:py-8 ${image ? "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]" : "lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]"}`}
      >
        <div className="flex min-h-[26rem] flex-col justify-center border-t-4 border-accent bg-primary px-7 py-10 text-primary-foreground sm:px-11 lg:min-h-[31rem] lg:px-14">
          <p className="text-small font-semibold tracking-[0.04em] text-primary-foreground/78">장애인거주시설</p>
          <h1
            id="home-heading"
            className="text-safe-wrap mt-5 text-[2.75rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[3.5rem] lg:text-[4rem]"
          >
            {siteName}
          </h1>
          <p className="text-safe-wrap mt-7 max-w-md text-[1.125rem] leading-8 text-primary-foreground/88">
            {description}
          </p>
          <p className="text-safe-wrap mt-3 max-w-md text-small text-primary-foreground/68">
            기관 정보와 생활 기록, 참여 방법을 정확하게 안내합니다.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link
              href="/about"
              className="inline-flex min-h-13 items-center justify-center bg-surface px-4 text-small font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface sm:px-7"
            >
              시설 알아보기
            </Link>
            <Link
              href="/about/directions"
              className="inline-flex min-h-13 items-center justify-center border border-primary-foreground/45 px-4 text-small font-semibold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface sm:px-7"
            >
              방문 안내
            </Link>
          </div>
        </div>
        {image ? (
          <figure className="group relative min-w-0 overflow-hidden bg-primary-hover">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              unoptimized
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="aspect-[4/3] h-full w-full object-cover transition-transform duration-[var(--motion-duration-standard)] ease-standard group-hover:scale-[1.015] lg:aspect-auto"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-primary/94 px-5 py-4 text-small leading-6 text-primary-foreground sm:px-7">
              <span className="mr-3 font-bold text-sun-soft">최근 활동 기록</span>
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
          <nav aria-label="시설 주요 안내" className="bg-paper px-7 py-8 sm:px-10 lg:px-12 lg:py-12">
            <p className="text-small font-bold text-accent">먼저 확인할 정보</p>
            <ul className="mt-4 divide-y divide-paper-strong border-y border-paper-strong">
              {[
                { href: "/about/people", title: "함께하는 사람들", text: "직원의 역할과 담당 업무" },
                { href: "/about/spaces", title: "생활공간", text: "시설의 공간과 쓰임" },
                { href: "/about/directions", title: "찾아오시는 길", text: "주소와 방문 전 문의" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-16 items-center justify-between gap-4 py-4 text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring sm:py-5"
                  >
                    <span>
                      <span className="block text-body font-bold sm:text-xl">{item.title}</span>
                      <span className="mt-1 hidden text-small text-muted-foreground sm:block">{item.text}</span>
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
