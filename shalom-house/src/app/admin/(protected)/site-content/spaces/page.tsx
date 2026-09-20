import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { listAdminFacilitySpaces } from "@/features/facility-spaces/facility-space.admin-repository";
import { getFacilitySpacePublicationStatusLabel } from "@/features/facility-spaces/facility-space.types";
import { formatAdminDate } from "@/lib/format-admin-date";
export default async function Page() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const spaces = await listAdminFacilitySpaces();
  return (
    <div className="space-y-6">
      <Link href="/admin/site-content" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
        ← 공식 콘텐츠 관리
      </Link>
      <AdminPageHeader
        title="생활공간 관리"
        description="생활공간 소개와 공개 상태를 관리합니다."
        actions={
          <>
          <Link className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/admin/site-content/spaces/new">
            생활공간 등록
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/about/spaces">
            공개 페이지 보기
          </Link>
          </>
        }
      />
      {spaces.length ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full">
            <thead>
              <tr>
                {["공간명", "공개 상태", "표시 순서", "최근 수정", "상세", "편집"].map((x) => (
                  <th className="bg-surface-subtle p-3 text-left" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr className="border-t" key={space.id}>
                  <td className="p-3">{space.title}</td>
                  <td className="p-3">{getFacilitySpacePublicationStatusLabel(space.publicationStatus)}</td>
                  <td className="p-3">{space.displayOrder}</td>
                  <td className="p-3">
                    <time dateTime={space.updatedAt}>{formatAdminDate(space.updatedAt)}</time>
                  </td>
                  <td className="p-1">
                    <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/spaces/${space.id}`}>
                      상세
                    </Link>
                  </td>
                  <td className="p-1">
                    <Link className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/admin/site-content/spaces/${space.id}/edit`}>
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
          <h2 className="text-heading font-bold">등록된 생활공간이 없습니다.</h2>
        </div>
      )}
    </div>
  );
}
