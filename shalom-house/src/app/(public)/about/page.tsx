import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import {
  getPublicContactInformation,
  getPublicFacilityOverview,
} from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import styles from "./about-v2.module.css";

export const metadata = createPublicPageMetadata("/about");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default async function AboutPage() {
  const [content, contact] = await Promise.all([getPublicFacilityOverview(), getPublicContactInformation()]);
  return (
    <div className="section-layout">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="시설개요"
        description={content.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "기관소개" }]}
        adminAction={<PublicAdminEditLink href="/admin/site-content/facility-overview" />}
      />
      <div className={styles.page}>
        <section className={styles.facts} aria-labelledby="about-summary-heading">
          <div className={styles.sectionLead}>
            <div>
              <p className={styles.kicker}>샬롬의집 안내</p>
              <h2 id="about-summary-heading">시설 기본정보</h2>
            </div>
          </div>
          <dl className={styles.factGrid}>
            {content.facts.map((item, index) => (
              <div key={index} className={styles.fact}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.principles} aria-labelledby="about-principles-heading">
          <div className={styles.principleIntro}>
            <p className={styles.kicker}>{content.principlesEyebrow}</p>
            <h2 id="about-principles-heading">{content.principlesTitle}</h2>
            <p className={styles.introDescription}>{content.principlesDescription}</p>
          </div>
          <ul className={styles.principleList}>
            {content.principles.map((item, index) => (
              <li key={index}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.scenes} aria-labelledby="about-scenes-heading">
          <div className={styles.sectionLead}>
            <div>
              <p className={styles.kicker}>{content.scenesEyebrow}</p>
              <h2 id="about-scenes-heading">{content.scenesTitle}</h2>
            </div>
            <Link className={styles.inlineLink} href="/life">생활·활동 보기 <Arrow /></Link>
          </div>
          <p className={styles.scenesDescription}>{content.scenesDescription}</p>
          <ul className={styles.sceneGrid}>
            {content.scenes.map((item, index) => (
              <li key={index}>
                <p className={styles.sceneLabel}>{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.closingGrid}>
          <div className={styles.policy}>
            <details>
              <summary>{content.policyEyebrow}<span aria-hidden="true">＋</span></summary>
              <div className={styles.policyContent}>
                <h2>{content.policyTitle}</h2>
                <ul>
                  {content.policyItems.map((item, index) => (
                    <li key={index}>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
            <Link className={styles.inlineLink} href="/transparency">자료공개 보기 <Arrow /></Link>
          </div>
          <aside className={styles.contact} aria-labelledby="about-contact-heading">
            <p className={styles.contactKicker}>문의와 방문</p>
            <h2 id="about-contact-heading">{contact.visitInquiryTitle}</h2>
            <p>{contact.visitInquiryDescription}</p>
            <a className={styles.phone} href={createTelephoneHref(contact.phone)}>{contact.phone} <Arrow /></a>
            <address>{contact.address}</address>
            <Link className={styles.contactLink} href="/about/directions">찾아오시는 길 <Arrow /></Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
