import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { FacilityOverviewContent, ContactInformationContent } from "@/features/site-content/site-content.types";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import type { PublicGallerySummary } from "@/features/gallery/gallery.repository";
import type { PublicNewsPostSummary } from "@/features/news/news.types";
import type { PublicProgram } from "@/features/programs/program.types";
import type { PublicTransparencyDocument } from "@/features/transparency/transparency.repository";
import { transparencyCategoryLabels } from "@/features/transparency/transparency.types";
import { formatPublicDate } from "@/lib/format-public-date";
import type { HeroImage } from "./home-hero-media";
import { PublicHomeHero } from "./public-home-hero";
import styles from "./public-home.module.css";

type PublicHomeProps = {
  overview: FacilityOverviewContent;
  contact: ContactInformationContent;
  heroImage?: HeroImage;
  hasPublishedPhotos: boolean;
  galleryItems: readonly PublicGallerySummary[];
  notices: readonly PublicNewsPostSummary[];
  activities: readonly PublicNewsPostSummary[];
  programs: readonly Pick<PublicProgram, "slug" | "title" | "category" | "summary">[];
  documents: readonly Pick<
    PublicTransparencyDocument,
    "slug" | "title" | "category" | "periodLabel" | "documentDate" | "fileType"
  >[];
  errors: { news: boolean; gallery: boolean; programs: boolean; transparency: boolean };
};

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.textLink}>
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

