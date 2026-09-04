import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicInquiryForm } from "@/components/support/public-inquiry-form";
import { inquiryKinds, type InquiryKind } from "@/features/inquiries/inquiry.types";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/support/contact");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const [contact, params] = await Promise.all([getPublicContactInformation(), searchParams]);
  const initialKind: InquiryKind = inquiryKinds.includes(params.kind as InquiryKind)
    ? (params.kind as InquiryKind)
    : "general";
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/support"
        eyebrow="함께하기"
        title="문의하기"
        description={contact.contactPageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "문의하기" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/contact-information" />
      <div className="mx-auto grid max-w-site items-start gap-9 px-page py-9 sm:px-page-wide sm:py-12 lg:grid-cols-12 lg:gap-12">
        <section id="inquiry-form" aria-labelledby="inquiry-heading" className="min-w-0 lg:col-span-8">
          <p className="text-small font-bold text-accent">온라인 접수</p>
          <h2 id="inquiry-heading" className="mt-2 text-[1.75rem] font-bold tracking-[-0.025em]">
            문의 내용을 남겨 주세요
          </h2>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            문의 종류를 선택하고 내용을 남겨 주세요. 후원·자원봉사·방문 문의도 이곳에서 접수합니다.
          </p>
          <PublicInquiryForm key={initialKind} initialKind={initialKind} phoneFallback={contact.phone} />
        </section>
        <aside
          aria-labelledby="contact-paths-heading"
          className="min-w-0 border-t-4 border-accent bg-accent-soft p-6 sm:p-8 lg:col-span-4"
        >
          <p className="text-small font-bold text-accent">대표 문의</p>
          <h2 id="contact-paths-heading" className="mt-2 text-heading font-bold">
            다른 문의 방법
          </h2>
          <p className="text-safe-wrap mt-3 text-small leading-7 text-muted-foreground">
            {contact.contactIntroduction}
          </p>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-small text-muted-foreground">대표 전화</dt>
              <dd>
                <a className="institution-link text-heading" href={createTelephoneHref(contact.phone)}>
                  {contact.phone}
                </a>
              </dd>
            </div>
            <div className="border-t border-border pt-4">
              <dt className="text-small text-muted-foreground">주소</dt>
              <dd className="text-safe-wrap mt-2 leading-7">{contact.address}</dd>
            </div>
          </dl>
          <Link className="institution-link mt-2" href="/about/directions">
            찾아오시는 길 <span aria-hidden="true">→</span>
          </Link>
          {contact.showInstagram && contact.instagramUrl ? (
            <p className="mt-4 border-t border-border pt-4">
              <a className="institution-link" href={contact.instagramUrl} target="_blank" rel="noreferrer">
                공식 인스타그램 <span className="text-xs">(새 창)</span>
              </a>
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
