import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminDetailHeader } from "@/components/admin/admin-detail-header";
import { AdminStatusSummary } from "@/components/admin/admin-status-summary";
import { AdminUserSessionForm } from "@/components/admin/admin-user-session-form";
import { AdminWorkflowPanel } from "@/components/admin/admin-workflow-panel";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { adminRoleLabels, adminUserStatusLabels } from "@/features/admin-auth/admin-auth.types";
import { getAdminUserDetail } from "@/features/admin-users/admin-user.admin-repository";
import { formatAdminDate } from "@/lib/format-admin-date";

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
    <div className="space-y-8">
      {msg ? <p role="status" className="rounded-control border border-border bg-surface px-4 py-3 font-semibold">{msg}</p> : null}
      <AdminDetailHeader
        backHref="/admin/admin-users"
        backLabel="관리자 계정 관리"
        eyebrow="관리자 계정 · 상세"
        title={u.displayName}
        actions={<Link href={`/admin/admin-users/${id}/edit`} className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">편집</Link>}
      />

      <AdminStatusSummary items={[
        { label: "역할", value: adminRoleLabels[u.role] },
        { label: "상태", value: adminUserStatusLabels[u.status], emphasized: true },
        { label: "활성 세션", value: `${u.activeSessionCount}개` },
        { label: "최근 수정", value: <time dateTime={u.updatedAt}>{formatAdminDate(u.updatedAt)}</time> },
      ]} />

      {u.status === "disabled" ? <aside className="rounded-card border border-border-strong bg-surface-subtle p-5"><p className="font-semibold">이 계정은 로그인하거나 관리자 페이지를 사용할 수 없습니다.</p></aside> : null}

      <section aria-labelledby="admin-user-information-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="admin-user-information-heading" className="text-heading font-bold">계정 정보</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-small font-semibold text-muted-foreground">이메일</dt><dd className="mt-1 break-all">{u.email}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">마지막 로그인</dt><dd className="mt-1">{u.lastLoginAt ? <time dateTime={u.lastLoginAt}>{formatAdminDate(u.lastLoginAt)}</time> : "—"}</dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">생성 시각</dt><dd className="mt-1"><time dateTime={u.createdAt}>{formatAdminDate(u.createdAt)}</time></dd></div>
          <div><dt className="text-small font-semibold text-muted-foreground">현재 계정 여부</dt><dd className="mt-1">{u.isCurrentUser ? "현재 계정" : "아님"}</dd></div>
        </dl>
      </section>

      <AdminWorkflowPanel title="로그인 세션 관리" description="이 계정의 활성 로그인 세션을 모두 해제할 수 있습니다." tone="danger">
        <AdminUserSessionForm
          userId={id}
          expectedUpdatedAt={u.updatedAt}
          activeSessionCount={u.activeSessionCount}
          isCurrentUser={u.isCurrentUser}
        />
      </AdminWorkflowPanel>

      <AdminAuditHistory heading="감사 이력" items={u.audit} />
    </div>
  );
}
