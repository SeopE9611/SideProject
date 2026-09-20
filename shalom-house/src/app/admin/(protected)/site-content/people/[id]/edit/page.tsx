import { notFound, redirect } from "next/navigation";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
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
      <AdminFormPageHeader backHref={`/admin/site-content/people/${id}`} backLabel="직원 소개 상세" eyebrow="함께하는 사람들 · 수정" title="직원 정보 수정" description="직원 정보와 홈페이지 공개 범위를 수정합니다." />
      <AdminFormGuidance title="공개 정보 확인">
        직원 이름은 본인의 홈페이지 공개 확인을 마친 경우에만 표시합니다. 이름 공개 확인 근거는 내부 참조값이며 공개 페이지에 노출하지 않습니다.
      </AdminFormGuidance>
      <section aria-labelledby="staff-profile-form-title">
        <h2 id="staff-profile-form-title" className="sr-only">직원 정보 입력</h2>
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
      </section>
    </div>
  );
}
