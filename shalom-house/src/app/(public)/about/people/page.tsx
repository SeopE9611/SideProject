import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/people");

import Link from "next/link";

import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { listPublicStaffProfiles } from "@/features/staff/staff.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export default async function PeoplePage() {
  const profiles = await listPublicStaffProfiles();

  return (
    <>
      <SectionPageHeader
        sectionHref="/about"
        eyebrow="시설소개"
        title="함께하는 사람들"
        description="직원과 운영 역할을 승인된 범위에서 소개합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "함께하는 사람들" }]}
        notice="직원 정보는 당사자 확인과 홈페이지 공개 승인을 마친 범위에서만 안내합니다."
      />
      <PublicAdminEditLink href="/admin/site-content/people" />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        {profiles.length ? (
          <ul className="grid gap-6 lg:grid-cols-3">
            {profiles.map((profile) => (
              <li key={profile.id} className="border-t-4 border-primary py-6">
                {profile.name?.trim() ? (
                  <>
                    <h2 className="text-safe-wrap mt-5 font-bold">{profile.name}</h2>
                    <p className="text-safe-wrap mt-2">{profile.role}</p>
                  </>
                ) : (
                  <h2 className="text-safe-wrap mt-5 font-bold">{profile.role}</h2>
                )}
                <p className="text-safe-wrap mt-3 text-muted-foreground">{profile.responsibility}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-6">
            <p className="text-small font-bold text-accent">소개 준비 중</p>
            <h2 className="text-safe-wrap mt-2 text-heading font-bold">직원 소개를 준비하고 있습니다.</h2>
            <p className="text-safe-wrap mt-3 max-w-3xl text-muted-foreground">
              직원 이름과 사진은 당사자 확인과 홈페이지 공개 승인을 마친 경우에만 게시합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-5">
              <Link className="font-bold text-primary underline" href="/about">
                시설개요
              </Link>
              <Link className="font-bold text-primary underline" href="/support/contact">
                문의하기
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
