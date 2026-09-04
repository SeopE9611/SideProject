import Link from "next/link";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata = createPublicPageMetadata("/about/directions");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DirectionsPage() {
  const contact = await getPublicContactInformation();
  const mapLinks = [
    { label: "네이버 지도", href: "https://map.naver.com/p/search/" + encodeURIComponent(contact.address) },
    { label: "카카오맵", href: "https://map.kakao.com/?q=" + encodeURIComponent(contact.address) },
  ];
  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="찾아오시는 길"
        description={contact.directionsPageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "찾아오시는 길" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/contact-information" />
      <div className="mx-auto grid max-w-site items-start gap-6 px-page py-8 sm:px-page-wide sm:py-10 lg:grid-cols-12 lg:gap-10">
        <section
          aria-labelledby="directions-address-heading"
          className="min-w-0 border-t-3 border-accent bg-surface-subtle px-6 py-7 sm:p-9 lg:col-span-7"
        >
          <h2 id="directions-address-heading" className="flex items-center gap-2 text-base font-bold text-accent">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-5 shrink-0"
            >
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            주소
          </h2>
          <address className="text-safe-wrap mt-5 max-w-xl text-2xl leading-normal font-bold tracking-tight not-italic sm:text-3xl">
            {contact.address}
          </address>
          <p className="text-safe-wrap mt-7 text-small text-muted-foreground">
            지도에서 위치와 이동 경로를 확인하세요.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {mapLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="inline-flex min-h-14 w-full flex-wrap items-center justify-between gap-2 border border-border-strong bg-surface px-4 py-3 text-small font-bold hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:px-5"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                  <span className="text-xs text-muted-foreground">
                    새 창 <span aria-hidden="true">↗</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <aside aria-labelledby="directions-contact-heading" className="min-w-0 px-1 py-3 sm:px-0 lg:col-span-5 lg:py-7">
          <h2 id="directions-contact-heading" className="text-heading font-bold">
            {contact.visitInquiryTitle}
          </h2>
          <dl className="mt-6">
            <dt className="text-small text-muted-foreground">대표 전화</dt>
            <dd className="text-safe-wrap mt-1 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {contact.phone}
            </dd>
          </dl>
          <p className="text-safe-wrap mt-4 max-w-md leading-7 text-muted-foreground">
            {contact.visitInquiryDescription}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              className="inline-flex min-h-12 items-center justify-center bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              href={createTelephoneHref(contact.phone)}
            >
              전화로 문의하기
            </a>
            <Link className="institution-link text-small" href="/support/contact">
              온라인 문의하기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
