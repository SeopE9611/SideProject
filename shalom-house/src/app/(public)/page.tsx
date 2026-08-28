import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel } from "@/features/news/news.types";
import type { PublicNewsPostSummary } from "@/features/news/news.types";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    number: "01",
    label: "시설 안내",
    description: "샬롬의 집을 소개합니다",
    href: "/about",
    borderClassName: "",
  },
  {
    number: "02",
    label: "생활 이야기",
    description: "함께하는 일상을 전합니다",
    href: "/life",
    borderClassName: "border-t border-border sm:border-l sm:border-t-0",
  },
  {
    number: "03",
    label: "함께하기",
    description: "자원봉사와 후원을 안내합니다",
    href: "/support",
    borderClassName: "border-t border-border lg:border-l lg:border-t-0",
  },
  {
    number: "04",
    label: "새 소식",
    description: "공지와 활동 소식을 확인합니다",
    href: "/news",
    borderClassName:
      "border-t border-border sm:border-l lg:border-t-0",
  },
] as const;

type ActivityKind = "meal" | "outing" | "space";

type ActivityCard = {
  number: string;
  category: string;
  title: string;
  description: string;
  kind: ActivityKind;
  imageSrc: string | null;
  imageAlt: string;
  cardClassName: string;
  gridClassName: string;
  mediaClassName: string;
  mediaBorderClassName: string;
};

const activityCards: readonly ActivityCard[] = [
  {
    number: "01",
    category: "자원봉사",
    title: "함께 준비하는 점심",
    description:
      "평일 점심 식사 준비를 돕는 손길이 모여 따뜻한 한 끼를 만듭니다.",
    kind: "meal",
    imageSrc: null,
    imageAlt: "샬롬의 집 점심 식사 준비 활동",
    cardClassName: "lg:col-span-7",
    gridClassName: "",
    mediaClassName: "min-h-56 bg-home-sun",
    mediaBorderClassName: "border-t",
  },
  {
    number: "02",
    category: "외부 활동",
    title: "집 밖에서 만나는 하루",
    description:
      "나들이를 통해 새로운 장소를 만나고 지역사회에서 다양한 경험을 나눕니다.",
    kind: "outing",
    imageSrc: null,
    imageAlt: "샬롬의 집 나들이와 외부 활동",
    cardClassName: "lg:col-span-5",
    gridClassName: "",
    mediaClassName: "min-h-56 bg-home-sky",
    mediaBorderClassName: "border-t",
  },
  {
    number: "03",
    category: "생활 공간",
    title: "더 편안하게 가꾸는 공간",
    description:
      "매일 머무는 생활 공간을 안전하고 편안하게 바꾸는 활동을 이어 왔습니다.",
    kind: "space",
    imageSrc: null,
    imageAlt: "안전하고 편안하게 가꾼 샬롬의 집 생활 공간",
    cardClassName: "lg:col-span-12",
    gridClassName: "sm:grid-cols-[1.08fr_0.92fr]",
    mediaClassName: "min-h-64 bg-home-coral sm:min-h-[22rem]",
    mediaBorderClassName: "border-t sm:border-l sm:border-t-0",
  },
];

type SocialPreviewSlot = {
  number: string;
  label: string;
  imageSrc: string | null;
  imageAlt: string;
  className: string;
  colorClassName: string;
};

const socialPreviewSlots: readonly SocialPreviewSlot[] = [
  {
    number: "01",
    label: "함께하는 생활",
    imageSrc: null,
    imageAlt: "샬롬의 집에서 함께하는 생활 모습",
    className: "col-span-2 min-h-44 sm:min-h-52",
    colorClassName: "bg-home-sun",
  },
  {
    number: "02",
    label: "일상의 활동",
    imageSrc: null,
    imageAlt: "샬롬의 집 일상 활동 모습",
    className: "min-h-44",
    colorClassName: "bg-home-sky",
  },
  {
    number: "03",
    label: "편안한 공간",
    imageSrc: null,
    imageAlt: "샬롬의 집의 편안한 생활 공간",
    className: "min-h-44",
    colorClassName: "bg-home-coral",
  },
];

const publishedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

async function getHomeNewsPosts(): Promise<readonly PublicNewsPostSummary[]> {
  try {
    const posts = await getNewsRepository().listPublished({ limit: 6 });
    return posts.filter((post) => !post.isDemo).slice(0, 3);
  } catch (error) {
    console.error("홈 최근 소식을 불러오지 못했습니다.", error);
    return [];
  }
}

