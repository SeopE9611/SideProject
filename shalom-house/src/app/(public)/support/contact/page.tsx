import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/support/contact");

import Link from "next/link";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";
import { PublicInquiryForm } from "@/components/support/public-inquiry-form";
import { inquiryKinds, type InquiryKind } from "@/features/inquiries/inquiry.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const contact = await getPublicContactInformation();
  const requestedKind = (await searchParams).kind;
  const initialKind: InquiryKind = inquiryKinds.includes(requestedKind as InquiryKind)
    ? (requestedKind as InquiryKind)
    : "general";
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="문의하기"
        description={contact.contactPageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "문의하기" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/contact-information" />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">문의 경로</h2>
        <p className="mt-5 text-small text-muted-foreground">{contact.contactIntroduction}</p>
        <dl className="mt-5 divide-y divide-border border-y">
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">대표 전화</dt>
            <dd className="sm:col-span-2">
              <a className="text-primary underline" href={createTelephoneHref(contact.phone)}>
                {contact.phone}
              </a>
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">주소</dt>
            <dd className="text-safe-wrap sm:col-span-2">{contact.address}</dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">찾아오시는 길</dt>
            <dd className="sm:col-span-2">
              <Link className="text-primary underline" href="/about/directions">
                방문 안내 보기
              </Link>
            </dd>
          </div>
          {contact.showInstagram && contact.instagramUrl ? (
            <div className="grid gap-2 py-5 sm:grid-cols-3">
              <dt className="font-bold">인스타그램</dt>
              <dd className="sm:col-span-2">
                <a
                  className="text-safe-wrap text-primary underline"
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  공식 인스타그램 보기(새 창)
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section className="mx-auto max-w-site px-page pb-16 sm:px-page-wide">
        <h2 className="text-heading font-bold">온라인 문의 접수</h2>
        <p className="mt-3 text-muted-foreground">
          일반 문의, 방문, 자원봉사, 후원과 후원금 영수증·내역 문의를 접수할 수 있습니다.
        </p>
        <PublicInquiryForm initialKind={initialKind} phoneFallback={contact.phone} />
      </section>
    </>
  );
}
