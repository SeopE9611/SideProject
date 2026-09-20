import { notFound, redirect } from "next/navigation";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
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
      <AdminFormPageHeader backHref={`/admin/site-content/spaces/${id}`} backLabel="생활공간 상세" eyebrow="생활공간 · 수정" title="생활공간 수정" description="생활공간 설명과 공개 상태를 수정합니다." />
      <AdminFormGuidance title="공개 전 확인">
        입소자 개인정보가 포함되지 않아야 합니다. 시설 보안에 영향을 줄 수 있는 상세 위치·출입 정보는 입력하지 마세요.
      </AdminFormGuidance>
      <section aria-labelledby="facility-space-form-title">
        <h2 id="facility-space-form-title" className="sr-only">생활공간 정보 입력</h2>
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
      </section>
    </div>
  );
}
