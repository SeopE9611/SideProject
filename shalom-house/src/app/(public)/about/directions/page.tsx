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
      <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14">
        <div className="grid items-stretch gap-5 lg:grid-cols-12 lg:gap-8">
          <section
            aria-labelledby="directions-address-heading"
            className="min-w-0 border-t-4 border-accent bg-primary px-7 py-8 text-primary-foreground sm:p-10 lg:col-span-7 lg:p-12"
          >
            <p className="text-small font-bold text-sun-soft">방문 위치</p>
            <h2
              id="directions-address-heading"
              className="text-safe-wrap mt-3 text-[1.875rem] font-extrabold tracking-[-0.025em] sm:text-[2.25rem]"
            >
              주소를 확인하고 지도를 열어보세요
            </h2>
            <address className="text-safe-wrap mt-8 max-w-2xl text-[1.75rem] leading-snug font-bold tracking-[-0.025em] not-italic sm:text-[2.35rem]">
              {contact.address}
            </address>
            <p className="text-safe-wrap mt-8 text-small text-primary-foreground/72">
              선택한 지도 서비스가 새 창에서 열립니다.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {mapLinks.map((link) => (
                <li key={link.href}>
                  <a
                    className="group inline-flex min-h-14 w-full items-center justify-between gap-3 bg-surface px-5 py-3 text-small font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-surface"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                    <span className="text-small transition-transform group-hover:translate-x-1" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <aside
            aria-labelledby="directions-contact-heading"
            className="min-w-0 border-t-4 border-paper-strong bg-paper px-7 py-8 sm:p-10 lg:col-span-5 lg:p-12"
          >
            <p className="text-small font-bold text-accent">방문 전 확인</p>
            <h2
              id="directions-contact-heading"
              className="text-safe-wrap mt-3 text-[1.875rem] font-extrabold tracking-[-0.025em]"
            >
              {contact.visitInquiryTitle}
            </h2>
            <dl className="mt-8">
              <dt className="text-small text-muted-foreground">대표 전화</dt>
              <dd className="text-safe-wrap mt-2 text-[2rem] font-extrabold tracking-[-0.025em] text-primary sm:text-[2.5rem]">
                {contact.phone}
              </dd>
            </dl>
            <p className="text-safe-wrap mt-5 max-w-md text-small leading-8 text-muted-foreground">
              {contact.visitInquiryDescription}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <a
                className="inline-flex min-h-13 items-center justify-center bg-primary px-5 py-3 font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                href={createTelephoneHref(contact.phone)}
              >
                전화로 문의하기
              </a>
              <Link
                className="inline-flex min-h-13 items-center justify-center border border-primary px-5 py-3 font-bold text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
                href="/support/contact"
              >
                온라인 문의
              </Link>
            </div>
          </aside>
        </div>

        <section aria-labelledby="visit-order-heading" className="mt-8 border-y border-border py-7 sm:mt-10 sm:py-8">
          <h2 id="visit-order-heading" className="sr-only">
            방문 정보 확인 순서
          </h2>
          <ol className="grid gap-6 sm:grid-cols-3 sm:gap-0">
            {[
              ["01", "주소 확인", "방문 위치를 먼저 확인합니다."],
              ["02", "지도 열기", "이동 경로는 지도 서비스에서 확인합니다."],
              ["03", "방문 전 문의", "일정과 출입 안내는 대표 전화로 확인합니다."],
            ].map(([number, title, description]) => (
              <li
                key={number}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 sm:border-l sm:border-border sm:px-6 sm:first:border-l-0 sm:first:pl-0"
              >
                <span className="text-small font-bold tabular-nums text-accent" aria-hidden="true">
                  {number}
                </span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-safe-wrap mt-1 text-small text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
