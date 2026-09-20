import { redirect } from "next/navigation";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminTransparencyDraftForm } from "@/components/admin/admin-transparency-draft-form";
export default async function NewTransparencyPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.create")) redirect("/admin?forbidden=1");
  return (
    <div className="min-w-0 space-y-8">
      <AdminFormPageHeader
        backHref="/admin/transparency"
        backLabel="자료공개 관리로 돌아가기"
        eyebrow="자료공개 · 작성"
        title="자료공개 초안 작성"
        description="PDF는 private bucket에 저장되며 즉시 공개되지 않습니다."
      />
      <AdminFormGuidance title="업로드 전 확인">
        <p>
          업로드 전에 주민등록번호, 연락처, 계좌정보, 서명, 개인 건강·복지 정보와 공개가 제한된 내부 정보가 포함되지
          않았는지 확인해 주세요.
        </p>
      </AdminFormGuidance>
      <section aria-labelledby="admin-transparency-form-heading">
        <h2 id="admin-transparency-form-heading" className="sr-only">
          자료공개 초안 입력
        </h2>
        <AdminTransparencyDraftForm mode="create" />
      </section>
    </div>
  );
}
