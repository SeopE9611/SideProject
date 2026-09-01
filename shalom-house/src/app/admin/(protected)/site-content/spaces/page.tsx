import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { listAdminFacilitySpaces } from "@/features/facility-spaces/facility-space.admin-repository";
import { getFacilitySpacePublicationStatusLabel } from "@/features/facility-spaces/facility-space.types";
export default async function Page() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const spaces = await listAdminFacilitySpaces();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/site-content" className="underline">
          ← 공식 콘텐츠 관리
        </Link>
        <h1 className="mt-4 text-title font-bold">생활공간 관리</h1>
        <div className="mt-4 flex gap-5">
          <Link className="min-h-11 font-bold underline" href="/admin/site-content/spaces/new">
            생활공간 등록
          </Link>
          <Link className="min-h-11 underline" href="/about/spaces">
            공개 페이지 보기
          </Link>
        </div>
      </header>
      {spaces.length ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["공간명", "공개 상태", "표시 순서", "최근 수정", "상세", "편집"].map((x) => (
                  <th className="p-3 text-left" key={x}>
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
                    <time dateTime={space.updatedAt}>{space.updatedAt}</time>
                  </td>
                  <td>
                    <Link className="underline" href={`/admin/site-content/spaces/${space.id}`}>
                      상세
                    </Link>
                  </td>
                  <td>
                    <Link className="underline" href={`/admin/site-content/spaces/${space.id}/edit`}>
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-y py-6">등록된 생활공간이 없습니다.</p>
      )}
    </div>
  );
}
