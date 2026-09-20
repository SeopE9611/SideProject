import { redirect } from "next/navigation";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminFacilitySpaceForm } from "@/components/admin/admin-facility-space-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
export default async function Page() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  return (
    <div className="space-y-6">
      <AdminFormPageHeader backHref="/admin/site-content/spaces" backLabel="생활공간 관리" eyebrow="생활공간 · 작성" title="생활공간 등록" description="공개 홈페이지에 표시할 생활공간 정보를 등록합니다." />
      <AdminFormGuidance title="공개 전 확인">
        입소자 개인정보가 포함되지 않아야 합니다. 시설 보안에 영향을 줄 수 있는 상세 위치·출입 정보는 입력하지 마세요.
      </AdminFormGuidance>
      <section aria-labelledby="facility-space-form-title">
        <h2 id="facility-space-form-title" className="sr-only">생활공간 입력</h2>
        <AdminFacilitySpaceForm
        mode="create"
        expectedUpdatedAt={null}
        initialSpace={{ title: "", description: "", publicationStatus: "draft", displayOrder: 1 }}
        />
      </section>
    </div>
  );
}
