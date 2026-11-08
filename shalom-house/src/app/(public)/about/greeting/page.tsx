import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { getPublicGreeting } from "@/features/site-content/site-content.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import styles from "./greeting-v2.module.css";

export const metadata = createPublicPageMetadata("/about/greeting");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GreetingPage() {
  const greeting = await getPublicGreeting().catch(() => {
    console.error("공개 인사말 조회 실패");
    return null;
  });
  const signerName = greeting?.showSignerName ? greeting.signerName.trim() : "";

  return (
    <div className="section-layout">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="인사말"
        description={greeting?.pageDescription ?? "시설 운영 책임자의 인사말을 전합니다."}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "기관소개", href: "/about" }, { label: "인사말" }]}
        adminAction={<PublicAdminEditLink href="/admin/site-content/greeting" />}
      />
      <div className={styles.canvas}>
        <article className={styles.article} aria-labelledby="greeting-heading">
          {greeting ? (
            <>
              <header className={styles.introduction}>
                {greeting.statusLabel.trim() ? (
                  <p className={styles.status}>{greeting.statusLabel}</p>
                ) : null}
                <h2
                  id="greeting-heading"
                  className={styles.title}
                >
                  {greeting.title}
                </h2>
              </header>
              <div className={styles.message}>
                <div className={styles.paragraphs}>
                  {greeting.paragraphs.map((paragraph, index) => (
                    <p key={index} className={styles.paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                {greeting.signerRole.trim() || signerName ? (
                  <p className={styles.signer}>
                    {greeting.signerRole}
                    {greeting.signerRole.trim() && signerName ? " · " : ""}
                    {signerName}
                  </p>
                ) : null}
                {greeting.notice.trim() ? (
                  <aside
                    aria-label="인사말 게시 안내"
                    className={styles.notice}
                  >
                    {greeting.notice}
                  </aside>
                ) : null}
              </div>
            </>
          ) : (
            <div role="status" className={styles.error}>
              <h2 id="greeting-heading" className={styles.errorTitle}>
                인사말을 불러오지 못했습니다.
              </h2>
              <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
              <a href="/about/greeting" className={styles.link}>
                다시 불러오기
              </a>
            </div>
          )}
          <nav
            aria-label="시설 관련 안내"
            className={styles.navigation}
          >
            <Link className={styles.link} href="/about">
              시설개요 <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.link} href="/about/directions">
              찾아오시는 길 <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
