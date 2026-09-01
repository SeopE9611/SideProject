import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/greeting");

import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { getPublicGreeting } from "@/features/site-content/site-content.repository";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GreetingPage() {
  const greeting = await getPublicGreeting();

  return (
    <>
      <SectionPageHeader
        sectionHref="/about"
        eyebrow="시설소개"
        title="인사말"
        description={greeting.pageDescription}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "인사말" }]}
        notice={greeting.notice}
      />
      <PublicAdminEditLink href="/admin/site-content/greeting" />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <p className="font-bold text-accent">{greeting.statusLabel}</p>
        <h2 className="text-safe-wrap mt-3 text-heading font-bold">{greeting.title}</h2>
        {greeting.paragraphs.map((paragraph, index) => (
          <p
            key={`greeting-paragraph-${index}`}
            className="text-safe-wrap mt-4 max-w-3xl text-body text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
        {greeting.signerRole || greeting.showSignerName ? (
          <p className="mt-6 font-semibold">
            {greeting.signerRole}
            {greeting.signerRole && greeting.showSignerName ? " · " : ""}
            {greeting.showSignerName ? greeting.signerName : ""}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-5">
          <Link className="font-bold text-primary underline" href="/about">
            시설개요
          </Link>
          <Link className="font-bold text-primary underline" href="/about/directions">
            찾아오시는 길
          </Link>
        </div>
      </section>
    </>
  );
}
