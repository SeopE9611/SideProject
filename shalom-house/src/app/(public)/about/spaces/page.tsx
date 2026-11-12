import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { listPublicFacilitySpaces } from "@/features/facility-spaces/facility-space.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import styles from "./spaces-v2.module.css";

export const metadata = createPublicPageMetadata("/about/spaces");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const spaces = await listPublicFacilitySpaces().catch(() => {
    console.error("공개 생활공간 조회 실패");
    return null;
  });

  return (
    <div className="section-layout">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="생활공간"
        description="시설의 공간과 쓰임을 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "기관소개", href: "/about" }, { label: "생활공간" }]}
        adminAction={<PublicAdminEditLink href="/admin/site-content/spaces" label="생활공간 수정" />}
      />
      <div className={styles.canvas}>
        <section aria-labelledby="spaces-heading" className={styles.content}>
          <header className={styles.introduction}>
            <p className={styles.kicker}>공간과 쓰임</p>
            <h2 id="spaces-heading" className={styles.title}>공간 안내</h2>
          </header>
          {spaces === null ? (
            <div className={styles.error} role="status">
              <h3 className={styles.errorTitle}>생활공간 안내를 불러오지 못했습니다.</h3>
              <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
              <a className={styles.link} href="/about/spaces">
                다시 불러오기
              </a>
            </div>
          ) : spaces.length ? (
            <ul className={styles.list}>
              {spaces.map((space, index) => (
                <li className={`${styles.space} ${space.media ? styles.withMedia : ""}`} key={space.id}>
                  <div className={styles.copy}>
                    <div className={styles.identity}>
                      <h3 className={styles.spaceTitle}>{space.title}</h3>
                      <span className={styles.number} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className={styles.description}>{space.description}</p>
                  </div>
                  {space.media ? (
                    // eslint-disable-next-line @next/next/no-img-element -- no-store 공개 프록시의 즉시 접근 차단 의미를 유지합니다.
                    <img
                      src={space.media.src}
                      alt={space.media.altText}
                      width={space.media.width}
                      height={space.media.height}
                      loading="lazy"
                      className={styles.image}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="현재 공개된 생활공간 안내가 없습니다."
              description={
                <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                  방문에 필요한 주소와 연락처는 찾아오시는 길에서 확인할 수 있습니다.
                </p>
              }
              variant="list"
              className="[&_h3]:text-lg"
            />
          )}
          <nav aria-label="생활공간 관련 안내" className={styles.navigation}>
            <Link className={styles.link} href="/about">
              시설개요 <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.link} href="/about/directions">
              찾아오시는 길 <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </section>
      </div>
    </div>
  );
}
