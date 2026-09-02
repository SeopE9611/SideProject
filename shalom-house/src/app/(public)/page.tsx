import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/");

import Link from "next/link";

import { FixtureMediaPlaceholder } from "@/components/home/fixture-media-placeholder";
import { HomeHero } from "@/components/home/home-hero";
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

const textLink =
  "text-safe-wrap inline-flex min-h-11 items-center gap-2 font-bold text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function getQuickLinkBorderClasses(index: number): string {
  const mobile = [index % 2 === 0 ? "border-r" : "", index < 4 ? "border-b" : ""];
  const tablet = [index % 3 !== 2 ? "sm:border-r" : "sm:border-r-0", index < 3 ? "sm:border-b" : "sm:border-b-0"];
  const desktop = [index < 5 ? "lg:border-r" : "lg:border-r-0", "lg:border-b-0"];

  return [...mobile, ...tablet, ...desktop, "border-white/20"].filter(Boolean).join(" ");
}

export default async function Home() {
  const [newsPosts, contact] = await Promise.all([getHomeNewsPosts(), getPublicContactInformation()]);
  const [featuredPost, ...otherPosts] = newsPosts;

  return (
    <>
      <HomeHero
        siteName={siteConfig.name}
        facilityType="장애인거주시설"
        address={contact.address}
        description={siteConfig.description}
        media={homeFixture.heroMedia}
      />

      <nav aria-labelledby="quick-heading" className="border-b border-border bg-primary text-on-dark">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="border-x border-white/20 lg:grid lg:grid-cols-[12rem_1fr]">
            <h2 id="quick-heading" className="flex items-center border-b border-white/20 px-5 py-5 text-heading font-bold lg:border-b-0 lg:border-r">
              주요 업무
            </h2>
            <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {homeFixture.quickLinks.map((item, index) => (
                <li key={item.href} className={getQuickLinkBorderClasses(index)}>
                  <Link className="group flex min-h-24 flex-col justify-between p-4 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white" href={item.href}>
                    <span className="text-xs text-white/65">0{index + 1}</span>
                    <strong className="text-safe-wrap flex items-end justify-between gap-2 text-small">
                      {item.label}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </strong>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </nav>

      <section aria-labelledby="news-heading" className="bg-surface py-section sm:py-section-wide">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <header className="lg:col-span-4">
              <h2 id="news-heading" className="text-title font-bold">공지와 활동 소식</h2>
              <p className="text-safe-wrap mt-4 max-w-sm text-body text-muted-foreground">시설에서 공식적으로 공개한 새로운 안내와 활동 기록입니다.</p>
              <Link className={`${textLink} mt-6`} href="/news">전체 소식 보기 <span aria-hidden="true">→</span></Link>
            </header>
            <div className="lg:col-span-8">
              {featuredPost ? (
                <div className={`grid border-t-4 border-foreground ${otherPosts.length > 0 ? "md:grid-cols-2" : ""}`}>
                  <article className={`border-b border-border bg-primary-soft p-6 md:p-8 ${otherPosts.length > 0 ? "md:border-r" : ""}`}>
                    <p className="text-small font-bold text-primary">{getNewsCategoryLabel(featuredPost.category)}</p>
                    <h3 className="mt-5 text-heading font-bold">
                      <Link className="text-safe-wrap hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${featuredPost.slug}`}>{featuredPost.title}</Link>
                    </h3>
                    <p className="text-safe-wrap mt-4 text-body text-muted-foreground">{featuredPost.summary}</p>
                    <time className="mt-7 block text-small text-muted-foreground" dateTime={featuredPost.publishedAt}>{dateFormatter.format(new Date(featuredPost.publishedAt))}</time>
                  </article>
                  {otherPosts.length > 0 ? <ul>
                    {otherPosts.map((post) => (
                      <li key={post.id} className="border-b border-border">
                        <article className="px-1 py-5 md:px-6">
                          <div className="flex flex-wrap justify-between gap-2 text-small text-muted-foreground"><span className="font-bold text-primary">{getNewsCategoryLabel(post.category)}</span><time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time></div>
                          <h3 className="mt-3 text-xl font-bold"><Link className="text-safe-wrap hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}>{post.title}</Link></h3>
                          <p className="text-safe-wrap mt-2 line-clamp-2 text-small text-muted-foreground">{post.summary}</p>
                        </article>
                      </li>
                    ))}
                  </ul> : null}
                </div>
              ) : (
                <div className="border-y-2 border-foreground py-7">
                  <h3 className="text-heading font-bold">새로운 소식을 준비하고 있습니다.</h3>
                  <p className="text-safe-wrap mt-2 text-muted-foreground">공개된 공지사항과 활동소식이 등록되면 이곳에서 안내합니다.</p>
                  <Link className={`${textLink} mt-4`} href="/news">소식 페이지 보기 <span aria-hidden="true">→</span></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="life-heading" className="border-y border-border bg-surface-subtle py-section sm:py-section-wide">
        <div className="mx-auto grid max-w-site gap-8 px-page sm:px-page-wide lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <FixtureMediaPlaceholder label={homeFixture.lifeMedia.label} description={homeFixture.lifeMedia.description} />
            <p className="text-safe-wrap mt-3 text-small text-muted-foreground">{homeFixture.lifeMedia.caption}</p>
          </div>
          <div className="lg:col-span-5">
            <h2 id="life-heading" className="text-title font-bold">생활과 프로그램</h2>
            <p className="text-safe-wrap mt-4 text-body text-muted-foreground">일상생활과 프로그램, 공개 승인을 마친 활동 기록을 구분해 안내합니다.</p>
            <ul className="mt-8 border-t-2 border-foreground">
              {homeFixture.lifeLinks.map((item, index) => (
                <li key={item.href} className="border-b border-border">
                  <Link className="group grid min-h-24 grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={item.href}>
                    <span className="text-small text-accent">0{index + 1}</span><span><strong className="text-xl">{item.label}</strong><span className="text-safe-wrap mt-1 block text-small text-muted-foreground">{item.description}</span></span><span aria-hidden="true" className="text-xl text-primary transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="documents-heading" className="bg-background py-section">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <div className="grid border border-border-strong bg-surface lg:grid-cols-[1fr_1.6fr]">
            <header className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r"><p className="text-small font-bold text-accent">운영 정보</p><h2 id="documents-heading" className="mt-2 text-title font-bold">자료공개</h2><p className="text-safe-wrap mt-4 text-muted-foreground">확인과 공개 절차를 마친 운영 자료를 안내합니다.</p></header>
            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8"><div><p className="text-small font-bold text-muted-foreground">공개 문서 현황</p><h3 className="mt-2 text-heading font-bold">현재 공개된 자료가 없습니다.</h3><p className="text-safe-wrap mt-2 text-muted-foreground">자료가 게시되면 자료공개 페이지에서 확인할 수 있습니다.</p></div><Link className={textLink} href="/transparency">자료공개 페이지 <span aria-hidden="true">→</span></Link></div>
          </div>
        </div>
      </section>

      <section aria-labelledby="participation-heading" className="bg-foreground text-on-dark">
        <div className="mx-auto grid max-w-site px-page py-12 sm:px-page-wide sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
          <div><h2 id="participation-heading" className="text-title font-bold">함께할 수 있는 방법</h2><p className="text-safe-wrap mt-4 max-w-xl text-body text-white/75">후원과 자원봉사에 참여하기 전 안내 절차를 확인하거나 담당자에게 문의해 주세요.</p></div>
          <ul className="mt-8 border-t border-white/30 lg:mt-0">
            {homeFixture.participationLinks.map((item, index) => <li key={item.href} className="border-b border-white/30"><Link className={`group flex min-h-14 items-center justify-between px-2 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${index === 0 ? "text-white" : "text-white/80"}`} href={item.href}>{item.label}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></Link></li>)}
          </ul>
        </div>
      </section>

      <section aria-labelledby="contact-heading" className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-site px-page sm:px-page-wide"><div className="grid gap-7 border-t-4 border-primary pt-7 lg:grid-cols-[1fr_2fr]">
          <h2 id="contact-heading" className="text-title font-bold">방문·연락 안내</h2>
          <div className="grid gap-7 sm:grid-cols-2"><address className="not-italic"><p className="text-small font-bold text-muted-foreground">주소</p><p className="text-safe-wrap mt-2 text-body font-bold">{contact.address}</p><Link className={`${textLink} mt-3`} href="/about/directions">찾아오시는 길</Link></address><div><p className="text-small font-bold text-muted-foreground">대표 전화</p><p className="text-safe-wrap mt-2 text-body font-bold">{contact.phone}</p><a className={`${textLink} mt-3`} href={createTelephoneHref(contact.phone)}>전화 연결</a></div></div>
        </div></div>
      </section>
    </>
  );
}