function ActivityArtwork({ kind }: { kind: ActivityKind }) {
  if (kind === "meal") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        className="size-36 sm:size-44"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="104" r="52" />
        <circle cx="100" cy="104" r="31" opacity="0.35" />
        <path d="M39 46v116M25 46v43c0 13 28 13 28 0V46M161 46v116M161 46c20 18 20 48 0 64" />
      </svg>
    );
  }

  if (kind === "outing") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        className="size-36 sm:size-44"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="145" cy="48" r="22" />
        <path d="M14 145c34-60 57-62 85-24s46 34 87-38" />
        <path d="M18 174c38-43 73-45 104-16 19 18 39 19 64 7" opacity="0.4" />
        <path d="m41 103 18-24 16 20 24-37 27 42" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="size-36 sm:size-44"
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="25" y="25" width="150" height="150" rx="8" />
      <path d="M100 25v150M25 100h150" opacity="0.45" />
      <path d="M48 143h104M61 143v-25h78v25" />
      <circle cx="58" cy="59" r="11" />
      <path d="M136 75c-15-20-34-8-34 8 0 19 34 33 34 33s34-14 34-33c0-16-19-28-34-8Z" />
    </svg>
  );
}

function ActivityMedia({ activity }: { activity: ActivityCard }) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden border-border text-home-ink ${activity.mediaBorderClassName} ${activity.mediaClassName}`}
    >
      {activity.imageSrc ? (
        <Image
          fill
          sizes="(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw"
          src={activity.imageSrc}
          alt={activity.imageAlt}
          className="object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center p-8 opacity-70">
          <ActivityArtwork kind={activity.kind} />
        </div>
      )}
    </div>
  );
}

function SocialPreview({ slot }: { slot: SocialPreviewSlot }) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-hero-on-dark/15 text-home-ink ${slot.className} ${slot.colorClassName}`}
    >
      {slot.imageSrc ? (
        <>
          <Image
            fill
            sizes="(min-width: 1024px) 24vw, 50vw"
            src={slot.imageSrc}
            alt={slot.imageAlt}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-home-ink/75 via-transparent to-transparent" />
          <p className="text-safe-wrap absolute bottom-5 left-5 right-5 font-bold text-hero-on-dark">
            {slot.label}
          </p>
        </>
      ) : (
        <div
          aria-hidden="true"
          className="flex size-full flex-col justify-between p-5 sm:p-6"
        >
          <span className="text-small font-bold">{slot.number}</span>
          <span className="text-safe-wrap text-balance text-title font-bold">
            {slot.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default async function Home() {
  const newsPosts = await getHomeNewsPosts();

  return (
    <>
      <HomeHero />

      <nav
        aria-labelledby="home-quick-links-heading"
        className="relative z-10 mx-auto -mt-11 w-full max-w-site px-page sm:px-page-wide"
      >
        <h2 id="home-quick-links-heading" className="sr-only">
          자주 찾는 안내
        </h2>
        <ul className="grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <li key={item.href} className={item.borderClassName}>
              <Link
                className="group grid min-h-28 grid-cols-[3rem_1fr_auto] items-center gap-4 px-5 py-5 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring"
                href={item.href}
              >
                <span className="grid size-11 place-items-center rounded-full bg-home-cream text-small font-bold text-primary">
                  {item.number}
                </span>
                <span>
                  <span className="text-safe-wrap block text-base font-bold">
                    {item.label}
                  </span>
                  <span className="text-safe-wrap mt-1 block text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-xl font-bold text-primary transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section
        aria-labelledby="home-life-heading"
        className="bg-surface pb-20 pt-24 sm:pb-24 sm:pt-28"
      >
        <div className="mx-auto w-full max-w-site px-page sm:px-page-wide">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-small font-bold text-accent">샬롬의 일상</p>
              <h2
                id="home-life-heading"
                className="text-safe-wrap mt-3 max-w-3xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                같이 먹고, 걷고, 쉬는 하루
              </h2>
            </div>
            <div className="lg:justify-self-end">
              <p className="text-safe-wrap max-w-xl text-pretty text-body text-muted-foreground">
                특별한 행사가 아니어도 괜찮습니다. 함께 보내는 평범한 시간이
                샬롬의 집 이야기가 됩니다.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/life"
              >
                생활이야기 전체 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            {activityCards.map((activity) => (
              <article
                key={activity.number}
                className={`overflow-hidden rounded-panel border border-border bg-surface shadow-card ${activity.cardClassName}`}
              >
                <div className={`grid h-full ${activity.gridClassName}`}>
                  <div className="flex min-h-[17rem] flex-col justify-between p-7 sm:p-9">
                    <div>
                      <div className="flex items-center gap-3 text-small font-bold text-primary">
                        <span>{activity.number}</span>
                        <span className="h-px w-10 bg-primary/40" />
                        <span>{activity.category}</span>
                      </div>
                      <h3 className="text-safe-wrap mt-5 max-w-lg text-balance text-title font-bold text-foreground sm:text-display">
                        {activity.title}
                      </h3>
                    </div>
                    <p className="text-safe-wrap mt-6 max-w-xl text-pretty text-body text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <ActivityMedia activity={activity} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {newsPosts.length > 0 ? (
        <section
          aria-labelledby="home-news-heading"
          className="bg-home-cream py-20 sm:py-24"
        >
          <div className="mx-auto grid w-full max-w-site gap-12 px-page sm:px-page-wide lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div>
              <p className="text-small font-bold text-primary">최근 소식</p>
              <h2
                id="home-news-heading"
                className="text-safe-wrap mt-3 text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                샬롬의 집에서 전하는 이야기
              </h2>
              <Link
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-base font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href="/news"
              >
                전체 소식 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul className="border-t-2 border-foreground">
              {newsPosts.map((post) => (
                <li key={post.id} className="border-b border-border-strong">
                  <article className="grid gap-4 py-7 sm:grid-cols-[7rem_1fr_auto] sm:items-start sm:gap-6">
                    <p className="text-small font-bold text-primary">
                      {getNewsCategoryLabel(post.category)}
                    </p>
                    <div>
                      <h3 className="text-heading font-bold text-foreground">
                        <Link
                          className="text-safe-wrap inline-flex min-h-11 items-center gap-2 underline decoration-border-strong underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                          <span aria-hidden="true">→</span>
                        </Link>
                      </h3>
                      <p className="text-safe-wrap mt-2 max-w-2xl text-pretty text-body text-muted-foreground">
                        {post.summary}
                      </p>
                    </div>
                    <time
                      dateTime={post.publishedAt}
                      className="text-small text-muted-foreground sm:text-right"
                    >
                      {publishedDateFormatter.format(new Date(post.publishedAt))}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section
          aria-labelledby="home-news-heading"
          className="bg-home-cream py-20 sm:py-24"
        >
          <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-surface shadow-card lg:grid-cols-[1fr_0.95fr]">
            <div className="px-7 py-12 sm:px-12 sm:py-16 lg:px-14">
              <p className="text-small font-bold text-primary">공식 채널</p>
              <h2
                id="home-news-heading"
                className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold text-foreground sm:text-display-lg"
              >
                새로운 일상은 인스타그램에서 전합니다
              </h2>
              <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-muted-foreground">
                사진과 활동 기록이 연결되면 이 공간에서 샬롬의 집의 최근
                이야기를 이어서 볼 수 있습니다.
              </p>
              <a
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-control bg-home-ink px-6 py-3 text-base font-bold text-hero-on-dark transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href={siteConfig.instagram}
              >
                공식 인스타그램 보기
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="grid min-h-[24rem] grid-cols-2 gap-3 bg-home-ink p-5 sm:gap-4 sm:p-7 lg:border-l lg:border-border">
              {socialPreviewSlots.map((slot) => (
                <SocialPreview key={slot.number} slot={slot} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        aria-labelledby="home-together-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-site overflow-hidden rounded-panel border border-border bg-home-ink lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-7 py-12 text-hero-on-dark sm:px-12 sm:py-16 lg:px-14">
            <p className="text-small font-bold text-home-sun">함께하기</p>
            <h2
              id="home-together-heading"
              className="text-safe-wrap mt-4 max-w-xl text-balance text-display font-bold sm:text-display-lg"
            >
              샬롬의 하루에 마음을 더해주세요
            </h2>
            <p className="text-safe-wrap mt-5 max-w-xl text-pretty text-body text-hero-muted">
              자원봉사와 후원 안내, 공개된 운영 자료를 한곳에서 확인할 수
              있습니다.
            </p>
          </div>

          <div className="grid bg-surface sm:grid-cols-2 lg:grid-cols-1">
            <Link
              className="group flex min-h-40 items-center justify-between gap-6 border-b border-border px-7 py-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring sm:border-b-0 sm:border-r lg:border-b lg:border-r-0"
              href="/support"
            >
              <span>
                <span className="text-small font-bold text-accent">01 함께하기</span>
                <span className="text-safe-wrap mt-2 block text-heading font-bold">
                  자원봉사와 후원 안내
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-2xl font-bold transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              className="group flex min-h-40 items-center justify-between gap-6 px-7 py-7 text-foreground transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-focus-ring"
              href="/transparency"
            >
              <span>
                <span className="text-small font-bold text-primary">02 정보공개</span>
                <span className="text-safe-wrap mt-2 block text-heading font-bold">
                  운영 및 후원 공개자료
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-2xl font-bold transition-transform duration-[var(--motion-duration-fast)] ease-standard group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
