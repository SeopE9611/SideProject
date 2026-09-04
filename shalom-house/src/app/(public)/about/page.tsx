import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import {
  getPublicContactInformation,
  getPublicFacilityOverview,
} from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/about");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const relatedLinks = [
  { label: "인사말", href: "/about/greeting" },
  { label: "함께하는 사람들", href: "/about/people" },
  { label: "생활공간", href: "/about/spaces" },
  { label: "자료공개", href: "/transparency" },
];

export default async function AboutPage() {
  const [content, contact] = await Promise.all([getPublicFacilityOverview(), getPublicContactInformation()]);
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="시설개요"
        description={content.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/facility-overview" />
      <div className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-10">
        <section aria-labelledby="about-summary-heading">
          <h2 id="about-summary-heading" className="text-heading font-bold">
            시설 기본정보
          </h2>
          <dl className="mt-5 grid gap-px border-y border-border border-t-3 border-t-accent bg-border sm:grid-cols-3">
            {content.facts.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-3 bg-surface-subtle px-5 py-5 sm:block sm:px-7 sm:py-7"
              >
                <dt className="text-safe-wrap text-small font-medium text-muted-foreground">{item.label}</dt>
                <dd className="text-safe-wrap text-lg leading-relaxed font-bold text-primary sm:mt-3 sm:text-xl">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="mt-10 grid items-start gap-10 sm:mt-12 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 space-y-10 sm:space-y-12 lg:col-span-8">
            <section aria-labelledby="about-principles-heading">
              <h2
                id="about-principles-heading"
                className="text-safe-wrap text-2xl font-bold tracking-tight sm:text-[1.75rem]"
              >
                {content.principlesEyebrow}
              </h2>
              <p className="text-safe-wrap mt-5 text-lg font-semibold">{content.principlesTitle}</p>
              <p className="text-safe-wrap mt-2 max-w-2xl text-body text-muted-foreground">
                {content.principlesDescription}
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {content.principles.map((item, index) => (
                  <li key={index} className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5">
                    <h3 className="text-safe-wrap text-lg font-semibold">{item.title}</h3>
                    <p className="text-safe-wrap text-small leading-7 text-muted-foreground">{item.description}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="about-scenes-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="about-scenes-heading"
                  className="text-safe-wrap text-2xl font-bold tracking-tight sm:text-[1.75rem]"
                >
                  {content.scenesEyebrow}
                </h2>
                <Link className="institution-link text-small" href="/life">
                  생활이야기 보기 <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="text-safe-wrap mt-5 text-lg font-semibold">{content.scenesTitle}</p>
              <p className="text-safe-wrap mt-2 max-w-2xl text-body text-muted-foreground">
                {content.scenesDescription}
              </p>
              <ul className="mt-6 grid gap-x-6 sm:grid-cols-3">
                {content.scenes.map((item, index) => (
                  <li key={index} className="min-w-0 border-t border-border py-5">
                    <p className="text-small font-semibold text-accent">{item.label}</p>
                    <div className="mt-3 min-w-0">
                      <h3 className="text-safe-wrap text-lg font-bold">{item.title}</h3>
                      <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <details className="border-y border-border">
              <summary className="text-safe-wrap min-h-12 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                {content.policyEyebrow}
              </summary>
              <div className="pb-5">
                <h2 className="text-safe-wrap font-medium">{content.policyTitle}</h2>
                <ul className="mt-4 space-y-4">
                  {content.policyItems.map((item, index) => (
                    <li key={index}>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-safe-wrap mt-1 text-small leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
          <aside aria-label="시설 안내와 방문 문의" className="min-w-0 lg:col-span-4">
            <nav aria-label="시설 관련 안내" className="bg-primary-soft p-6 sm:p-7">
              <h2 className="text-heading font-bold">관련 안내</h2>
              <ul className="mt-3 divide-y divide-border">
                {relatedLinks.map((item) => (
                  <li key={item.href}>
                    <Link className="institution-link flex w-full justify-between py-3" href={item.href}>
                      {item.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <section aria-labelledby="about-contact-heading" className="mt-8 px-1">
              <h2 id="about-contact-heading" className="text-heading font-bold">
                {contact.visitInquiryTitle}
              </h2>
              <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
                {contact.visitInquiryDescription}
              </p>
              <a
                className="institution-link mt-3 text-[1.75rem] tracking-tight"
                href={createTelephoneHref(contact.phone)}
              >
                {contact.phone}
              </a>
              <address className="text-safe-wrap mt-2 text-small leading-7 not-italic text-muted-foreground">
                {contact.address}
              </address>
              <Link className="institution-link mt-2" href="/about/directions">
                찾아오시는 길 <span aria-hidden="true">→</span>
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
