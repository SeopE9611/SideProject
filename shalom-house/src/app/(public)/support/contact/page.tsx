import type { Metadata } from "next";
import Link from "next/link";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getPublicContactInformation } from "@/features/site-content/site-content.repository";
import { createTelephoneHref } from "@/features/site-content/site-content.types";

export const metadata: Metadata = { title: "문의하기" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contact = await getPublicContactInformation();
  return <>
    <SectionPageHeader sectionHref="/support" eyebrow="함께하기" title="문의하기"
      description={contact.contactPageDescription}
      breadcrumbs={[{ label: "홈", href: "/" }, { label: "함께하기", href: "/support" }, { label: "문의하기" }]} />
    <PublicAdminEditLink href="/admin/site-content/contact-information" />
    <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
      <h2 className="text-heading font-bold">문의 경로</h2>
      <p className="mt-5 text-small text-muted-foreground">{contact.contactIntroduction}</p>
      <dl className="mt-5 divide-y divide-border border-y">
        <div className="grid gap-2 py-5 sm:grid-cols-3"><dt className="font-bold">대표 전화</dt><dd className="sm:col-span-2"><a className="text-primary underline" href={createTelephoneHref(contact.phone)}>{contact.phone}</a></dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-3"><dt className="font-bold">주소</dt><dd className="text-safe-wrap sm:col-span-2">{contact.address}</dd></div>
        <div className="grid gap-2 py-5 sm:grid-cols-3"><dt className="font-bold">찾아오시는 길</dt><dd className="sm:col-span-2"><Link className="text-primary underline" href="/about/directions">방문 안내 보기</Link></dd></div>
        {contact.showInstagram && contact.instagramUrl ? <div className="grid gap-2 py-5 sm:grid-cols-3"><dt className="font-bold">인스타그램</dt><dd className="sm:col-span-2"><a className="text-safe-wrap text-primary underline" href={contact.instagramUrl} target="_blank" rel="noreferrer">공식 인스타그램 보기(새 창)</a></dd></div> : null}
      </dl>
    </section>
  </>;
}
