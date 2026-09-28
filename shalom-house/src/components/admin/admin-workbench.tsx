import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNavigation, type AdminNavigationPermissions } from "./admin-navigation";
import { SkipLink } from "@/components/layout/skip-link";

export function AdminWorkbench({
  children,
  operator,
  permissions,
  preview = false,
}: {
  children: ReactNode;
  operator: string;
  permissions: AdminNavigationPermissions;
  preview?: boolean;
}) {
  return (
    <div className="workbench">
      <SkipLink />
      <div className="workbench-frame">
        <header className="workbench-top">
          <Link href={preview ? "/design-preview/admin" : "/admin"}>
            샬롬의 집 <span>운영 관리</span>
          </Link>
          <div>
            <span>{operator}</span>
            <Link href={preview ? "/design-preview" : "/"}>{preview ? "공개 디자인 보기" : "홈페이지 보기"} ↗</Link>
            {!preview ? (
              <form method="post" action="/api/admin/auth/logout">
                <button type="submit">로그아웃</button>
              </form>
            ) : (
              <span className="workbench-demo-label">테스트 화면 · 저장 안 됨</span>
            )}
          </div>
        </header>
        <AdminNavigation {...permissions} preview={preview} />
        <main id="main-content" tabIndex={-1} className="workbench-main">
          {children}
        </main>
      </div>
    </div>
  );
}