export function PublicHome({
  overview,
  contact,
  heroImage,
  hasPublishedPhotos,
  galleryItems,
  notices,
  activities,
  programs,
  documents,
  errors,
}: PublicHomeProps) {
  const latestPosts = [...notices, ...activities]
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  return (
    <div className={styles.home}>
      <PublicHomeHero
        key={heroImage?.src ?? "no-photo"}
        siteName={siteConfig.name}
        description={overview.pageDescription}
        image={heroImage}
      />
      <section className={styles.life} aria-labelledby="home-life-heading">
        <div>
          <p className={styles.eyebrow}>생활·활동</p>
          <h2 id="home-life-heading">생활과 지원</h2>
          <p className={styles.lead}>{overview.principlesDescription}</p>
          <TextLink href="/life">생활·활동 살펴보기</TextLink>
        </div>
        <div className={styles.lifeContent}>
          {overview.principles.map((item, index) => (
            <div className={styles.roleRow} key={index}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
          <div className={styles.programs}>
            <div className={styles.sectionHeading}>
              <h3>프로그램</h3>
              <TextLink href="/life/programs">전체 프로그램</TextLink>
            </div>
            {programs.map((program) => (
              <article key={program.slug}>
                <p className={styles.meta}>{program.category}</p>
                <h4>
                  <Link href={`/life/programs/${program.slug}`}>{program.title}</Link>
                </h4>
                <p>{program.summary}</p>
              </article>
            ))}
            {!programs.length && (
              <p className={styles.empty}>
                {errors.programs ? "프로그램을 불러오지 못했습니다." : "현재 공개된 프로그램이 없습니다."}
              </p>
            )}
          </div>
          <TextLink href="/about/spaces">생활공간 알아보기</TextLink>
        </div>
      </section>
      <section className={styles.records} aria-labelledby="home-records-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>소식과 기록</p>
            <h2 id="home-records-heading">최근 소식</h2>
          </div>
          <TextLink href="/news">소식 전체 보기</TextLink>
        </div>
        <div className={styles.recordsGrid}>
          <div className={styles.homeNews}>
            {latestPosts.some((post) => post.isDemo) && <p className={styles.empty}>미리보기 · 테스트 소식입니다.</p>}
            {latestPosts.map((post) => (
              <article key={post.id}>
                <div className={styles.meta}>
                  <span>{post.category === "notice" ? "공지사항" : "활동소식"}</span>
                  <time dateTime={post.publishedAt}>{formatPublicDate(post.publishedAt)}</time>
                </div>
                <h3>
                  <Link href={`/news/${post.slug}`}>{post.title}</Link>
                </h3>
              </article>
            ))}
            {errors.news && (
              <p className={styles.empty}>
                {latestPosts.length ? "일부 소식을 불러오지 못했습니다." : "소식을 불러오지 못했습니다."}
              </p>
            )}
            {!latestPosts.length && !errors.news && <p className={styles.empty}>현재 공개된 소식이 없습니다.</p>}
          </div>
          <div className={styles.photos}>
            <div className={styles.sectionHeading}>
              <h3>활동사진</h3>
              <TextLink href="/life/gallery">사진 목록</TextLink>
            </div>
            {galleryItems.map((photo) => (
              <figure className={styles.recordFigure} key={photo.slug}>
                <Link href={`/life/gallery/${photo.slug}`}>
                  <Image
                    src={`/api/gallery/${photo.slug}/media`}
                    alt={photo.altText}
                    width={photo.width}
                    height={photo.height}
                    sizes="(min-width: 900px) 40vw, 100vw"
                    unoptimized
                  />
                </Link>
                <figcaption>
                  <Link href={`/life/gallery/${photo.slug}`}>{photo.title}</Link>
                  <time dateTime={photo.activityDate}>{formatPublicDate(photo.activityDate)}</time>
                </figcaption>
              </figure>
            ))}
            {!galleryItems.length && (
              <p className={styles.empty}>
                {errors.gallery
                  ? "활동사진을 불러오지 못했습니다."
                  : hasPublishedPhotos
                    ? "활동사진 목록에서 공개 기록을 확인할 수 있습니다."
                    : "현재 공개된 활동사진이 없습니다."}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className={styles.participation} aria-labelledby="home-participation-heading">
        <div>
          <p className={styles.eyebrow}>후원·봉사</p>
          <h2 id="home-participation-heading">후원과 자원봉사</h2>
          <p>후원과 자원봉사에 관한 문의를 안내합니다.</p>
          <TextLink href="/support">참여 안내 살펴보기</TextLink>
        </div>
        <div className={styles.participationActions}>
          <TextLink href="/support/contact?kind=donation#inquiry-form">후원 문의 접수</TextLink>
          <TextLink href="/support/contact?kind=volunteer#inquiry-form">자원봉사 문의 접수</TextLink>
        </div>
      </section>
      <section className={styles.documents} aria-labelledby="home-documents-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>운영 정보</p>
            <h2 id="home-documents-heading">운영 자료공개</h2>
          </div>
          <TextLink href="/transparency">자료 전체 보기</TextLink>
        </div>
        <ul className={styles.documentList}>
          {documents.map((document) => (
            <li key={document.slug}>
              <a
                href={`/api/transparency/${document.slug}/document`}
                target="_blank"
                rel="noreferrer"
                className={styles.documentRow}
              >
                <span className={styles.documentCategory}>{transparencyCategoryLabels[document.category]}</span>
                <strong>{document.title}</strong>
                <span>{document.periodLabel}</span>
                <span className={styles.fileType}>
                  {document.fileType} 열기 <span className="sr-only">(새 창)</span>
                  <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {!documents.length && (
          <p className={styles.empty}>
            {errors.transparency ? "자료를 불러오지 못했습니다." : "현재 공개된 운영 자료가 없습니다."}
          </p>
        )}
      </section>
      <section id="admission" tabIndex={-1} className={styles.admission} aria-labelledby="home-admission-heading">
        <div>
          <p className={styles.eyebrow}>입소·이용</p>
          <h2 id="home-admission-heading">입소·이용 관련 연락 안내</h2>
        </div>
        <div>
          <p>
            입소·이용에 관한 질문은 대표 전화 또는 일반 문의로 연락해 주세요. 전용 신청·접수 절차를 제공하는 페이지가
            아닙니다.
          </p>
          <p className={styles.small}>일반 문의에는 진단·의료·장애·가족관계 등 민감한 개인정보를 입력하지 마세요.</p>
          <div className={styles.contactLinks}>
            <a className={styles.textLink} href={createTelephoneHref(contact.phone)}>
              {contact.phone}
            </a>
            <TextLink href="/support/contact?kind=general#inquiry-form">일반 문의</TextLink>
          </div>
        </div>
      </section>
      <section className={styles.contact} aria-labelledby="home-contact-heading">
        <div>
          <p className={styles.eyebrow}>문의와 방문</p>
          <h2 id="home-contact-heading">연락과 방문 안내</h2>
          <p>{contact.visitInquiryDescription}</p>
        </div>
        <div className={styles.contactChannels}>
          <a className={styles.phone} href={createTelephoneHref(contact.phone)}>
            {contact.phone}
          </a>
          <address>{contact.address}</address>
          <div className={styles.contactLinks}>
            <TextLink href="/support/contact">온라인 문의</TextLink>
            <TextLink href="/about/directions">찾아오시는 길</TextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
