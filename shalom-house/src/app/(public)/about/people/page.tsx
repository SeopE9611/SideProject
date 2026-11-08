import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { listPublicStaffProfiles } from "@/features/staff/staff.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import styles from "./people-v2.module.css";

export const metadata = createPublicPageMetadata("/about/people");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const profiles = await listPublicStaffProfiles().catch(() => {
    console.error("공개 직원 소개 조회 실패");
    return null;
  });

  return (
    <div className="section-layout">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="함께하는 사람들"
        description="직원의 역할과 담당 업무를 소개합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "기관소개", href: "/about" }, { label: "함께하는 사람들" }]}
        adminAction={<PublicAdminEditLink href="/admin/site-content/people" />}
      />
      <div className={styles.canvas}>
        <section aria-labelledby="staff-heading" className={styles.content}>
          <header className={styles.introduction}>
            <p className={styles.kicker}>공개된 역할</p>
            <h2
              id="staff-heading"
              className={styles.title}
            >
              직원과 담당 업무
            </h2>
          </header>
          {profiles === null ? (
            <div className={styles.error} role="status">
              <h3 className={styles.errorTitle}>직원 소개를 불러오지 못했습니다.</h3>
              <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
              <a className={styles.link} href="/about/people">
                다시 불러오기
              </a>
            </div>
          ) : profiles.length ? (
            <ul className={styles.list}>
              {profiles.map((profile, index) => (
                <li
                  key={profile.id}
                  className={styles.row}
                >
                  <div className={styles.identity}>
                    <h3 className={styles.role}>{profile.role}</h3>
                    {profile.name?.trim() ? (
                      <p className={styles.name}>{profile.name}</p>
                    ) : null}
                    <span className={styles.number} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className={styles.responsibility}>
                    {profile.responsibility}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="현재 공개된 직원 소개가 없습니다."
              description={
                <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                  시설에 관한 질문은 문의 페이지에서 접수할 수 있습니다.
                </p>
              }
              variant="list"
              className="[&_h3]:text-lg"
            />
          )}
          <nav aria-label="직원 소개 관련 안내" className={styles.navigation}>
            <Link className={styles.link} href="/about">
              시설개요 <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.link} href="/support/contact">
              문의하기 <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </section>
      </div>
    </div>
  );
}
