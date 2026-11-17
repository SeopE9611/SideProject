import { redirect } from "next/navigation";

import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import type { Metadata } from "next";

import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminNewsDraftForm } from "@/components/admin/admin-news-draft-form";

export const metadata: Metadata = {
  title: "소식 작성",
  robots: { index: false, follow: false },
};

export default async function AdminNewsCreatePage() {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "content.create")) redirect("/admin?forbidden=1");
  return (
    <div className="admin-editor-layout">
      <AdminFormPageHeader
        backHref="/admin/news"
        backLabel="소식 관리로 돌아가기"
        eyebrow="소식 · 작성"
        title="소식 작성"
        description={
          <>
          공지사항 또는 활동소식을 작성합니다.
          <br />
          {admin.role === "admin" ? "임시저장하거나, 공개 가능 여부를 확인한 뒤 게시할 수 있습니다." : "현재 역할의 권한에 따라 초안을 저장하고 기존 게시 절차를 진행합니다."}
          </>
        }
      />

      <AdminFormGuidance
        title="저장 전 안전 확인"
        description="임시저장과 게시 전에 공개 가능한 내용인지 확인하세요. 다음 정보는 저장하지 마세요."
      >
        <ul className="list-disc space-y-2 pl-5">
          <li>거주인 이름·장애·건강·가족관계 등 개인을 식별할 수 있는 정보</li>
          <li>개인 연락처와 계정·인증정보</li>
          <li>내부 사건·사고·상담·회의·인사자료</li>
          <li>공개 권한이 확인되지 않은 사진·후원·자원봉사 정보</li>
        </ul>
      </AdminFormGuidance>

      <section aria-labelledby="admin-news-form-heading">
        <h2 id="admin-news-form-heading" className="sr-only">
          소식 입력
        </h2>
        <AdminNewsDraftForm mode="create" simpleManagement={admin.role === "admin"} />
      </section>
    </div>
  );
}
