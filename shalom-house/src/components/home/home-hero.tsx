import Link from "next/link";

import { HomeHeroMedia } from "@/components/home/home-hero-media";
import { LineIcon, type LineIconName } from "@/components/ui/line-icon";

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
  const facilityLinks: readonly { href: string; title: string; text: string; icon: LineIconName }[] = [
    { href: "/about/people", title: "함께하는 사람들", text: "직원의 역할과 담당 업무", icon: "heart-handshake" },
    { href: "/about/spaces", title: "생활공간", text: "시설의 공간과 쓰임", icon: "building" },
    { href: "/about/directions", title: "찾아오시는 길", text: "주소와 방문 전 문의", icon: "map-pin" },
  ];

  return (
    <section aria-labelledby="home-heading" className="bg-surface-subtle pt-5 sm:pt-8">
      <div
        className={`mx-auto grid max-w-site px-page sm:px-page-wide ${image ? "lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]" : "md:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]"}`}
      >
        <div className="relative flex flex-col justify-center overflow-hidden border-t-4 border-accent bg-primary px-7 py-7 text-primary-foreground sm:min-h-[25rem] sm:px-11 sm:py-10 lg:min-h-[28rem] lg:px-14">
          <div
            className="absolute -right-16 -top-20 size-64 rounded-full border border-primary-foreground/10"
            aria-hidden="true"
          />
          <div
            className="absolute -right-5 -top-8 size-32 rounded-full border border-primary-foreground/10"
            aria-hidden="true"
          />
          <p className="relative text-small font-semibold tracking-[0.045em] text-primary-foreground/78">
            장애인거주시설 공식 홈페이지
          </p>
          <h1
            id="home-heading"
            className="text-safe-wrap relative mt-4 text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.045em] sm:mt-5 sm:text-[3.5rem] lg:text-[4rem]"
          >
            {siteName}
          </h1>
          <p className="text-safe-wrap relative mt-5 max-w-md text-[1.125rem] leading-8 text-primary-foreground/92 sm:mt-7">
            {description}
          </p>
          <p className="text-safe-wrap relative mt-3 hidden max-w-md text-small leading-7 text-primary-foreground/70 sm:block">
            시설 정보, 생활 기록, 참여 방법과 방문 안내를 한곳에서 확인할 수 있습니다.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-5">
            <Link
              href="/about"
              className="inline-flex min-h-13 items-center justify-center gap-2 bg-surface px-5 text-small font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface sm:px-7"
            >
              시설 알아보기
              <LineIcon name="arrow-right" size={18} />
            </Link>
            <Link
              href="/about/directions"
              className="inline-flex min-h-13 items-center justify-center gap-2 px-2 text-small font-semibold text-primary-foreground underline decoration-primary-foreground/45 underline-offset-8 transition-colors duration-[var(--motion-duration-fast)] hover:decoration-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface"
            >
              <LineIcon name="map-pin" size={19} />
              방문·문의 정보
            </Link>
          </div>
        </div>
        {image ? (
          <HomeHeroMedia key={image.src} image={image} />
        ) : (
          <nav aria-label="시설 주요 안내" className="bg-paper px-7 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
            <p className="text-small font-bold text-accent">시설 안내 바로가기</p>
            <h2 className="text-safe-wrap mt-2 hidden text-[1.65rem] font-extrabold tracking-[-0.025em] text-primary sm:block">
              필요한 정보를 먼저 확인하세요
            </h2>
            <ul className="mt-4 divide-y divide-paper-strong border-y border-paper-strong">
              {facilityLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex min-h-14 items-center gap-3 py-3 text-foreground underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-focus-ring sm:gap-4 sm:py-5"
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-accent sm:size-11">
                      <LineIcon name={item.icon} size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-bold group-hover:underline sm:text-xl">{item.title}</span>
                      <span className="mt-1 hidden text-small text-muted-foreground sm:block">{item.text}</span>
                    </span>
                    <LineIcon className="shrink-0" name="arrow-right" size={19} />
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
