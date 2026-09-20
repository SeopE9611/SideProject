import { redirect } from "next/navigation";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminGalleryDraftForm } from "@/components/admin/admin-gallery-draft-form";
export default async function NewGalleryPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.create")) redirect("/admin?forbidden=1");
  return (
    <div className="space-y-8">
      <AdminFormPageHeader
        backHref="/admin/gallery"
        backLabel="활동사진 관리로 돌아가기"
        eyebrow="활동사진 · 작성"
        title="활동사진 초안 작성"
        description="업로드 즉시 공개되지 않으며 변환된 WebP만 비공개로 저장합니다."
      />
      <AdminFormGuidance title="업로드 전 안전 확인">
        <ul className="list-disc space-y-2 pl-5">
          <li>촬영 동의와 홈페이지 공개 동의는 별개입니다.</li>
          <li>얼굴·이름표·문서·주소·차량번호를 확인합니다.</li>
          <li>장애·건강·개별 지원 정보가 드러나는 장면은 등록하지 않습니다.</li>
          <li>동의 문서 원본과 실명을 입력하지 않습니다.</li>
          <li>업로드 즉시 공개되지 않습니다.</li>
          <li>변환된 WebP만 저장합니다.</li>
        </ul>
      </AdminFormGuidance>
      <section aria-labelledby="admin-gallery-form-heading">
        <h2 id="admin-gallery-form-heading" className="sr-only">
          활동사진 초안 입력
        </h2>
        <AdminGalleryDraftForm mode="create" />
      </section>
    </div>
  );
}
