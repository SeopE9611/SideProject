import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getStaffPublicationStatusLabel } from "@/features/staff/staff.types";
import { listAdminStaffProfiles } from "@/features/staff/staff.admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";
export default async function Page() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const profiles = await listAdminStaffProfiles();
  return (
    <div className="space-y-6">
      <Link href="/admin/site-content" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        ← 공식 콘텐츠 관리
      </Link>
      <AdminPageHeader
        title="함께하는 사람들 관리"
        description="직원 소개와 공개 상태를 관리합니다."
        actions={
          <>
          <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/site-content/people/new">
            직원 소개 등록
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/people">
            공개 페이지 보기
          </Link>
          </>
        }
      />
      {profiles.length ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full">
            <thead>
              <tr>
                {["직책·역할", "공개 이름", "공개 상태", "표시 순서", "최근 수정", "상세", "편집"].map((x) => (
                  <th className="bg-surface-subtle p-3 text-left" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr className="border-t" key={p.id}>
                  <td className="p-3">{p.role}</td>
                  <td className="p-3">{p.publicName}</td>
                  <td className="p-3">{getStaffPublicationStatusLabel(p.publicationStatus)}</td>
                  <td className="p-3">{p.displayOrder}</td>
                  <td className="p-3">
                    <time dateTime={p.updatedAt}>{formatAdminDate(p.updatedAt)}</time>
                  </td>
                  <td className="p-1">
                    <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/people/${p.id}`}>
                      상세
                    </Link>
                  </td>
                  <td className="p-1">
                    <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/people/${p.id}/edit`}>
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-heading font-bold">등록된 직원 소개가 없습니다.</h2>
        </div>
      )}
    </div>
  );
}
