import Image from "next/image";
import programSample from "@/content/fixtures/assets/landscape.webp";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedFixtureNewsPosts } from "@/content/fixtures/news.fixture";
import { visualProgramFixtures, visualDocumentFixtures } from "@/content/fixtures/visual.fixture";
import { HomeV2Hero } from "./home-v2-hero";
import {
  defaultFacilityOverviewContent as overview,
  defaultContactInformationContent as contact,
} from "@/features/site-content/site-content.defaults";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { transparencyCategoryLabels } from "@/features/transparency/transparency.types";
import { formatPublicDate } from "@/lib/format-public-date";
import { HomeV2Navigation } from "./home-v2-navigation";
import styles from "./home-v2.module.css";

const base = "/design-preview/home-v2";
const news = getPublishedFixtureNewsPosts();

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.moreLink}>
      {children}
      <Arrow />
    </Link>
  );
}

function ReviewControls({ photo, empty }: { photo: boolean; empty: boolean }) {
  return (
    <details className={styles.reviewControls}>
      <summary>사진·데이터 상태 비교</summary>
      <form action={base} method="get">
        <label>
          대표 사진
          <select name="photo" defaultValue={photo ? "sample" : "none"}>
            <option value="none">사진 없음</option>
            <option value="sample">테스트 사진 있음</option>
          </select>
        </label>
        <label>
          목록 데이터
          <select name="data" defaultValue={empty ? "empty" : "filled"}>
            <option value="filled">고정 예시 있음</option>
            <option value="empty">목록 0건</option>
          </select>
        </label>
        <button type="submit" className={styles.secondaryButton}>
          상태 적용 <Arrow />
        </button>
      </form>
      <p>소개·연락처는 기존 기본값이며, 프로그램·소식·자료는 실제 기록이 아닌 고정 테스트 데이터입니다.</p>
    </details>
  );
}

function Contact() {
  return (
    <section className={styles.contactBand} aria-labelledby="v2-contact-heading">
      <div className={`${styles.container} ${styles.contactGrid}`}>
        <div>
          <h2 id="v2-contact-heading">문의와 방문</h2>
          <p className={styles.description}>{contact.visitInquiryDescription}</p>
        </div>
        <div className={styles.contactInformation}>
          <a className={styles.phone} href={createTelephoneHref(contact.phone)}>
            {contact.phone}
            <Arrow />
          </a>
          <address>{contact.address}</address>
          <div className={styles.actions}>
            <Link href="/support/contact" className={styles.secondaryButton}>
              온라인 문의 <Arrow />
            </Link>
            <MoreLink href="/about/directions">찾아오시는 길</MoreLink>
          </div>
          <p className={styles.note}>온라인 문의에 진단·의료·가족관계 등 민감한 개인정보를 입력하지 마세요.</p>
        </div>
      </div>
    </section>
  );
}

