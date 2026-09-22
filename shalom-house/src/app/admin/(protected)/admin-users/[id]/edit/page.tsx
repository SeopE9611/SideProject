import { notFound, redirect } from "next/navigation";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
import { AdminUserEditForm } from "@/components/admin/admin-user-edit-form";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getAdminUserDetail } from "@/features/admin-users/admin-user.admin-repository";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) notFound();
  const u = await getAdminUserDetail(id, a.admin.id);
  if (!u) notFound();
  if (u === "invalid_document") throw new Error("invalid_document");
  return (
    <div className="space-y-8">
      <AdminFormPageHeader
        backHref={`/admin/admin-users/${id}`}
        backLabel="관리자 계정 상세"
        eyebrow="관리자 계정 · 편집"
        title="관리자 계정 편집"
        description="표시 이름, 역할과 계정 상태를 관리합니다."
      />
      <AdminFormGuidance
        title="권한 변경 주의"
        description="역할 또는 상태 변경은 관리자 접근 권한과 로그인 세션에 즉시 영향을 줍니다."
      >
        <p>
          역할 또는 상태를 변경하면 해당 계정의 기존 로그인 세션이 해제될 수 있으므로, 대상 계정과 변경 내용을
          저장 전에 다시 확인하세요.
        </p>
      </AdminFormGuidance>
      <AdminUserEditForm
        userId={id}
        email={u.email}
        displayName={u.displayName}
        role={u.role}
        status={u.status}
        expectedUpdatedAt={u.updatedAt}
        isCurrentUser={u.isCurrentUser}
      />
    </div>
  );
}
