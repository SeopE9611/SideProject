import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/");

import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { homeFixture } from "@/content/fixtures/home.fixture";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel, type PublicNewsPostSummary } from "@/features/news/news.types";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
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

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
const arrowLink = `group flex min-h-12 items-center justify-between gap-4 py-3 font-bold transition-colors hover:text-primary ${focusClass}`;

export default async function Home() {
  const [newsPosts, contact] = await Promise.all([getHomeNewsPosts(), getPublicContactInformation()]);
  const featuredPost = newsPosts[0];
  const remainingNewsPosts = newsPosts.slice(1);
  const newsColumnClass = remainingNewsPosts.length === 0 ? "lg:col-span-4" : remainingNewsPosts.length === 1 ? "lg:col-span-5" : "lg:col-span-6";
  const lifeColumnClass = remainingNewsPosts.length === 0 ? "lg:col-span-8" : remainingNewsPosts.length === 1 ? "lg:col-span-7" : "lg:col-span-6";

  return (
    <>
      <section aria-labelledby="home-heading" className="bg-background">
        <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14 lg:py-16">
          <div className="grid border-y border-border-strong lg:grid-cols-12">
            <div className="py-10 lg:col-span-7 lg:border-r lg:border-border lg:pr-14">
              <p className="text-body font-bold text-accent">장애인거주시설</p>
              <h1 id="home-heading" className="text-safe-wrap mt-3 text-display-lg font-bold lg:text-hero">
                {siteConfig.name}
              </h1>
              <p className="text-safe-wrap mt-5 max-w-2xl text-body text-muted-foreground">{siteConfig.description}</p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                <Link className={`inline-flex min-h-12 items-center rounded-control bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover ${focusClass}`} href="/about">시설소개</Link>
                <Link className={`inline-flex min-h-12 items-center font-bold text-primary underline decoration-border-strong underline-offset-4 hover:text-primary-hover ${focusClass}`} href="/about/directions">찾아오시는 길</Link>
              </div>
              {homeFixture.heroMedia.kind === "image" ? (
                <Image className="mt-9 aspect-[3/2] w-full object-cover" src={homeFixture.heroMedia.src} alt={homeFixture.heroMedia.alt} width={homeFixture.heroMedia.width} height={homeFixture.heroMedia.height} priority />
              ) : null}
              {featuredPost ? (
                <div className="mt-8 bg-primary-soft px-5 py-4 sm:grid sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-4">
                  <p className="font-bold text-primary">최신 공지</p>
                  <Link className={`text-safe-wrap mt-1 block min-h-11 py-2 font-bold hover:text-primary sm:mt-0 ${focusClass}`} href={`/news/${featuredPost.slug}`}>{featuredPost.title}</Link>
                  <time className="text-small text-muted-foreground" dateTime={featuredPost.publishedAt}>{dateFormatter.format(new Date(featuredPost.publishedAt))}</time>
                </div>
              ) : null}
            </div>

            <div className="py-8 lg:col-span-5 lg:py-10 lg:pl-12">
              <h2 className="text-heading font-bold">주요 이용 안내</h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                {homeFixture.quickLinks.map((item) => (
                  <li key={item.href} className="border-b border-border">
                    <Link className={arrowLink} href={item.href}><span className="text-safe-wrap">{item.label}</span><span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></Link>
                  </li>
                ))}
              </ul>
              <dl className="mt-7 bg-accent-soft px-5 py-2">
                <div className="grid gap-1 border-b border-border py-4 sm:grid-cols-[6.5rem_1fr]"><dt className="font-bold text-muted-foreground">주소</dt><dd className="text-safe-wrap font-bold">{contact.address}</dd></div>
                <div className="grid gap-1 border-b border-border py-4 sm:grid-cols-[6.5rem_1fr]"><dt className="font-bold text-muted-foreground">대표 전화</dt><dd><a className={`inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 ${focusClass}`} href={createTelephoneHref(contact.phone)}>{contact.phone}</a></dd></div>
              </dl>
            </div>
          </div>

        </div>
      </section>

      <section aria-labelledby="information-heading" className="bg-surface py-14 sm:py-20">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className={newsColumnClass}>
              <header className="flex flex-wrap items-end justify-between gap-4 pb-5">
                <div><h2 id="information-heading" className="text-title font-bold sm:text-display">공지와 활동 소식</h2><p className="text-safe-wrap mt-2 text-muted-foreground">시설의 공식 공지와 공개 승인된 활동 소식입니다.</p></div>
                <Link className={`inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 ${focusClass}`} href="/news">전체보기</Link>
              </header>
              {remainingNewsPosts.length ? (
                <ul className="divide-y divide-border">
                  {remainingNewsPosts.map((post) => (
                    <li key={post.id}><article className="py-5"><div className="flex flex-wrap items-center justify-between gap-3 text-small"><span className="font-bold text-primary">{getNewsCategoryLabel(post.category)}</span><time className="text-muted-foreground" dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time></div><h3 className="mt-2 text-xl font-bold"><Link className={`text-safe-wrap hover:text-primary ${focusClass}`} href={`/news/${post.slug}`}>{post.title}</Link></h3></article></li>
                  ))}
                </ul>
              ) : <p className="text-safe-wrap bg-background px-5 py-4 text-muted-foreground">{featuredPost ? "최근 공지는 위의 기관 안내에서 확인하거나 소식 페이지에서 전체 목록을 살펴보세요." : "공개된 공지사항과 활동 소식은 소식 페이지에서 안내합니다."}</p>}
            </div>

            <div className={lifeColumnClass}>
              <h2 className="pb-5 text-title font-bold sm:text-display">생활·프로그램</h2>
              <p className="text-safe-wrap mt-5 text-body text-muted-foreground">일상생활과 프로그램, 공개 승인을 마친 활동 기록을 구분해 안내합니다.</p>
              <ul className="mt-5 border-t border-border">
                {homeFixture.lifeLinks.map((item) => <li key={item.href} className="border-b border-border"><Link className={`${arrowLink} py-4`} href={item.href}><span><strong className="block text-xl">{item.label}</strong><span className="text-safe-wrap mt-1 block text-small font-normal text-muted-foreground">{item.description}</span></span><span aria-hidden="true">→</span></Link></li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="participation-heading" className="bg-primary-soft py-14 sm:py-20">
        <div className="mx-auto grid max-w-site gap-12 px-page sm:px-page-wide lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 id="participation-heading" className="text-title font-bold sm:text-display">함께할 수 있는 방법</h2>
            <p className="text-safe-wrap mt-4 max-w-2xl text-body text-muted-foreground">후원과 자원봉사에 참여하기 전 안내 절차를 확인하거나 담당자에게 문의해 주세요.</p>
            <Link className={`mt-8 inline-flex min-h-12 items-center rounded-control bg-primary px-7 py-3 font-bold text-primary-foreground hover:bg-primary-hover ${focusClass}`} href={homeFixture.participationLinks[0].href}>후원하기 <span aria-hidden="true" className="ml-3">→</span></Link>
            <ul className="mt-6 max-w-2xl border-t border-border-strong">
              {homeFixture.participationLinks.slice(1).map((item) => <li key={item.href} className="border-b border-border-strong"><Link className={arrowLink} href={item.href}>{item.label}<span aria-hidden="true">→</span></Link></li>)}
            </ul>
          </div>
          <div className="grid gap-10 lg:col-span-7 sm:grid-cols-2 sm:gap-8 lg:border-l lg:border-border-strong lg:pl-12">
            <section aria-labelledby="trust-heading"><h2 id="trust-heading" className="text-heading font-bold">자료공개</h2><p className="text-safe-wrap mt-3 text-muted-foreground">시설 운영과 관련하여 공개가 승인된 자료를 확인할 수 있습니다.</p><Link className={`mt-4 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 ${focusClass}`} href="/transparency">자료공개 바로가기 →</Link></section>
            <section aria-labelledby="contact-heading"><h2 id="contact-heading" className="text-heading font-bold">방문·연락 안내</h2><address className="mt-3 not-italic"><dl><div className="grid gap-1 py-2"><dt className="font-bold">주소</dt><dd className="text-safe-wrap">{contact.address}</dd></div><div className="grid gap-1 py-2"><dt className="font-bold">전화</dt><dd>{contact.phone}</dd></div></dl></address><div className="mt-3 flex flex-wrap gap-x-6"><Link className={`inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 ${focusClass}`} href="/about/directions">찾아오시는 길</Link><a className={`inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 ${focusClass}`} href={createTelephoneHref(contact.phone)}>전화 연결</a></div></section>
          </div>
        </div>
      </section>
    </>
  );
}
