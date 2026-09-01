import type { Metadata } from "next";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { getPublicFacilityOverview } from "@/features/site-content/site-content.repository";

export const metadata: Metadata = {
  title: "시설소개",
  description: "지체 및 지적 장애인이 서로의 속도와 선택을 존중하며 함께 생활하는 샬롬의 집을 소개합니다.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await getPublicFacilityOverview();
  return (
    <>
      <SectionPageHeader
        sectionHref="/about"
        eyebrow="시설소개"
        title="시설개요"
        description={content.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/facility-overview" />
      <section className="bg-surface py-12 sm:py-16" aria-labelledby="about-summary-heading">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <h2 id="about-summary-heading" className="text-safe-wrap sr-only">
            시설 기본 정보
          </h2>
          <dl className="grid border-y border-border sm:grid-cols-3">
            {content.facts.map((item, index) => (
              <div
                key={`fact-${index}`}
                className="border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"
              >
                <dt className="text-safe-wrap text-small font-bold text-primary">{item.label}</dt>
                <dd className="text-safe-wrap mt-2 text-body">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section aria-labelledby="about-principles-heading" className="bg-surface-subtle py-12 sm:py-16">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-accent">{content.principlesEyebrow}</p>
          <h2 id="about-principles-heading" className="text-safe-wrap mt-3 text-display font-bold">
            {content.principlesTitle}
          </h2>
          <p className="text-safe-wrap mt-4 max-w-3xl text-body text-muted-foreground">
            {content.principlesDescription}
          </p>
          <ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3">
            {content.principles.map((item, index) => (
              <li key={`principle-${index}`} className="border-b border-border py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <p className="text-small font-bold text-accent">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="text-safe-wrap mt-3 text-heading font-bold">{item.title}</h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section aria-labelledby="about-scenes-heading" className="bg-surface py-12 sm:py-16">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-primary">{content.scenesEyebrow}</p>
          <h2 id="about-scenes-heading" className="text-safe-wrap mt-3 text-display font-bold">
            {content.scenesTitle}
          </h2>
          <p className="text-safe-wrap mt-4 max-w-3xl text-muted-foreground">{content.scenesDescription}</p>
          <ol className="mt-8 grid border-t-2 border-foreground lg:grid-cols-3">
            {content.scenes.map((item, index) => (
              <li key={`scene-${index}`} className="border-b border-border py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <p className="text-safe-wrap text-small font-bold text-accent">
                  {String(index + 1).padStart(2, "0")} · {item.label}
                </p>
                <h3 className="text-safe-wrap mt-3 text-heading font-bold">{item.title}</h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section aria-labelledby="about-policy-heading" className="bg-surface-subtle py-12 sm:py-16">
        <div className="mx-auto max-w-site px-page sm:px-page-wide">
          <p className="text-safe-wrap text-small font-bold text-primary">{content.policyEyebrow}</p>
          <h2 id="about-policy-heading" className="text-safe-wrap mt-3 max-w-3xl text-display font-bold">
            {content.policyTitle}
          </h2>
          <div className="mt-8 grid border-t-4 border-primary sm:grid-cols-2">
            {content.policyItems.map((item, index) => (
              <div
                key={`policy-${index}`}
                className={
                  index === 0 ? "border-b border-border py-6 sm:border-b-0 sm:border-r sm:pr-8" : "py-6 sm:pl-8"
                }
              >
                <h3 className="text-safe-wrap font-bold">{item.title}</h3>
                <p className="text-safe-wrap mt-3 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
