import Image from "next/image";
import Link from "next/link";
import type { HeroImage } from "./home-hero-media";
import type { FacilityOverviewContent, ContactInformationContent } from "@/features/site-content/site-content.types";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import type { PublicGallerySummary } from "@/features/gallery/gallery.repository";
import type { PublicNewsPostSummary } from "@/features/news/news.types";
import type { PublicProgram } from "@/features/programs/program.types";
import type { PublicTransparencyDocument } from "@/features/transparency/transparency.repository";
import { transparencyCategoryLabels } from "@/features/transparency/transparency.types";
import { formatPublicDate } from "@/lib/format-public-date";
import { HomeV2Hero } from "@/components/design-preview/home-v2-hero";
import type { HomeV2Slide } from "@/components/design-preview/home-v2-realistic";
import commonRoom from "@/components/design-preview/assets/home-v2-realistic/hero-01-common-room.webp";
import personalChoice from "@/components/design-preview/assets/home-v2-realistic/hero-02-personal-choice.webp";
import neighborhood from "@/components/design-preview/assets/home-v2-realistic/hero-03-neighborhood.webp";
import styles from "@/components/design-preview/home-v2.module.css";

type PublicHomeV2Props = {
  overview: FacilityOverviewContent;
  contact: ContactInformationContent;
  heroImage?: HeroImage;
  hasPublishedPhotos: boolean;
  galleryItems: readonly PublicGallerySummary[];
  notices: readonly PublicNewsPostSummary[];
  activities: readonly PublicNewsPostSummary[];
  programs: readonly Pick<PublicProgram, "slug" | "title" | "category" | "summary" | "coverImage">[];
  documents: readonly Pick<PublicTransparencyDocument, "slug" | "title" | "category" | "periodLabel" | "documentDate" | "fileType">[];
  errors: { news: boolean; gallery: boolean; programs: boolean; transparency: boolean };
};

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={styles.moreLink}>{children}<Arrow /></Link>;
}

