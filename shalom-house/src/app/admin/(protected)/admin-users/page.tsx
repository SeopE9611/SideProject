import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import {
  adminRoleLabels,
  adminRoles,
  adminUserStatuses,
  isAdminRole,
  type AdminUserStatus,
} from "@/features/admin-auth/admin-auth.types";
import { getAdminUserCounts, listAdminUsers } from "@/features/admin-users/admin-user.admin-repository";
import { ADMIN_USER_PAGE_SIZE } from "@/features/admin-users/admin-user.types";
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
  const href = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(Math.max(1, targetPage)));
    return `?${params}`;
  };
  return (
    <div>
      <h1 className="text-title font-bold">관리자 계정 관리</h1>
      <p className="mt-3">
        전체 계정 {counts.total} · 활성 계정 {counts.active} · 비활성 계정 {counts.disabled} · 활성 시스템 관리자{" "}
        {counts.activeAdmins}
      </p>
      <Link href="/admin/admin-users/new" className="mt-4 inline-block">
        계정 추가
      </Link>
      <form className="mt-5 flex gap-3">
        <label htmlFor="admin-user-role-filter">역할</label>
        <select id="admin-user-role-filter" name="role" defaultValue={filters.role ?? ""}>
          <option value="">모든 역할</option>
          {adminRoles.map((x) => (
            <option key={x} value={x}>
              {adminRoleLabels[x]}
            </option>
          ))}
        </select>
        <label htmlFor="admin-user-status-filter">상태</label>
        <select id="admin-user-status-filter" name="status" defaultValue={filters.status ?? ""}>
          <option value="">모든 상태</option>
          {adminUserStatuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 border px-3">
          필터 적용
        </button>
      </form>
      {!items.length ? (
        <p className="mt-6">조건에 맞는 관리자 계정이 없습니다.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table>
            <thead>
              <tr>
                {["표시 이름", "이메일", "역할", "상태", "마지막 로그인", "활성 세션", "최근 수정", "상세"].map((x) => (
                  <th key={x} className="p-2 text-left">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td className="p-2">
                    {x.displayName} {x.isCurrentUser && <span>현재 계정</span>}
                  </td>
                  <td className="break-all p-2">{x.email}</td>
                  <td className="p-2">{adminRoleLabels[x.role]}</td>
                  <td className="p-2">{x.status}</td>
                  <td className="p-2">{x.lastLoginAt ? formatAdminDate(x.lastLoginAt) : "—"}</td>
                  <td className="p-2">활성 세션 {x.activeSessionCount}개</td>
                  <td className="p-2">{formatAdminDate(x.updatedAt)}</td>
                  <td className="p-2">
                    <Link href={`/admin/admin-users/${x.id}`}>상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="mt-6 flex gap-4">
        {page > 1 && <Link href={href(page - 1)}>이전</Link>}
        {page * ADMIN_USER_PAGE_SIZE < total && <Link href={href(page + 1)}>다음</Link>}
      </nav>
    </div>
  );
}
function isAdminUserStatus(value: unknown): value is AdminUserStatus {
  return adminUserStatuses.some((status) => status === value);
}
function formatAdminDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "시간 확인 불가"
    : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}
