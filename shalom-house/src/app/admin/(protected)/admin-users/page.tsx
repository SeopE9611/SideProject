import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFilterPanel } from "@/components/admin/admin-filter-panel";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import {
  adminRoleLabels,
  adminRoles,
  adminUserStatusLabels,
  adminUserStatuses,
  isAdminRole,
  type AdminUserStatus,
} from "@/features/admin-auth/admin-auth.types";
import { getAdminUserCounts, listAdminUsers } from "@/features/admin-users/admin-user.admin-repository";
import { ADMIN_USER_PAGE_SIZE } from "@/features/admin-users/admin-user.types";
import { formatAdminDate } from "@/lib/format-admin-date";

const adminUserListGridClass =
  "xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.65fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.5fr)]";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}) {
  const a = await authorizeCurrentAdmin("admin_users.manage");
  if (!a.ok) redirect("/admin?forbidden=1");
  const q = await searchParams,
    page = Math.max(1, Number.parseInt(q.page ?? "1") || 1),
    filters = {
      role: isAdminRole(q.role) ? q.role : undefined,
      status: isAdminUserStatus(q.status) ? q.status : undefined,
    };
  const [{ items, total }, counts] = await Promise.all([
    listAdminUsers({ page, pageSize: ADMIN_USER_PAGE_SIZE, filters, currentAdminId: a.admin.id, now: new Date() }),
    getAdminUserCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USER_PAGE_SIZE));
  const hasFilters = Boolean(filters.role || filters.status);
  const filterFormKey = [filters.role ?? "", filters.status ?? ""].join("|");
  const href = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(Math.max(1, targetPage)));
    return `/admin/admin-users?${params}`;
  };
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="관리자 계정 관리"
        description="관리자 계정의 역할, 상태와 로그인 세션 현황을 확인하고 관리합니다."
        actions={
          <Link href="/admin/admin-users/new" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
            계정 추가
          </Link>
        }
      />

      <section aria-labelledby="admin-user-summary-heading" className="rounded-card border border-border bg-surface p-5">
        <h2 id="admin-user-summary-heading" className="text-heading font-bold">관리자 계정 현황</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["전체 계정", counts.total], ["활성 계정", counts.active], ["비활성 계정", counts.disabled], ["활성 시스템 관리자", counts.activeAdmins]].map(([label, value]) => (
            <div key={label} className="min-w-0"><dt className="text-small font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-heading font-bold">{value}</dd></div>
          ))}
        </dl>
      </section>

      <AdminFilterPanel headingId="admin-user-filter-heading" title="관리자 계정 필터" totalItems={total} page={page} totalPages={totalPages}>
        <form key={filterFormKey} method="get" action="/admin/admin-users" className="mt-4 grid gap-3 sm:grid-cols-2">
          <label htmlFor="admin-user-role-filter" className="grid min-w-0 gap-2 font-semibold">
            역할
            <select id="admin-user-role-filter" name="role" defaultValue={filters.role ?? ""} className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              <option value="">모든 역할</option>
              {adminRoles.map((x) => <option key={x} value={x}>{adminRoleLabels[x]}</option>)}
            </select>
          </label>
          <label htmlFor="admin-user-status-filter" className="grid min-w-0 gap-2 font-semibold">
            상태
            <select id="admin-user-status-filter" name="status" defaultValue={filters.status ?? ""} className="min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-background px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              <option value="">모든 상태</option>
              {adminUserStatuses.map((x) => <option key={x} value={x}>{adminUserStatusLabels[x]}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 적용</button>
            <Link href="/admin/admin-users" className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-5 py-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link>
          </div>
        </form>
      </AdminFilterPanel>

      <section aria-labelledby="admin-user-list-heading">
        <h2 id="admin-user-list-heading" className="sr-only">관리자 계정 목록</h2>
        {items.length ? <>
          <div className={`hidden gap-4 border-y border-border bg-surface-subtle px-4 py-3 text-small font-bold xl:grid ${adminUserListGridClass}`}>
            {['표시 이름', '이메일', '역할', '상태', '마지막 로그인', '활성 세션', '최근 수정', '상세'].map((label) => <span key={label}>{label}</span>)}
          </div>
          <ul className="divide-y divide-border border-b border-border">
            {items.map((x) => <li key={x.id} className={`grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-2 xl:items-center xl:gap-4 ${adminUserListGridClass}`}>
              <p className="flex min-w-0 flex-wrap items-center gap-2 break-words"><strong className="text-small font-semibold xl:sr-only">표시 이름 </strong><span>{x.displayName}</span>{x.isCurrentUser ? <span className="rounded-control border border-border px-2 py-0.5 text-small font-semibold text-primary">현재 계정</span> : null}</p>
              <p className="min-w-0 break-all"><strong className="text-small font-semibold xl:sr-only">이메일 </strong>{x.email}</p>
              <p><strong className="text-small font-semibold xl:sr-only">역할 </strong>{adminRoleLabels[x.role]}</p>
              <p><strong className="text-small font-semibold xl:sr-only">상태 </strong>{adminUserStatusLabels[x.status]}</p>
              <p><strong className="text-small font-semibold xl:sr-only">마지막 로그인 </strong>{x.lastLoginAt ? <time dateTime={x.lastLoginAt}>{formatAdminDate(x.lastLoginAt)}</time> : "—"}</p>
              <p><strong className="text-small font-semibold xl:sr-only">활성 세션 </strong>{x.activeSessionCount}개</p>
              <p><strong className="text-small font-semibold xl:sr-only">최근 수정 </strong><time dateTime={x.updatedAt}>{formatAdminDate(x.updatedAt)}</time></p>
              <Link href={`/admin/admin-users/${x.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">상세</Link>
            </li>)}
          </ul>
        </> : <div className="rounded-card border border-border bg-surface p-6">
          <h3 className="text-heading font-bold">{hasFilters ? "선택한 조건에 맞는 관리자 계정이 없습니다." : "등록된 관리자 계정이 없습니다."}</h3>
          {hasFilters ? <Link href="/admin/admin-users" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">필터 초기화</Link> : null}
        </div>}
      </section>

      <AdminListPagination label="관리자 계정 목록 페이지 이동" page={page} totalPages={totalPages} previousHref={href(page - 1)} nextHref={href(page + 1)} />
    </div>
  );
}
function isAdminUserStatus(value: unknown): value is AdminUserStatus {
  return adminUserStatuses.some((status) => status === value);
}
