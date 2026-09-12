import Image from "next/image";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { HomeLifeStories } from "@/components/home/home-life-stories";
import { isVisualFixtureEnabled, visualHomeImage } from "@/content/fixtures/visual.fixture";
import { siteConfig } from "@/config/site";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";
import { getNewsRepository } from "@/features/news/news.repository";
import { getProgramRepository } from "@/features/programs/program.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation, getPublicFacilityOverview } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { findPublicTransparencyDocuments } from "@/features/transparency/transparency.repository";
import { transparencyCategoryLabels } from "@/features/transparency/transparency.types";

export const metadata = createPublicPageMetadata("/");
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });

const visitorLinks = [
  { href: "/about", title: "시설을 이해하고 싶어요", description: "시설의 기본 정보와 운영 방향" },
  { href: "/life", title: "생활과 프로그램을 보고 싶어요", description: "일상생활, 프로그램과 공개 승인된 활동 기록" },
  { href: "/support", title: "함께하는 방법을 찾고 있어요", description: "후원, 자원봉사와 참여 문의" },
  { href: "/about/directions", title: "방문과 연락 방법이 궁금해요", description: "주소와 방문 문의" },
] as const;

export default async function Home() {
  const [overview, contact, [noticesResult, activitiesResult, galleryResult, programsResult, transparencyResult]] = await Promise.all([
    getPublicFacilityOverview(),
    getPublicContactInformation(),
    Promise.allSettled([
      getNewsRepository().searchPublished({ category: "notice", pageSize: 3 }),
      getNewsRepository().searchPublished({ category: "activity", pageSize: 2 }),
      findPublicGalleryItems(),
      getProgramRepository().listPublished({ limit: 3 }),
      findPublicTransparencyDocuments(),
    ]),
  ]);
  const isPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const notices = noticesResult.status === "fulfilled" ? noticesResult.value.items.filter((post) => isPreview || !post.isDemo) : [];
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value.items.filter((post) => isPreview || !post.isDemo) : [];
  const galleryItems = galleryResult.status === "fulfilled" ? galleryResult.value.slice(0, 4) : [];
  const programs = programsResult.status === "fulfilled" ? programsResult.value.slice(0, 3) : [];
  const documents = transparencyResult.status === "fulfilled" ? transparencyResult.value.slice(0, 3) : [];
  const visualFixtureEnabled = isVisualFixtureEnabled();
  const leadPhoto = !visualFixtureEnabled && galleryItems.length >= 4 ? galleryItems[0] : undefined;
  const heroImage = visualFixtureEnabled ? visualHomeImage : leadPhoto ? {
    src: `/api/gallery/${leadPhoto.slug}/media`, alt: leadPhoto.altText, width: leadPhoto.width, height: leadPhoto.height,
    caption: leadPhoto.title, href: `/life/gallery/${leadPhoto.slug}`,
  } : undefined;
  const lifeItems = visualFixtureEnabled || galleryItems.length < 4 ? galleryItems.slice(0, 3) : galleryItems.slice(1, 4);

  if (noticesResult.status === "rejected") console.error("홈 공지사항 조회 실패");
  if (activitiesResult.status === "rejected") console.error("홈 활동소식 조회 실패");
  if (galleryResult.status === "rejected") console.error("홈 활동사진 조회 실패");
  if (programsResult.status === "rejected") console.error("홈 프로그램 조회 실패");
  if (transparencyResult.status === "rejected") console.error("홈 자료공개 조회 실패");

  return (
    <div className="bg-surface">
      <HomeHero siteName={siteConfig.name} description={overview.pageDescription} image={heroImage} />

      <nav aria-label="방문 목적별 안내" className="mx-auto max-w-site px-page sm:px-page-wide">
        <ol className="grid border-b border-border lg:grid-cols-4">
          {visitorLinks.map((item, index) => (
            <li key={item.href} className="border-t border-border lg:border-t-0 lg:border-l lg:first:border-l-0">
              <Link className="group grid min-h-36 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-6 pr-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring lg:px-6 lg:first:pl-0" href={item.href}>
                <span className="text-small font-bold tabular-nums text-accent">{String(index + 1).padStart(2, "0")}</span>
                <span><span className="text-safe-wrap block text-lg font-bold text-primary group-hover:underline">{item.title}</span><span className="text-safe-wrap mt-2 block text-small leading-6 text-muted-foreground">{item.description}</span><span className="mt-3 block text-primary" aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="about-home-heading" className="mx-auto max-w-site px-page py-16 sm:px-page-wide sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
          <div><p className="text-small font-bold text-accent">About Shalom</p><h2 id="about-home-heading" className="text-safe-wrap mt-2 text-[1.9rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">샬롬의 집을 소개합니다</h2></div>
          <div>
            <p className="text-safe-wrap max-w-3xl text-[1.3rem] leading-9 font-semibold sm:text-[1.6rem] sm:leading-10">{overview.principlesDescription}</p>
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 border-t border-border pt-5 text-small font-bold text-primary">
              <li><Link className="institution-link min-h-11 py-2" href="/about">시설개요</Link></li>
              <li><Link className="institution-link min-h-11 py-2" href="/about/spaces">생활공간</Link></li>
              <li><Link className="institution-link min-h-11 py-2" href="/about/people">함께하는 사람들</Link></li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="life-home-heading" className="border-y border-border bg-surface-subtle py-14 sm:py-20">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-small font-bold text-accent">Life at Shalom</p><h2 id="life-home-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.6rem]">사진으로 만나는 일상</h2></div><Link className="institution-link min-h-11 py-2 text-small" href="/life/gallery">활동사진 전체보기 →</Link></div>
          {lifeItems.length ? <HomeLifeStories items={lifeItems.map((item) => ({ slug: item.slug, title: item.title, category: item.category, altText: item.altText, activityDate: item.activityDate, dateLabel: dateFormatter.format(new Date(item.activityDate)) }))} /> : galleryResult.status === "rejected" ? <p className="border-t border-border py-5 text-small text-muted-foreground" role="status">활동사진을 불러오지 못했습니다. <Link className="institution-link" href="/life/gallery">활동사진 목록에서 다시 확인</Link></p> : <p className="border-t border-border py-5 text-small text-muted-foreground">아직 공개된 활동사진이 없습니다.</p>}
        </div>
      </section>

      <section aria-labelledby="programs-home-heading" className="mx-auto max-w-site px-page py-16 sm:px-page-wide sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div><p className="text-small font-bold text-accent">Programs</p><h2 id="programs-home-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">프로그램 안내</h2><Link className="institution-link mt-5 min-h-11 py-2 text-small" href="/life/programs">전체 프로그램 보기 →</Link></div>
          {programs.length ? <ol className="border-t-2 border-primary">{programs.map((program, index) => <li key={program.slug} className="border-b border-border"><Link className="group grid min-h-28 grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-start gap-3 py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/life/programs/${program.slug}`}><span className="text-small tabular-nums text-accent">{String(index + 1).padStart(2, "0")}</span><span><span className="text-small font-bold text-accent">{program.category}</span><span className="text-safe-wrap mt-1 block text-xl font-bold group-hover:text-primary group-hover:underline">{program.title}</span>{program.summary ? <span className="text-safe-wrap mt-2 block text-small leading-7 text-muted-foreground">{program.summary}</span> : null}</span><span className="text-primary" aria-hidden="true">→</span></Link></li>)}</ol> : <div className="border-t-2 border-primary py-6"><p className="font-semibold">{programsResult.status === "rejected" ? "프로그램을 불러오지 못했습니다." : "현재 공개된 프로그램이 없습니다."}</p><Link className="institution-link mt-3 text-small" href="/life/programs">프로그램 목록에서 확인</Link></div>}
        </div>
      </section>

      <section aria-labelledby="news-home-heading" className="border-y border-border py-16 sm:py-20">
        <div className="mx-auto max-w-site px-page sm:px-page-wide"><p className="text-small font-bold text-accent">News</p><h2 id="news-home-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">샬롬의 집 소식</h2>
          {[...notices, ...activities].some((post) => post.isDemo) ? <p className="mt-2 text-xs text-muted-foreground">미리보기 · 아래 예시 소식은 레이아웃 검증용입니다.</p> : null}
          <div className="mt-9 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <section aria-labelledby="notices-heading"><div className="flex items-end justify-between border-b-2 border-primary pb-4"><h3 id="notices-heading" className="text-2xl font-extrabold">공지사항</h3><Link className="institution-link min-h-11 py-2 text-small" href="/news/notices">전체보기 →</Link></div>{notices.length ? <ul>{notices.map((post) => <li key={post.id} className="border-b border-border"><Link className="group grid min-h-20 gap-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}><time className="text-small tabular-nums text-muted-foreground" dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time><span className="text-safe-wrap font-semibold group-hover:text-primary group-hover:underline">{post.title}</span></Link></li>)}</ul> : <p className="border-b border-border py-5 text-small text-muted-foreground">{noticesResult.status === "rejected" ? "공지사항을 불러오지 못했습니다." : "아직 등록된 공지사항이 없습니다."}</p>}</section>
            <section aria-labelledby="activities-heading"><div className="flex items-end justify-between border-b border-border pb-4"><h3 id="activities-heading" className="text-2xl font-extrabold">활동소식</h3><Link className="institution-link min-h-11 py-2 text-small" href="/news/activities">전체보기 →</Link></div>{activities.length ? <div className="divide-y divide-border">{activities.map((post) => <article key={post.id} className={`grid gap-5 py-6 ${post.coverImage ? "sm:grid-cols-[10rem_minmax(0,1fr)]" : ""}`}>{post.coverImage ? <Link className="relative block aspect-[4/3] overflow-hidden bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}><Image alt={post.coverImage.altText} className="object-cover" fill sizes="10rem" src={post.coverImage.src} unoptimized /></Link> : null}<div><time className="text-small tabular-nums text-muted-foreground" dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time><h4 className="text-safe-wrap mt-2 text-xl font-bold leading-snug"><Link className="hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}>{post.title}</Link></h4>{post.summary && post.summary !== post.title ? <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">{post.summary}</p> : null}</div></article>)}</div> : <p className="border-b border-border py-5 text-small text-muted-foreground">{activitiesResult.status === "rejected" ? "활동소식을 불러오지 못했습니다." : "아직 등록된 활동소식이 없습니다."}</p>}</section>
          </div>
        </div>
      </section>

      <section aria-labelledby="together-heading" className="bg-paper"><div className="mx-auto grid max-w-site gap-8 px-page py-14 sm:px-page-wide sm:py-18 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16"><div><p className="text-small font-bold text-accent">Together</p><h2 id="together-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">함께하는 방법</h2></div><div className="grid border-y border-paper-strong sm:grid-cols-2 sm:divide-x sm:divide-paper-strong"><Link className="group min-h-40 py-7 pr-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring sm:pr-8" href="/support/donation"><span className="block text-2xl font-extrabold text-primary group-hover:underline">후원 안내</span><span className="text-safe-wrap mt-3 block text-small leading-7 text-muted-foreground">후원 방법과 영수증 문의를 확인합니다.</span><span className="mt-5 block font-bold text-primary">절차 확인 →</span></Link><Link className="group min-h-40 border-t border-paper-strong py-7 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring sm:border-t-0 sm:pl-8" href="/support/volunteer"><span className="block text-2xl font-extrabold text-primary group-hover:underline">자원봉사</span><span className="text-safe-wrap mt-3 block text-small leading-7 text-muted-foreground">참여 절차와 문의 안내를 확인합니다.</span><span className="mt-5 block font-bold text-primary">절차 확인 →</span></Link></div></div></section>

      <section aria-labelledby="transparency-home-heading" className="mx-auto max-w-site px-page py-16 sm:px-page-wide sm:py-20"><div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16"><div><p className="text-small font-bold text-accent">Trust &amp; Transparency</p><h2 id="transparency-home-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">자료공개</h2><p className="text-safe-wrap mt-4 text-small leading-7 text-muted-foreground">운영 및 후원 공개자료를 확인할 수 있습니다.</p><Link className="institution-link mt-4 min-h-11 py-2 text-small" href="/transparency">자료공개 전체보기 →</Link></div>{documents.length ? <ul className="border-t-2 border-primary">{documents.map((document) => <li key={document.slug} className="grid gap-3 border-b border-border py-5 sm:grid-cols-[7rem_minmax(0,1fr)_8rem] sm:items-baseline"><span className="text-small font-bold text-accent">{transparencyCategoryLabels[document.category]}</span><div><p className="text-safe-wrap font-bold">{document.title}</p><p className="text-safe-wrap mt-1 text-small text-muted-foreground">{document.periodLabel}</p></div><a className="institution-link min-h-11 py-2 text-small sm:justify-self-end" href={`/api/transparency/${document.slug}/document`} target="_blank" rel="noreferrer" aria-label={`${document.title} 문서 열기 (새 창)`}>문서 열기 →</a></li>)}</ul> : <div className="border-t-2 border-primary py-6"><p className="font-semibold">{transparencyResult.status === "rejected" ? "자료를 불러오지 못했습니다." : "현재 공개된 운영 자료가 없습니다."}</p><Link className="institution-link mt-3 text-small" href="/transparency">자료공개에서 확인</Link></div>}</div></section>

      <section aria-labelledby="visit-home-heading" className="border-t border-border bg-surface-subtle"><div className="mx-auto grid max-w-site gap-8 px-page py-14 sm:px-page-wide sm:py-18 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16"><div><p className="text-small font-bold text-accent">Visit</p><h2 id="visit-home-heading" className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.03em] text-primary sm:text-[2.4rem]">방문·연락 안내</h2></div><address className="not-italic"><p className="text-small text-muted-foreground">주소</p><p className="text-safe-wrap mt-2 text-[1.35rem] leading-8 font-bold sm:text-[1.7rem]">{contact.address}</p><p className="mt-7 text-small text-muted-foreground">대표전화</p><a className="mt-2 inline-flex min-h-11 items-center whitespace-nowrap text-[1.55rem] font-extrabold tabular-nums text-primary underline decoration-border-strong underline-offset-5 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring sm:text-[2rem]" href={createTelephoneHref(contact.phone)}>{contact.phone}</a><div className="mt-7"><Link className="institution-link min-h-11 py-2 font-bold" href="/about/directions">찾아오시는 길 →</Link></div></address></div></section>
    </div>
  );
}
