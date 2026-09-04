import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { listPublicFacilitySpaces } from "@/features/facility-spaces/facility-space.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/spaces");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const spaces = await listPublicFacilitySpaces().catch(() => {
    console.error("공개 생활공간 조회 실패");
    return null;
  });

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="생활공간"
        description="시설의 공간과 쓰임을 안내합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "생활공간" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/spaces" />
      <section aria-labelledby="spaces-heading" className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12">
        <p className="text-small font-bold text-accent">공간과 쓰임</p>
        <h2
          id="spaces-heading"
          className="mt-2 border-b-2 border-foreground pb-5 text-[1.75rem] font-bold tracking-[-0.025em]"
        >
          공간 안내
        </h2>
        {spaces === null ? (
          <div className="border-b border-border py-6" role="status">
            <h3 className="text-lg font-semibold">생활공간 안내를 불러오지 못했습니다.</h3>
            <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            <a className="institution-link mt-3" href="/about/spaces">
              다시 불러오기
            </a>
          </div>
        ) : spaces.length ? (
          <ul className="divide-y divide-border border-b border-border">
            {spaces.map((space, index) => (
              <li
                className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 md:grid-cols-[3rem_minmax(0,0.9fr)_minmax(0,1.6fr)] md:gap-x-8"
                key={space.id}
              >
                <span className="text-lg font-bold text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-safe-wrap text-[1.2rem] font-semibold">{space.title}</h3>
                <p className="text-safe-wrap col-start-2 max-w-content whitespace-pre-wrap text-body leading-8 md:col-start-auto">
                  {space.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-b border-border py-6">
            <h3 className="text-safe-wrap text-lg font-semibold">현재 공개된 생활공간 안내가 없습니다.</h3>
            <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
              방문에 필요한 주소와 연락처는 찾아오시는 길에서 확인할 수 있습니다.
            </p>
          </div>
        )}
        <nav aria-label="생활공간 관련 안내" className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Link className="institution-link" href="/about">
            시설개요
          </Link>
          <Link className="institution-link" href="/about/directions">
            찾아오시는 길
          </Link>
        </nav>
      </section>
    </div>
  );
}
