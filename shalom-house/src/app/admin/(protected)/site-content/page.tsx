import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { getAdminStaffCounts } from "@/features/staff/staff.admin-repository";
import { getAdminFacilitySpaceCounts } from "@/features/facility-spaces/facility-space.admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
export default async function SiteContentPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const [items, counts, spaceCounts] = await Promise.all([
    Promise.all([
      getAdminSiteContent("facility-overview"),
      getAdminSiteContent("greeting"),
      getAdminSiteContent("contact-information"),
      getAdminSiteContent("donation-guidance"),
    ]),
    getAdminStaffCounts(),
    getAdminFacilitySpaceCounts(),
  ]);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="공식 콘텐츠 관리"
        description="시설개요, 원장 인사말, 연락처·찾아오시는 길, 후원 안내, 함께하는 사람들과 생활공간을 관리합니다."
      />
      <div className="grid gap-5">
        {items.map((item) => (
          <section key={item.key} className="rounded-card border border-border bg-surface p-5">
            <h2 className="text-heading font-bold">
              {item.key === "facility-overview"
                ? "시설개요"
                : item.key === "greeting"
                  ? "원장 인사말"
                  : item.key === "contact-information"
                    ? "연락처·찾아오시는 길"
                    : "후원 안내"}
            </h2>
            {item.persisted ? (
              <p className="mt-2 text-muted-foreground">
                MongoDB 저장됨
                {item.updatedAt ? (
                  <>
                    {" "}· 최근 수정 <time dateTime={item.updatedAt}>{formatAdminDate(item.updatedAt)}</time>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-muted-foreground">현재 코드 기본 콘텐츠를 사용 중입니다.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/${item.key}`}>
                편집
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href={
                  item.key === "facility-overview"
                    ? "/about"
                    : item.key === "greeting"
                      ? "/about/greeting"
                      : item.key === "contact-information"
                        ? "/about/directions"
                        : "/support/donation"
                }
              >
                공개 페이지 보기
              </Link>
            </div>
          </section>
        ))}
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">함께하는 사람들</h2>
          <p className="mt-2 text-muted-foreground">
            등록된 직원 소개 수 {counts.total}명 · 공개 중인 직원 수 {counts.published}명
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/site-content/people">
              관리
            </Link>
            <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/people">
              공개 페이지 보기
            </Link>
          </div>
        </section>
        <section className="rounded-card border border-border bg-surface p-5">
          <h2 className="text-heading font-bold">생활공간</h2>
          <p className="mt-2 text-muted-foreground">
            등록된 생활공간 수 {spaceCounts.total}개 · 공개 중인 생활공간 수 {spaceCounts.published}개
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/site-content/spaces">
              관리
            </Link>
            <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/spaces">
              공개 페이지 보기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
