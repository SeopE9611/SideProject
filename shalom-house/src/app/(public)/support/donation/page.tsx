import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import {
  getPublicContactInformation,
  getPublicDonationGuidance,
} from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/support/donation");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DonationPage() {
  const [contact, guidance] = await Promise.all([getPublicContactInformation(), getPublicDonationGuidance()]);
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/support"
        eyebrow="함께하기"
        title="후원하기"
        description={guidance.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "후원하기" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/donation-guidance" />
      <div className="mx-auto grid max-w-site items-start gap-9 px-page py-9 sm:px-page-wide sm:py-12 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="donation-steps-heading" className="min-w-0 lg:col-span-8">
          <p className="text-small font-bold text-accent">확인 순서</p>
          <h2 id="donation-steps-heading" className="mt-2 text-[1.75rem] font-bold tracking-[-0.025em]">
            후원 방식 확인 절차
          </h2>
          <p className="text-safe-wrap mt-5 border-l-4 border-accent bg-surface-subtle px-5 py-4 text-small leading-7">
            {guidance.notice}
          </p>
          <ol className="mt-6 border-t-2 border-foreground">
            {guidance.steps.map((step, index) => (
              <li
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-border py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
                key={index}
              >
                <span className="text-title font-bold text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-safe-wrap text-body leading-8">{step}</p>
              </li>
            ))}
          </ol>
          <Link className="institution-link mt-5" href="/transparency">
            {guidance.transparencyLinkLabel} <span aria-hidden="true">→</span>
          </Link>
        </section>
        <aside
          aria-labelledby="donation-contact-heading"
          className="min-w-0 border-t-4 border-accent bg-accent-soft p-6 sm:p-8 lg:col-span-4"
        >
          <p className="text-small font-bold text-accent">후원 문의</p>
          <h2 id="donation-contact-heading" className="text-safe-wrap mt-2 text-heading font-bold">
            {guidance.contactTitle}
          </h2>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            {guidance.contactDescription}
          </p>
          <Link
            className="text-safe-wrap mt-5 inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            href="/support/contact?kind=donation#inquiry-form"
          >
            {guidance.donationInquiryLabel}
          </Link>
          <dl className="mt-6 border-t border-border pt-4">
            <dt className="text-small text-muted-foreground">대표 전화</dt>
            <dd>
              <a className="institution-link text-heading" href={createTelephoneHref(contact.phone)}>
                {contact.phone}
              </a>
            </dd>
          </dl>
          <Link
            className="institution-link text-safe-wrap mt-4"
            href="/support/contact?kind=donation_receipt#inquiry-form"
          >
            {guidance.receiptInquiryLabel} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
