import { redirect } from "next/navigation";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminFormGuidance } from "@/components/admin/admin-form-guidance";
import { AdminFormPageHeader } from "@/components/admin/admin-form-page-header";
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
      <AdminFormPageHeader
        backHref="/admin/site-content"
        backLabel="공식 콘텐츠 관리"
        eyebrow="시설 공식 정보 · 원장 인사말"
        title="원장 인사말 편집"
        description="공개 홈페이지의 원장 인사말과 서명 표시를 관리합니다."
      />
      {(await searchParams).saved === "1" ? (
        <p role="status" className="rounded-control border border-border-strong bg-surface p-4 font-semibold">
          저장했습니다.
        </p>
      ) : null}
      <AdminFormGuidance title="공개 전 확인" description="저장하면 현재 공개 인사말이 즉시 변경됩니다.">
        인사말 본문과 원장 이름 공개 여부를 확인해 주세요.
      </AdminFormGuidance>
      <AdminGreetingForm content={detail.content} updatedAt={detail.updatedAt} />
      <AdminAuditHistory items={audit} />
    </div>
  );
}
