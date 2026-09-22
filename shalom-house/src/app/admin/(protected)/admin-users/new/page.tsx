import { redirect } from "next/navigation";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminUserCreateForm } from "@/components/admin/admin-user-create-form";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";

export default async function Page() {
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  return (
    <div className="space-y-8">
      <AdminFormPageHeader
        backHref="/admin/admin-users"
        backLabel="관리자 계정 관리"
        eyebrow="관리자 계정 · 등록"
        title="관리자 계정 추가"
        description="관리자 페이지에 접근할 계정과 역할을 등록합니다."
      />
      <AdminFormGuidance
        title="초기 비밀번호 전달 주의"
        description="계정 생성 전에 역할과 비밀번호 전달 방법을 확인합니다."
      >
        <p>
          초기 비밀번호는 안전한 별도 경로로 당사자에게 전달하세요. 비밀번호를 이메일·메신저 공개 채널이나
          감사 메모에 기록하지 마세요.
        </p>
      </AdminFormGuidance>
      <AdminUserCreateForm />
    </div>
  );
}