function Home({ photo, empty }: { photo: boolean; empty: boolean }) {
  const posts = empty ? [] : news.slice(0, 3);
  const programs = empty ? [] : visualProgramFixtures;
  const documents = empty ? [] : visualDocumentFixtures.slice(0, 2);
  return (
    <>
      <div className={styles.introBand}>
        <HomeV2Hero
          photo={photo}
          introduction={overview.pageDescription}
          principles={overview.principles}
        />
        <div className={styles.container}>
          <nav className={styles.purposeNavigation} aria-label="방문 목적별 안내">
            <Link href={`${base}/admission`}>
              <div>
                <strong>입소·이용 문의</strong>
                <span>일반 연락 경로를 확인합니다</span>
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
        <section className={`${styles.section} ${styles.lifeSection}`} aria-labelledby="v2-life-heading">
          <div className={styles.sectionHeading}>
            <h2 id="v2-life-heading">생활과 활동</h2>
            <MoreLink href="/life">생활·활동 보기</MoreLink>
          </div>
          <p className={styles.programNote}>프로그램 · 고정 테스트 데이터 · 실제 운영 기록 아님</p>
          <div className={styles.programArea}>
            {programs.length > 0 ? (
              <ul className={styles.programList}>
                {programs.map((program) => {
                  // The fixture API is development-only; reuse its exact static asset in this isolated Preview.
                  const cover = program.coverImage;
                  const previewImage = cover?.src === "/api/gallery/fixture-landscape/media" ? programSample : null;
                  return (
                    <li key={program.slug}>
                      <Link href={`${base}/programs/${program.slug}`}
                        className={previewImage ? styles.programWithImage : undefined}>
                        {previewImage && cover && (
                          <figure className={styles.programImage}>
                            <Image src={previewImage} alt={cover.altText} width={cover.width} height={cover.height}
                              sizes="(min-width: 600px) 224px, 100vw" unoptimized />
                            <figcaption>도형 테스트 이미지 · 실제 기관 사진 아님</figcaption>
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
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>현재 표시할 프로그램이 없습니다.</p>
            )}
          </div>
        </section>
        <section className={`${styles.section} ${styles.updates}`} aria-label="최근 소식과 운영 자료">
          <div>
            <div className={styles.sectionHeading}>
              <h2>최근 소식</h2>
              <MoreLink href="/news">소식 전체</MoreLink>
            </div>
            {posts.length > 0 ? (
              <ul className={styles.recordList}>
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link href={`${base}/news/${post.slug}`} className={styles.recordRow}>
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
            ) : (
              <p className={styles.empty}>현재 표시할 소식이 없습니다.</p>
            )}
          </div>
          <div>
            <div className={styles.sectionHeading}>
              <h2>운영 자료</h2>
              <MoreLink href="/transparency">자료 전체</MoreLink>
            </div>
            {documents.length > 0 ? (
              <ul className={styles.recordList}>
                {documents.map((document) => (
                  <li key={document.slug}>
                    <Link href={`${base}/documents/${document.slug}`} className={styles.recordRow}>
                      <div className={styles.meta}>
                        <span>{transparencyCategoryLabels[document.category]}</span>
                        <span>
                          {document.periodLabel} · {document.fileType}
                        </span>
                      </div>
                      <h3>{document.title}</h3>
                      <span className={styles.recordArrow}><Arrow /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>현재 표시할 운영 자료가 없습니다.</p>
            )}
          </div>
        </section>
      </div>
      <Contact />
    </>
  );
}

function Admission() {
  return (
    <article className={`${styles.container} ${styles.detail}`}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={base}>메인 V2 시안</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">입소·이용</span>
      </nav>
      <div className={styles.readingWidth}>
        <h1>입소·이용 문의</h1>
        <p className={styles.status}>검토용 화면 · 공식 이용 정보 미확정</p>
        <p className={styles.description}>
          입소·이용에 관한 질문은 기존 대표 전화 또는 일반 문의로 연락할 수 있습니다.
        </p>
        <p>
          이 화면은 운영용 입소 안내 페이지가 아닙니다. 입소 자격·정원·신청 절차·승인 여부를 안내하거나 접수하지
          않습니다.
        </p>
        <div className={styles.actions}>
          <Link href="/support/contact?kind=general" className={styles.primaryButton}>
            일반 문의하기 <Arrow />
          </Link>
          <a className={styles.secondaryButton} href={createTelephoneHref(contact.phone)}>
            {contact.phone}
            <Arrow />
          </a>
        </div>
        <p className={styles.note}>일반 문의에 민감한 의료·장애·가족 정보를 입력하지 마세요.</p>
      </div>
    </article>
  );
}

function FixtureDetail({ screen }: { screen: string[] }) {
  const [kind, slug] = screen;
  const post = kind === "news" ? news.find((item) => item.slug === slug) : undefined;
  const program = kind === "programs" ? visualProgramFixtures.find((item) => item.slug === slug) : undefined;
  const document = kind === "documents" ? visualDocumentFixtures.find((item) => item.slug === slug) : undefined;
  const item = post ?? program ?? document;
  if (screen.length !== 2 || !item) notFound();
  const label = post ? "소식 예시" : program ? "프로그램 예시" : "자료 예시";
  return (
    <article className={`${styles.container} ${styles.detail}`}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={base}>메인 V2 시안</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{label}</span>
      </nav>
      <div className={styles.readingWidth}>
        <p className={styles.status}>고정 테스트 데이터 · 실제 기관 기록 아님</p>
        <h1>{item.title}</h1>
        <p className={styles.description}>{item.summary}</p>
        {post && (
          <>
            <time dateTime={post.publishedAt}>{formatPublicDate(post.publishedAt)}</time>
            {post.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </>
        )}
        {program && (
          <>
            <h2>목적</h2>
            <p>{program.purpose}</p>
            {program.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </>
        )}
        {document && (
          <>
            <dl className={styles.documentFacts}>
              <div>
                <dt>분류</dt>
                <dd>{transparencyCategoryLabels[document.category]}</dd>
              </div>
              <div>
                <dt>기준 기간</dt>
                <dd>{document.periodLabel}</dd>
              </div>
              <div>
                <dt>형식</dt>
                <dd>{document.fileType}</dd>
              </div>
            </dl>
            <p>자료 정보의 표시 예시입니다. 실제 PDF 다운로드는 제공하지 않습니다.</p>
          </>
        )}
        <div className={styles.actions}>
          <Link href={base} className={styles.secondaryButton}>
            시안 홈으로 돌아가기 <Arrow />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HomeV2Preview({ screen, photo, empty }: { screen: string[]; photo: boolean; empty: boolean }) {
  const home = screen.length === 0;
  const admission = screen.length === 1 && screen[0] === "admission";
  if (!home && !admission && (screen.length !== 2 || !["news", "programs", "documents"].includes(screen[0])))
    notFound();
  return (
    <div className={styles.preview}>
      <a href="#home-v2-main" className={styles.skipLink}>
        본문 바로가기
      </a>
      <aside className={styles.reviewBar}>
        <div className={styles.reviewInner}>
          <span>
            <strong>메인 V2 시안</strong> · 고정 예시 콘텐츠 · 저장 기능 없음
          </span>
          <Link href="/design-preview">
            기존 시안 보기 <Arrow />
          </Link>
        </div>
      </aside>
      <HomeV2Navigation key={screen.join("/")} admission={admission} />
      {home && (
        <div className={styles.container}>
          <ReviewControls photo={photo} empty={empty} />
        </div>
      )}
      <main id="home-v2-main" tabIndex={-1}>
        {home ? <Home photo={photo} empty={empty} /> : admission ? <Admission /> : <FixtureDetail screen={screen} />}
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <Image src="/brand/logo-header.svg" width={1400} height={360} alt="샬롬의집" unoptimized />
          <p>메인 홈페이지 디자인 검토용 화면입니다. 실제 기관 기록·프로그램·공개자료가 아닙니다.</p>
          <Link href="/">
            운영 홈페이지 보기 <Arrow />
          </Link>
        </div>
      </footer>
    </div>
  );
}
