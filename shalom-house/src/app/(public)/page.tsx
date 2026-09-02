import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/");

import Image from "next/image";
import Link from "next/link";

import { HomeHero } from "@/components/home/home-hero";
import { siteConfig } from "@/config/site";
import { homeFixture } from "@/content/fixtures/home.fixture";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel, type PublicNewsPostSummary } from "@/features/news/news.types";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

async function getHomeNewsPosts(): Promise<readonly PublicNewsPostSummary[]> {
  try {
    const posts = await getNewsRepository().listPublished({ limit: 6 });
    return posts.filter((post) => !post.isDemo).slice(0, 3);
  } catch (error) {
    console.error("홈 최근 소식을 불러오지 못했습니다.", error);
    return [];
  }
}

const textLink = "text-safe-wrap inline-flex min-h-11 items-center gap-2 font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export default async function Home() {
  const [newsPosts, contact] = await Promise.all([getHomeNewsPosts(), getPublicContactInformation()]);
  const [featuredPost, ...otherPosts] = newsPosts;

  return <>
    <HomeHero siteName={siteConfig.name} facilityType="장애인거주시설" address={contact.address} phone={contact.phone} description={siteConfig.description} media={homeFixture.heroMedia} />

    <nav aria-labelledby="quick-heading" className="bg-surface pb-5 sm:pb-7">
      <div className="mx-auto max-w-site px-page sm:px-page-wide">
        <div className="rounded-panel border border-border bg-surface px-4 py-4 shadow-card sm:px-6">
          <h2 id="quick-heading" className="text-small font-bold text-muted-foreground">빠른 서비스</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {homeFixture.quickLinks.map((item) => <li key={item.href}><Link className="group flex min-h-16 items-center justify-between gap-2 rounded-control px-3 py-2 text-base font-bold hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:min-h-20" href={item.href}><span className="text-safe-wrap">{item.label}</span><span aria-hidden="true" className="text-primary transition-transform group-hover:translate-x-1">→</span></Link></li>)}
          </ul>
        </div>
      </div>
    </nav>

    <section aria-labelledby="news-heading" className="bg-surface py-14 sm:py-20">
      <div className="mx-auto max-w-site px-page sm:px-page-wide">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-small font-bold text-accent">SHALOM NEWS</p><h2 id="news-heading" className="mt-2 text-title font-bold">공지와 활동 소식</h2></div><Link className={textLink} href="/news">전체보기 <span aria-hidden="true">→</span></Link></header>
        {featuredPost ? <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
          <article className="rounded-card bg-primary-soft p-6 sm:p-8"><p className="text-small font-bold text-primary">{getNewsCategoryLabel(featuredPost.category)} · 최신 소식</p><h3 className="mt-3 text-heading font-bold"><Link className="text-safe-wrap hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${featuredPost.slug}`}>{featuredPost.title}</Link></h3><p className="text-safe-wrap mt-3 text-body text-muted-foreground">{featuredPost.summary}</p><time className="mt-5 block text-small text-muted-foreground" dateTime={featuredPost.publishedAt}>{dateFormatter.format(new Date(featuredPost.publishedAt))}</time></article>
          {otherPosts.length ? <ul className="divide-y divide-border">{otherPosts.map((post) => <li key={post.id}><article className="py-5"><div className="flex flex-wrap justify-between gap-3 text-small text-muted-foreground"><span className="font-bold text-primary">{getNewsCategoryLabel(post.category)}</span><time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time></div><h3 className="mt-2 text-xl font-bold"><Link className="text-safe-wrap hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}>{post.title}</Link></h3></article></li>)}</ul> : null}
        </div> : <div className="mt-7 rounded-card bg-background px-6 py-5"><h3 className="text-xl font-bold">새로운 소식을 준비하고 있습니다.</h3><p className="text-safe-wrap mt-1 text-muted-foreground">공개된 공지사항과 활동소식은 소식 페이지에서 안내합니다.</p></div>}
      </div>
    </section>

    <section aria-labelledby="life-heading" className="bg-accent-soft py-14 sm:py-20">
      <div className={`mx-auto max-w-site px-page sm:px-page-wide ${homeFixture.lifeMedia.kind === "image" ? "grid gap-10 lg:grid-cols-2 lg:items-center" : ""}`}>
        {homeFixture.lifeMedia.kind === "image" ? <Image className="aspect-[3/2] w-full rounded-panel object-cover" src={homeFixture.lifeMedia.src} alt={homeFixture.lifeMedia.alt} width={homeFixture.lifeMedia.width} height={homeFixture.lifeMedia.height} /> : null}
        <div><p className="text-small font-bold text-accent">생활 안내</p><h2 id="life-heading" className="mt-2 text-title font-bold">생활과 프로그램</h2><p className="text-safe-wrap mt-3 max-w-2xl text-body text-muted-foreground">일상생활과 프로그램, 공개 승인을 마친 활동 기록을 구분해 안내합니다.</p>
          <ul className="mt-7 grid gap-3 md:grid-cols-3">{homeFixture.lifeLinks.map((item) => <li key={item.href}><Link className="group flex h-full min-h-36 flex-col justify-between rounded-card bg-surface p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={item.href}><span><strong className="text-xl">{item.label}</strong><span className="text-safe-wrap mt-2 block text-small text-muted-foreground">{item.description}</span></span><span aria-hidden="true" className="mt-4 text-primary transition-transform group-hover:translate-x-1">→</span></Link></li>)}</ul>
        </div>
      </div>
    </section>

    <section aria-labelledby="participation-heading" className="bg-background py-14 sm:py-20"><div className="mx-auto grid max-w-site gap-8 px-page sm:px-page-wide lg:grid-cols-[1fr_1.4fr] lg:items-center"><div><p className="text-small font-bold text-accent">참여 안내</p><h2 id="participation-heading" className="mt-2 text-title font-bold">함께할 수 있는 방법</h2><p className="text-safe-wrap mt-3 text-body text-muted-foreground">후원과 자원봉사에 참여하기 전 안내 절차를 확인하거나 담당자에게 문의해 주세요.</p></div><ul className="grid gap-3 sm:grid-cols-3">{homeFixture.participationLinks.map((item, index) => <li key={item.href}><Link className={`flex min-h-24 items-center justify-between rounded-card p-5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${index === 0 ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "bg-surface text-foreground shadow-card hover:text-primary"}`} href={item.href}>{item.label}<span aria-hidden="true">→</span></Link></li>)}</ul></div></section>

    <section aria-labelledby="documents-heading" className="bg-surface py-12 sm:py-16"><div className="mx-auto max-w-site px-page sm:px-page-wide"><div className="flex flex-col gap-5 rounded-panel bg-primary-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><h2 id="documents-heading" className="text-heading font-bold">자료공개</h2><p className="text-safe-wrap mt-2 text-body text-muted-foreground">시설 운영과 관련하여 공개가 승인된 자료를 확인할 수 있습니다.</p></div><Link className={`${textLink} shrink-0`} href="/transparency">자료공개 바로가기 <span aria-hidden="true">→</span></Link></div></div></section>

    <section aria-labelledby="contact-heading" className="bg-surface pb-16 pt-4 sm:pb-20"><div className="mx-auto max-w-site px-page sm:px-page-wide"><div className="grid gap-6 rounded-panel bg-foreground p-6 text-on-dark sm:p-8 lg:grid-cols-[1fr_2fr] lg:items-center"><div><p className="text-small font-bold text-white/65">CONTACT</p><h2 id="contact-heading" className="mt-2 text-title font-bold">방문·연락 안내</h2></div><div className="grid gap-5 sm:grid-cols-2"><address className="not-italic"><p className="text-small font-bold text-white/65">주소</p><p className="text-safe-wrap mt-1 text-body font-bold">{contact.address}</p><Link className="mt-2 inline-flex min-h-11 items-center font-bold underline underline-offset-4" href="/about/directions">찾아오시는 길</Link></address><div><p className="text-small font-bold text-white/65">대표 전화</p><p className="mt-1 text-body font-bold">{contact.phone}</p><a className="mt-2 inline-flex min-h-11 items-center font-bold underline underline-offset-4" href={createTelephoneHref(contact.phone)}>전화 연결</a></div></div></div></div></section>
  </>;
}
