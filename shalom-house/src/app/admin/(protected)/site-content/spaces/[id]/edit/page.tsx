import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminFacilitySpaceForm } from "@/components/admin/admin-facility-space-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminFacilitySpace } from "@/features/facility-spaces/facility-space.admin-repository";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const { id } = await params;
  const detail = await getAdminFacilitySpace(id);
  if (!detail) notFound();
  return (
    <div className="space-y-6">
      <header>
        <Link href={`/admin/site-content/spaces/${id}`} className="underline">
          ← 생활공간 상세
        </Link>
        <h1 className="mt-4 text-title font-bold">생활공간 수정</h1>
      </header>
      <AdminFacilitySpaceForm
        mode="edit"
        id={id}
        expectedUpdatedAt={detail.updatedAt}
        initialSpace={{
          title: detail.title,
          description: detail.description,
          publicationStatus: detail.publicationStatus,
          displayOrder: detail.displayOrder,
        }}
      />
    </div>
  );
}
