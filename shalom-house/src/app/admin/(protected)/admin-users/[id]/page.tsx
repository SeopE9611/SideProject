import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminUserSessionForm } from "@/components/admin/admin-user-session-form";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { adminRoleLabels } from "@/features/admin-auth/admin-auth.types";
import { getAdminUserDetail } from "@/features/admin-users/admin-user.admin-repository";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) notFound();
  const u = await getAdminUserDetail(id, a.admin.id);
  if (!u) notFound();
  if (u === "invalid_document") throw new Error("invalid_document");
  const q = await searchParams,
    msg =
      q.created === "1"
        ? "관리자 계정을 생성했습니다."
        : q.updated === "1"
          ? "관리자 계정 정보를 저장했습니다."
          : q.sessionsRevoked === "1"
            ? "관리자 계정의 로그인 세션을 해제했습니다."
            : null;
  return (
    <div>
      {msg && <p role="status">{msg}</p>}
      <h1 className="text-title font-bold">계정 정보</h1>
      {u.status === "disabled" && <p>이 계정은 로그인하거나 관리자 페이지를 사용할 수 없습니다.</p>}
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <dt>이메일</dt>
          <dd className="break-all">{u.email}</dd>
        </div>
        <div>
          <dt>표시 이름</dt>
          <dd>{u.displayName}</dd>
        </div>
        <div>
          <dt>역할</dt>
          <dd>{adminRoleLabels[u.role]}</dd>
        </div>
        <div>
          <dt>상태</dt>
          <dd>{u.status}</dd>
        </div>
        <div>
          <dt>마지막 로그인</dt>
          <dd>{u.lastLoginAt ? formatAdminDate(u.lastLoginAt) : "—"}</dd>
        </div>
        <div>
          <dt>활성 세션 수</dt>
          <dd>{u.activeSessionCount}</dd>
        </div>
        <div>
          <dt>생성 시각</dt>
          <dd>{formatAdminDate(u.createdAt)}</dd>
        </div>
        <div>
          <dt>수정 시각</dt>
          <dd>{formatAdminDate(u.updatedAt)}</dd>
        </div>
        <div>
          <dt>현재 계정 여부</dt>
          <dd>{u.isCurrentUser ? "현재 계정" : "아님"}</dd>
        </div>
      </dl>
      <Link href={`/admin/admin-users/${id}/edit`} className="mt-5 inline-block">
        편집
      </Link>
      <AdminUserSessionForm
        userId={id}
        expectedUpdatedAt={u.updatedAt}
        activeSessionCount={u.activeSessionCount}
        isCurrentUser={u.isCurrentUser}
      />
      <div className="mt-8">
        <AdminAuditHistory heading="감사 이력" items={u.audit} />
      </div>
    </div>
  );
}
function formatAdminDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "시간 확인 불가"
    : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}
