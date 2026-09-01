import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/support/donation");

import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import {
  getPublicContactInformation,
  getPublicDonationGuidance,
} from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function DonationPage() {
  const [contact, guidance] = await Promise.all([
    getPublicContactInformation(),
    getPublicDonationGuidance(),
  ]);
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="후원하기"
        description={guidance.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "후원하기" }]}
        notice={guidance.notice}
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <PublicAdminEditLink href="/admin/site-content/donation-guidance" />
        <h2 className="text-heading font-bold">후원 방식 확인 절차</h2>
        <ol className="mt-5 list-decimal space-y-4 border-y border-border py-6 pl-6">
          {guidance.steps.map((step) => (
            <li className="text-safe-wrap" key={step}>
              {step}
            </li>
          ))}
        </ol>
        <h2 className="mt-8 text-heading font-bold">{guidance.contactTitle}</h2>
        <p className="mt-3">{guidance.contactDescription}</p>
        <p className="mt-5">
          대표 전화{" "}
          <a className="font-bold text-primary underline" href={createTelephoneHref(contact.phone)}>
            {contact.phone}
          </a>
        </p>
        <Link className="mt-5 inline-flex font-bold text-primary underline" href="/transparency">
          {guidance.transparencyLinkLabel}
        </Link>
        <div className="mt-5 flex flex-wrap gap-5">
          <Link className="font-bold text-primary underline" href="/support/contact?kind=donation">
            {guidance.donationInquiryLabel}
          </Link>
          <Link className="font-bold text-primary underline" href="/support/contact?kind=donation_receipt">
            {guidance.receiptInquiryLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
