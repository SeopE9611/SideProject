import Link from "next/link";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { listPublicStaffProfiles } from "@/features/staff/staff.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/people");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const profiles = await listPublicStaffProfiles().catch(() => {
    console.error("공개 직원 소개 조회 실패");
    return null;
  });

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="함께하는 사람들"
        description="직원의 역할과 담당 업무를 소개합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "함께하는 사람들" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/people" />
      <section aria-labelledby="staff-heading" className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12">
        <p className="text-small font-bold text-accent">공개된 역할</p>
        <h2
          id="staff-heading"
          className="mt-2 border-b-2 border-foreground pb-5 text-[1.75rem] font-bold tracking-[-0.025em]"
        >
          직원과 담당 업무
        </h2>
        {profiles === null ? (
          <div className="border-b border-border py-6" role="status">
            <h3 className="text-lg font-semibold">직원 소개를 불러오지 못했습니다.</h3>
            <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            <a className="institution-link mt-3" href="/about/people">
              다시 불러오기
            </a>
          </div>
        ) : profiles.length ? (
          <ul className="divide-y divide-border border-b border-border">
            {profiles.map((profile, index) => (
              <li
                key={profile.id}
                className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 md:grid-cols-[3rem_minmax(0,0.9fr)_minmax(0,1.6fr)] md:gap-x-8"
              >
                <span className="text-lg font-bold text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-safe-wrap text-[1.2rem] font-semibold">{profile.role}</h3>
                  {profile.name?.trim() ? (
                    <p className="text-safe-wrap mt-2 text-small text-muted-foreground">{profile.name}</p>
                  ) : null}
                </div>
                <p className="text-safe-wrap col-start-2 max-w-content whitespace-pre-wrap text-body leading-8 md:col-start-auto">
                  {profile.responsibility}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-b border-border py-6">
            <h3 className="text-safe-wrap text-lg font-semibold">현재 공개된 직원 소개가 없습니다.</h3>
            <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
              시설에 관한 질문은 문의 페이지에서 접수할 수 있습니다.
            </p>
          </div>
        )}
        <nav aria-label="직원 소개 관련 안내" className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Link className="institution-link" href="/about">
            시설개요
          </Link>
          <Link className="institution-link" href="/support/contact">
            문의하기
          </Link>
        </nav>
      </section>
    </div>
  );
}
