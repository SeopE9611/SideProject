import Link from "next/link";
import { HomeHero } from "./home-hero";
import { HomeLifeStories } from "./home-life-stories";
import { HomeProgramDisclosure } from "./home-program-disclosure";
import type { HeroImage } from "./home-hero-media";
import type { FacilityOverviewContent, ContactInformationContent } from "@/features/site-content/site-content.types";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { formatPublicDate } from "@/lib/format-public-date";
import { transparencyCategoryLabels, type TransparencyCategory } from "@/features/transparency/transparency.types";
import { siteConfig } from "@/config/site";

type Entry = { id: string; slug: string; title: string; publishedAt: string; isDemo?: boolean };
type Photo = {
  slug: string;
  title: string;
  category: string;
  altText: string;
  activityDate: string;
  mediaSrc?: string;
};
export type HomeJournalProps = {
  overview: FacilityOverviewContent;
  contact: ContactInformationContent;
  heroImages: HeroImage[];
  notices: readonly Entry[];
  activities: readonly Entry[];
  galleryItems: readonly Photo[];
  programs: readonly { slug: string; title: string; category: string; summary: string }[];
  documents: readonly { slug: string; title: string; category: TransparencyCategory }[];
  preview?: boolean;
  errors?: { news?: boolean; gallery?: boolean; programs?: boolean; transparency?: boolean };
};
export function HomeJournal({
  overview,
  contact,
  heroImages,
  notices,
  activities,
  galleryItems,
  programs,
  documents,
  preview = false,
  errors = {},
}: HomeJournalProps) {
  const latestPosts = [...notices, ...activities]
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  const hasNotices = notices.length > 0;
  const hasActivities = activities.length > 0;
  return (
    <div className="home-journal">
      <HomeHero siteName={siteConfig.name} description={overview.pageDescription} images={heroImages} />
      <section aria-labelledby="news-home-heading" className="home-bulletin">
        <div>
          <h2 id="news-home-heading">최근 소식</h2>
          <Link href="/news">전체 보기 ↗</Link>
        </div>
        <div>
          {[...notices, ...activities].some((post) => post.isDemo) ? (
            <p className="text-small text-muted-foreground">미리보기 · 테스트 소식입니다.</p>
          ) : null}
          <ul>
            {latestPosts.map((post) => (
              <li key={post.id}>
                <Link href={preview ? `/design-preview/news/${post.slug}` : `/news/${post.slug}`}>
                  <time dateTime={post.publishedAt}>{formatPublicDate(post.publishedAt)}</time>
                  <span className="text-safe-wrap">{post.title}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
            {!hasNotices && !hasActivities ? (
              <li>{errors.news ? "소식을 불러오지 못했습니다." : "현재 공개된 소식이 없습니다."}</li>
            ) : null}
          </ul>
        </div>
      </section>
      <section aria-labelledby="life-home-heading" className="journal-chapter journal-life">
        <header className="chapter-heading">
          <div>
            <p>생활·프로그램</p>
            <h2 id="life-home-heading">생활 기록</h2>
          </div>
          <Link href="/life/gallery" className="institution-link">
            활동사진 모두 보기 ↗
          </Link>
        </header>
        {galleryItems.length ? (
          <HomeLifeStories
            items={galleryItems.map((item) => ({
              slug: item.slug,
              title: item.title,
              category: item.category,
              altText: item.altText,
              activityDate: item.activityDate,
              mediaSrc: item.mediaSrc,
              href: preview ? `/design-preview/gallery/${item.slug}` : undefined,
              dateLabel: formatPublicDate(item.activityDate),
            }))}
          />
        ) : (
          <p className="journal-empty">
            {errors.gallery ? "활동사진을 불러오지 못했습니다." : "아직 공개된 활동사진이 없습니다."}
          </p>
        )}
        <div className="journal-programs">
          <header>
            <h3>프로그램</h3>
            <Link href="/life/programs" className="institution-link">
              전체 프로그램 ↗
            </Link>
          </header>
          <div>
            {programs.map((program) => (
              <HomeProgramDisclosure
                key={program.slug}
                category={program.category}
                title={program.title}
                summary={program.summary}
                href={preview ? `/design-preview/programs/${program.slug}` : `/life/programs/${program.slug}`}
              />
            ))}
            {!programs.length ? (
              <p className="journal-empty">
                {errors.programs ? "프로그램을 불러오지 못했습니다." : "현재 공개된 프로그램이 없습니다."}
              </p>
            ) : null}
          </div>
        </div>
      </section>
      <section aria-labelledby="about-home-heading" className="journal-about">
        <div className="journal-about-title">
          <p>시설소개</p>
          <h2 id="about-home-heading">
            샬롬의 집을
            <br />
            소개합니다
          </h2>
          <Link className="cover-link" href="/about">
            시설개요 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="journal-about-content">
          <p className="journal-about-description text-safe-wrap">{overview.principlesDescription}</p>
          <dl>
            {overview.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd className="text-safe-wrap">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <nav aria-label="시설 더 알아보기">
            <Link href="/about/greeting">인사말 ↗</Link>
            <Link href="/about/people">함께하는 사람들 ↗</Link>
            <Link href="/about/spaces">생활공간 ↗</Link>
          </nav>
        </div>
      </section>
      <section aria-labelledby="participate-heading" className="journal-participate">
        <header>
          <p>함께하기</p>
          <h2 id="participate-heading">후원과 자원봉사</h2>
        </header>
        <div>
          <Link href="/support/donation">
            <strong>후원 안내</strong>
            <span>방법과 절차 확인</span>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/support/volunteer">
            <strong>자원봉사</strong>
            <span>참여 안내 확인</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section aria-label="자료공개와 방문 안내" className="journal-directory">
        <div>
          <h2>자료공개</h2>
          <ul>
            {documents.map((doc) => (
              <li key={doc.slug}>
                <a href={`/api/transparency/${doc.slug}/document`} target="_blank" rel="noreferrer">
                  <span>{transparencyCategoryLabels[doc.category]}</span>
                  <strong className="text-safe-wrap">{doc.title}</strong>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
          {!documents.length ? (
            <p>{errors.transparency ? "자료를 불러오지 못했습니다." : "현재 공개된 운영 자료가 없습니다."}</p>
          ) : null}
          <Link href="/transparency" className="institution-link">
            자료공개 전체보기 ↗
          </Link>
        </div>
        <div>
          <h2>방문·연락</h2>
          <p>{contact.address}</p>
          <a className="directory-phone" href={createTelephoneHref(contact.phone)}>
            {contact.phone}
          </a>
          <div className="flex flex-wrap gap-5">
            <Link href="/about/directions" className="institution-link">
              찾아오시는 길 ↗
            </Link>
            <Link href="/support/contact" className="institution-link">
              온라인 문의 ↗
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
