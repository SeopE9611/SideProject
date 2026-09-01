import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminStaffProfileForm } from "@/components/admin/admin-staff-profile-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminStaffProfile } from "@/features/staff/staff.admin-repository";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const { id } = await params;
  const detail = await getAdminStaffProfile(id);
  if (!detail) notFound();
  return (
    <div className="space-y-6">
      <header>
        <Link href={`/admin/site-content/people/${id}`} className="underline">
          ← 직원 소개 상세
        </Link>
        <h1 className="mt-4 text-title font-bold">직원 정보 수정</h1>
      </header>
      <AdminStaffProfileForm
        mode="edit"
        id={id}
        expectedUpdatedAt={detail.updatedAt}
        initialProfile={{
          role: detail.role,
          responsibility: detail.responsibility,
          name: detail.name,
          showName: detail.showName,
          nameDisclosureConfirmed: detail.nameDisclosureConfirmed,
          nameDisclosureReference: detail.nameDisclosureReference,
          publicationStatus: detail.publicationStatus,
          displayOrder: detail.displayOrder,
        }}
      />
    </div>
  );
}
