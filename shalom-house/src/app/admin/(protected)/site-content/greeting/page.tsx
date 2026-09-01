import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminGreetingForm } from "@/components/admin/admin-greeting-form";
import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { hasAdminPermission } from "@/features/admin-auth/admin-authorization";
import { getAdminSiteContent } from "@/features/site-content/site-content.admin-repository";
import { listAdminSiteContentAuditHistory } from "@/features/site-content/site-content.audit-repository";
export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasAdminPermission(admin, "site_content.manage")) redirect("/admin?forbidden=1");
  const [detail, audit] = await Promise.all([
    getAdminSiteContent("greeting"),
    listAdminSiteContentAuditHistory({ key: "greeting", limit: 50 }),
  ]);
  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/site-content" className="underline">
          ← 공식 콘텐츠 관리
        </Link>
        <h1 className="mt-4 text-title font-bold">원장 인사말 편집</h1>
        {(await searchParams).saved === "1" ? (
          <p role="status" className="mt-3 font-semibold text-primary">
            저장했습니다.
          </p>
        ) : null}
      </header>
      <AdminGreetingForm content={detail.content} updatedAt={detail.updatedAt} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