export function PublicHomeV2({ overview, contact, notices, activities, programs, documents, errors }: PublicHomeV2Props) {
  const posts = [...notices, ...activities]
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const slides: readonly HomeV2Slide[] = [
    {
      title: "샬롬의집",
      description: overview.pageDescription,
      image: commonRoom,
      alt: "햇살이 드는 공동 식탁과 의자가 있는 공간을 표현한 연출 이미지",
      label: "연출 이미지",
      position: "65% center",
    },
    {
      title: overview.principles[0].title,
      description: overview.principles[0].description,
      image: personalChoice,
      alt: "여러 색의 크레용 중 하나를 고르는 손을 표현한 연출 이미지",
      label: "연출 이미지",
      position: "center",
    },
    {
      title: overview.principles[2].title,
      description: overview.principles[2].description,
      image: neighborhood,
      alt: "녹지와 벤치가 있는 동네 산책길을 표현한 연출 이미지",
      label: "연출 이미지",
      position: "center",
    },
  ];

  return (
    <div className={styles.preview}>
      <div className={styles.introBand}>
        <HomeV2Hero photo introduction={overview.pageDescription} principles={overview.principles} slidesOverride={slides} />
        <div className={styles.container}>
          <nav className={styles.purposeNavigation} aria-label="방문 목적별 안내">
            <Link id="admission" href="/support/contact?kind=general">
              <div>
                <strong>입소·이용 문의</strong>
                <span>대표 연락 경로를 확인합니다</span>
              </div>
              <Arrow />
            </Link>
            <Link href="/support/donation">
              <div>
                <strong>후원 안내</strong>
                <span>후원에 관한 안내를 살펴봅니다</span>
              </div>
              <Arrow />
            </Link>
            <Link href="/support/volunteer">
              <div>
                <strong>자원봉사</strong>
                <span>참여 전 확인할 내용을 알아봅니다</span>
              </div>
              <Arrow />
            </Link>
          </nav>
        </div>
      </div>

      <div className={styles.container}>
        <section className={`${styles.section} ${styles.lifeSection}`} aria-labelledby="home-v2-life-heading">
          <div className={styles.sectionHeading}>
            <h2 id="home-v2-life-heading">생활과 활동</h2>
            <MoreLink href="/life">생활·활동 보기</MoreLink>
          </div>
          <div className={styles.programArea}>
            {programs.length ? (
              <ul className={styles.programList}>
                {programs.map((program) => (
                  <li key={program.slug}>
                    <Link
                      href={`/life/programs/${program.slug}`}
                      className={program.coverImage ? styles.programWithImage : undefined}
                    >
                      {program.coverImage && (
                        <figure className={styles.programImage}>
                          <Image
                            src={program.coverImage.src}
                            alt={program.coverImage.altText}
                            width={program.coverImage.width}
                            height={program.coverImage.height}
                            sizes="(min-width: 600px) 224px, 100vw"
                            unoptimized
                          />
                        </figure>
                      )}
                      <div className={styles.programText}>
                        <span className={styles.meta}>{program.category}</span>
                        <h3>{program.title}</h3>
                        <p>{program.summary}</p>
                        <span className={styles.rowAction}>내용 보기 <Arrow /></span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                {errors.programs ? "프로그램을 불러오지 못했습니다." : "현재 공개된 프로그램이 없습니다."}
              </p>
            )}
          </div>
        </section>

        <section className={`${styles.section} ${styles.updates}`} aria-label="최근 소식과 운영 자료">
          <div>
            <div className={styles.sectionHeading}>
              <h2>최근 소식</h2>
              <MoreLink href="/news">소식 전체</MoreLink>
            </div>
            {posts.length > 0 && (
              <ul className={styles.recordList}>
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link href={`/news/${post.slug}`} className={styles.recordRow}>
                      <div className={styles.meta}>
                        <span>{post.category === "notice" ? "공지사항" : "활동소식"}</span>
                        <time dateTime={post.publishedAt}>{formatPublicDate(post.publishedAt)}</time>
                      </div>
                      <h3>{post.title}</h3>
                      <span className={styles.recordArrow}><Arrow /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {errors.news && <p className={styles.empty}>일부 소식을 불러오지 못했습니다.</p>}
            {!posts.length && !errors.news && <p className={styles.empty}>현재 공개된 소식이 없습니다.</p>}
          </div>
          <div>
            <div className={styles.sectionHeading}>
              <h2>운영 자료</h2>
              <MoreLink href="/transparency">자료 전체</MoreLink>
            </div>
            {documents.length > 0 ? (
              <ul className={styles.recordList}>
                {documents.slice(0, 2).map((document) => (
                  <li key={document.slug}>
                    <a
                      href={`/api/transparency/${document.slug}/document`}
                      className={styles.recordRow}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className={styles.meta}>
                        <span>{transparencyCategoryLabels[document.category]}</span>
                        <span>{document.periodLabel} · {document.fileType}</span>
                      </div>
                      <h3>{document.title}<span className="sr-only"> (새 창)</span></h3>
                      <span className={styles.recordArrow}><Arrow /></span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                {errors.transparency ? "운영 자료를 불러오지 못했습니다." : "현재 공개된 운영 자료가 없습니다."}
              </p>
            )}
          </div>
        </section>
      </div>

      <section className={styles.contactBand} aria-labelledby="home-v2-contact-heading">
        <div className={`${styles.container} ${styles.contactGrid}`}>
          <div>
            <h2 id="home-v2-contact-heading">문의와 방문</h2>
            <p className={styles.description}>{contact.visitInquiryDescription}</p>
          </div>
          <div className={styles.contactInformation}>
            <a className={styles.phone} href={createTelephoneHref(contact.phone)}>
              {contact.phone}<Arrow />
            </a>
            <address>{contact.address}</address>
            <div className={styles.actions}>
              <Link href="/support/contact" className={styles.secondaryButton}>온라인 문의 <Arrow /></Link>
              <MoreLink href="/about/directions">찾아오시는 길</MoreLink>
            </div>
            <p className={styles.note}>온라인 문의에 진단·의료·가족관계 등 민감한 개인정보를 입력하지 마세요.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
